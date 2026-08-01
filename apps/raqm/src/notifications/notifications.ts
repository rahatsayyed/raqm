import * as Notifications from 'expo-notifications';
import type { NotificationResponse } from 'expo-notifications';
import type { NavigationContainerRef } from '@react-navigation/native';
import { getSetting, updateTx } from '../db/database';
import { useTxStore } from '../store/txStore';
import type { MainStackParamList } from '../navigation/types';
import { useAppStore } from '../store/appStore';

const TX_CHANNEL_ID = 'raqm-tx';
const TX_CATEGORY_ID = 'tx';
const CATEGORY_ACTION_ID = 'category-tx';
const ADD_NOTE_ACTION_ID = 'add-note';
const NOT_EXPENSE_ACTION_ID = 'not-expense';

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

  await Notifications.setNotificationCategoryAsync(TX_CATEGORY_ID, [
    {
      identifier: CATEGORY_ACTION_ID,
      buttonTitle: 'Category',
      options: { opensAppToForeground: true },
    },
    {
      identifier: ADD_NOTE_ACTION_ID,
      buttonTitle: 'Add note',
      textInput: {
        placeholder: 'Add a note…',
        submitButtonTitle: 'Save',
      },
      options: { opensAppToForeground: false },
    },
    {
      identifier: NOT_EXPENSE_ACTION_ID,
      buttonTitle: 'Not An Expense',
      options: { opensAppToForeground: false },
    },
  ]);
}

/**
 * Posts the styled transaction notification (T17, T23's JS-side half). Uses trigger: null
 * (immediate) so it lands on the app's default channel, which app.json's expo-notifications
 * plugin config points at 'raqm-tx'. Carries `data: { txId }` so attachNotificationHandlers
 * can deep-link on tap, and `categoryIdentifier: 'tx'` so the "Add note" action (T18) appears.
 */
export async function postTxNotification(txId: number, title: string, body: string, color?: string): Promise<string> {
  return Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      data: { txId },
      categoryIdentifier: TX_CATEGORY_ID,
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
 * - 'category-tx' action: navigate to EditTransaction with autoOpenCategoryPicker so the
 *   user lands straight on the category grid instead of the full edit form.
 * - 'add-note' action with typed text (T18): save the note directly to the DB without
 *   navigating or opening the app to the foreground.
 * - 'not-expense' action: flips linkSettled (same flag countsTowardTotals() already checks
 *   everywhere else) without opening the app, then dismisses the notification.
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
    const notificationId = response.notification.request.identifier;

    if (response.actionIdentifier === ADD_NOTE_ACTION_ID) {
      const userText = response.userText;
      const finish = async () => {
        if (typeof data.txId === 'number' && userText && userText.trim().length > 0) {
          await updateTx(data.txId, { notes: userText.trim() });
          await useTxStore.getState().refresh();
        }
        // Android's direct-reply (RemoteInput) contract requires the app to re-post a
        // notification with the SAME identifier once the reply is handled — otherwise the
        // system leaves the inline input in its "sending" spinner state indefinitely (only
        // clearing on a fresh render, e.g. closing/reopening the shade). Re-scheduling the
        // same content under the same identifier is what signals "done" and clears it.
        const content = response.notification.request.content;
        await Notifications.scheduleNotificationAsync({
          identifier: notificationId,
          content: {
            title: content.title ?? '',
            body: content.body ?? '',
            data: content.data,
            categoryIdentifier: content.categoryIdentifier ?? undefined,
          },
          trigger: null,
        });
      };
      finish().catch(() => {});
      // Deliberately does NOT dismiss the notification — adding a note is a lightweight
      // annotation, so the transaction notification stays put for the user to still tap,
      // edit, or mark not-an-expense afterward.
      return;
    }

    if (response.actionIdentifier === NOT_EXPENSE_ACTION_ID) {
      if (typeof data.txId === 'number') {
        updateTx(data.txId, { linkSettled: true });
        useTxStore.getState().refresh();
      }
      Notifications.dismissNotificationAsync(notificationId);
      return;
    }

    if (response.actionIdentifier === CATEGORY_ACTION_ID) {
      if (!useAppStore.getState().isOnboardingComplete || typeof data.txId !== 'number') return;
      navigateWhenReady(() => {
        navRef.navigate('EditTransaction', { transactionId: data.txId as number, autoOpenCategoryPicker: true });
      });
      return;
    }

    if (response.actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
      if (!useAppStore.getState().isOnboardingComplete) return;

      navigateWhenReady(() => {
        if (typeof data.txId === 'number') {
          navRef.navigate('TransactionDetail', { transactionId: data.txId });
        } else {
          navRef.navigate('Tabs');
        }
      });
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
