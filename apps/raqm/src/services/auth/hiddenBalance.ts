import * as Crypto from 'expo-crypto';

import { getSetting, setSetting } from '../../db/database';
import { canUseDeviceAuth } from './appLock';

/** `app_settings` key holding the lowercase-hex SHA-256 of `salt:password`. */
export const PASSWORD_HASH_KEY = 'hidden_balance_password_hash';
/** `app_settings` key holding the lowercase-hex 16-byte random salt. */
export const PASSWORD_SALT_KEY = 'hidden_balance_password_salt';

/**
 * How the next reveal attempt should authenticate. Recomputed on *every*
 * attempt, never cached — that is what keeps Hide Balances working if App Lock
 * is turned off after having been used for an earlier reveal this session.
 */
export type RevealAuthMethod = 'device' | 'password' | 'setup-password';

const SALT_BYTES = 16;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Salted SHA-256. The salt is prefixed with a `:` separator so a salt/password
 * boundary can never be ambiguous (e.g. salt "ab" + password "cd" must not
 * collide with salt "abc" + password "d").
 *
 * SHA-256 rather than a slow KDF is a deliberate, spec-sanctioned choice: this
 * password gates a UI reveal against someone glancing at an unlocked phone, it
 * is not protecting data at rest. See the spec's "Reveal authentication".
 */
async function hashPassword(password: string, saltHex: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${saltHex}:${password}`,
  );
}

/** True once the user has set a custom app password (both hash and salt present). */
export async function hasAppPassword(): Promise<boolean> {
  const [hash, salt] = await Promise.all([
    getSetting(PASSWORD_HASH_KEY),
    getSetting(PASSWORD_SALT_KEY),
  ]);
  return !!hash && !!salt;
}

/**
 * Generates a fresh salt and stores `hash` + `salt`. Writing the salt first
 * would leave a salt with no hash if the second write failed; writing the hash
 * first would leave an unverifiable hash. Both are written together and
 * `hasAppPassword()` requires both, so a half-written pair reads as "no
 * password" rather than as a password nobody can enter.
 */
export async function setAppPassword(password: string): Promise<void> {
  const saltBytes = await Crypto.getRandomBytesAsync(SALT_BYTES);
  const saltHex = toHex(saltBytes);
  const hash = await hashPassword(password, saltHex);
  await Promise.all([
    setSetting(PASSWORD_HASH_KEY, hash),
    setSetting(PASSWORD_SALT_KEY, saltHex),
  ]);
}

/**
 * False (never throws) when no password is set, so a caller that races a
 * password reset can't be handed a spurious "correct". Plain string equality is
 * fine here — there is no remote attacker to time, and the compared values are
 * both local hex digests.
 */
export async function verifyAppPassword(password: string): Promise<boolean> {
  const [expected, saltHex] = await Promise.all([
    getSetting(PASSWORD_HASH_KEY),
    getSetting(PASSWORD_SALT_KEY),
  ]);
  if (!expected || !saltHex) return false;
  const actual = await hashPassword(password, saltHex);
  return actual === expected;
}

/**
 * Device auth wins whenever it's genuinely available — a biometric or
 * PIN/pattern/password set up on the device — regardless of whether App
 * Lock itself is toggled on. App Lock's on/off setting only controls
 * whether Raqm shows a lock screen on open; it doesn't gate whether an
 * existing device credential can be reused here. Otherwise fall back to
 * the custom password, and if there isn't one yet, ask the user to create
 * one.
 */
export async function getRevealAuthMethod(): Promise<RevealAuthMethod> {
  if (await canUseDeviceAuth()) return 'device';
  return (await hasAppPassword()) ? 'password' : 'setup-password';
}
