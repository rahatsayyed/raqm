import { BankParserFactory } from '@rahatsayyed/bank-sms-parser';
import { useTxStore } from '../store/txStore';
import { accountLabel } from '../utils/accountLabel';
import {
  getMonitoredNotificationPackages,
  getNotificationSourceEnabled,
  recordUnsupportedNotification,
} from '../db/database';
import { postParsedTxNotification } from './smsProcessing';
import { logEvent } from './logger';

export interface IncomingNotification {
  packageName: string;
  title: string;
  text: string;
  timestamp: number;
}

/**
 * Single entry point for turning one captured bank/UPI app notification into a stored
 * transaction. Invoked exclusively from the "NotificationBackgroundTask" headless JS task
 * (registered in index.ts), started by RaqmNotificationListenerService via
 * HeadlessSmsTaskService — the same plumbing the SMS path uses, so this works with the
 * app killed.
 *
 * Returns the new transaction's id, or null when nothing was stored: feature off, app not
 * monitored, no parser match (queued for reporting instead), or a cross-source duplicate
 * of an SMS Raqm already has.
 */
export async function processIncomingNotification(
  data: IncomingNotification,
): Promise<number | null> {
  // Defence in depth — native already filters by the monitored set, but the two stores
  // (SharedPreferences and app_settings) can drift if a write failed, and the master
  // toggle lives only on the JS side.
  if (!(await getNotificationSourceEnabled())) return null;
  const monitored = await getMonitoredNotificationPackages();
  if (!monitored.includes(data.packageName)) return null;

  // Parsers anchor on a single line, and different apps put the transaction sentence in
  // different places (GPay in the title, PhonePe in the text). Try each separately rather
  // than concatenating, which would break the anchors.
  const candidates = [data.text, data.title].map((s) => s.trim()).filter((s) => s.length > 0);
  let tx = null;
  for (const candidate of candidates) {
    tx = BankParserFactory.parse(candidate, data.packageName, data.timestamp);
    if (tx) break;
  }

  if (!tx) {
    logEvent('notifsrc.parsed', `failed pkg=${data.packageName}`);
    const appName =
      BankParserFactory.getParser(data.packageName)?.getBankName() ?? data.packageName;
    await recordUnsupportedNotification({
      packageName: data.packageName,
      appName,
      title: data.title,
      text: data.text,
      timestamp: data.timestamp,
    });
    return null;
  }

  logEvent('notifsrc.parsed', `success app=${tx.bankName} type=${tx.type}`);

  const id = await useTxStore.getState().addParsedWithLocation(tx, 'notification');
  if (id === null) return null; // duplicate (incl. cross-source), or a hidden account
  logEvent('tx.inserted', `txId=${id} source=notification`);

  const labels = useTxStore.getState().accountLabels;
  const bankLabel = accountLabel(tx.bankName, tx.accountLast4 ?? null, labels);
  await postParsedTxNotification(id, tx, bankLabel);

  return id;
}
