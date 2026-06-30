import React, { useState } from 'react';
import { PermissionsAndroid } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';
import { PermissionRequiredModal } from '../../components/PermissionRequiredModal';

export function PermissionSMSReceiveScreen({ navigation }: OnboardingScreenProps<'PermissionSMSReceive'>) {
  const [modalVisible, setModalVisible] = useState(false);
  const [isPermanentlyDenied, setIsPermanentlyDenied] = useState(false);

  const requestPermission = async () => {
    const result = await PermissionsAndroid.request('android.permission.RECEIVE_SMS' as any, {
      title: 'Receive SMS Permission',
      message: 'Raqm needs to detect new bank SMS messages in real time.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });

    if (result === PermissionsAndroid.RESULTS.GRANTED) {
      navigation.navigate('PermissionNotifications');
    } else {
      setIsPermanentlyDenied(result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
      setModalVisible(true);
    }
  };

  return (
    <>
      <PermissionScreen
        iconEmoji="📩"
        headline="Catch transactions instantly"
        headlineAccent="instantly"
        description="So we catch new transactions the moment they arrive — even when the app is in the background."
        trustItems={[
          { icon: '⚡', title: 'Real-time Detection', subtitle: 'New transactions appear immediately.' },
          { icon: '🔋', title: 'Battery Friendly', subtitle: 'Minimal background footprint.' },
        ]}
        ctaLabel="Enable Background Monitoring"
        onCTA={requestPermission}
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
