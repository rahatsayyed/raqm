import React, { useEffect } from 'react';
import * as Location from 'expo-location';
import { OnboardingScreenProps } from '../../navigation/types';
import { PermissionScreen } from './PermissionScreen';

export function PermissionLocationScreen({ navigation }: OnboardingScreenProps<'PermissionLocation'>) {
  // Already granted — skip this page. Checking background (not foreground) status since
  // that's the permission live-detected transactions actually need: foreground-only grants
  // silently fail to produce a coordinate whenever the SMS arrives while the app isn't open.
  useEffect(() => {
    let cancelled = false;
    Location.getBackgroundPermissionsAsync().then(({ status }) => {
      if (status === Location.PermissionStatus.GRANTED && !cancelled) navigation.replace('DateRange');
    });
    return () => {
      cancelled = true;
    };
  }, [navigation]);

  const handleCTA = async () => {
    // Android 11+ removed the ability to grant background location from a runtime dialog
    // at all — requestForegroundPermissionsAsync() must succeed first, and
    // requestBackgroundPermissionsAsync() then opens the system Settings page itself
    // (expo-location's documented behavior) for the user to pick "Allow all the time",
    // since Google no longer permits that option inside a normal permission prompt.
    const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
    if (foregroundStatus === Location.PermissionStatus.GRANTED) {
      await Location.requestBackgroundPermissionsAsync();
    }
    navigation.replace('DateRange');
  };

  return (
    <PermissionScreen
      iconEmoji="📍"
      headline="Tag where you spend"
      headlineAccent="spend"
      description={`Raqm tags where each payment was made — even transactions detected while the app is closed. When the settings screen opens, choose "Allow all the time".`}
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
