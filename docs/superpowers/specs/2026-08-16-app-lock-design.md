# App Lock — Design

## Context

Raqm is a personal finance app; anyone who picks up the phone can currently
open it and see every transaction and balance. This is the first of three
"App Security & Privacy Features" (App Lock, Hide Balances, bank/payment
notification scan). App Lock ships first because Hide Balances' reveal
confirmation depends on whether App Lock is configured.

v0 scope: a lock screen shown on app open and on returning to the app from
the background, unlocked via the device's own biometric/PIN/pattern check.
No custom in-app password in this feature — that's introduced by Hide
Balances for the case where App Lock isn't configured.

## Native dependency

`expo-local-authentication` — wraps Android's `BiometricPrompt`. Calling
`authenticateAsync({ disableDeviceFallback: false })` tries biometric first
and lets the OS itself fall back to whatever device credential (PIN,
pattern, password) the user already has set up. This satisfies "biometric
primary, device PIN/password fallback" with zero custom auth UI and no
secrets stored by Raqm.

This is a new native module: after `npm install`, a prebuild + 
`npm run raqm:android` is required (per this project's native/CNG rule).
Verify against https://docs.expo.dev/versions/v56.0.0/ before writing
against its API, per this project's standing Expo-SDK-56 caution.

## Setting

New `app_settings` key `app_lock_enabled` ('0'/'1'), read/written via the
existing `getSetting`/`setSetting` helpers in `src/db/database.ts` — no
schema migration needed, this table already exists and is generic
key-value.

A new "Security" section in `SettingsScreen.tsx` holds the toggle:

- **Turning ON:** first call `canUseDeviceAuth()` (see below). If the
  device has no biometric enrolled AND no PIN/pattern/password set up,
  show an alert ("Set up a screen lock in your phone's settings first")
  and leave the toggle off. Otherwise persist `app_lock_enabled = '1'`.
- **Turning OFF:** persist `app_lock_enabled = '0'` immediately, no
  additional confirmation required (the user already passed the lock to
  reach Settings in the first place during this session).

## `src/services/auth/appLock.ts`

```ts
export async function isAppLockEnabled(): Promise<boolean>;
export async function setAppLockEnabled(enabled: boolean): Promise<void>;

// True if the device has biometric enrolled OR a PIN/pattern/password set.
export async function canUseDeviceAuth(): Promise<boolean>;

// Runs the OS biometric/device-credential prompt. Resolves true only on
// an actual successful authentication; resolves false on cancel, failure,
// or lockout — never throws for user-facing failure cases.
export async function authenticateWithDevice(reason: string): Promise<boolean>;
```

`canUseDeviceAuth()` combines `LocalAuthentication.hasHardwareAsync()` (or
`isEnrolledAsync()` for biometrics) with `getEnrolledLevelAsync()` /
`supportedAuthenticationTypesAsync()` semantics — the exact call shape is
pinned down at plan-writing time against the versioned Expo docs, not
guessed here.

This module is intentionally the shared home for "does this device have
usable auth" — Hide Balances' design will read `canUseDeviceAuth()` and
`isAppLockEnabled()` from here rather than duplicating the check.

## `src/components/LockScreen.tsx`

Full-screen, theme-token-only (dark theme, `Colors.*`, NativeWind since
this is a new screen — see project styling convention), no navigation
chrome:

- App name/icon, "Unlock Raqm" headline.
- An explicit "Unlock" button — the OS prompt can appear automatically on
  mount, but a visible retry affordance is required for when the user
  dismisses/cancels it (back button, tap-outside, or a failed attempt) so
  they aren't stuck looking at a screen with no way to retry.
- No path around this screen other than a successful `authenticateWithDevice`
  call — no skip, no timeout auto-dismiss.

## Gate in `App.tsx`

`AppContent` currently renders `<AppNavigator />` directly inside the
top-inset `View`. A new lock gate wraps it:

- State: `locked: boolean`, initialized `true` if `isAppLockEnabled()`
  resolves true (checked once, before first paint of the navigator), else
  `false` (lock is off — gate is a pass-through, no behavior change at
  all when the setting is off, per the task's explicit requirement).
- On mount, if enabled, immediately call `authenticateWithDevice()`; render
  `LockScreen` while `locked` is true, `AppNavigator` once it flips false.
- `AppState` listener: on `background` → `active` transition, if
  `app_lock_enabled` is on, set `locked = true` and re-run
  `authenticateWithDevice()`. This means re-lock fires on **every**
  return from background, not just cold start — the standard behavior for
  a finance app, since otherwise switching apps and back would skip the
  lock screen the task explicitly asks for on "app open." If the setting
  is off at the time of the transition, this listener is a no-op.
- The gate reads `isAppLockEnabled()` fresh at both checkpoints (mount and
  each foreground transition) rather than caching it in a module-level
  variable, so a change made in Settings takes effect on the very next
  background/foreground cycle without requiring an app restart.

## Error handling

- `authenticateWithDevice` failing (wrong biometric, user cancels, device
  lockout after too many attempts) leaves `locked = true` — `LockScreen`
  stays up, "Unlock" button lets the user retry.
- If `canUseDeviceAuth()` is false at the moment App Lock would activate
  (e.g., the user removed their device screen lock after enabling App
  Lock in Raqm), the gate treats this as "cannot lock" and passes through
  to `AppNavigator` unlocked, rather than presenting an unlock screen with
  no possible way to unlock. This is a safety valve, not a security
  guarantee — Hide Balances' spec will note the same edge case for its
  "set up a password" prompt.

## Out of scope (v0)

- Any lock-timeout/grace-period setting (e.g. "only re-lock after 5
  minutes in background") — not requested; every background→foreground
  transition re-locks.
- Screenshot/recent-apps-preview protection (`FLAG_SECURE`) — a separate,
  narrower concern not requested here.
- A custom in-app password as a fallback for App Lock itself — this is
  reserved for Hide Balances, where the requirement is explicit.
