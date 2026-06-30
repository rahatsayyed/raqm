import { useState } from 'react';
import { PermissionsAndroid } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';
import { PermissionRequiredModal } from '../../components/PermissionRequiredModal';

export function PermissionSMSReceiveScreen({ navigation }: OnboardingScreenProps<'PermissionSMSReceive'>) {
  const [modalVisible, setModalVisible] = useState(false);
  const [isPermanentlyDenied, setIsPermanentlyDenied] = useState(false);
  const [status, setStatus] = useState<'idle' | 'granted' | 'auto_granted'>('idle');

  const requestPermission = async () => {
    const alreadyGranted = await PermissionsAndroid.check('android.permission.RECEIVE_SMS' as any);
    if (alreadyGranted) {
      setStatus('auto_granted');
      setTimeout(() => navigation.navigate('PermissionNotifications'), 1400);
      return;
    }

    const result = await PermissionsAndroid.request('android.permission.RECEIVE_SMS' as any, {
      title: 'Receive SMS Permission',
      message: 'Raqm needs to detect new bank SMS messages in real time.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });

    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      setStatus('granted');
      setTimeout(() => navigation.navigate('PermissionNotifications'), 700);
    } else {
      setIsPermanentlyDenied(result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
      setModalVisible(true);
    }
  };

  const isGranted = status !== 'idle';

  return (
    <>
      <PermissionScreen
        iconEmoji={isGranted ? '✅' : '📩'}
        headline="Catch transactions instantly"
        headlineAccent="instantly"
        description={
          status === 'auto_granted'
            ? 'Already enabled — Android granted this automatically alongside Read SMS (same permission group). Moving on…'
            : status === 'granted'
              ? 'Background monitoring enabled. Moving to the next step…'
              : 'So we catch new transactions the moment they arrive — even when the app is in the background.'
        }
        trustItems={[
          { icon: '⚡', title: 'Real-time Detection', subtitle: 'New transactions appear immediately.' },
          { icon: '🔋', title: 'Battery Friendly', subtitle: 'Minimal background footprint.' },
        ]}
        ctaLabel="Enable Background Monitoring"
        onCTA={isGranted ? () => {} : requestPermission}
      />

      <PermissionRequiredModal
        visible={modalVisible}
        permissionName="Receive SMS"
        reason="Raqm cannot detect new transactions in real time without this permission. You'll miss instant alerts when money moves."
        isPermanentlyDenied={isPermanentlyDenied}
        onGrantPress={() => {
          setModalVisible(false);
          requestPermission();
        }}
        onDismiss={() => setModalVisible(false)}
      />
    </>
  );
}
