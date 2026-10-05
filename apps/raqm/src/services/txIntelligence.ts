import {
  loadTxRecords,
  linkTxs,
  updateTx,
  getSplits,
  getSplitParticipants,
  setSplitParticipantStatus,
  getSplitPaymentTxIds,
} from '../db/database';
import type { TxRecord } from '../db/database';
import { pairSelfTransfers, pairRefunds, computeRecurringIds, isCreditType } from './txIntelligenceCore';
import { logEvent } from './logger';

export {
  pairSelfTransfers,
  pairRefunds,
  findSelfTransferPartner,
  computeRecurringIds,
  isDuplicateSms,
  countsTowardTotals,
  isCreditType,
} from './txIntelligenceCore';

/** T11. `txs`, when given, is used instead of re-querying SQLite — callers that already have a
 * fresh-enough snapshot (see `runDetectionJobs`) skip a full-table reload this way. */
export async function detectSelfTransfers(txs?: TxRecord[]): Promise<number> {
  const rows = txs ?? await loadTxRecords();
  const pairs = pairSelfTransfers(rows);
  for (const [a, b] of pairs) {
    await linkTxs(a, b, 'self_transfer');
  }
  return pairs.length;
}

/** T12. See `detectSelfTransfers` for the `txs` param's purpose. */
export async function detectRefunds(txs?: TxRecord[]): Promise<number> {
  const rows = txs ?? await loadTxRecords();
  const pairs = pairRefunds(rows);
  for (const [a, b] of pairs) {
    await linkTxs(a, b, 'refund');
  }
  return pairs.length;
}

/** R1. See `detectSelfTransfers` for the `txs` param's purpose. Skips transactions already
 * flagged recurring so a steady-state app start doesn't re-write every recurring tx ever
 * found, every single launch. */
export async function detectSubscriptions(txs?: TxRecord[]): Promise<number> {
  const rows = txs ?? await loadTxRecords();
  const ids = computeRecurringIds(rows);
  const alreadyRecurring = new Set(rows.filter(t => t.recurring).map(t => t.id));
  let updated = 0;
  for (const id of ids) {
    if (alreadyRecurring.has(id)) continue;
    await updateTx(id, { recurring: true });
    updated++;
  }
  return updated;
}

/** Matches incoming credits against what's left of each open participant's share (shareAmount
 * minus paidAmount so prior installments count), falling back to a smaller unclaimed credit as
 * a plausible partial payment when nothing covers the full remainder; always lands on
 * 'attention' for the user to confirm, never auto-settles. Never throws — a Split-specific bug
 * here must not abort the rest of app startup or a rescan. */
export async function matchSplitPayments(): Promise<void> {
  try {
    const txs = await loadTxRecords();
    const credits = txs.filter((t) => isCreditType(t.type) && t.deletedAt == null);

    const creditsByAmount = new Map<number, TxRecord[]>();
    for (const credit of credits) {
      const bucket = creditsByAmount.get(credit.amount);
      if (bucket) bucket.push(credit);
      else creditsByAmount.set(credit.amount, [credit]);
    }

    const splits = await getSplits();
    const openSplits = splits.filter((s) => s.status === 'open');
    const participantsBySplit = new Map<number, Awaited<ReturnType<typeof getSplitParticipants>>>();
    for (const split of splits) {
      participantsBySplit.set(split.id, await getSplitParticipants(split.id));
    }

    // A credit already claimed as some OTHER participant's matchedTxId (from a prior run), or
    // already recorded as a confirmed payment (possibly for a participant whose matchedTxId has
    // since moved on to a later installment), must not be handed out again this run — both are
    // tracked in one Set so a single credit is never matched to two participants.
    const claimedTxIds = new Set<number>(await getSplitPaymentTxIds());
    for (const split of splits) {
      for (const participant of participantsBySplit.get(split.id) ?? []) {
        if ((participant.status === 'attention' || participant.status === 'settled') && participant.matchedTxId != null) {
          claimedTxIds.add(participant.matchedTxId);
        }
      }
    }

    // Sorted once per run, not re-sorted per participant, so the partial-credit fallback
    // below stays one O(n log n) pass instead of O(participants × credits log credits).
    const creditsByTimestampAsc = [...credits].sort((a, b) => a.timestamp - b.timestamp);

    for (const split of openSplits) {
      const participants = participantsBySplit.get(split.id) ?? [];
      for (const participant of participants) {
        if (participant.isSelf) continue;
        if (participant.status !== 'unpaid' && participant.status !== 'partial') continue;
        // Rounded to cents — plain float subtraction can miss an exact bucket match
        // (e.g. 900 - 500.50 isn't bit-identical to a stored 399.5).
        const remaining = Math.round((participant.shareAmount - participant.paidAmount) * 100) / 100;
        if (remaining <= 0) continue;
        const bucket = creditsByAmount.get(remaining);
        const exactMatch = bucket?.find((c) => c.timestamp >= split.createdAt && !claimedTxIds.has(c.id));
        const candidate = exactMatch ?? creditsByTimestampAsc.find(
          (c) => c.amount < remaining && c.timestamp >= split.createdAt && !claimedTxIds.has(c.id),
        );
        if (!candidate) continue;
        claimedTxIds.add(candidate.id);
        await setSplitParticipantStatus(participant.id, 'attention', candidate.id);
      }
    }
  } catch (e) {
    logEvent('splitMatch.failed', e instanceof Error ? e.message : String(e));
  }
}

/**
 * Runs all three jobs. Called after scan/rescan and once on app start (contract §3).
 *
 * Loads the transaction table at most twice instead of the naive 3x-plus-callers'-own-reload:
 * `initialTxs` (when the caller already has a fresh snapshot, e.g. AppNavigator right after
 * `loadTxs()`) is reused for self-transfer detection and, if that step made no changes, for
 * refund/subscription detection too. `detectSelfTransfers` and `detectRefunds` both filter on
 * `linkType === null` (see `isLinked` in txIntelligenceCore.ts) — reusing a snapshot across a
 * step that actually linked something would risk pairing an already-linked row again, so a
 * fresh reload is forced only when self-transfer pairing found at least one pair. Subscription
 * detection never reads `linkType`, so it's always safe to reuse whichever snapshot is current.
 */
export async function runDetectionJobs(initialTxs?: TxRecord[]): Promise<void> {
  logEvent('detection.start');
  try {
    const first = initialTxs ?? await loadTxRecords();
    const selfTransferCount = await detectSelfTransfers(first);
    const afterSelfTransfer = selfTransferCount > 0 ? await loadTxRecords() : first;
    await detectRefunds(afterSelfTransfer);
    await detectSubscriptions(afterSelfTransfer);
    logEvent('detection.done');
  } catch (e) {
    logEvent('detection.failed', e instanceof Error ? e.message : String(e));
    throw e;
  }
}
