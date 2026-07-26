import { loadTxRecords, linkTxs, updateTx } from '../db/database';
import { pairSelfTransfers, pairRefunds, computeRecurringIds } from './txIntelligenceCore';

export {
  pairSelfTransfers,
  pairRefunds,
  computeRecurringIds,
  isDuplicateSms,
  countsTowardTotals,
  isCreditType,
} from './txIntelligenceCore';

/** T11 */
export async function detectSelfTransfers(): Promise<number> {
  const txs = await loadTxRecords();
  const pairs = pairSelfTransfers(txs);
  for (const [a, b] of pairs) {
    await linkTxs(a, b, 'self_transfer');
  }
  return pairs.length;
}

/** T12 */
export async function detectRefunds(): Promise<number> {
  const txs = await loadTxRecords();
  const pairs = pairRefunds(txs);
  for (const [a, b] of pairs) {
    await linkTxs(a, b, 'refund');
  }
  return pairs.length;
}

/** R1 */
export async function detectSubscriptions(): Promise<number> {
  const txs = await loadTxRecords();
  const ids = computeRecurringIds(txs);
  for (const id of ids) {
    await updateTx(id, { recurring: true });
  }
  return ids.length;
}

/** Runs all three jobs. Called after scan/rescan and once on app start (contract §3). */
export async function runDetectionJobs(): Promise<void> {
  await detectSelfTransfers();
  await detectRefunds();
  await detectSubscriptions();
}
