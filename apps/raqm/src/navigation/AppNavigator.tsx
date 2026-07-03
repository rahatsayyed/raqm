import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainNavigator } from './MainNavigator';
import { useAppStore } from '../store/appStore';
import { useTxStore } from '../store/txStore';
import { runDetectionJobs } from '../services/txIntelligence';
import { navigationRef } from './navigationRef';
import { initNotifications, attachNotificationHandlers, scheduleSummaries } from '../notifications/notifications';
import { Colors } from '../theme';

export function AppNavigator() {
  const isOnboardingComplete = useAppStore(s => s.isOnboardingComplete);
  const loadTxs = useTxStore(s => s.load);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const unsub = useAppStore.persist.onFinishHydration(async () => {
      await loadTxs();
      await runDetectionJobs();
      useTxStore.getState().refresh();
      if (cancelled) return;
      await initNotifications();
      if (cancelled) return;
      await scheduleSummaries();
      if (!cancelled) setReady(true);
    });
    if (useAppStore.persist.hasHydrated()) {
      loadTxs().then(async () => {
        await runDetectionJobs();
        useTxStore.getState().refresh();
        if (cancelled) return;
        await initNotifications();
        if (cancelled) return;
        await scheduleSummaries();
        if (!cancelled) setReady(true);
      });
    }
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (isOnboardingComplete) {
      useTxStore.getState().refresh();
    }
  }, [isOnboardingComplete]);

  useEffect(() => {
    const detach = attachNotificationHandlers(navigationRef);
    return detach;
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      {isOnboardingComplete ? <MainNavigator /> : <OnboardingNavigator />}
    </NavigationContainer>
  );
}
