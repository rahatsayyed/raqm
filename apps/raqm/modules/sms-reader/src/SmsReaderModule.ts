import { requireNativeModule } from 'expo-modules-core';
import type { SmsMessage } from './SmsReader.types';

const native = requireNativeModule('SmsReader');

export function readInbox(fromTimestamp: number, toTimestamp: number): Promise<SmsMessage[]> {
  return native.readInbox(fromTimestamp, toTimestamp);
}

export function openNotificationListenerSettings(): void {
  native.openNotificationListenerSettings();
}
