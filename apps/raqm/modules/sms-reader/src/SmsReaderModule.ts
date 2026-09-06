import { requireNativeModule } from 'expo-modules-core';
import type { EventSubscription } from 'expo-modules-core';
import type { SmsMessage, InstalledApp, LaunchDeepLink } from './SmsReader.types';

const native = requireNativeModule('SmsReader');

export function readInbox(fromTimestamp: number, toTimestamp: number): Promise<SmsMessage[]> {
  return native.readInbox(fromTimestamp, toTimestamp);
}

export function getEarliestMessageDate(): Promise<number> {
  return native.getEarliestMessageDate();
}

export function openNotificationListenerSettings(): void {
  native.openNotificationListenerSettings();
}

/** Appends the Category, Add note, and Not An Expense/Income actions to an already-posted tx
 * notification, all handled natively (no JS/RN engine boot required) — see the native module. */
export function attachTxActions(notificationId: string, txId: number, notExpenseLabel: string): void {
  native.attachTxActions(notificationId, txId, notExpenseLabel);
}

/** Returns the absolute filesystem path to the native diagnostic log file (native.log). */
export function getNativeLogPath(): Promise<string> {
  return native.getNativeLogPath();
}

/** Fires whenever Android's ACTION_SCREEN_OFF broadcast is observed natively (device screen
 * turned off/locked) — used to distinguish a real lock from a mere app backgrounding, which
 * JS-level AppState alone cannot do. See the native module's OnCreate for the receiver. */
export function addScreenLockedListener(listener: () => void): EventSubscription {
  return native.addListener('screenLocked', listener);
}

/** Whether Raqm's NotificationListenerService currently has notification access granted. */
export function isNotificationListenerEnabled(): boolean {
  return native.isNotificationListenerEnabled();
}

/** Mirrors the monitored-app package list into native SharedPreferences. */
export function setMonitoredNotificationPackages(packages: string[]): Promise<void> {
  return native.setMonitoredNotificationPackages(packages);
}

/** Mirrors the month_start_day setting into native SharedPreferences so the home-screen
 * widgets can compute period bounds without opening a second SQLite connection. */
export function setMonthStartDay(day: number): Promise<void> {
  return native.setMonthStartDay(day);
}

/** Launchable, user-visible installed apps, sorted by display name. */
export function getInstalledApps(): Promise<InstalledApp[]> {
  return native.getInstalledApps();
}

/** Reads and clears the quick-add / open-transaction extras from MainActivity's intent.
 * Returns null when the app was launched normally. Synchronous — it only touches the
 * already-delivered Intent. */
export function consumeLaunchDeepLink(): LaunchDeepLink | null {
  return native.consumeLaunchDeepLink() ?? null;
}

/** Nudges every placed home-screen widget to recompose immediately, rather than waiting for
 * the 30-minute platform tick. Never rejects for widget-side reasons — the native side
 * swallows its own failures. */
export function refreshWidgets(): Promise<void> {
  return native.refreshWidgets();
}
