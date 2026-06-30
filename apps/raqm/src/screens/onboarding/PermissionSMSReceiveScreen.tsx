import React from 'react';
import { PermissionsAndroid } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';

export function PermissionSMSReceiveScreen({ navigation }: OnboardingScreenProps<'PermissionSMSReceive'>) {
  const handleCTA = async () => {
    await PermissionsAndroid.request('android.permission.RECEIVE_SMS' as any, {
      title: 'Receive SMS Permission',
      message: 'Raqm needs to detect new bank SMS messages in real time.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    navigation.navigate('PermissionNotifications');
  };

  return (
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
      onCTA={handleCTA}
    />
  );
}
