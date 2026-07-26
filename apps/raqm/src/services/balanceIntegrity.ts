import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import type { TxRecord } from '../db/database';

export interface BalanceMismatch {
  /** Stable identity for this specific mismatch (bank+last4+txId) — used for dismiss persistence. */
  key: string;
  bankName: string;
  last4: string | null;
  currency: string;
  txId: number;
  timestamp: number;
  expected: number;
  actual: number;
  diff: number;
}

// Tolerance for rounding/fee noise in bank-reported balances.
const EPSILON = 1;

function signedDelta(tx: TxRecord): number {
  if (tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT) return tx.amount;
  if (tx.type === TransactionType.EXPENSE || tx.type === TransactionType.TRANSFER || tx.type === TransactionType.INVESTMENT) return -tx.amount;
  return 0; // BALANCE_UPDATE (manual correction) and anything else has no ledger impact of its own
}

/**
 * Detects gaps between the balance we'd expect from summing raw transaction amounts and
 * the balance banks actually report — usually caused by a missed/unsupported SMS (see
 * "Report undetected SMS"). Runs a single timestamp-sorted pass per account, resyncing
 * to the bank-reported balance at every checkpoint so one gap doesn't cascade into
 * repeated false positives. O(n log n) for the sort, O(n) for the scan.
 */
export function detectBalanceMismatches(txs: TxRecord[]): BalanceMismatch[] {
  const byAccount = new Map<string, TxRecord[]>();
  for (const tx of txs) {
    if (tx.deletedAt != null || tx.isFromCard) continue;
    const key = `${tx.bankName}|${tx.accountLast4 ?? ''}`;
    const list = byAccount.get(key);
    if (list) list.push(tx);
    else byAccount.set(key, [tx]);
  }

  const mismatches: BalanceMismatch[] = [];
  for (const list of byAccount.values()) {
    list.sort((a, b) => a.timestamp - b.timestamp);
    let runningExpected: number | null = null;
    for (const tx of list) {
      const candidate: number | null = runningExpected != null ? runningExpected + signedDelta(tx) : null;
      if (tx.balance != null) {
        if (candidate != null && Math.abs(tx.balance - candidate) > EPSILON) {
          mismatches.push({
            key: `${tx.bankName}|${tx.accountLast4 ?? ''}|${tx.id}`,
            bankName: tx.bankName,
            last4: tx.accountLast4,
            currency: tx.currency,
            txId: tx.id,
            timestamp: tx.timestamp,
            expected: candidate,
            actual: tx.balance,
            diff: tx.balance - candidate,
          });
        }
        runningExpected = tx.balance;
      } else {
        runningExpected = candidate;
      }
    }
  }

  return mismatches.sort((a, b) => b.timestamp - a.timestamp);
}
