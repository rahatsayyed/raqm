import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';
import type { NavigationContainerRef } from '@react-navigation/native';
import { getSetting } from '../db/database';
import type { MainStackParamList } from '../navigation/types';
import { useAppStore } from '../store/appStore';

const TX_CHANNEL_ID = 'raqm-tx';

const DAILY_SUMMARY_ID = 'raqm-daily-summary';
const WEEKLY_SUMMARY_ID = 'raqm-weekly-summary';
const MONTHLY_SUMMARY_ID = 'raqm-monthly-summary';

/**
 * Sets the foreground notification handler, requests POST_NOTIFICATIONS permission, and
 * creates the Android notification channel used by every notification this app posts.
 * The Category/Add note/Not An Expense actions are NOT registered here — they're appended
 * natively per-notification (see SmsReaderModule.attachTxActions, called from
 * smsProcessing.ts right after posting) so they're handled entirely by native code
 * (CategoryPickerActivity / NotificationActionReceiver) and never need to boot the JS/RN
 * engine — the previous expo-task-manager based path for Add note/Not An Expense was
 * unreliable specifically because that boot is exactly what aggressive OEM battery managers
 * (MIUI, ColorOS, etc.) are most likely to kill when the app process is fully dead.
 * Safe to call multiple times (idempotent on the native side).
 */
export async function initNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Check-only: the POST_NOTIFICATIONS request belongs to the onboarding
  // PermissionNotifications page — requesting here fired the system dialog at
  // every app open before onboarding reached that page.
  await Notifications.getPermissionsAsync();

  await Notifications.setNotificationChannelAsync(TX_CHANNEL_ID, {
    name: 'Transactions',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 150, 100, 150],
    enableVibrate: true,
  });
}

/**
 * Posts the styled transaction notification (T17, T23's JS-side half). Uses trigger: null
 * (immediate) so it lands on the app's default channel, which app.json's expo-notifications
 * plugin config points at 'raqm-tx'. Carries `data: { txId }` so attachNotificationHandlers
 * can deep-link on tap. No action category here — smsProcessing.ts calls
 * SmsReader.attachTxActions right after this resolves to append Category/Add note/Not An
 * Expense natively.
 */
export async function postTxNotification(
  txId: number,
  title: string,
  body: string,
  color?: string,
): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { txId },
      color,
    },
    trigger: null,
  });
}

/** Cancels/removes an already-posted notification by identifier — used when a self-transfer's
 * second leg arrives and its two individual notifications need to collapse into one. */
export async function cancelTxNotification(notificationId: string): Promise<void> {
  await Notifications.dismissNotificationAsync(notificationId);
}

/**
 * Posts a plain alert notification with no action category and no txId — used by Plan 5's
 * budget-threshold checks (B4/B5). Tapping it falls through to the "no txId" branch of
 * attachNotificationHandlers, which just opens the Dashboard.
 */
export async function postBudgetAlert(title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: {},
    },
    trigger: null,
  });
}

/**
 * Wires up the single global notification-response listener.
 * - Tap with a txId in data (T17): navigate to TransactionDetail.
 * - Tap with no txId (summary notifications): navigate to the tab root (Dashboard is the
 *   first tab, so this lands the user there).
 * - Category/Add note/Not An Expense actions: NOT handled here at all — they're natively
 *   added (see SmsReaderModule.attachTxActions) and handled entirely by
 *   CategoryPickerActivity/NotificationActionReceiver, so they never reach this JS listener.
 * Also handles the cold-start case: if the app was launched by tapping a notification,
 * addNotificationResponseReceivedListener never fires for that response, so we fetch it
 * explicitly via getLastNotificationResponseAsync() and run it through the same handler.
 * Returns an unsubscribe function.
 */
export function attachNotificationHandlers(
  navRef: NavigationContainerRef<MainStackParamList>,
): () => void {
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const navigateWhenReady = (navigate: () => void) => {
    if (navRef.isReady()) {
      navigate();
    } else {
      retryTimer = setTimeout(() => {
        retryTimer = null;
        if (navRef.isReady()) navigate();
      }, 500);
    }
  };

  const handleResponse = (response: NotificationResponse) => {
    const data = response.notification.request.content.data as { txId?: number };

    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      const proceed = () => {
        if (!useAppStore.getState().isOnboardingComplete) return;
        navigateWhenReady(() => {
          if (typeof data.txId === 'number') {
            navRef.navigate('TransactionDetail', { transactionId: data.txId });
          } else {
            navRef.navigate('Tabs');
          }
        });
      };

      // A notification tap that cold-starts the app fires this via getLastNotificationResponseAsync
      // below, right as AppNavigator mounts — well before useAppStore's persisted
      // isOnboardingComplete finishes hydrating (it defaults to false until then). Checking it
      // immediately silently dropped the navigation, landing the user on the normal app instead
      // of TransactionDetail. Wait for hydration first so the check reads the real value.
      if (useAppStore.persist.hasHydrated()) {
        proceed();
      } else {
        const unsub = useAppStore.persist.onFinishHydration(() => {
          unsub();
          proceed();
        });
      }
    }
  };

  const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);

  Notifications.getLastNotificationResponseAsync().then(response => {
    if (response) handleResponse(response);
  });

  return () => {
    if (retryTimer !== null) clearTimeout(retryTimer);
    sub.remove();
  };
}

