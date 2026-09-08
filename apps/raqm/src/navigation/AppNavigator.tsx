import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainNavigator } from './MainNavigator';
import { useAppStore } from '../store/appStore';
import { useTxStore } from '../store/txStore';
import { runDetectionJobs } from '../services/txIntelligence';
import { navigationRef } from './navigationRef';
import { syncDiscoveredAccounts, getSetting } from '../db/database';
import { initNotifications, attachNotificationHandlers, scheduleSummaries } from '../notifications/notifications';
import { attachDeepLinkHandler } from './deepLinks';
import { Colors } from '../theme';
import { logEvent } from '../services/logger';
import { SmsReader } from '../native/SmsReader';

export function AppNavigator() {
  const isOnboardingComplete = useAppStore(s => s.isOnboardingComplete);
  const loadTxs = useTxStore(s => s.load);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    // Only loadTxs and detectionJobs affect what the first screen shows, so only those two
    // gate `ready`. syncAccounts/initNotifications/scheduleSummaries/syncMonthStartDay are
    // background setup with no bearing on the first render — they used to sit inside the
    // same awaited Promise.all as loadTxs, which meant a single slow one of them (observed:
    // scheduleSummaries took 34s on-device, most likely an Android notification-scheduling
    // hiccup) froze the whole app on the loading spinner even though nothing was actually
    // broken. They now fire independently and are never awaited by the ready-gating path.
    const runStartup = async () => {
      const timed = async (tag: string, fn: () => Promise<void>) => {
        const t0 = Date.now();
        logEvent(`${tag}.start`);
        await fn();
        logEvent(`${tag}.done`, `${Date.now() - t0}ms`);
      };

      // Never awaited by the critical path below — a slow or failing background task must
      // never freeze the spinner or crash startup. Each call catches and logs on its own.
      const detached = (tag: string, fn: () => Promise<void>) => {
        timed(tag, fn).catch((e) => {
          logEvent(`${tag}.failed`, e instanceof Error ? e.message : String(e));
        });
      };

      // One-time backfill: users who already had a custom month_start_day before the
      // widgets shipped have no native mirror yet (MoreScreen only writes it going
      // forward), so every widget would silently use day 1 until they re-opened
      // Settings. Re-syncing it unconditionally on every cold start is idempotent and
      // cheap (one setting read + one SharedPreferences write), so no "only if missing"
      // check is needed.
      const syncMonthStartDay = async () => {
        const raw = await getSetting('month_start_day');
        const day = raw ? Number(raw) : 1;
        await SmsReader.setMonthStartDay(day).catch(() => {});
      };

      detached('startup.syncAccounts', syncDiscoveredAccounts);
      detached('startup.initNotifications', initNotifications);
      detached('startup.scheduleSummaries', scheduleSummaries);
      detached('startup.syncMonthStartDay', syncMonthStartDay);

      // A throw from either step here (loadTxs/detectionJobs/insertParsedTxs can all throw)
      // must never leave the app stuck on the loading spinner forever — always reach
      // setReady, even on failure. The user still gets a working (if incompletely-initialized)
      // app instead of a permanent blank screen.
      try {
        await timed('startup.loadTxs', loadTxs);
        if (cancelled) return;

        await timed('startup.detectionJobs', () =>
          runDetectionJobs(useTxStore.getState().txs),
        );
        useTxStore.getState().refresh();
      } catch (e) {
        logEvent('startup.failed', e instanceof Error ? e.message : String(e));
      } finally {
        if (!cancelled) setReady(true);
      }
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
    const detachNotifications = attachNotificationHandlers(navigationRef);
    const detachDeepLinks = attachDeepLinkHandler(navigationRef);
    return () => {
      detachNotifications();
      detachDeepLinks();
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
    <NavigationContainer ref={navigationRef}>
      {isOnboardingComplete ? <MainNavigator /> : <OnboardingNavigator />}
    </NavigationContainer>
  );
}
