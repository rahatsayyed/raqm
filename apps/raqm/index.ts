import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';

import App from './App';
import { processIncomingSms } from './src/services/smsProcessing';

// Registered regardless of whether any screen is mounted — HeadlessSmsTaskService (native,
// modules/sms-reader) starts this task on every incoming SMS, including when Android has
// killed the app process entirely. See smsProcessing.ts and SmsBroadcastReceiver.kt.
AppRegistry.registerHeadlessTask('SmsBackgroundTask', () => async (data: { body: string; sender: string; timestamp: number }) => {
  await processIncomingSms(data);
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
