import { Platform } from 'react-native';
import * as SmsReaderModule from '../../modules/sms-reader/src/SmsReaderModule';

export type { SmsMessage } from '../../modules/sms-reader/src/SmsReader.types';

export const SmsReader = {
  readInbox(fromTimestamp: number, toTimestamp: number) {
    if (Platform.OS !== 'android') return Promise.resolve([]);
    return SmsReaderModule.readInbox(fromTimestamp, toTimestamp);
  },

  openNotificationListenerSettings(): void {
    if (Platform.OS !== 'android') return;
    SmsReaderModule.openNotificationListenerSettings();
  },
};
