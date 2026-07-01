import React from 'react';
import { PermissionsAndroid } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';

export function PermissionLocationScreen({ navigation }: OnboardingScreenProps<'PermissionLocation'>) {
  const handleCTA = async () => {
    await PermissionsAndroid.request('android.permission.ACCESS_FINE_LOCATION' as any, {
      title: 'Location Permission',
      message: 'Raqm uses your location to tag where each payment was made.',
      buttonPositive: 'Allow',
      buttonNegative: 'Deny',
    });
    navigation.replace('DateRange');
  };

  return (
    <PermissionScreen
      iconEmoji="📍"
      headline="Tag where you spend"
      headlineAccent="spend"
      description="To tag where each payment was made — so you can see your spending on a map."
      trustItems={[
        { icon: '🗺️', title: 'Location Map', subtitle: 'See spending locations in transaction detail.' },
        { icon: '🔒', title: 'Stored Locally', subtitle: 'GPS coordinates never leave your device.' },
      ]}
      ctaLabel="Enable Location"
      onCTA={handleCTA}
      skipLabel="Skip for now"
      onSkip={() => navigation.replace('DateRange')}
    />
  );
}
