import React from 'react';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';

export function PermissionLocationScreen({ navigation }: OnboardingScreenProps<'PermissionLocation'>) {
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
      onCTA={() => navigation.navigate('DateRange')}
      skipLabel="Skip for now"
      onSkip={() => navigation.navigate('DateRange')}
    />
  );
}
