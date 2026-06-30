import React from 'react';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';

export function PermissionSMSReadScreen({ navigation }: OnboardingScreenProps<'PermissionSMSRead'>) {
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
      onCTA={() => navigation.navigate('PermissionSMSReceive')}
    />
  );
}
