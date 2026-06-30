import React from 'react';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';

export function PermissionNotificationAccessScreen({ navigation }: OnboardingScreenProps<'PermissionNotificationAccess'>) {
  return (
    <PermissionScreen
      iconEmoji="✨"
      headline="Cleaner bank notifications"
      headlineAccent="notifications"
      description="We'll replace raw bank SMS alerts with a cleaner, richer notification showing merchant, amount, and category."
      trustItems={[
        { icon: '🎨', title: 'Rich Notifications', subtitle: 'See merchant, amount, and category at a glance.' },
        { icon: '🚫', title: 'No SMS Clutter', subtitle: 'Raw bank SMS replaced with a clean alert.' },
      ]}
      ctaLabel="Enable Notification Access"
      onCTA={() => navigation.navigate('PermissionLocation')}
      skipLabel="Skip for now"
      onSkip={() => navigation.navigate('PermissionLocation')}
    />
  );
}
