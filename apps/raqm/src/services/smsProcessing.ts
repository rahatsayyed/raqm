import { BankParserFactory, TransactionType } from '@rahatsayyed/bank-sms-parser';
import { useTxStore } from '../store/txStore';
import { postTxNotification } from '../notifications/notifications';
import { accountLabel } from '../utils/accountLabel';

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

  const bankLabel = accountLabel(tx.bankName, tx.accountLast4 ?? null, useTxStore.getState().accountLabels);
  const debit = isDebit(tx.type);
  const sign = debit ? '-' : '+';
  const notifBody = tx.merchant
    ? `${sign}₹${tx.amount.toLocaleString('en-IN')} · ${tx.merchant}`
    : `${sign}₹${tx.amount.toLocaleString('en-IN')} · ${bankLabel}`;
  await postTxNotification(id, tx.merchant ? 'New transaction' : `New transaction from ${bankLabel}`, notifBody);

  return { id, merchant: tx.merchant ?? null, bankLabel, amount: tx.amount, isDebit: debit };
}
