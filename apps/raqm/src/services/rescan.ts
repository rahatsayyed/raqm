import { SmsReader } from '../native/SmsReader';
import { BankParserFactory } from '@rahatsayyed/bank-sms-parser';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';
import { clearScannedTransactions, insertParsedTxs, getNewestScannedTimestamp } from '../db/database';
import { useTxStore } from '../store/txStore';
import { runDetectionJobs } from './txIntelligence';
import { useOnboardingStore, dateRangeToTimestamps } from '../store/onboardingStore';

export interface RescanResult {
  found: number;
}

// Serialize scan operations: a pull-to-refresh interleaving with a full rescan's
// clear→insert window could wipe freshly-added rows or duplicate them.
let scanInFlight: Promise<RescanResult> | null = null;

function serialize(op: () => Promise<RescanResult>): Promise<RescanResult> {
  const run = (scanInFlight ?? Promise.resolve(null)).catch(() => null).then(op);
  scanInFlight = run;
  run.finally(() => {
    if (scanInFlight === run) scanInFlight = null;
  });
  return run;
}

/**
 * Re-reads the SMS inbox over the currently-configured onboarding date range (S4), filters to
 * known bank senders (S5), parses, replaces all previously-scanned (is_manual = 0) transactions
 * with the fresh set, then reruns Plan 3's detection jobs. Manually added transactions are never
 * touched. See Task 3 notes in the Plan 7 doc for the category/notes-loss caveat.
 */
export function rescanTransactions(
  onProgress?: (count: number) => void,
): Promise<RescanResult> {
  return serialize(() => rescanTransactionsInner(onProgress));
}

async function rescanTransactionsInner(
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

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Pull-to-refresh scan: reads only SMS NEWER than the newest scanned transaction and
 * appends parsed results. Non-destructive — never clears rows, so user edits, categories,
 * and links on existing transactions survive (unlike the full rescanTransactions above).
 * Falls back to the last 30 days when nothing has been scanned yet.
 */
export function incrementalScan(): Promise<RescanResult> {
  return serialize(incrementalScanInner);
}

async function incrementalScanInner(): Promise<RescanResult> {
  // DB max INCLUDING soft-deleted rows — the store excludes them, and using the store's
  // max could resurrect an SMS the user deleted.
  const newestScanned = await getNewestScannedTimestamp();
  const from = newestScanned != null ? newestScanned + 1 : Date.now() - THIRTY_DAYS_MS;

  const messages = await SmsReader.readInbox(from, Date.now());

  // Guard against the live-SMS listener inserting the same message mid-pull:
  // skip anything already present (same bank + amount + SMS timestamp).
  const existing = new Set(
    useTxStore.getState().txs.map(t => `${t.bankName}|${t.amount}|${t.timestamp}`),
  );

  const parsed: ParsedTransaction[] = [];
  for (const msg of messages) {
    if (!BankParserFactory.isKnownBankSender(msg.sender)) continue; // S5
    const tx = BankParserFactory.parse(msg.body, msg.sender, msg.timestamp);
    if (tx && !existing.has(`${tx.bankName}|${tx.amount}|${tx.timestamp}`)) parsed.push(tx);
  }

  if (parsed.length > 0) {
    await insertParsedTxs(parsed);
    await runDetectionJobs();
  }
  // Refresh even when nothing new was found so a pull still syncs any external DB changes.
  await useTxStore.getState().refresh();

  return { found: parsed.length };
}
