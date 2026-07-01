import React from 'react';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';
import { SmsReader } from '../../native/SmsReader';

export function PermissionNotificationAccessScreen({ navigation }: OnboardingScreenProps<'PermissionNotificationAccess'>) {
  const handleCTA = () => {
    // Notification listener access is not a runtime permission —
    // it requires the user to enable it manually in system settings.
    SmsReader.openNotificationListenerSettings();
    navigation.replace('PermissionLocation');
  };

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
      onCTA={handleCTA}
      skipLabel="Skip for now"
      onSkip={() => navigation.replace('PermissionLocation')}
    />
  );
}
