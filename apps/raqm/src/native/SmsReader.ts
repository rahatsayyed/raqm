import { Platform } from 'react-native';
import type { EventSubscription } from 'expo-modules-core';
import * as SmsReaderModule from '../../modules/sms-reader/src/SmsReaderModule';

export type { SmsMessage } from '../../modules/sms-reader/src/SmsReader.types';

const noop: EventSubscription = { remove: () => {} };

export const SmsReader = {
  readInbox(fromTimestamp: number, toTimestamp: number) {
    if (Platform.OS !== 'android') return Promise.resolve([]);
    return SmsReaderModule.readInbox(fromTimestamp, toTimestamp);
  },

  getEarliestMessageDate(): Promise<number> {
    if (Platform.OS !== 'android') return Promise.resolve(0);
    return SmsReaderModule.getEarliestMessageDate();
  },

  openNotificationListenerSettings(): void {
    if (Platform.OS !== 'android') return;
    SmsReaderModule.openNotificationListenerSettings();
  },

  addNewSmsListener(
    listener: (event: { body: string; sender: string; timestamp: number }) => void,
  ): EventSubscription {
    if (Platform.OS !== 'android') return noop;
    return SmsReaderModule.addNewSmsListener(listener);
  },
};
