import { NativeModules, Platform } from 'react-native';

export interface SmsMessage {
  body: string;
  sender: string;
  timestamp: number;
}

const { SmsReaderModule } = NativeModules;

export const SmsReader = {
  readInbox(fromTimestamp: number, toTimestamp: number): Promise<SmsMessage[]> {
    if (Platform.OS !== 'android' || !SmsReaderModule) return Promise.resolve([]);
    return SmsReaderModule.readInbox(fromTimestamp, toTimestamp);
  },

  openNotificationListenerSettings(): void {
    if (Platform.OS !== 'android' || !SmsReaderModule) return;
    SmsReaderModule.openNotificationListenerSettings();
  },
};
