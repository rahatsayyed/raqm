import { SmsReader } from '../native/SmsReader';
import { BankParserFactory } from '@rahatsayyed/bank-sms-parser';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';
import { insertParsedTxs, getScannedIdentitiesSince } from '../db/database';
import { useTxStore } from '../store/txStore';
import { runDetectionJobs } from './txIntelligence';
import { logEvent } from './logger';

export interface RescanResult {
  found: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const BUTTON_WINDOW_MS = 30 * DAY_MS; // More → Re-scan

// Serialize scan operations so two scans can't interleave their read→insert windows.
let scanInFlight: Promise<RescanResult> | null = null;

function serialize(op: () => Promise<RescanResult>): Promise<RescanResult> {
  const run = (scanInFlight ?? Promise.resolve(null)).catch(() => null).then(op);
  scanInFlight = run;
  // .finally() returns a new derived promise that also rejects when `run` does; it's used
  // here only for bookkeeping and isn't awaited, so an unhandled rejection would otherwise
  // fire on every failed scan even though the real rejection is already handled by whoever
  // awaits the returned `run` below.
  run.finally(() => {
    if (scanInFlight === run) scanInFlight = null;
  }).catch(() => {});
  return run;
}

/**
 * Missing-only scan core: reads the inbox over [from, to], parses bank SMS (S5 filter),
 * and inserts ONLY transactions whose identity (`bankName|amount|smsTimestamp`) exists in
 * no row at all — live OR soft-deleted. Never clears, never touches existing rows, so user
 * categories, notes, tags, links, and deletions all survive every scan.
 */
async function scanMissing(from: number, to: number = Date.now()): Promise<RescanResult> {
  logEvent('rescan.start');
  try {
    const [messages, seen] = await Promise.all([
      SmsReader.readInbox(from, to),
      getScannedIdentitiesSince(from),
    ]);

    const parsed: ParsedTransaction[] = [];
    for (const msg of messages) {
      if (!BankParserFactory.isKnownBankSender(msg.sender)) continue; // S5
      const tx = BankParserFactory.parse(msg.body, msg.sender, msg.timestamp);
      if (!tx) continue;
      const identity = `${tx.bankName}|${tx.amount}|${tx.timestamp}`;
      if (seen.has(identity)) continue; // already present (or user-deleted) — skip
      seen.add(identity); // also dedupes repeats within this batch
      parsed.push(tx);
    }

    if (parsed.length > 0) {
      await insertParsedTxs(parsed);
      await runDetectionJobs();
    }
    // Refresh even when nothing new was found so a pull still syncs any external DB changes.
    await useTxStore.getState().refresh();

    logEvent('rescan.done');
    return { found: parsed.length };
  } catch (e) {
    logEvent('rescan.failed', e instanceof Error ? e.message : String(e));
    throw e; // preserve existing behavior — callers still see the rejection
  }
}

/**
 * More → Re-scan SMS: fill in any missing transactions from the last 30 days (S4).
 * Non-destructive — this used to clear and rebuild all scanned rows; it no longer does.
 */
export function rescanTransactions(
  onProgress?: (count: number) => void,
): Promise<RescanResult> {
  return serialize(async () => {
    const result = await scanMissing(Date.now() - BUTTON_WINDOW_MS);
    onProgress?.(result.found);
    return result;
  });
}

/** More → Re-scan SMS with a user-picked [from, to] range. */
export function rescanTransactionsRange(
  from: number,
  to: number,
  onProgress?: (count: number) => void,
): Promise<RescanResult> {
  return serialize(async () => {
    const result = await scanMissing(from, to);
    onProgress?.(result.found);
    return result;
  });
}
