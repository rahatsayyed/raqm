import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import {
  loadTxRecords,
  updateTx,
  softDeleteTx,
  getCategoryRuleForMerchant,
  getWordMatchCategoryForMerchant,
  getMerchantPrivacyRules,
  isMerchantHidden,
  matchesPattern,
  amountMatchesThreshold,
  getCategoryIdByName,
} from '../db/database';
import { useTxStore } from '../store/txStore';

// Serialized the same way rescan.ts serializes scans, so a rule reapply can't race a
// scan or another reapply and interleave writes.
let reapplyInFlight: Promise<unknown> | null = null;

function serialize<T>(op: () => Promise<T>): Promise<T> {
  const run = (reapplyInFlight ?? Promise.resolve(null)).catch(() => null).then(op);
  reapplyInFlight = run;
  run.finally(() => {
    if (reapplyInFlight === run) reapplyInFlight = null;
  }).catch(() => {});
  return run;
}

/**
 * Re-categorizes existing transactions whose merchant matches a Word Match pattern and
 * currently has no exact `category_rules` override (that always wins — see spec).
 */
export function reapplyWordMatchRule(
  pattern: string,
  categoryId: number,
  subcategoryId: number | null,
): Promise<number> {
  return serialize(async () => {
    const txs = await loadTxRecords();
    let count = 0;
    for (const tx of txs) {
      if (tx.deletedAt || !tx.merchant || !matchesPattern(pattern, tx.merchant)) continue;
      const exactRule = await getCategoryRuleForMerchant(tx.merchant);
      if (exactRule) continue; // exact rule always wins, never overwritten by Word Match
      await updateTx(tx.id, { categoryId, subcategoryId });
      count++;
    }
    await useTxStore.getState().refresh();
    return count;
  });
}

export function reapplyAmountMaskRule(): Promise<void> {
  return serialize(async () => {
    await useTxStore.getState().refresh();
  });
}

export function reapplyAmountTransferRule(threshold: number): Promise<number> {
  return serialize(async () => {
    const txs = await loadTxRecords();
    let count = 0;
    for (const tx of txs) {
      if (tx.deletedAt || tx.type === TransactionType.TRANSFER) continue;
      if (!amountMatchesThreshold(tx.amount, threshold, 'above')) continue;
      const categoryId = tx.categoryId ?? (await getCategoryIdByName('Transfer'));
      await updateTx(tx.id, { type: TransactionType.TRANSFER, categoryId });
      count++;
    }
    await useTxStore.getState().refresh();
    return count;
  });
}

export function reapplyHideMerchantRule(pattern: string): Promise<number> {
  return serialize(async () => {
    const txs = await loadTxRecords();
    let count = 0;
    for (const tx of txs) {
      if (tx.deletedAt || !matchesPattern(pattern, tx.merchant)) continue;
      await softDeleteTx(tx.id);
      count++;
    }
    await useTxStore.getState().refresh();
    return count;
  });
}

export function reapplyExcludeFromBudgetRule(): Promise<void> {
  return serialize(async () => {
    await useTxStore.getState().refresh();
  });
}
