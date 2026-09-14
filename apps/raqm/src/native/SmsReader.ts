import { Platform } from 'react-native';
import type { EventSubscription } from 'expo-modules-core';
import * as SmsReaderModule from '../../modules/sms-reader/src/SmsReaderModule';

export type { SmsMessage, InstalledApp } from '../../modules/sms-reader/src/SmsReader.types';

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

  /** Builds and posts the tx notification with all three actions attached from the first
   * post — see SmsReaderModule.postTxNotification. Returns the notification's id. */
  postTxNotification(
    title: string,
    body: string,
    color: string | undefined,
    txId: number,
    notExpenseLabel: string,
  ): Promise<string> {
    if (Platform.OS !== 'android') return Promise.resolve('');
    return SmsReaderModule.postTxNotification(title, body, color, txId, notExpenseLabel);
  },

  cancelTxNotification(notificationId: string): Promise<void> {
    if (Platform.OS !== 'android') return Promise.resolve();
    return SmsReaderModule.cancelTxNotification(notificationId);
  },

  /** Absolute filesystem path to the native diagnostic log file (native.log). */
  getNativeLogPath(): Promise<string> {
    if (Platform.OS !== 'android') return Promise.resolve('');
    return SmsReaderModule.getNativeLogPath();
  },

  /** Subscribes to the native "screenLocked" event (Android ACTION_SCREEN_OFF). Returns a
   * no-op subscription on non-Android platforms. */
  addScreenLockedListener(listener: () => void): EventSubscription | { remove: () => void } {
    if (Platform.OS !== 'android') return { remove: () => {} };
    return SmsReaderModule.addScreenLockedListener(listener);
  },

  isNotificationListenerEnabled(): boolean {
    if (Platform.OS !== 'android') return false;
    return SmsReaderModule.isNotificationListenerEnabled();
  },

  setMonitoredNotificationPackages(packages: string[]): Promise<void> {
    if (Platform.OS !== 'android') return Promise.resolve();
    return SmsReaderModule.setMonitoredNotificationPackages(packages);
  },

  getInstalledApps() {
    if (Platform.OS !== 'android') return Promise.resolve([]);
    return SmsReaderModule.getInstalledApps();
  },

  /** Mirrors month_start_day into native SharedPreferences for the home-screen widgets. */
  setMonthStartDay(day: number): Promise<void> {
    if (Platform.OS !== 'android') return Promise.resolve();
    return SmsReaderModule.setMonthStartDay(day);
  },
};
