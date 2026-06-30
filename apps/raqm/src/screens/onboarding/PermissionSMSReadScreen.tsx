import React, { useState } from 'react';
import { PermissionsAndroid } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';
import { PermissionRequiredModal } from '../../components/PermissionRequiredModal';

export function PermissionSMSReadScreen({ navigation }: OnboardingScreenProps<'PermissionSMSRead'>) {
  const [modalVisible, setModalVisible] = useState(false);
  const [isPermanentlyDenied, setIsPermanentlyDenied] = useState(false);

  const requestPermission = async () => {
    const result = await PermissionsAndroid.request('android.permission.READ_SMS' as any, {
      title: 'Read SMS Permission',
      message: 'Raqm needs to read your SMS to find bank transaction alerts.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });

    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      navigation.navigate('PermissionSMSReceive');
    } else {
      setIsPermanentlyDenied(result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
      setModalVisible(true);
    }
  };

  return (
    <>
      <PermissionScreen
        iconEmoji="💬"
        headline="Access your transactions"
        headlineAccent="transactions"
        description="To find your bank transactions automatically, we need permission to read your SMS. We only look for financial alerts."
        trustItems={[
          { icon: '🛡️', title: 'Privacy First', subtitle: 'Encrypted processing on-device.' },
          { icon: '🔍', title: 'Smart Filters', subtitle: 'Personal texts remain private.' },
        ]}
        ctaLabel="Grant SMS Access"
        onCTA={requestPermission}
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
