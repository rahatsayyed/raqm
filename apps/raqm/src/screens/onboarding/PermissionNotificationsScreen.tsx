import React from 'react';
import { PermissionsAndroid } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';

export function PermissionNotificationsScreen({ navigation }: OnboardingScreenProps<'PermissionNotifications'>) {
  const handleCTA = async () => {
    await PermissionsAndroid.request('android.permission.POST_NOTIFICATIONS' as any, {
      title: 'Notification Permission',
      message: 'Raqm needs notification access to alert you when money moves.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    navigation.replace('PermissionNotificationAccess');
  };

  return (
    <PermissionScreen
      iconEmoji="🔔"
      headline="Stay on top of your money"
      headlineAccent="money"
      description="To alert you when money moves and send spending summaries — daily, weekly, and monthly."
      trustItems={[
        { icon: '💸', title: 'Transaction Alerts', subtitle: 'Know the moment money moves.' },
        { icon: '📈', title: 'Spending Summaries', subtitle: 'Daily, weekly, and monthly digests.' },
      ]}
      ctaLabel="Allow Notifications"
      onCTA={handleCTA}
    />
  );
}
