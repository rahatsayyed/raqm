import * as LocalAuthentication from 'expo-local-authentication';

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

/**
 * True if the device has a biometric enrolled OR a PIN/pattern/password set.
 * `getEnrolledLevelAsync()` is the authoritative check because it reports the
 * device-credential (SECRET) case too — `isEnrolledAsync()` alone only covers
 * biometric enrollment and would wrongly report "no auth available" on a
 * PIN-only phone.
 * Any native throw is treated as "no usable auth" rather than propagating:
 * every caller wants a boolean, and a throw here would strand the user.
 */
export async function canUseDeviceAuth(): Promise<boolean> {
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level !== LocalAuthentication.SecurityLevel.NONE;
  } catch {
    return false;
  }
}

/**
 * Runs the OS biometric/device-credential prompt. Resolves true only on an
 * actual successful authentication; resolves false on cancel, failure or
 * lockout — never throws for user-facing failure cases.
 *
 * `disableDeviceFallback: false` is what makes the OS itself offer the
 * device PIN/pattern/password when biometrics fail or aren't enrolled, so
 * Raqm needs no custom auth UI and stores no secret of its own.
 */
export async function authenticateWithDevice(reason: string): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      disableDeviceFallback: false,
      cancelLabel: 'Cancel',
    });
    return result.success;
  } catch {
    return false;
  }
}
