# Hide Balances — Design

## Context

Second of the "App Security & Privacy Features" list, after App Lock (spec:
`docs/superpowers/specs/2026-08-16-app-lock-design.md`). Lets a user mask
income/expense/net/bank-balance figures on screen as `****`, revealing them
only after a one-time-per-session confirmation.

This feature must keep working even when App Lock is off — App Lock and
Hide Balances are related but independent: App Lock gates the whole app on
open; Hide Balances gates individual values and needs its own fallback
authentication (a custom app password) for users who never set up App Lock.

## Settings

Four new `app_settings` keys, each `'0'`/`'1'`, via the existing
`getSetting`/`setSetting` helpers (`src/db/database.ts`) — no schema
migration, same pattern as App Lock's `app_lock_enabled`:

- `hide_income`
- `hide_expense`
- `hide_net`
- `hide_bank_balances`

A new "Hide balances" section in `SettingsScreen.tsx`, one toggle per key,
placed after the "Security" section App Lock adds.

## Reveal authentication

Reveal-auth method is decided **fresh every time**, never cached — this is
what keeps Hide Balances working if App Lock is later turned off:

```ts
// src/services/auth/hiddenBalance.ts
export type RevealAuthMethod = 'device' | 'password' | 'setup-password';

export async function getRevealAuthMethod(): Promise<RevealAuthMethod>;
// 'device'          — isAppLockEnabled() && canUseDeviceAuth() are both true
//                      (both from src/services/auth/appLock.ts, reused as-is)
// 'password'         — a custom app password has already been set
// 'setup-password'   — neither of the above; no auth method exists yet

export async function hasAppPassword(): Promise<boolean>;
export async function setAppPassword(password: string): Promise<void>;
export async function verifyAppPassword(password: string): Promise<boolean>;
```

The custom password is new secret storage Hide Balances introduces (App
Lock stores nothing). Given the threat model here is "someone glancing at
an unlocked phone," not encrypting data at rest, `setAppPassword` stores a
salted SHA-256 hash (`expo-crypto`'s `digestStringAsync`, salt from
`getRandomBytesAsync`) as two new `app_settings` keys:
`hidden_balance_password_hash`, `hidden_balance_password_salt`. This is a
new native dependency (`expo-crypto`) — same prebuild/rebuild requirement
as App Lock's `expo-local-authentication`. Not using `expo-secure-store`
(Keystore-backed) here is a deliberate choice: this password gates a UI
reveal, it isn't the last line of defense against data extraction, and
Raqm doesn't otherwise have a secure-storage dependency.

## Two independent layers

1. **Session unlock** — an in-memory-only flag (a small zustand store,
   matching the project's existing `txStore`/`onboardingStore` pattern),
   reset on every cold start. Set to true the first time reveal-auth
   succeeds in a session. Every subsequent tap on any masked value in that
   session skips straight to layer 2 — no repeat prompts, per the spec's
   explicit "don't ask again for the rest of the session."

2. **Per-value reveal with 30s auto-hide** — each masked value manages its
   own local reveal state and timer, independent of other masked values on
   screen. Tapping a `****`:
   - If session isn't unlocked yet: opens a bottom sheet built on the
     existing shared `BottomSheet` component/pattern (`TransactionDetailScreen.tsx`,
     including its keyboard-avoidance handling, since the password/setup
     branches have a text input) that branches on `getRevealAuthMethod()`:
     - `'device'` — immediately triggers `authenticateWithDevice()` from
       `appLock.ts`; success unlocks the session and reveals this value.
     - `'password'` — a password input; `verifyAppPassword()` on submit.
     - `'setup-password'` — a "set up a password to reveal hidden
       balances" form (new password + confirm field), calls
       `setAppPassword()`, then treats the just-set password as verified
       immediately (no separate re-entry step).
   - If session is already unlocked: reveals immediately, no sheet.
   - 30 seconds after the last tap with no new tap, the value re-masks
     itself. Tapping it again after auto-hide re-reveals instantly (session
     is still unlocked) and restarts its own 30s timer — it does not
     re-open the auth sheet.

## `src/components/MaskedValue.tsx`

```ts
interface MaskedValueProps {
  kind: 'income' | 'expense' | 'net' | 'bank_balance';
  value: number;
  currency: string;
  style?: /* matches call sites' existing numeric text styling */;
}
```

Reads the corresponding `hide_<kind>` setting. If not hidden, renders
`formatAmount(value, currency)` directly with no interactive behavior
change from today. If hidden, renders `****` (styled with the project's
numeric font token, matching the amount it replaces) and wires up the
tap/reveal/auto-hide-timer behavior described above.

## Where it plugs in

Existing call sites currently rendering `formatAmount(...)` directly for
income/expense/net/bank-balance figures, to be swapped for `<MaskedValue>`
(exact prop values — `kind`, `currency` — pinned down per call site at
plan-writing time, since some sites already have the surrounding numeric
styling this component needs to match):

- `src/screens/main/DashboardScreen.tsx` — net (hero), income, expense
  (month-spent)
- `src/screens/main/AnalyticsScreen.tsx` — whichever income/expense/net
  totals it displays
- `src/screens/main/ManageAccountsScreen.tsx`, `AccountDetailScreen.tsx` —
  bank balances
- `src/screens/main/TransactionsScreen.tsx` — any balance figures shown
  there

## Error handling

- Wrong password / failed biometric: bottom sheet stays open, inline error
  message, retry — same "no dead end" principle as the App Lock screen.
- `getRevealAuthMethod()` re-evaluated on every reveal attempt (not once
  per session) — so if App Lock is turned off mid-session after being used
  for an earlier reveal, the *next* reveal attempt (this session or a
  future one) falls through to `'password'` or `'setup-password'` rather
  than failing outright, satisfying "must keep working even if app lock is
  later turned off."
- Forgotten custom password: out of scope for v0 — no reset flow. Noted
  below.

## Out of scope (v0)

- Password reset/recovery flow for the custom app password.
- A global "reveal all" action — each masked value is revealed
  individually.
- Configurable auto-hide duration (fixed at 30s, matching the spec).
- Screenshot/recording protection for revealed values — same out-of-scope
  note as App Lock's spec.
