import { BankParserFactory, TransactionType } from '@rahatsayyed/bank-sms-parser';
import { useTxStore } from '../store/txStore';
import { postTxNotification, cancelTxNotification } from '../notifications/notifications';
import { SmsReader } from '../native/SmsReader';
import { accountLabel } from '../utils/accountLabel';
import { linkTxs } from '../db/database';
import { pairSelfTransfers } from './txIntelligence';
import { Colors } from '../theme';

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
  if (!tx) return null;

  const id = await useTxStore.getState().addParsedWithLocation(tx);
  if (id === null) return null; // duplicate, reference-duplicate, or a hidden account — see insertParsedTx

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
      SmsReader.addCategoryAction(selfTransferNotificationId, debitId);
    }

    return { id, merchant: tx.merchant ?? null, bankLabel, amount: tx.amount, isDebit: debit };
  }

  const sign = debit ? '-' : '+';
  const amountStr = `₹${tx.amount.toLocaleString('en-IN')}`;
  const action = debit ? 'debited' : 'credited';
  const notifTitle = tx.merchant
    ? debit
      ? `${amountStr} at ${tx.merchant}`
      : `${amountStr} ${tx.merchant} ${action}`
    : `${amountStr} ${action}`;
  const notifBody =
    tx.balance != null
      ? `₹${tx.balance.toLocaleString('en-IN')} available balance in ${bankLabel}`
      : `${sign}${amountStr} · ${bankLabel}`;
  const notificationId = await postTxNotification(id, notifTitle, notifBody, notificationColorFor(debit), !debit);
  SmsReader.addCategoryAction(notificationId, id);
  prunePendingLegNotifications();
  pendingLegNotifications.set(id, { notificationId, timestamp: Date.now() });

  return { id, merchant: tx.merchant ?? null, bankLabel, amount: tx.amount, isDebit: debit };
}
