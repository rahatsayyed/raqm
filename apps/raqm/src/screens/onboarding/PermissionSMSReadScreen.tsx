import React from 'react';
import { PermissionsAndroid } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';

export function PermissionSMSReadScreen({ navigation }: OnboardingScreenProps<'PermissionSMSRead'>) {
  const handleCTA = async () => {
    await PermissionsAndroid.request('android.permission.READ_SMS' as any, {
      title: 'Read SMS Permission',
      message: 'Raqm needs to read your SMS to find bank transaction alerts.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    navigation.navigate('PermissionSMSReceive');
  };

  return (
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
      onCTA={handleCTA}
    />
  );
}
