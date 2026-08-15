import { getSetting, setSetting } from '../../db/database';

/** `app_settings` key holding '0' | '1'. No migration needed — the table is generic key-value. */
export const APP_LOCK_SETTING_KEY = 'app_lock_enabled';

/** True only when the user has explicitly turned App Lock on. Default (unset) is off. */
export async function isAppLockEnabled(): Promise<boolean> {
  const raw = await getSetting(APP_LOCK_SETTING_KEY);
  return raw === '1';
}

export async function setAppLockEnabled(enabled: boolean): Promise<void> {
  await setSetting(APP_LOCK_SETTING_KEY, enabled ? '1' : '0');
}

/** True if the device has a biometric enrolled OR a PIN/pattern/password set. Filled in by Task 2. */
export async function canUseDeviceAuth(): Promise<boolean> {
  return false;
}

/**
 * Runs the OS biometric/device-credential prompt. Resolves true only on a real
 * successful authentication; resolves false on cancel, failure or lockout.
 * Never throws for user-facing failure cases. Filled in by Task 2.
 */
export async function authenticateWithDevice(reason: string): Promise<boolean> {
  void reason;
  return false;
}
