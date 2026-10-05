import { PermissionsAndroid, Platform } from 'react-native';
import { requestVoicePermission } from '../../modules/sms-reader/src/SmsReaderModule';

/** Requests SEND_SMS, mirroring the RECEIVE_SMS/READ_SMS request pattern already used
 * during onboarding (see PermissionSMSReadScreen.tsx). Returns whether it's granted. */
export async function requestSendSmsPermission(): Promise<boolean> {
  const alreadyGranted = await PermissionsAndroid.check('android.permission.SEND_SMS');
  if (alreadyGranted) return true;
  const result = await PermissionsAndroid.request('android.permission.SEND_SMS');
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export async function requestRecordAudioPermission(): Promise<boolean> {
  if (Platform.OS === 'ios') return requestVoicePermission();
  const alreadyGranted = await PermissionsAndroid.check('android.permission.RECORD_AUDIO');
  if (alreadyGranted) return true;
  const result = await PermissionsAndroid.request('android.permission.RECORD_AUDIO');
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
