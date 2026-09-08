import {
  loadTxRecords,
  linkTxs,
  updateTx,
  getSplits,
  getSplitParticipants,
  setSplitParticipantStatus,
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

/**
 * Looks for an incoming credit transaction matching an open participant's share —
 * a friend paying the user via UPI shows up as a credit SMS on the user's own
 * phone. A match only ever sets status to 'attention', never 'settled': two
 * participants owing the same amount, or an unrelated credit of the same size,
 * are real collision risks the user must confirm or reject (see SplitDetailScreen).
 * Amount-bucketed (a Map, not a nested scan) to stay ~O(n), matching
 * pairSelfTransfers' documented performance requirement. Catches its own errors —
 * runDetectionJobs re-throws on failure, and this must never abort the rest of
 * app startup or a rescan because of a Split-specific bug.
 */
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
    for (const split of splits.filter((s) => s.status === 'open')) {
      const participants = await getSplitParticipants(split.id);
      for (const participant of participants) {
        if (participant.status !== 'unpaid') continue;
        const bucket = creditsByAmount.get(participant.shareAmount);
        if (!bucket) continue;
        const candidate = bucket.find((c) => c.timestamp >= split.createdAt);
        if (!candidate) continue;
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
