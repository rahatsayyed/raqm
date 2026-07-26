import { useEffect, useState } from 'react';
import { PermissionsAndroid } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';
import { PermissionRequiredModal } from '../../components/PermissionRequiredModal';

export function PermissionSMSReadScreen({ navigation }: OnboardingScreenProps<'PermissionSMSRead'>) {
  const [modalVisible, setModalVisible] = useState(false);
  const [isPermanentlyDenied, setIsPermanentlyDenied] = useState(false);
  const [status, setStatus] = useState<'idle' | 'granted' | 'auto_granted'>('idle');

  // Already granted (e.g. reinstall, or user backed out mid-onboarding) — skip this page.
  useEffect(() => {
    let cancelled = false;
    PermissionsAndroid.check('android.permission.READ_SMS' as any).then((granted) => {
      if (granted && !cancelled) navigation.replace('PermissionNotifications');
    });
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  const requestPermission = async () => {
    const alreadyGranted = await PermissionsAndroid.check('android.permission.READ_SMS' as any);
    if (alreadyGranted) {
      setStatus('auto_granted');
      setTimeout(() => navigation.replace('PermissionNotifications'), 1000);
      return;
    }

    // Requesting only READ_SMS was relying on Android's same-permission-group auto-grant
    // to also flip RECEIVE_SMS to granted — that behavior isn't reliable across OEMs/OS
    // versions, and RECEIVE_SMS is exactly what the live-SMS BroadcastReceiver needs.
    // Request both explicitly so live detection doesn't silently depend on an assumption.
    const results: Record<string, string> = await PermissionsAndroid.requestMultiple([
      'android.permission.READ_SMS' as any,
      'android.permission.RECEIVE_SMS' as any,
    ]);
    const result = results['android.permission.READ_SMS'];

    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      setStatus('granted');
      setTimeout(() => navigation.replace('PermissionNotifications'), 700);
    } else {
      setIsPermanentlyDenied(result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
      setModalVisible(true);
    }
  };

  const isGranted = status !== 'idle';

  return (
    <>
      <PermissionScreen
        iconEmoji={isGranted ? '✅' : '💬'}
        headline="Access your transactions"
        headlineAccent="transactions"
        description={
          isGranted
            ? 'SMS access granted. Moving to the next step…'
            : 'To find bank transactions and catch new ones instantly, Raqm needs to read your SMS. We only look for financial alerts.'
        }
        trustItems={[
          { icon: '🛡️', title: 'Privacy First', subtitle: 'Encrypted processing on-device. Personal texts are never read.' },
          { icon: '⚡', title: 'Real-time Detection', subtitle: 'New transactions appear the moment they arrive.' },
        ]}
        ctaLabel="Grant SMS Access"
        onCTA={isGranted ? () => {} : requestPermission}
      />

      <PermissionRequiredModal
        visible={modalVisible}
        permissionName="Read SMS"
        reason="Raqm cannot work without SMS access. This is how we find your bank transactions — no manual data entry needed."
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