/**
 * Returns the last calendar day (at local midnight) of the custom month period that
 * contains "now", where a period runs from `startDay` of one month to the day before
 * `startDay` of the next month. E.g. startDay=1 → last day of the current calendar month.
 * startDay=15, today=Jul 20 → period is Jul 15–Aug 14, so this returns Aug 14.
 * startDay=15, today=Jul 10 → period is Jun 15–Jul 14, so this returns Jul 14.
 */
function lastDayOfPeriod(startDay: number): Date {
  const clampedStart = Math.min(Math.max(Math.trunc(startDay), 1), 28);
  const now = new Date();

  let periodStartMonth = now.getMonth();
  let periodStartYear = now.getFullYear();
  if (now.getDate() < clampedStart) {
    periodStartMonth -= 1;
    if (periodStartMonth < 0) {
      periodStartMonth = 11;
      periodStartYear -= 1;
    }
  }

  const nextPeriodStart = new Date(periodStartYear, periodStartMonth + 1, clampedStart);
  const lastDay = new Date(nextPeriodStart.getTime() - 24 * 60 * 60 * 1000);
  lastDay.setHours(0, 0, 0, 0);
  return lastDay;
}

async function cancelIfScheduled(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // not scheduled — nothing to cancel
  }
}

/**
 * Reads notif_daily / notif_weekly / notif_monthly (T22) and month_start_day, cancels any
 * previously scheduled summary notifications by fixed identifier, then re-schedules the
 * ones that are enabled. Safe to call repeatedly (on app launch and whenever a Settings
 * toggle changes) — it is fully idempotent.
 */
export async function scheduleSummaries(): Promise<void> {
  await cancelIfScheduled(DAILY_SUMMARY_ID);
  await cancelIfScheduled(WEEKLY_SUMMARY_ID);
  await cancelIfScheduled(MONTHLY_SUMMARY_ID);

  const [dailyEnabled, weeklyEnabled, monthlyEnabled, monthStartDayRaw] = await Promise.all([
    getSetting('notif_daily'),
    getSetting('notif_weekly'),
    getSetting('notif_monthly'),
    getSetting('month_start_day'),
  ]);

  if ((dailyEnabled ?? '1') === '1') {
    await Notifications.scheduleNotificationAsync({
      identifier: DAILY_SUMMARY_ID,
      content: {
        title: 'Daily summary',
        body: 'Your daily spend summary is ready.',
        data: {},
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 21,
        minute: 0,
        channelId: TX_CHANNEL_ID,
      },
    });
  }

  if ((weeklyEnabled ?? '1') === '1') {
    await Notifications.scheduleNotificationAsync({
      identifier: WEEKLY_SUMMARY_ID,
      content: {
        title: 'Weekly summary',
        body: 'Your weekly spend summary is ready.',
        data: {},
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // 1 = Sunday per expo-notifications convention
        hour: 20,
        minute: 0,
        channelId: TX_CHANNEL_ID,
      },
    });
  }

  if ((monthlyEnabled ?? '1') === '1') {
    const startDay = Number(monthStartDayRaw ?? '1');
    const fireDate = lastDayOfPeriod(startDay);
    fireDate.setHours(20, 0, 0, 0);

    if (fireDate.getTime() > Date.now()) {
      await Notifications.scheduleNotificationAsync({
        identifier: MONTHLY_SUMMARY_ID,
        content: {
          title: 'Monthly summary',
          body: 'Your monthly spend summary is ready.',
          data: {},
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: fireDate,
          channelId: TX_CHANNEL_ID,
        },
      });
    }
  }
}

/**
 * Alias so Plan 5's Settings screen can call `rescheduleSummaries()` after toggling
 * notif_daily/notif_weekly/notif_monthly or changing month_start_day — same function,
 * named for readability at the call site.
 */
export const rescheduleSummaries = scheduleSummaries;
