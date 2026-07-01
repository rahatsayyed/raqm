import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainNavigator } from './MainNavigator';
import { useAppStore } from '../store/appStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { Colors } from '../theme';

export function AppNavigator() {
  const isOnboardingComplete = useAppStore(s => s.isOnboardingComplete);
  const initDb = useOnboardingStore(s => s.initDb);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const unsub = useAppStore.persist.onFinishHydration(async () => {
      await initDb();
      if (!cancelled) setReady(true);
    });
    if (useAppStore.persist.hasHydrated()) {
      initDb().then(() => { if (!cancelled) setReady(true); });
    }
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  if (!ready) {
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
