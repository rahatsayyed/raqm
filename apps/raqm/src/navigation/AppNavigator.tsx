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
    const unsub = useAppStore.persist.onFinishHydration(async () => {
      let t0 = Date.now();
      logEvent('startup.loadTxs.start');
      await loadTxs();
      logEvent('startup.loadTxs.done', `${Date.now() - t0}ms`);

      t0 = Date.now();
      logEvent('startup.syncAccounts.start');
      await syncDiscoveredAccounts();
      logEvent('startup.syncAccounts.done', `${Date.now() - t0}ms`);

      t0 = Date.now();
      logEvent('startup.detectionJobs.start');
      await runDetectionJobs(useTxStore.getState().txs);
      logEvent('startup.detectionJobs.done', `${Date.now() - t0}ms`);

      useTxStore.getState().refresh();
      if (cancelled) return;

      t0 = Date.now();
      logEvent('startup.initNotifications.start');
      await initNotifications();
      logEvent('startup.initNotifications.done', `${Date.now() - t0}ms`);

      if (cancelled) return;

      t0 = Date.now();
      logEvent('startup.scheduleSummaries.start');
      await scheduleSummaries();
      logEvent('startup.scheduleSummaries.done', `${Date.now() - t0}ms`);

      if (!cancelled) setReady(true);
    });
    if (useAppStore.persist.hasHydrated()) {
      let loadT0 = Date.now();
      logEvent('startup.loadTxs.start');
      loadTxs().then(async () => {
        logEvent('startup.loadTxs.done', `${Date.now() - loadT0}ms`);
        let t0 = Date.now();
        logEvent('startup.syncAccounts.start');
        await syncDiscoveredAccounts();
        logEvent('startup.syncAccounts.done', `${Date.now() - t0}ms`);

        t0 = Date.now();
        logEvent('startup.detectionJobs.start');
        await runDetectionJobs(useTxStore.getState().txs);
        logEvent('startup.detectionJobs.done', `${Date.now() - t0}ms`);

        useTxStore.getState().refresh();
        if (cancelled) return;

        t0 = Date.now();
        logEvent('startup.initNotifications.start');
        await initNotifications();
        logEvent('startup.initNotifications.done', `${Date.now() - t0}ms`);

        if (cancelled) return;

        t0 = Date.now();
        logEvent('startup.scheduleSummaries.start');
        await scheduleSummaries();
        logEvent('startup.scheduleSummaries.done', `${Date.now() - t0}ms`);

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
