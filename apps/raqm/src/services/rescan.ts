import { SmsReader } from '../native/SmsReader';
import { BankParserFactory } from '@rahatsayyed/bank-sms-parser';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';
import { clearScannedTransactions, insertParsedTxs } from '../db/database';
import { useTxStore } from '../store/txStore';
import { runDetectionJobs } from './txIntelligence';
import { useOnboardingStore, dateRangeToTimestamps } from '../store/onboardingStore';

export interface RescanResult {
  found: number;
}

/**
 * Re-reads the SMS inbox over the currently-configured onboarding date range (S4), filters to
 * known bank senders (S5), parses, replaces all previously-scanned (is_manual = 0) transactions
 * with the fresh set, then reruns Plan 3's detection jobs. Manually added transactions are never
 * touched. See Task 3 notes in the Plan 7 doc for the category/notes-loss caveat.
 */
export async function rescanTransactions(
  onProgress?: (count: number) => void,
): Promise<RescanResult> {
  const { dateRange, customFrom, customTo } = useOnboardingStore.getState();
  const { from, to } = dateRangeToTimestamps(dateRange, customFrom, customTo);

  const messages = await SmsReader.readInbox(from, to);
  const knownSenderMessages = messages.filter(m => BankParserFactory.isKnownBankSender(m.sender));

  const parsed: ParsedTransaction[] = [];
  for (const msg of knownSenderMessages) {
    const tx = BankParserFactory.parse(msg.body, msg.sender, msg.timestamp);
    if (tx) parsed.push(tx);
  }

  onProgress?.(parsed.length);

  // Batched, categorizing insert (single BEGIN/COMMIT) — a mid-flight failure rolls the
  // insert back rather than leaving a half-reinserted table after the clear.
  await clearScannedTransactions();
  await insertParsedTxs(parsed);

  // Detection writes link/recurring flags directly to the DB, so it must run BEFORE the
  // store refresh (same ordering as AppNavigator) or the UI shows stale rows.
  await runDetectionJobs();
  await useTxStore.getState().refresh();

  return { found: parsed.length };
}
