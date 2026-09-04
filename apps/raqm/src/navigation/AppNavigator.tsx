import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainNavigator } from './MainNavigator';
import { useAppStore } from '../store/appStore';
import { useTxStore } from '../store/txStore';
import { runDetectionJobs } from '../services/txIntelligence';
import { navigationRef } from './navigationRef';
import { syncDiscoveredAccounts } from '../db/database';
import { initNotifications, attachNotificationHandlers, scheduleSummaries } from '../notifications/notifications';
import { Colors } from '../theme';
import { logEvent } from '../services/logger';

export function AppNavigator() {
  const isOnboardingComplete = useAppStore(s => s.isOnboardingComplete);
  const loadTxs = useTxStore(s => s.load);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // syncAccounts/initNotifications/scheduleSummaries each hit the DB or native APIs on
    // their own and never read loadTxs's in-memory result, so they run in parallel with it
    // instead of waiting behind it. Only detectionJobs needs loadTxs's txs, so it still
    // runs after that one step resolves.
    const runStartup = async () => {
      const timed = async (tag: string, fn: () => Promise<void>) => {
        const t0 = Date.now();
        logEvent(`${tag}.start`);
        await fn();
        logEvent(`${tag}.done`, `${Date.now() - t0}ms`);
      };

      await Promise.all([
        timed('startup.loadTxs', loadTxs),
        timed('startup.syncAccounts', syncDiscoveredAccounts),
        timed('startup.initNotifications', initNotifications),
        timed('startup.scheduleSummaries', scheduleSummaries),
      ]);
      if (cancelled) return;

      await timed('startup.detectionJobs', () =>
        runDetectionJobs(useTxStore.getState().txs),
      );
      useTxStore.getState().refresh();

      if (!cancelled) setReady(true);
    };

    const unsub = useAppStore.persist.onFinishHydration(runStartup);
    if (useAppStore.persist.hasHydrated()) {
      runStartup();
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
