import React from 'react';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';

export function PermissionSMSReceiveScreen({ navigation }: OnboardingScreenProps<'PermissionSMSReceive'>) {
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
      onCTA={() => navigation.navigate('PermissionNotifications')}
    />
  );
}
