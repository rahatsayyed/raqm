import { requireNativeModule } from 'expo-modules-core';
import type { SmsMessage } from './SmsReader.types';

const native = requireNativeModule('SmsReader');

export function readInbox(fromTimestamp: number, toTimestamp: number): Promise<SmsMessage[]> {
  return native.readInbox(fromTimestamp, toTimestamp);
}

export function getEarliestMessageDate(): Promise<number> {
  return native.getEarliestMessageDate();
}

export function openNotificationListenerSettings(): void {
  native.openNotificationListenerSettings();
}

/** Appends the Category, Add note, and Not An Expense/Income actions to an already-posted tx
 * notification, all handled natively (no JS/RN engine boot required) — see the native module. */
export function attachTxActions(notificationId: string, txId: number, notExpenseLabel: string): void {
  native.attachTxActions(notificationId, txId, notExpenseLabel);
}
