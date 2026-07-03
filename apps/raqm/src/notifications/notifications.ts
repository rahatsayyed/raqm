import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';
import type { NavigationContainerRef } from '@react-navigation/native';
import { getSetting, updateTx } from '../db/database';
import type { MainStackParamList } from '../navigation/types';
import { useAppStore } from '../store/appStore';

const TX_CHANNEL_ID = 'raqm-tx';
const TX_CATEGORY_ID = 'tx';
const ADD_NOTE_ACTION_ID = 'add-note';

const DAILY_SUMMARY_ID = 'raqm-daily-summary';
const WEEKLY_SUMMARY_ID = 'raqm-weekly-summary';
const MONTHLY_SUMMARY_ID = 'raqm-monthly-summary';

/**
 * Sets the foreground notification handler, requests POST_NOTIFICATIONS permission,
 * creates the Android notification channel used by every notification this app posts,
 * and registers the 'tx' action category with its inline text-input "Add note" action (T18).
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

  await Notifications.requestPermissionsAsync();

  await Notifications.setNotificationChannelAsync(TX_CHANNEL_ID, {
    name: 'Transactions',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 150, 100, 150],
    enableVibrate: true,
  });

  await Notifications.setNotificationCategoryAsync(TX_CATEGORY_ID, [
    {
      identifier: ADD_NOTE_ACTION_ID,
      buttonTitle: 'Add note',
      textInput: {
        placeholder: 'Add a note…',
        submitButtonTitle: 'Save',
      },
    },
  ]);
}

/**
 * Posts the styled transaction notification (T17, T23's JS-side half). Uses trigger: null
 * (immediate) so it lands on the app's default channel, which app.json's expo-notifications
 * plugin config points at 'raqm-tx'. Carries `data: { txId }` so attachNotificationHandlers
 * can deep-link on tap, and `categoryIdentifier: 'tx'` so the "Add note" action (T18) appears.
 */
export async function postTxNotification(txId: number, title: string, body: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { txId },
      categoryIdentifier: TX_CATEGORY_ID,
    },
    trigger: null,
  });
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
 * - 'add-note' action with typed text (T18): save the note directly to the DB without
 *   navigating or opening the app to the foreground.
 * Also handles the cold-start case: if the app was launched by tapping a notification,
 * addNotificationResponseReceivedListener never fires for that response, so we fetch it
 * explicitly via getLastNotificationResponseAsync() and run it through the same handler.
 * If both the cold-start check and the live listener somehow fire for the same response,
 * handleResponse runs twice — harmless, since navigating to the same route twice (or
 * re-saving the same note text) is a no-op in effect.
 * Returns an unsubscribe function.
 */
export function attachNotificationHandlers(
  navRef: NavigationContainerRef<MainStackParamList>,
): () => void {
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  const handleResponse = (response: NotificationResponse) => {
    const data = response.notification.request.content.data as { txId?: number };

    if (response.actionIdentifier === ADD_NOTE_ACTION_ID) {
      const userText = response.userText;
      if (typeof data.txId === 'number' && userText && userText.trim().length > 0) {
        updateTx(data.txId, { notes: userText.trim() });
      }
      return;
    }

    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      if (!useAppStore.getState().isOnboardingComplete) return;

      const navigate = () => {
        if (typeof data.txId === 'number') {
          navRef.navigate('TransactionDetail', { transactionId: data.txId });
        } else {
          navRef.navigate('Tabs');
        }
      };

      if (navRef.isReady()) {
        navigate();
      } else {
        retryTimer = setTimeout(() => {
          retryTimer = null;
          if (navRef.isReady()) navigate();
        }, 500);
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
