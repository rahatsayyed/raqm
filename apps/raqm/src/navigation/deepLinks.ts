import { AppState, type AppStateStatus } from 'react-native';
import type { NavigationContainerRef } from '@react-navigation/native';
import type { MainStackParamList } from './types';
import { consumeLaunchDeepLink } from '../../modules/sms-reader/src/SmsReaderModule';
import { useAppStore } from '../store/appStore';

// Cold-starting from a shortcut/tile/widget races AppNavigator's startup sequence exactly
// the way a notification tap does — see attachNotificationHandlers in notifications.ts for
// why a single one-shot retry silently dropped the navigation on a device with thousands of
// transactions. Same poll: every 500ms, up to ~15s.
const NAV_READY_RETRY_MS = 500;
const NAV_READY_MAX_ATTEMPTS = 30;

/**
 * Drains the native intent extras (SmsReader.consumeLaunchDeepLink) and navigates:
 * - openQuickAdd -> QuickAddCash
 * - openTransaction: <id> -> TransactionDetail
 * Runs once at mount (cold start) and again on every background->active transition (warm
 * start: ReactActivity.onNewIntent has already called setIntent by then).
 * Returns an unsubscribe function.
 */
export function attachDeepLinkHandler(
  navRef: NavigationContainerRef<MainStackParamList>,
): () => void {
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const navigateWhenReady = (navigate: () => void) => {
    if (navRef.isReady()) {
      navigate();
      return;
    }
    let attempts = 0;
    const tryNavigate = () => {
      retryTimer = null;
      if (disposed) return;
      if (navRef.isReady()) {
        navigate();
        return;
      }
      attempts++;
      if (attempts >= NAV_READY_MAX_ATTEMPTS) return;
      retryTimer = setTimeout(tryNavigate, NAV_READY_RETRY_MS);
    };
    retryTimer = setTimeout(tryNavigate, NAV_READY_RETRY_MS);
  };

  const drain = () => {
    let link: ReturnType<typeof consumeLaunchDeepLink>;
    try {
      link = consumeLaunchDeepLink();
    } catch {
      return; // never let a deep-link read break app startup
    }
    if (!link) return;

    const proceed = () => {
      if (!useAppStore.getState().isOnboardingComplete) return;
      navigateWhenReady(() => {
        if (typeof link!.openTransaction === 'number') {
          navRef.navigate('TransactionDetail', { transactionId: link!.openTransaction });
        } else if (link!.openQuickAdd) {
          navRef.navigate('QuickAddCash');
        }
      });
    };

    // Same hydration wait as attachNotificationHandlers: isOnboardingComplete defaults to
    // false until zustand's persisted state finishes hydrating, and checking it immediately
    // on a cold start silently drops the navigation.
    if (useAppStore.persist.hasHydrated()) {
      proceed();
    } else {
      const unsub = useAppStore.persist.onFinishHydration(() => {
        unsub();
        proceed();
      });
    }
  };

  drain();

  const onAppStateChange = (state: AppStateStatus) => {
    if (state === 'active') drain();
  };
  const sub = AppState.addEventListener('change', onAppStateChange);

  return () => {
    disposed = true;
    if (retryTimer !== null) clearTimeout(retryTimer);
    sub.remove();
  };
}
