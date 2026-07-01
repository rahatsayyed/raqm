import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainNavigator } from './MainNavigator';
import { useAppStore } from '../store/appStore';
import { Colors } from '../theme';

export function AppNavigator() {
  const isOnboardingComplete = useAppStore(s => s.isOnboardingComplete);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const unsub = useAppStore.persist.onFinishHydration(() => setHydrated(true));
    // If already hydrated (e.g. fast re-render), check immediately
    if (useAppStore.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);

  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {isOnboardingComplete ? <MainNavigator /> : <OnboardingNavigator />}
    </NavigationContainer>
  );
}
