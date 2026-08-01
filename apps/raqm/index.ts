import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import type { NotificationResponse } from 'expo-notifications';

import App from './App';
import { processIncomingSms } from './src/services/smsProcessing';
import { handleBackgroundAction, BACKGROUND_NOTIFICATION_TASK } from './src/notifications/notifications';

// Registered regardless of whether any screen is mounted — HeadlessSmsTaskService (native,
// modules/sms-reader) starts this task on every incoming SMS, including when Android has
// killed the app process entirely. See smsProcessing.ts and SmsBroadcastReceiver.kt.
AppRegistry.registerHeadlessTask('SmsBackgroundTask', () => async (data: { body: string; sender: string; timestamp: number }) => {
  await processIncomingSms(data);
});

// Must be defined at module scope so it runs as soon as expo-task-manager boots this JS
// bundle headlessly — including when the app process was fully killed and the user tapped
// 'Add note' or 'Not An Expense' on a notification. Registered with expo-notifications via
// registerTaskAsync() in notifications.ts's initNotifications(). Without this, those two
// background actions only ever reached JS if the app process happened to still be alive.
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data }) => {
  if (data && typeof data === 'object' && 'actionIdentifier' in data) {
    await handleBackgroundAction(data as unknown as NotificationResponse);
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
