import { requireNativeModule, EventSubscription } from 'expo-modules-core';
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

export function addNewSmsListener(
  listener: (event: SmsMessage) => void,
): EventSubscription {
  return native.addListener('onNewSms', listener);
}
