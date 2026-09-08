import { PermissionsAndroid } from 'react-native';

/** Requests SEND_SMS, mirroring the RECEIVE_SMS/READ_SMS request pattern already used
 * during onboarding (see PermissionSMSReadScreen.tsx). Returns whether it's granted. */
export async function requestSendSmsPermission(): Promise<boolean> {
  const alreadyGranted = await PermissionsAndroid.check('android.permission.SEND_SMS' as any);
  if (alreadyGranted) return true;
  const result = await PermissionsAndroid.request('android.permission.SEND_SMS' as any);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}
