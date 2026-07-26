import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import type { TxRecord } from '../db/database';

const DAY_MS = 24 * 60 * 60 * 1000;

function isDebitType(t: TransactionType): boolean {
  return t === TransactionType.EXPENSE || t === TransactionType.TRANSFER || t === TransactionType.INVESTMENT;
}

function isCreditType(t: TransactionType): boolean {
  return t === TransactionType.INCOME || t === TransactionType.CREDIT;
}

function accountKey(tx: TxRecord): string {
  return `${tx.bankName}|${tx.accountLast4 ?? ''}`;
}

function isLinked(tx: TxRecord): boolean {
  return tx.linkType !== null;
}

/** T11: pairs [debitId, creditId] — same amount, different account, within 24h, neither already linked. */
export function pairSelfTransfers(txs: TxRecord[]): [number, number][] {
  const pairs: [number, number][] = [];
  const usedCredit = new Set<number>();
  const debits = txs.filter(t => isDebitType(t.type) && !isLinked(t) && !t.isSplitChild);
  const credits = txs.filter(t => isCreditType(t.type) && !isLinked(t) && !t.isSplitChild);
  // Pairing requires identical amounts, so bucket credits by amount first —
  // the naive debits×credits scan was O(n²) and froze the scan at ~5k transactions.
  const creditsByAmount = new Map<number, TxRecord[]>();
  for (const credit of credits) {
    const bucket = creditsByAmount.get(credit.amount);
    if (bucket) bucket.push(credit);
    else creditsByAmount.set(credit.amount, [credit]);
  }
  for (const debit of debits) {
    const bucket = creditsByAmount.get(debit.amount);
    if (!bucket) continue;
    for (const credit of bucket) {
      if (usedCredit.has(credit.id)) continue;
      if (accountKey(credit) === accountKey(debit)) continue; // must be a different account
      if (Math.abs(credit.timestamp - debit.timestamp) > DAY_MS) continue;
      pairs.push([debit.id, credit.id]);
      usedCredit.add(credit.id);
      break;
    }
  }
  return pairs;
}

/** T12: pairs [debitId, creditId] — same amount + same merchant (case-insensitive), credit within 0–30 days after debit. */
export function pairRefunds(txs: TxRecord[]): [number, number][] {
  const pairs: [number, number][] = [];
  const usedDebit = new Set<number>();
  const debits = txs.filter(t => isDebitType(t.type) && !isLinked(t) && !t.isSplitChild);
  const credits = txs.filter(t => isCreditType(t.type) && !isLinked(t) && !t.isSplitChild);
  // Same-amount + same-merchant requirement → bucket debits by amount|merchant (O(n) instead of O(n²)).
  const debitsByKey = new Map<string, TxRecord[]>();
  for (const debit of debits) {
    if (!debit.merchant) continue;
    const key = `${debit.amount}|${debit.merchant.toLowerCase()}`;
    const bucket = debitsByKey.get(key);
    if (bucket) bucket.push(debit);
    else debitsByKey.set(key, [debit]);
  }
  for (const credit of credits) {
    if (!credit.merchant) continue;
    const bucket = debitsByKey.get(`${credit.amount}|${credit.merchant.toLowerCase()}`);
    if (!bucket) continue;
    let best: TxRecord | null = null;
    for (const debit of bucket) {
      if (usedDebit.has(debit.id)) continue;
      const gap = credit.timestamp - debit.timestamp;
      if (gap < 0 || gap > 30 * DAY_MS) continue;
      if (!best || debit.timestamp > best.timestamp) best = debit;
    }
    if (best) {
      pairs.push([best.id, credit.id]);
      usedDebit.add(best.id);
    }
  }
  return pairs;
}

/**
 * R1: ids that should be flagged recurring=1. Groups debit-type transactions by merchant
 * (case-insensitive, trimmed). Within a merchant group, any adjacent pair (sorted by timestamp)
 * with amount within ±5% and a 25–35 day gap marks BOTH members of that pair as recurring.
 */
export function computeRecurringIds(txs: TxRecord[]): number[] {
  const groups = new Map<string, TxRecord[]>();
  for (const tx of txs) {
    if (!tx.merchant || tx.isSplitChild || !isDebitType(tx.type)) continue;
    const key = tx.merchant.trim().toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(tx);
  }
  const result = new Set<number>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const sorted = [...group].sort((a, b) => a.timestamp - b.timestamp);
    // Two ways to qualify (tightened after device testing flagged too many false
    // positives from ordinary repeat purchases):
    //  - a chain of >=2 consecutive monthly-ish gaps (i.e. >=3 occurrences), amounts within 5%
    //  - a single gap, but only with IDENTICAL amounts and a tight 28-32 day gap
    const qualifying: Array<[TxRecord, TxRecord]> = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const cur = sorted[i];
      const amountDiff = Math.abs(cur.amount - prev.amount) / prev.amount;
      const gapDays = (cur.timestamp - prev.timestamp) / DAY_MS;
      if (amountDiff <= 0.05 && gapDays >= 25 && gapDays <= 35) {
        qualifying.push([prev, cur]);
      }
    }
    if (qualifying.length >= 2) {
      for (const [a, b] of qualifying) {
        result.add(a.id);
        result.add(b.id);
      }
    } else if (qualifying.length === 1) {
      const [a, b] = qualifying[0];
      const gapDays = (b.timestamp - a.timestamp) / DAY_MS;
      if (a.amount === b.amount && gapDays >= 28 && gapDays <= 32) {
        result.add(a.id);
        result.add(b.id);
      }
    }
  }
  return Array.from(result);
}

/**
 * T13: same amount + same SMS sender within 60 seconds → duplicate.
 * When both sides carry a reference (RRN/UTR/UPI ref), that's authoritative: a mismatch
 * means these are two *different* real transactions (e.g. two same-amount transfers to
 * the same bank within a minute of each other while testing) even though the amount/sender/
 * time heuristic alone would say "duplicate" — so a differing reference short-circuits to
 * false. A matching reference short-circuits to true regardless of the 60s window.
 */
export function isDuplicateSms(
  prev: { amount: number; sender: string; timestamp: number; reference?: string | null } | null,
  next: { amount: number; sender: string; timestamp: number; reference?: string | null },
): boolean {
  if (!prev) return false;
  if (prev.reference && next.reference) {
    return prev.reference === next.reference;
  }
  if (prev.amount !== next.amount) return false;
  if (prev.sender !== next.sender) return false;
  return Math.abs(next.timestamp - prev.timestamp) <= 60_000;
}

/**
 * THE canonical totals filter (contract §3). Excludes settled links and self-transfers.
 * Refund credits are NOT excluded here — the caller nets them against expense (see Task 6).
 */
export function countsTowardTotals(tx: TxRecord): boolean {
  if (tx.linkSettled) return false;
  if (tx.linkType === 'self_transfer') return false;
  return true;
}
