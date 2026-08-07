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

/** Appends a "Category" action to an already-posted tx notification whose PendingIntent opens
 * CategoryPickerActivity directly, bypassing MainActivity entirely — see the native module. */
export function addCategoryAction(notificationId: string, txId: number): void {
  native.addCategoryAction(notificationId, txId);
}
