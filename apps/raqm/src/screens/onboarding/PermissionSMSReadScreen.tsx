import { useState } from 'react';
import { PermissionsAndroid } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';
import { PermissionRequiredModal } from '../../components/PermissionRequiredModal';

export function PermissionSMSReadScreen({ navigation }: OnboardingScreenProps<'PermissionSMSRead'>) {
  const [modalVisible, setModalVisible] = useState(false);
  const [isPermanentlyDenied, setIsPermanentlyDenied] = useState(false);
  const [status, setStatus] = useState<'idle' | 'granted' | 'auto_granted'>('idle');

  const requestPermission = async () => {
    const alreadyGranted = await PermissionsAndroid.check('android.permission.READ_SMS' as any);
    if (alreadyGranted) {
      setStatus('auto_granted');
      setTimeout(() => navigation.navigate('PermissionSMSReceive'), 1000);
      return;
    }

    const result = await PermissionsAndroid.request('android.permission.READ_SMS' as any, {
      title: 'Read SMS Permission',
      message: 'Raqm needs to read your SMS to find bank transaction alerts.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });

    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      setStatus('granted');
      setTimeout(() => navigation.navigate('PermissionSMSReceive'), 700);
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
          status === 'auto_granted'
            ? 'Already granted. Moving to the next step…'
            : status === 'granted'
              ? 'SMS access granted. Moving to the next step…'
              : 'To find your bank transactions automatically, we need permission to read your SMS. We only look for financial alerts.'
        }
        trustItems={[
          { icon: '🛡️', title: 'Privacy First', subtitle: 'Encrypted processing on-device.' },
          { icon: '🔍', title: 'Smart Filters', subtitle: 'Personal texts remain private.' },
        ]}
        ctaLabel="Grant SMS Access"
        onCTA={isGranted ? () => {} : requestPermission}
      />

      <PermissionRequiredModal
        visible={modalVisible}
        permissionName="Read SMS"
        reason="Raqm cannot work without reading your SMS. This is how we find your bank transactions — no manual data entry needed."
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
