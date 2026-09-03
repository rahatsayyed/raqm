import { BankParserFactory, TransactionType } from '@rahatsayyed/bank-sms-parser';
import { useTxStore } from '../store/txStore';
import { postTxNotification, cancelTxNotification } from '../notifications/notifications';
import { SmsReader } from '../native/SmsReader';
import { accountLabel } from '../utils/accountLabel';
import { getCategories, linkTxs } from '../db/database';
import { pairSelfTransfers } from './txIntelligence';
import { Colors } from '../theme';
import { logEvent } from './logger';

const SELF_TRANSFER_COLOR = Colors.mossStructure;

function notificationColorFor(debit: boolean): string {
  return debit ? Colors.errorMuted : Colors.primary;
}

export interface ProcessedSms {
  id: number;
  merchant: string | null;
  bankLabel: string;
  amount: number;
  isDebit: boolean;
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

// Tracks the notification posted for each not-yet-linked live transaction, so that when its
// self-transfer partner leg arrives moments later we can cancel the first leg's standalone
// notification and replace both with a single combined one. In-memory only — if the process
// gets killed between legs this simply degrades to two individual notifications (the pair
// still gets linked correctly by the next rescan/app-start run of runDetectionJobs).
const pendingLegNotifications = new Map<number, { notificationId: string; timestamp: number }>();
const PENDING_LEG_TTL_MS = 24 * 60 * 60 * 1000; // matches pairSelfTransfers' own pairing window

function prunePendingLegNotifications(): void {
  const cutoff = Date.now() - PENDING_LEG_TTL_MS;
  for (const [id, entry] of pendingLegNotifications) {
    if (entry.timestamp < cutoff) pendingLegNotifications.delete(id);
  }
}

/**
 * Single entry point for turning an incoming bank SMS into a stored transaction + system
 * notification. Invoked exclusively from the "SmsBackgroundTask" headless JS task
 * (registered in index.ts) that HeadlessSmsTaskService starts natively on every SMS_RECEIVED
 * broadcast — the only reliable path once Android has killed the app's process. When the
 * app's JS instance is already running, React Native reuses it rather than booting a
 * second one, so this is also the sole processing path when the app is alive; there is no
 * separate "live" listener anymore (see SmsBroadcastReceiver.kt for why that was retired).
 */
export async function processIncomingSms(data: { body: string; sender: string; timestamp: number }): Promise<ProcessedSms | null> {
  const tx = BankParserFactory.parse(data.body, data.sender, data.timestamp);
  logEvent('sms.parsed', tx ? `success bank=${tx.bankName} type=${tx.type}` : 'failed');
  if (!tx) return null;

  const id = await useTxStore.getState().addParsedWithLocation(tx);
  if (id === null) return null; // duplicate, reference-duplicate, or a hidden account — see insertParsedTx
  logEvent('tx.inserted', `txId=${id}`);

  const debit = isDebit(tx.type);
  const labels = useTxStore.getState().accountLabels;
  const bankLabel = accountLabel(tx.bankName, tx.accountLast4 ?? null, labels);

  // Check whether this new leg immediately completes a self-transfer pair with an already-seen,
  // still-unlinked transaction (the common case: debit-from-bank-A and credit-to-bank-B SMS for
  // the same UPI transfer usually arrive seconds apart). If so, link them now rather than waiting
  // for the next rescan, and collapse both notifications into one.
  const txs = useTxStore.getState().txs;
  const pair = pairSelfTransfers(txs).find(([a, b]) => a === id || b === id);

  if (pair) {
    const [debitId, creditId] = pair;
    await linkTxs(debitId, creditId, 'self_transfer');
    await useTxStore.getState().refresh();

    const partnerId = debitId === id ? creditId : debitId;
    const pendingPartner = pendingLegNotifications.get(partnerId);
    if (pendingPartner) {
      await cancelTxNotification(pendingPartner.notificationId).catch(() => {});
      pendingLegNotifications.delete(partnerId);
    }
    pendingLegNotifications.delete(id);

    const refreshedTxs = useTxStore.getState().txs;
    const debitTx = refreshedTxs.find(t => t.id === debitId);
    const creditTx = refreshedTxs.find(t => t.id === creditId);
    if (debitTx && creditTx) {
      const fromLabel = accountLabel(debitTx.bankName, debitTx.accountLast4, labels);
      const toLabel = accountLabel(creditTx.bankName, creditTx.accountLast4, labels);
      const amount = `₹${debitTx.amount.toLocaleString('en-IN')}`;
      const selfTransferNotificationId = await postTxNotification(
        debitId,
        'Self-transfer',
        `${amount} transferred from ${fromLabel} to ${toLabel}`,
        SELF_TRANSFER_COLOR,
      );
      logEvent('notif.posted', `txId=${id}`);
      SmsReader.attachTxActions(selfTransferNotificationId, debitId, 'Not An Expense');
    }

    return { id, merchant: tx.merchant ?? null, bankLabel, amount: tx.amount, isDebit: debit };
  }

  const amountStr = `₹${tx.amount.toLocaleString('en-IN')}`;
  const action = debit ? 'debited' : 'credited';
  const notifTitle = tx.merchant
    ? debit
      ? `${amountStr} at ${tx.merchant}`
      : `${amountStr} ${tx.merchant} ${action}`
    : `${amountStr} ${action}`;
  // Always "Bank • Category" — never the raw sign/amount line — so the body matches what
  // NotificationBodySync.kt rebuilds after the user picks a category or adds a note from the
  // notification itself (see that file's refreshTxNotificationBody). Category is never left
  // blank: a transaction with no category_id yet reads as "Uncategorized", matching the native
  // side's fallback. A note is deliberately NOT shown here — it only appears once the user adds
  // one from the notification, at which point refreshTxNotificationBody appends it.
  const insertedTx = useTxStore.getState().txs.find((t) => t.id === id);
  let categoryName = 'Uncategorized';
  if (insertedTx?.categoryId != null) {
    const categories = await getCategories();
    categoryName = categories.find((c) => c.id === insertedTx.categoryId)?.name ?? 'Uncategorized';
  }
  const notifBody = `${bankLabel} • ${categoryName}`;
  const notificationId = await postTxNotification(id, notifTitle, notifBody, notificationColorFor(debit));
  logEvent('notif.posted', `txId=${id}`);
  SmsReader.attachTxActions(notificationId, id, debit ? 'Not An Expense' : 'Not An Income');
  prunePendingLegNotifications();
  pendingLegNotifications.set(id, { notificationId, timestamp: Date.now() });

  return { id, merchant: tx.merchant ?? null, bankLabel, amount: tx.amount, isDebit: debit };
}
