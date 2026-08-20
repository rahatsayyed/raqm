# Hide Balances Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user mask income / expense / net / bank-balance figures on screen as `****`, revealing an individual value only after a one-time-per-session authentication (device biometric, a custom app password, or a first-run password setup), with each revealed value auto-re-masking 30 seconds after its last tap.

**Architecture:** Four new `'0'`/`'1'` `app_settings` keys (`hide_income`, `hide_expense`, `hide_net`, `hide_bank_balances`) are owned by a new zustand store `src/store/hiddenBalanceStore.ts`, which also holds the in-memory-only `sessionUnlocked` flag (reset on every cold start, never persisted). A new service `src/services/auth/hiddenBalance.ts` decides the reveal-auth method **fresh on every attempt** — `'device'` when App Lock is on *and* the device has usable auth, `'password'` when a custom app password hash exists, `'setup-password'` otherwise — and owns the salted SHA-256 password hash (new `expo-crypto` native dependency, two more `app_settings` keys). A new presentational component `src/components/MaskedValue.tsx` replaces bare `formatAmount(...)` calls at the aggregate/balance call sites; when its `kind` is hidden it renders a tappable `****` that opens `src/components/RevealAuthSheet.tsx` (a bottom sheet replicating `TransactionDetailScreen`'s keyboard-lifting shell) and then manages its own 30s auto-hide timer.

**Tech Stack:** Expo SDK 56, React Native 0.85 (New Architecture), TypeScript, `expo-crypto`, `expo-local-authentication` (already added by the App Lock plan), expo-sqlite (generic `app_settings` key-value table), zustand, NativeWind.

**Spec:** `docs/superpowers/specs/2026-08-16-hide-balances-design.md`

**Companion spec (dependency):** `docs/superpowers/specs/2026-08-16-app-lock-design.md` and its plan `docs/superpowers/plans/2026-08-16-app-lock.md`.

## Global Constraints

- **Work dir:** every `apps/raqm`-relative path in this plan is under
  `/Users/copods/Documents/Projects/personal/Raqm/apps/raqm`. Branch:
  `build/v0-mvp`.
- **No test runner.** This app has no jest/vitest setup (per `CLAUDE.md`; only
  `packages/bank-sms-parser` has tests, and this feature does not touch it).
  The objective per-task gate is:
  ```bash
  cd /Users/copods/Documents/Projects/personal/Raqm/apps/raqm && npx tsc --noEmit
  ```
  It **must** be run from `apps/raqm`, never the repo root (the root tsconfig
  fails with TS6305). "Typecheck clean" is the completion gate for every task.
- **Device verification is a separate, pending step — never a task blocker.**
  No physical device or emulator is available to the controller executing this
  plan. Tasks that need a device list their manual checks under "Pending device
  verification"; a task is still *complete* when typecheck passes.
- **Expo SDK 56 API caution.** Per `apps/raqm/AGENTS.md`: *"Read the exact
  versioned docs at https://docs.expo.dev/versions/v56.0.0/ before writing any
  code."* Task 1 in particular **MUST** fetch
  `https://docs.expo.dev/versions/v56.0.0/sdk/crypto/` and correct the
  signatures given in this plan against the real page before writing any
  `expo-crypto` call.
- **Setting keys** — all in the existing generic `app_settings` table, all read
  and written through the existing `getSetting` / `setSetting` helpers.
  **No schema migration** — do not touch the migration runner and do not bump
  `schema_migrations`.
  | Key | Values | Meaning |
  |---|---|---|
  | `hide_income` | `'0'` \| `'1'` | mask income aggregates |
  | `hide_expense` | `'0'` \| `'1'` | mask expense / spend aggregates |
  | `hide_net` | `'0'` \| `'1'` | mask the net figure |
  | `hide_bank_balances` | `'0'` \| `'1'` | mask bank / account balances |
  | `hidden_balance_password_hash` | hex string | SHA-256 of `salt:password` |
  | `hidden_balance_password_salt` | hex string | 16 random bytes, hex-encoded |
  All four `hide_*` keys default to **off** when unset, so the feature is a pure
  no-op for every existing user until they opt in.
- **Mask string:** exactly `****` (four ASCII asterisks), per the spec. Do not
  substitute bullets, em-dashes, or a different count.
- **Auto-hide duration:** fixed at **30 000 ms**. Not configurable (spec's
  "Out of scope").
- **Styling:** NativeWind `className` only for the new components
  (`MaskedValue`, `RevealAuthSheet`) and the new Settings section. All colors,
  font families and font sizes come from `tailwind.config.js` tokens
  (`bg-surface-container-low`, `text-on-surface`, `font-mono-medium`,
  `text-metric-hero`, `text-error`, …), which mirror `src/theme`. Never hardcode
  hex or `rgba(255,…)`. `style` is permitted only where NativeWind can't express
  it — the `maxHeight`/`marginBottom` keyboard lift in the sheet, and
  `Colors.*` values passed as *props* to RN/`react-native-svg` components
  (`placeholderTextColor`, `trackColor`, icon `color`).
- **Masked text must keep the exact numeric styling of the value it replaces.**
  `MaskedValue` takes a `className` prop and applies it to both the revealed
  amount and the `****`, so no call site's layout or font changes.
- **Keyboard avoidance (required, per `CLAUDE.md`):** `RevealAuthSheet` has text
  inputs, so it must replicate `TransactionDetailScreen`'s `BottomSheet`
  keyboard handling — track keyboard height via `Keyboard.addListener` and lift
  the sheet card (`marginBottom` + shrunken `maxHeight`), plus
  `KeyboardAwareScrollView` with `enableOnAndroid extraScrollHeight={Spacing.lg}
  keyboardShouldPersistTaps="handled"`. `TransactionDetailScreen`'s
  `BottomSheet` is **not exported** (it is a module-private function at
  `apps/raqm/src/screens/main/TransactionDetailScreen.tsx:947`), and the
  established precedent for a new standalone sheet is to replicate it — see
  `apps/raqm/src/components/RefreshAccountSheet.tsx`, whose own doc comment
  says exactly this. Replicate; do **not** refactor `TransactionDetailScreen`.
- **List performance (per `CLAUDE.md`):** `MaskedValue` is rendered inside
  `TransactionsScreen`'s `FlatList` `renderItem`, so it must be wrapped in
  `React.memo` and take only primitive/stable props.
- **Native/CNG:** `apps/raqm/android/` is gitignored and regenerated by
  prebuild. Adding `expo-crypto` requires `npm run raqm:android` before the
  feature can run on a device. Never hand-edit anything under
  `apps/raqm/android/`.
- **Git:** conventional commits, `feat(raqm): …`. Commit at the end of each
  task. **Never push** — the user confirms pushes.
- **Model-tier guidance for subagent-driven execution** (per the
  `superpowers:subagent-driven-development` model-selection rules):
  - **Cheap / haiku-tier** — Task 2 (`hiddenBalanceStore.ts`): fully specified,
    mechanical, single new file, no judgment calls.
  - **Standard / sonnet-tier** — Task 1 (must read live Expo docs and reconcile
    them with the given `expo-crypto` signatures), Task 3 (the bottom sheet:
    three-way branching UI + keyboard handling), Task 4 (`MaskedValue`: timer /
    reveal-state lifecycle), Task 5 (Settings integration with existing screen
    state), and Tasks 6, 7, 8 (screen wiring — multiple files with layout
    implications, where subtle regressions are most likely).
  - **Most-capable tier** — reserved **exclusively** for the final whole-branch
    review after Task 8. Do **not** assign it to any individual implementation
    task.

---

## Dependency on the App Lock feature

Hide Balances imports from `apps/raqm/src/services/auth/appLock.ts`, which
**already exists in the working tree** (committed as `06ab10e`). Its exact
current exports — verified by reading the file, not the App Lock plan — are:

```ts
export const APP_LOCK_SETTING_KEY = 'app_lock_enabled';
export async function isAppLockEnabled(): Promise<boolean>;
export async function setAppLockEnabled(enabled: boolean): Promise<void>;
export async function canUseDeviceAuth(): Promise<boolean>;
export async function authenticateWithDevice(reason: string): Promise<boolean>;
```

Status of each, as of the start of this plan:

| Export | State |
|---|---|
| `isAppLockEnabled` | **fully implemented** — reads `app_lock_enabled`, returns `raw === '1'` |
| `setAppLockEnabled` | **fully implemented** |
| `canUseDeviceAuth` | **stub, returns `false`** — App Lock's Task 2 fills it in |
| `authenticateWithDevice` | **stub, returns `false`** — App Lock's Task 2 fills it in |

**These four signatures are final and will not change** when App Lock's Task 2
lands; only the two stub bodies get replaced. So this plan may call all four
freely.

**Consequence to be aware of while implementing and reviewing:** until App
Lock's Task 2 is done, `canUseDeviceAuth()` returns `false`, so
`getRevealAuthMethod()` will never return `'device'` and the sheet's device
branch is unreachable at runtime. That is expected and is **not** a bug in this
plan's code — do not "fix" it by reimplementing the auth calls here.
`expo-local-authentication` must be called from `appLock.ts` and nowhere else.

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `apps/raqm/package.json` | Modify | adds the `expo-crypto` dependency |
| `apps/raqm/src/services/auth/hiddenBalance.ts` | Create | the only module that knows the password-hash keys and the only module that calls `expo-crypto`; decides the reveal-auth method |
| `apps/raqm/src/store/hiddenBalanceStore.ts` | Create | owns the four `hide_*` settings in memory + the session-unlock flag; the only module that knows the `hide_*` key names |
| `apps/raqm/src/components/RevealAuthSheet.tsx` | Create | the device / password / setup-password bottom sheet |
| `apps/raqm/src/components/MaskedValue.tsx` | Create | mask-or-render-amount, tap-to-reveal, 30s auto-hide |
| `apps/raqm/src/screens/main/SettingsScreen.tsx` | Modify | "HIDE BALANCES" section with four toggles |
| `apps/raqm/src/components/dashboard/HeroMetric.tsx` | Modify | widen `value` / `stats[].value` to `React.ReactNode` |
| `apps/raqm/src/screens/main/DashboardScreen.tsx` | Modify | net hero, Debit stat, Credit stat, advisor sentence |
| `apps/raqm/src/components/analytics/BriefingHero.tsx` | Modify | widen `value` to `React.ReactNode` |
| `apps/raqm/src/components/AccountLiquidityCard.tsx` | Modify | per-account available balance |
| `apps/raqm/src/screens/main/AnalyticsScreen.tsx` | Modify | spending hero, total liquidity |
| `apps/raqm/src/screens/main/ManageAccountsScreen.tsx` | Modify | per-account balance |
| `apps/raqm/src/screens/main/AccountDetailScreen.tsx` | Modify | last known balance, card outstanding |
| `apps/raqm/src/screens/main/TransactionsScreen.tsx` | Modify | day-header total |

### Call sites in scope, and the ones deliberately excluded

Pinned down by grepping `formatAmount` in each named screen. **In scope**
(aggregate / balance figures only):

| File:line (pre-edit) | Figure | `kind` |
|---|---|---|
| `DashboardScreen.tsx:614` | `HeroMetric value` — net this month | `net` |
| `DashboardScreen.tsx:622` | `HeroMetric` "Debit" stat — `metrics.monthSpent` | `expense` |
| `DashboardScreen.tsx:627` | `HeroMetric` "Credit" stat — `metrics.income` | `income` |
| `DashboardScreen.tsx:508` | `advisorLine` prose — "You've spent ₹X so far this month." | `expense` (string-level, see Task 6) |
| `AnalyticsScreen.tsx:358` | `BriefingHero value` — month spending total | `expense` |
| `AnalyticsScreen.tsx:494` | "TOTAL LIQUIDITY" total | `bank_balance` |
| `AccountLiquidityCard.tsx` (`balance` render) | per-account "Available Balance" in the Analytics liquidity strip | `bank_balance` |
| `ManageAccountsScreen.tsx:120` | per-account balance | `bank_balance` |
| `AccountDetailScreen.tsx:175` | last known balance | `bank_balance` |
| `AccountDetailScreen.tsx:219` | card "Outstanding" | `bank_balance` |
| `TransactionsScreen.tsx:283` | day-header total (`dayTotals`, sum of that day's amounts) | `expense` |

**Explicitly out of scope** — these render `formatAmount` but are *not* the
aggregate/balance figures the spec names. Do not touch them; a reviewer seeing
them unchanged should know it was deliberate:

- `DashboardScreen.tsx:659`, `DashboardScreen.tsx:712`,
  `AnalyticsScreen.tsx:384`, `AnalyticsScreen.tsx:474`,
  `AccountDetailScreen.tsx:304`, `TransactionsScreen.tsx:503` — individual
  transaction / upcoming-due row amounts.
- `TransactionsScreen.tsx:301` — a merged-group row's sum. A group row is a
  row, not an aggregate header.
- `AnalyticsScreen.tsx:422` — the top-merchant spend *delta* ("₹X less"), a
  comparison inside prose, not an income/expense/net total.
- `AccountLiquidityCard.tsx` `monthSpend` — a per-account month spend shown as
  a small secondary figure on the card, not one of the four named aggregates.

---

### Task 1: `expo-crypto` dependency + `hiddenBalance.ts` service

**Model tier:** standard / sonnet — this task must reconcile the signatures
below against the live Expo v56 docs and make a judgment call where they differ.

**Files:**
- Modify: `apps/raqm/package.json` (via `npx expo install`, not by hand)
- Create: `apps/raqm/src/services/auth/hiddenBalance.ts`

**Interfaces:**
- Consumes: `getSetting` / `setSetting` from `apps/raqm/src/db/database.ts`
  (exact existing signatures, verified at `src/db/database.ts:703` and `:712`):
  ```ts
  export async function getSetting(key: string): Promise<string | null>;
  export async function setSetting(key: string, value: string): Promise<void>;
  ```
  and, from `apps/raqm/src/services/auth/appLock.ts` (already in the tree — see
  the "Dependency on the App Lock feature" section above):
  ```ts
  export async function isAppLockEnabled(): Promise<boolean>;
  export async function canUseDeviceAuth(): Promise<boolean>;
  ```
- Produces, consumed by Tasks 3 and 4:
  ```ts
  export const PASSWORD_HASH_KEY = 'hidden_balance_password_hash';
  export const PASSWORD_SALT_KEY = 'hidden_balance_password_salt';
  export type RevealAuthMethod = 'device' | 'password' | 'setup-password';
  export async function getRevealAuthMethod(): Promise<RevealAuthMethod>;
  export async function hasAppPassword(): Promise<boolean>;
  export async function setAppPassword(password: string): Promise<void>;
  export async function verifyAppPassword(password: string): Promise<boolean>;
  ```

- [ ] **Step 1: Install the native dependency**

Run from the app workspace so the dependency lands in `apps/raqm/package.json`:

```bash
cd /Users/copods/Documents/Projects/personal/Raqm/apps/raqm && npx expo install expo-crypto
```

`npx expo install` (not plain `npm install`) is required — it picks the version
matched to Expo SDK 56.

- [ ] **Step 2: Read the versioned docs before writing any crypto call**

**This step is mandatory.** Fetch and read:

`https://docs.expo.dev/versions/v56.0.0/sdk/crypto/`

Confirm on that page:

1. `digestStringAsync` — exact name, parameter order, and whether the default
   return encoding is lowercase hex. Expected:
   `digestStringAsync(algorithm: CryptoDigestAlgorithm, data: string, options?: { encoding: CryptoEncoding }): Promise<string>`,
   hex by default.
2. `CryptoDigestAlgorithm.SHA256` — confirm the enum name and the member
   spelling (`SHA256`, not `SHA_256`).
3. `getRandomBytesAsync` — expected
   `getRandomBytesAsync(byteCount: number): Promise<Uint8Array>`. If v56 has
   dropped or renamed it, use whatever the page lists for cryptographically
   secure random bytes (`getRandomBytes` is the sync sibling; `randomUUID()` is
   an acceptable fallback salt source **only** if both byte functions are gone —
   say so in the task report if you have to fall back).
4. The "Configuration in app config" section — `expo-crypto` historically needs
   **no** config plugin and no Android permission. If, and only if, the v56 page
   says otherwise, add the plugin entry to the `expo.plugins` array in
   `apps/raqm/app.json` alongside the existing `"expo-sqlite"` /
   `"expo-sharing"` string entries, keeping the array's existing formatting.
   If the docs confirm no config is needed, change nothing in `app.json`.

The code in Step 3 is a **best-guess starting point, not authority**. Where the
docs disagree, follow the docs and note the correction in the task report.

- [ ] **Step 3: Create the service module**

Create `apps/raqm/src/services/auth/hiddenBalance.ts`:

```ts
import * as Crypto from 'expo-crypto';
import { getSetting, setSetting } from '../../db/database';
import { canUseDeviceAuth, isAppLockEnabled } from './appLock';

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
  let out = '';
  for (const byte of bytes) {
    out += byte.toString(16).padStart(2, '0');
  }
  return out;
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
 * Device auth wins when it is genuinely available: App Lock on AND the device
 * has a biometric or PIN/pattern/password. Otherwise fall back to the custom
 * password, and if there isn't one yet, ask the user to create one.
 *
 * Note: `canUseDeviceAuth()` is still a stub returning false until App Lock's
 * Task 2 lands, so this will resolve to 'password' / 'setup-password' in the
 * meantime. That is expected — do not work around it here.
 */
export async function getRevealAuthMethod(): Promise<RevealAuthMethod> {
  const [lockOn, deviceUsable] = await Promise.all([
    isAppLockEnabled(),
    canUseDeviceAuth(),
  ]);
  if (lockOn && deviceUsable) return 'device';
  return (await hasAppPassword()) ? 'password' : 'setup-password';
}
```

- [ ] **Step 4: Typecheck**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm/apps/raqm && npx tsc --noEmit
```

Expected: clean, no output. A failure most likely means the `expo-crypto` enum
or function names differ in v56 — go back to Step 2 and use the real names.
`for (const byte of bytes)` over a `Uint8Array` requires `downlevelIteration`
or an ES2015+ target; if it errors, replace the loop body's iteration with
`Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')` and
keep everything else identical.

- [ ] **Step 5: Rebuild the native app**

Adding a native module changes the native project, so a rebuild is required per
`CLAUDE.md` (a JS-only Metro reload is not enough):

```bash
cd /Users/copods/Documents/Projects/personal/Raqm && npm run raqm:android
```

**If no device or emulator is attached, this command will fail at the install
step. That is expected and is NOT a task failure** — record the failure output
and move on. The objective gate for this task remains Step 4's clean typecheck.
Flag in the task report that `npm run raqm:android` and on-device verification
are still pending for a human with a device.

- [ ] **Step 6: Commit**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm
git add apps/raqm/package.json package-lock.json apps/raqm/src/services/auth/hiddenBalance.ts
git commit -m "feat(raqm): add expo-crypto and hiddenBalance auth service"
```

(If Step 2 modified `app.json`, add `apps/raqm/app.json` to the `git add` too.)

**Pending device verification (not a blocker):** on a real phone, set a
password, force-quit, reopen, and confirm the same password still verifies
(salt and hash survived the restart) and that a wrong password returns false.

---

### Task 2: `hiddenBalanceStore.ts` — hide settings + session-unlock flag

**Model tier:** cheap / haiku — fully specified, one new file, no judgment calls.

**Files:**
- Create: `apps/raqm/src/store/hiddenBalanceStore.ts`

**Interfaces:**
- Consumes: `getSetting` / `setSetting` from `apps/raqm/src/db/database.ts`
  (signatures repeated in Task 1's Interfaces block). Follows the existing
  zustand pattern in `apps/raqm/src/store/onboardingStore.ts`
  (`create<Store>((set) => ({ … }))` from `'zustand'`).
- Produces, consumed by Tasks 3–8:
  ```ts
  export type MaskedKind = 'income' | 'expense' | 'net' | 'bank_balance';
  export const HIDE_SETTING_KEYS: Record<MaskedKind, string>;
  export const useHiddenBalanceStore: /* zustand store hook */;
  // store state:
  //   hydrated: boolean
  //   hidden: Record<MaskedKind, boolean>
  //   sessionUnlocked: boolean
  //   hydrate: () => Promise<void>
  //   setHidden: (kind: MaskedKind, value: boolean) => Promise<void>
  //   unlockSession: () => void
  ```

- [ ] **Step 1: Create the store**

Create `apps/raqm/src/store/hiddenBalanceStore.ts`:

```ts
import { create } from 'zustand';
import { getSetting, setSetting } from '../db/database';

/** The four maskable figure classes, one per `hide_*` setting. */
export type MaskedKind = 'income' | 'expense' | 'net' | 'bank_balance';

/**
 * The only place the `hide_*` key names live. Note `bank_balance` maps to the
 * plural `hide_bank_balances` — that asymmetry is the spec's, kept as-is.
 */
export const HIDE_SETTING_KEYS: Record<MaskedKind, string> = {
  income: 'hide_income',
  expense: 'hide_expense',
  net: 'hide_net',
  bank_balance: 'hide_bank_balances',
};

const ALL_KINDS: MaskedKind[] = ['income', 'expense', 'net', 'bank_balance'];

interface HiddenBalanceStore {
  /** False until the four settings have been read from SQLite once. */
  hydrated: boolean;
  hidden: Record<MaskedKind, boolean>;
  /**
   * In-memory only, deliberately never persisted — a cold start must always
   * re-authenticate. True once a reveal-auth attempt has succeeded this session.
   */
  sessionUnlocked: boolean;
  hydrate: () => Promise<void>;
  setHidden: (kind: MaskedKind, value: boolean) => Promise<void>;
  unlockSession: () => void;
}

/**
 * Deduped hydration: several MaskedValue instances mount in the same frame and
 * would otherwise each fire four SELECTs. Mirrors the reason `getDb()` caches
 * its promise rather than its handle (see CLAUDE.md).
 */
let hydratePromise: Promise<void> | null = null;

export const useHiddenBalanceStore = create<HiddenBalanceStore>((set) => ({
  hydrated: false,
  // Default OFF for every kind: unset keys mean the feature is a no-op for
  // every existing user until they opt in from Settings.
  hidden: { income: false, expense: false, net: false, bank_balance: false },
  sessionUnlocked: false,

  hydrate: async () => {
    if (hydratePromise) return hydratePromise;
    hydratePromise = (async () => {
      const raws = await Promise.all(
        ALL_KINDS.map((kind) => getSetting(HIDE_SETTING_KEYS[kind])),
      );
      const hidden: Record<MaskedKind, boolean> = {
        income: false,
        expense: false,
        net: false,
        bank_balance: false,
      };
      ALL_KINDS.forEach((kind, i) => {
        hidden[kind] = raws[i] === '1';
      });
      set({ hidden, hydrated: true });
    })();
    return hydratePromise;
  },

  setHidden: async (kind, value) => {
    // Optimistic in-memory update first so the Settings switch and every
    // on-screen MaskedValue flip in the same frame; the write follows.
    set((state) => ({ hidden: { ...state.hidden, [kind]: value } }));
    await setSetting(HIDE_SETTING_KEYS[kind], value ? '1' : '0');
  },

  unlockSession: () => set({ sessionUnlocked: true }),
}));

// Kick hydration off at module load. This module is imported by MaskedValue,
// which is imported by the screens, so the read starts during bundle
// evaluation — strictly earlier than txStore's transaction load, which is what
// produces the numbers MaskedValue renders. In practice hydration is always
// finished before any real amount exists to display.
void useHiddenBalanceStore.getState().hydrate();
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm/apps/raqm && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm
git add apps/raqm/src/store/hiddenBalanceStore.ts
git commit -m "feat(raqm): add hiddenBalance store for hide settings and session unlock"
```

---

### Task 3: `RevealAuthSheet` — the device / password / setup bottom sheet

**Model tier:** standard / sonnet — three-way branching UI plus the keyboard
lift; integration judgment required.

**Files:**
- Create: `apps/raqm/src/components/RevealAuthSheet.tsx`

**Interfaces:**
- Consumes:
  - `getRevealAuthMethod`, `setAppPassword`, `verifyAppPassword`,
    `type RevealAuthMethod` from `../services/auth/hiddenBalance` (Task 1).
  - `authenticateWithDevice` from `../services/auth/appLock` — signature
    `(reason: string) => Promise<boolean>`, see the App Lock dependency section.
  - `KeyboardAwareScrollView` from `./KeyboardAwareScrollView` (the
    cssInterop-wrapped one required by `CLAUDE.md`).
  - `Colors`, `Spacing` from `../theme`.
- Produces, consumed by Task 4:
  ```ts
  export function RevealAuthSheet(props: {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
  }): React.JSX.Element;
  ```
  `onSuccess` fires *in addition to* the caller closing the sheet — the sheet
  calls `onSuccess()` then `onClose()`.

- [ ] **Step 1: Read the sheet shell being replicated**

Read `apps/raqm/src/screens/main/TransactionDetailScreen.tsx` lines 947–1025
(the module-private `BottomSheet`) and
`apps/raqm/src/components/RefreshAccountSheet.tsx` lines 1–80 (the existing
precedent for replicating it in a standalone component). The keyboard-lift
mechanics below are copied from them; if either has drifted, match the version
in `TransactionDetailScreen.tsx` — `CLAUDE.md` names it the canonical one.

- [ ] **Step 2: Create the component**

Create `apps/raqm/src/components/RevealAuthSheet.tsx`:

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../theme';
import { KeyboardAwareScrollView } from './KeyboardAwareScrollView';
import { authenticateWithDevice } from '../services/auth/appLock';
import {
  getRevealAuthMethod,
  setAppPassword,
  verifyAppPassword,
  type RevealAuthMethod,
} from '../services/auth/hiddenBalance';

interface Props {
  visible: boolean;
  /** Dismiss without revealing. Also called by the sheet right after onSuccess. */
  onClose: () => void;
  /** A real successful authentication. The caller unlocks the session and reveals. */
  onSuccess: () => void;
}

const MIN_PASSWORD_LENGTH = 4;

/**
 * Reveal-auth sheet for hidden balances. Not routed through
 * TransactionDetailScreen's BottomSheet (that component isn't exported) —
 * replicates its keyboard-lift technique per CLAUDE.md, since the password and
 * setup branches both need text inputs.
 *
 * The auth method is resolved on every open, never cached, so turning App Lock
 * off mid-session correctly falls through to the password branch next time.
 */
export function RevealAuthSheet({ visible, onClose, onSuccess }: Props) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const [method, setMethod] = useState<RevealAuthMethod | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Guards a second submit while one is in flight — double-tap double-submits
  // have shipped twice in this app (CLAUDE.md).
  const busyRef = useRef(false);
  const passwordRef = useRef<TextInput | null>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const succeed = useCallback(() => {
    onSuccess();
    onClose();
  }, [onSuccess, onClose]);

  const runDeviceAuth = useCallback(async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const ok = await authenticateWithDevice('Reveal hidden balances');
      if (ok) succeed();
      // No dead end: on failure the sheet stays open with a retry button.
      else setError('Authentication failed. Try again.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [succeed]);

  // Resolve the method on each open and immediately fire the OS prompt in the
  // 'device' case, so that branch needs no extra tap.
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setPassword('');
    setConfirm('');
    setError(null);
    setMethod(null);
    Keyboard.dismiss();
    (async () => {
      const next = await getRevealAuthMethod();
      if (cancelled) return;
      setMethod(next);
      if (next === 'device') {
        await runDeviceAuth();
      } else {
        // autoFocus fires before KeyboardAwareScrollView has measured a
        // freshly-mounted input, so focus on a short delay instead (CLAUDE.md).
        setTimeout(() => passwordRef.current?.focus(), 80);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, runDeviceAuth]);

  async function onSubmitPassword() {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      const ok = await verifyAppPassword(password);
      if (ok) succeed();
      else setError('Incorrect password.');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  async function onSubmitSetup() {
    if (busyRef.current) return;
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    try {
      await setAppPassword(password);
      // The password the user just typed counts as verified — the spec is
      // explicit that there is no separate re-entry step.
      succeed();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  const maxSheetHeight =
    keyboardHeight > 0
      ? windowHeight - keyboardHeight - insets.top - Spacing.lg
      : windowHeight * 0.8;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable className="flex-1 bg-[#0e151299] justify-end" onPress={onClose}>
        <Pressable
          className="bg-surface-container-low rounded-t-2xl border-t border-border-subtle"
          style={{ maxHeight: maxSheetHeight, marginBottom: keyboardHeight }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center py-3">
            <View className="w-12 h-1.5 rounded-full bg-surface-variant" />
          </View>
          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={Spacing.lg}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingBottom: (keyboardHeight > 0 ? 0 : insets.bottom) + Spacing.sm,
            }}
          >
            <View className="px-container-margin pb-lg">
              <Text className="font-inter-bold text-headline-sm text-on-surface mb-xs">
                Reveal hidden balances
              </Text>

              {method === null && (
                <Text className="font-inter text-body-standard text-on-surface-variant">
                  Checking how to confirm it's you…
                </Text>
              )}

              {method === 'device' && (
                <>
                  <Text className="font-inter text-body-standard text-on-surface-variant mb-md">
                    Confirm with your fingerprint, PIN or pattern.
                  </Text>
                  <TouchableOpacity
                    className="bg-primary rounded-lg py-[12px] items-center"
                    activeOpacity={0.8}
                    disabled={busy}
                    onPress={runDeviceAuth}
                  >
                    <Text className="font-inter-semibold text-body-md text-on-primary">
                      {busy ? 'Waiting…' : 'Try again'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {method === 'password' && (
                <>
                  <Text className="font-inter text-body-standard text-on-surface-variant mb-md">
                    Enter your Raqm password to reveal this value.
                  </Text>
                  <TextInput
                    ref={passwordRef}
                    className="font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[10px]"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="Password"
                    placeholderTextColor={Colors.outline}
                    returnKeyType="done"
                    onSubmitEditing={onSubmitPassword}
                  />
                  <TouchableOpacity
                    className="bg-primary rounded-lg py-[12px] items-center mt-md"
                    activeOpacity={0.8}
                    disabled={busy}
                    onPress={onSubmitPassword}
                  >
                    <Text className="font-inter-semibold text-body-md text-on-primary">
                      {busy ? 'Checking…' : 'Reveal'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {method === 'setup-password' && (
                <>
                  <Text className="font-inter text-body-standard text-on-surface-variant mb-md">
                    Set up a password to reveal hidden balances. You'll use it every
                    time you open the app.
                  </Text>
                  <TextInput
                    ref={passwordRef}
                    className="font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[10px]"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    placeholder="New password"
                    placeholderTextColor={Colors.outline}
                    returnKeyType="next"
                  />
                  <TextInput
                    className="font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[10px] mt-sm"
                    value={confirm}
                    onChangeText={setConfirm}
                    secureTextEntry
                    placeholder="Confirm password"
                    placeholderTextColor={Colors.outline}
                    returnKeyType="done"
                    onSubmitEditing={onSubmitSetup}
                  />
                  <Text className="font-inter text-supporting-text text-on-surface-variant mt-xs">
                    There's no way to reset this password yet — pick one you'll remember.
                  </Text>
                  <TouchableOpacity
                    className="bg-primary rounded-lg py-[12px] items-center mt-md"
                    activeOpacity={0.8}
                    disabled={busy}
                    onPress={onSubmitSetup}
                  >
                    <Text className="font-inter-semibold text-body-md text-on-primary">
                      {busy ? 'Saving…' : 'Set password and reveal'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}

              {error && (
                <Text className="font-inter text-supporting-text text-error mt-sm">{error}</Text>
              )}

              <TouchableOpacity className="py-md items-center mt-xs" onPress={onClose}>
                <Text className="font-inter text-body-md text-on-surface-variant">Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAwareScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm/apps/raqm && npx tsc --noEmit
```

Expected: clean. If `KeyboardAwareScrollView` rejects
`contentContainerStyle`, check the prop name used in
`TransactionDetailScreen.tsx`'s `BottomSheet` and match it exactly.

- [ ] **Step 4: Commit**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm
git add apps/raqm/src/components/RevealAuthSheet.tsx
git commit -m "feat(raqm): add reveal-auth bottom sheet for hidden balances"
```

**Pending device verification (not a blocker):** the sheet lifts above the
keyboard when the password field is focused; a wrong password shows the inline
error and leaves the sheet open; the setup branch rejects a mismatch and a
too-short password without closing; Cancel and the scrim both dismiss without
revealing.

---

### Task 4: `MaskedValue` — mask, tap-to-reveal, 30s auto-hide

**Model tier:** standard / sonnet — timer and reveal-state lifecycle.

**Files:**
- Create: `apps/raqm/src/components/MaskedValue.tsx`

**Interfaces:**
- Consumes:
  - `formatAmount` from `../utils/format` — exact existing signature
    (`apps/raqm/src/utils/format.ts`):
    `export function formatAmount(n: number, currency?: string | null): string`.
    Note it already applies `Math.abs`, so a caller wanting a minus sign passes
    it via `prefix`.
  - `useHiddenBalanceStore`, `type MaskedKind` from
    `../store/hiddenBalanceStore` (Task 2).
  - `RevealAuthSheet` from `./RevealAuthSheet` (Task 3).
- Produces, consumed by Tasks 6–8:
  ```ts
  export const MASK_TEXT = '****';
  export const MaskedValue: React.MemoExoticComponent<(props: {
    kind: MaskedKind;
    value: number;
    currency?: string | null;
    className?: string;
    prefix?: string;
    numberOfLines?: number;
  }) => React.JSX.Element>;
  ```

- [ ] **Step 1: Create the component**

Create `apps/raqm/src/components/MaskedValue.tsx`:

```tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Text } from 'react-native';
import { formatAmount } from '../utils/format';
import { useHiddenBalanceStore, type MaskedKind } from '../store/hiddenBalanceStore';
import { RevealAuthSheet } from './RevealAuthSheet';

export const MASK_TEXT = '****';

/** Milliseconds a revealed value stays visible after its last tap. Fixed by spec. */
const AUTO_HIDE_MS = 30_000;

interface MaskedValueProps {
  kind: MaskedKind;
  value: number;
  currency?: string | null;
  /** The exact numeric classes of the value being replaced, so nothing shifts. */
  className?: string;
  /** Rendered before the amount when revealed — e.g. Dashboard's negative-net "−". */
  prefix?: string;
  numberOfLines?: number;
}

/**
 * Renders `formatAmount(value, currency)` normally, or a tappable `****` when
 * the user has hidden this `kind`.
 *
 * Memoized with primitive-only props because this renders inside
 * TransactionsScreen's FlatList rows (CLAUDE.md's list-performance rule).
 */
export const MaskedValue = React.memo(function MaskedValue({
  kind,
  value,
  currency,
  className,
  prefix,
  numberOfLines,
}: MaskedValueProps) {
  const hiddenSetting = useHiddenBalanceStore((s) => s.hidden[kind]);
  const hydrated = useHiddenBalanceStore((s) => s.hydrated);
  const sessionUnlocked = useHiddenBalanceStore((s) => s.sessionUnlocked);
  const unlockSession = useHiddenBalanceStore((s) => s.unlockSession);

  const [revealed, setRevealed] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mask while hydration is still in flight: showing the real number and then
  // masking it would leak exactly what the feature hides. Hydration is kicked
  // off at bundle-eval time and always resolves before txStore has any
  // transactions to render, so this state is not observable in practice.
  const masked = (hiddenSetting || !hydrated) && !revealed;

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Each instance owns its own timer, so revealing one value never affects
  // another on the same screen.
  const revealForAWhile = useCallback(() => {
    setRevealed(true);
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setRevealed(false);
    }, AUTO_HIDE_MS);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  // Turning the setting back off in Settings must not leave a stale timer
  // ticking against a value that is no longer masked at all.
  useEffect(() => {
    if (!hiddenSetting) {
      clearTimer();
      setRevealed(false);
    }
  }, [hiddenSetting, clearTimer]);

  const onPress = useCallback(() => {
    // Already unlocked this session (including after an auto-hide): reveal
    // instantly and restart this value's own timer. No second prompt, ever.
    if (sessionUnlocked) {
      revealForAWhile();
      return;
    }
    setSheetVisible(true);
  }, [sessionUnlocked, revealForAWhile]);

  const onAuthSuccess = useCallback(() => {
    unlockSession();
    revealForAWhile();
  }, [unlockSession, revealForAWhile]);

  if (!hiddenSetting && hydrated) {
    // Not hidden: byte-for-byte the same output as the bare formatAmount call
    // this component replaced, with no interactive behavior added.
    return (
      <Text className={className} numberOfLines={numberOfLines}>
        {prefix}
        {formatAmount(value, currency)}
      </Text>
    );
  }

  return (
    <>
      <Text className={className} numberOfLines={numberOfLines} onPress={onPress} suppressHighlighting>
        {masked ? MASK_TEXT : `${prefix ?? ''}${formatAmount(value, currency)}`}
      </Text>
      {sheetVisible && (
        <RevealAuthSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          onSuccess={onAuthSuccess}
        />
      )}
    </>
  );
});
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm/apps/raqm && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm
git add apps/raqm/src/components/MaskedValue.tsx
git commit -m "feat(raqm): add MaskedValue component with tap reveal and auto-hide"
```

**Pending device verification (not a blocker):** with a kind hidden, tapping
`****` opens the sheet once; after a successful auth, other masked values on the
same screen reveal on a single tap with no sheet; a revealed value re-masks
after 30 seconds; tapping it again re-reveals instantly and restarts its own 30s
window without re-opening the sheet.

---

### Task 5: "HIDE BALANCES" section in `SettingsScreen`

**Model tier:** standard / sonnet — integrates with existing screen state.

**Files:**
- Modify: `apps/raqm/src/screens/main/SettingsScreen.tsx`
  (imports at lines 1–6; new JSX section immediately before the
  `{/* APPEARANCE */}` comment, currently line 209)

**Interfaces:**
- Consumes: `useHiddenBalanceStore`, `type MaskedKind` from
  `../../store/hiddenBalanceStore` (Task 2).
- Produces: no new exports.

- [ ] **Step 1: Add the import**

Add directly below the existing `notifications` import (line 6) in
`apps/raqm/src/screens/main/SettingsScreen.tsx`:

```tsx
import { useHiddenBalanceStore, type MaskedKind } from '../../store/hiddenBalanceStore';
```

No change to the `react-native` import on line 2 — `View`, `Text` and `Switch`
are already imported there.

- [ ] **Step 2: Read the store in the component**

Add immediately after the existing `const [drafts, setDrafts] = useState…`
declaration (line 19), inside `SettingsScreen`:

```tsx
  // Read straight from the store rather than adding four more useState +
  // getSetting calls to `reload`: the store is already the source of truth for
  // these keys and is hydrated at bundle-eval time, so the switches are correct
  // on first paint and stay in sync with every on-screen MaskedValue.
  const hiddenBalances = useHiddenBalanceStore((s) => s.hidden);
  const setHiddenBalance = useHiddenBalanceStore((s) => s.setHidden);
```

Do **not** touch the existing `reload` callback.

- [ ] **Step 3: Add the section JSX**

Insert immediately above the `{/* APPEARANCE */}` comment (currently line 209),
matching the neighbouring PERIOD / NOTIFICATIONS / BUDGETS sections exactly.

**Placement note:** the spec asks for this section "after the Security section
App Lock adds". App Lock's Task 5 (which adds that SECURITY section in the same
place) may or may not be committed yet. Either way the correct insertion point
is the same: **immediately before `{/* APPEARANCE */}`** — which is after
SECURITY when SECURITY exists, and after BUDGETS when it doesn't. Do not add a
SECURITY section here; that belongs to the App Lock plan.

```tsx
        {/* HIDE BALANCES */}
        <Text className="font-inter-semibold text-section-header text-on-surface-variant mt-lg mb-sm">HIDE BALANCES</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
          <Text className="font-inter text-supporting-text text-on-surface-variant mb-sm">
            Hidden figures show as **** until you tap them and confirm it's you. Once
            confirmed, the rest of the session needs no further confirmation.
          </Text>
          {([
            ['net', 'Net this month'],
            ['income', 'Income totals'],
            ['expense', 'Spending totals'],
            ['bank_balance', 'Bank balances'],
          ] as [MaskedKind, string][]).map(([kind, label]) => (
            <View key={kind} className="flex-row justify-between items-center py-[10px]">
              <Text className="font-inter text-body-standard text-on-surface flex-1 pr-md">{label}</Text>
              <Switch
                value={hiddenBalances[kind]}
                onValueChange={(value) => setHiddenBalance(kind, value)}
                trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
              />
            </View>
          ))}
        </View>
```

`setHiddenBalance` returns a promise the `onValueChange` handler intentionally
doesn't await — the store updates the switch synchronously and the SQLite write
follows; there is no failure path the user could act on.

- [ ] **Step 4: Typecheck**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm/apps/raqm && npx tsc --noEmit
```

Expected: clean. If TS complains about the `onValueChange` returning a promise,
wrap it as `onValueChange={(value) => { void setHiddenBalance(kind, value); }}`.

- [ ] **Step 5: Commit**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm
git add apps/raqm/src/screens/main/SettingsScreen.tsx
git commit -m "feat(raqm): add Hide balances toggles to Settings"
```

**Pending device verification (not a blocker):** all four switches persist
across an app restart; flipping one immediately masks/unmasks the corresponding
figures on Home when you navigate back; the section renders after SECURITY (or
after BUDGETS if App Lock isn't merged) and before APPEARANCE.

---

### Task 6: Wire `MaskedValue` into `DashboardScreen`

**Model tier:** standard / sonnet — touches a shared presentational component's
prop types plus a prose string; layout regressions are the risk here.

**Files:**
- Modify: `apps/raqm/src/components/dashboard/HeroMetric.tsx` (props interface;
  the `value` render at line 26 and the `s.value` render at line 40)
- Modify: `apps/raqm/src/screens/main/DashboardScreen.tsx`
  (import near line 44; `advisorLine` at lines 504–517; the `HeroMetric` block
  at lines 613–630)

**Interfaces:**
- Consumes: `MaskedValue` and `MASK_TEXT` from `../../components/MaskedValue`
  (Task 4); `useHiddenBalanceStore` from `../../store/hiddenBalanceStore`
  (Task 2).
- Produces: `HeroMetric`'s props widen — `value: React.ReactNode` and
  `stats?: { label: string; value: React.ReactNode; direction: 'up' | 'down' }[]`.
  `HeroMetric` has exactly one consumer, `DashboardScreen`, so no other call
  site is affected. Existing `string` callers keep working: a `string` is a
  valid `ReactNode`, and the component keeps wrapping strings in the same `Text`.

- [ ] **Step 1: Widen `HeroMetric`'s props**

In `apps/raqm/src/components/dashboard/HeroMetric.tsx`, change the props
interface so `value` and each stat's `value` accept a node. The current
interface declares them as `string`; replace those two field types:

```tsx
interface HeroMetricProps {
  label: string;
  /** A string is wrapped in the metric-hero Text; a node is rendered as-is
   *  (MaskedValue brings its own Text with the same classes). */
  value: React.ReactNode;
  valueColorClassName?: string;
  sublabel?: string;
  stats?: { label: string; value: React.ReactNode; direction: 'up' | 'down' }[];
}
```

Keep every other field exactly as it already is — only the two `value` types
change. If the file's existing interface has a different name or extra optional
fields, edit in place rather than replacing the whole interface.

- [ ] **Step 2: Render the nodes in `HeroMetric`**

Replace line 26:

```tsx
        <Text className={`font-mono-medium text-metric-hero ${valueColorClassName}`}>{value}</Text>
```

with:

```tsx
        {typeof value === 'string' ? (
          <Text className={`font-mono-medium text-metric-hero ${valueColorClassName}`}>{value}</Text>
        ) : (
          value
        )}
```

Replace line 40:

```tsx
                  <Text className="font-mono-medium text-body-standard text-on-surface">{s.value}</Text>
```

with:

```tsx
                  {typeof s.value === 'string' ? (
                    <Text className="font-mono-medium text-body-standard text-on-surface">{s.value}</Text>
                  ) : (
                    s.value
                  )}
```

The `typeof === 'string'` fork is what keeps the styling identical whichever
form a caller passes, and keeps `HeroMetric` usable with plain strings.

- [ ] **Step 3: Add the imports to `DashboardScreen`**

In `apps/raqm/src/screens/main/DashboardScreen.tsx`, add directly below the
existing `formatAmount` import (line 44):

```tsx
import { MaskedValue, MASK_TEXT } from "../../components/MaskedValue";
import { useHiddenBalanceStore } from "../../store/hiddenBalanceStore";
```

- [ ] **Step 4: Mask the advisor sentence's amount**

`advisorLine` (lines 504–517) embeds the month-spend figure in prose, so it
can't hold a component — but leaving it would leak the very number the expense
mask hides. Read the setting and substitute the mask text.

Add above the `advisorLine` `useMemo` (i.e. above line 503's comment):

```tsx
  // The advisor sentence interpolates the month-spend figure into prose, so it
  // can't host a MaskedValue — substitute the mask text at the string level
  // instead, or the expense mask would be trivially bypassed by reading this
  // card. Masked-while-unhydrated for the same reason MaskedValue is.
  const hideExpenseText = useHiddenBalanceStore(
    (s) => s.hidden.expense || !s.hydrated,
  );
```

Then change line 508 from:

```tsx
      return `You've spent ${formatAmount(metrics.monthSpent, currency)} so far this month.`;
```

to:

```tsx
      return `You've spent ${
        hideExpenseText ? MASK_TEXT : formatAmount(metrics.monthSpent, currency)
      } so far this month.`;
```

and add `hideExpenseText` to that `useMemo`'s dependency array, so line 517
becomes:

```tsx
  }, [txs.length, metrics, currency, hideExpenseText]);
```

The other `advisorLine` branches return percentages and category names, not
amounts, so they need no change.

- [ ] **Step 5: Swap the three `HeroMetric` figures**

Replace the `HeroMetric` block at lines 613–630:

```tsx
        <HeroMetric
          label="NET THIS MONTH"
          value={`${netIsNegative ? "−" : ""}${formatAmount(metrics.net, currency)}`}
          valueColorClassName={
            netIsNegative ? "text-error-muted" : "text-ink-headline"
          }
          sublabel={todayLine()}
          stats={[
            {
              label: "Debit",
              value: formatAmount(metrics.monthSpent, currency),
              direction: "up",
            },
            {
              label: "Credit",
              value: formatAmount(metrics.income, currency),
              direction: "down",
            },
          ]}
        />
```

with:

```tsx
        <HeroMetric
          label="NET THIS MONTH"
          value={
            <MaskedValue
              kind="net"
              value={metrics.net}
              currency={currency}
              prefix={netIsNegative ? "−" : ""}
              className={`font-mono-medium text-metric-hero ${
                netIsNegative ? "text-error-muted" : "text-ink-headline"
              }`}
            />
          }
          valueColorClassName={
            netIsNegative ? "text-error-muted" : "text-ink-headline"
          }
          sublabel={todayLine()}
          stats={[
            {
              label: "Debit",
              value: (
                <MaskedValue
                  kind="expense"
                  value={metrics.monthSpent}
                  currency={currency}
                  className="font-mono-medium text-body-standard text-on-surface"
                />
              ),
              direction: "up",
            },
            {
              label: "Credit",
              value: (
                <MaskedValue
                  kind="income"
                  value={metrics.income}
                  currency={currency}
                  className="font-mono-medium text-body-standard text-on-surface"
                />
              ),
              direction: "down",
            },
          ]}
        />
```

The `className` values are copied verbatim from the `Text` elements they now
replace inside `HeroMetric` (lines 26 and 40 pre-edit) — that is what keeps the
hero's font, size and color identical. `valueColorClassName` is kept on the
props even though the node now carries its own color class: it is still the
prop's documented purpose and still applies for any future string caller.

Leave lines 659 and 712 (`TransactionRow` / upcoming-due `amountLabel`)
untouched — row amounts are out of scope.

- [ ] **Step 6: Typecheck**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm/apps/raqm && npx tsc --noEmit
```

Expected: clean. `formatAmount` must still be imported in
`DashboardScreen.tsx` — lines 508, 659 and 712 still use it.

- [ ] **Step 7: Commit**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm
git add apps/raqm/src/components/dashboard/HeroMetric.tsx apps/raqm/src/screens/main/DashboardScreen.tsx
git commit -m "feat(raqm): mask net, income and spend figures on Home"
```

**Pending device verification (not a blocker):** with nothing hidden, the Home
hero looks pixel-identical to before; with `net` hidden, the hero shows `****`
in the same size/color and the "−" sign is gone until revealed; with `expense`
hidden, both the Debit stat and the advisor sentence show `****`.

---

### Task 7: Wire `MaskedValue` into `AnalyticsScreen` + the liquidity cards

**Model tier:** standard / sonnet — one more shared component prop widening plus
a card layout with a fixed-width numeric slot.

**Files:**
- Modify: `apps/raqm/src/components/analytics/BriefingHero.tsx`
  (props interface, `value` render at line 19)
- Modify: `apps/raqm/src/components/AccountLiquidityCard.tsx`
  (the "Available Balance" `Text` rendering `formatAmount(balance, currency)`)
- Modify: `apps/raqm/src/screens/main/AnalyticsScreen.tsx`
  (import near line 18; `BriefingHero` at line 358; total-liquidity figure at
  line 494)

**Interfaces:**
- Consumes: `MaskedValue` from `../../components/MaskedValue` /
  `./MaskedValue` (Task 4).
- Produces: `BriefingHero`'s `value` prop widens from `string` to
  `React.ReactNode`. `BriefingHero` has exactly one consumer,
  `AnalyticsScreen`. `AccountLiquidityCard`'s public props are **unchanged** —
  the masking happens entirely inside it.

- [ ] **Step 1: Widen `BriefingHero`'s `value` prop**

In `apps/raqm/src/components/analytics/BriefingHero.tsx`, change the `value`
field of the `Props` interface from `string` to:

```tsx
  /** A string is wrapped in the metric-hero Text; a node is rendered as-is. */
  value: React.ReactNode;
```

and replace line 19:

```tsx
      <Text className="font-mono-medium text-metric-hero text-ink-headline tracking-tight">{value}</Text>
```

with:

```tsx
      {typeof value === 'string' ? (
        <Text className="font-mono-medium text-metric-hero text-ink-headline tracking-tight">{value}</Text>
      ) : (
        value
      )}
```

Leave `label`, `data` and `currency` exactly as they are.

- [ ] **Step 2: Mask the per-account balance in `AccountLiquidityCard`**

In `apps/raqm/src/components/AccountLiquidityCard.tsx`, add below the existing
`formatAmount` import:

```tsx
import { MaskedValue } from "./MaskedValue";
```

Replace the "Available Balance" figure:

```tsx
              <Text
                className="font-mono-medium text-[22px] leading-[26px] text-on-surface"
                numberOfLines={1}
              >
                {formatAmount(balance, currency)}
              </Text>
```

with:

```tsx
              <MaskedValue
                kind="bank_balance"
                value={balance}
                currency={currency}
                className="font-mono-medium text-[22px] leading-[26px] text-on-surface"
                numberOfLines={1}
              />
```

Leave the `monthSpend` figure above it untouched — it is a per-account spend
figure, explicitly out of scope (see "Call sites in scope" above). `formatAmount`
stays imported for it.

- [ ] **Step 3: Add the import to `AnalyticsScreen`**

In `apps/raqm/src/screens/main/AnalyticsScreen.tsx`, add directly below the
existing `formatAmount` import (line 18):

```tsx
import { MaskedValue } from '../../components/MaskedValue';
```

- [ ] **Step 4: Mask the spending hero**

Replace line 358:

```tsx
      <BriefingHero label={heroLabel} value={formatAmount(heroTotal, currency)} data={heroSparkline} currency={currency} />
```

with:

```tsx
      <BriefingHero
        label={heroLabel}
        value={
          <MaskedValue
            kind="expense"
            value={heroTotal}
            currency={currency}
            className="font-mono-medium text-metric-hero text-ink-headline tracking-tight"
          />
        }
        data={heroSparkline}
        currency={currency}
      />
```

`kind="expense"` is correct here: `heroLabel` is `"<MONTH> SPENDING"` and
`heroTotal` is the month's spend total. The `className` is copied verbatim from
the `Text` it replaces inside `BriefingHero`. The `currency` prop stays on
`BriefingHero` — the sparkline tooltip uses it independently.

- [ ] **Step 5: Mask the total-liquidity figure**

Replace the figure at line 494:

```tsx
              <Text className="font-mono-medium text-statement-lg text-on-surface">
                {formatAmount(liquiditySnapshot.total, currency)}
              </Text>
```

with:

```tsx
              <MaskedValue
                kind="bank_balance"
                value={liquiditySnapshot.total}
                currency={currency}
                className="font-mono-medium text-statement-lg text-on-surface"
              />
```

This `Text` sits inside a `TouchableOpacity` that navigates to ManageAccounts.
`MaskedValue`'s `onPress` on the inner `Text` takes precedence over the parent
touchable for taps landing on the number itself, which is the behavior we want
(tap the number to reveal, tap the label or chevron to navigate). Note this in
the task report so the reviewer knows it is deliberate.

Leave lines 384, 422 and 474 untouched — row amounts and the merchant delta are
out of scope.

- [ ] **Step 6: Typecheck**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm/apps/raqm && npx tsc --noEmit
```

Expected: clean. `formatAmount` must still be imported in both
`AnalyticsScreen.tsx` (lines 384, 422, 474 still use it) and
`AccountLiquidityCard.tsx` (`monthSpend` still uses it).

- [ ] **Step 7: Commit**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm
git add apps/raqm/src/components/analytics/BriefingHero.tsx apps/raqm/src/components/AccountLiquidityCard.tsx apps/raqm/src/screens/main/AnalyticsScreen.tsx
git commit -m "feat(raqm): mask spending hero and liquidity balances on Analytics"
```

**Pending device verification (not a blocker):** with nothing hidden, the
Briefing hero and the liquidity strip look unchanged; with `bank_balance`
hidden, both the TOTAL LIQUIDITY figure and every card's Available Balance show
`****`, the cards keep their width, and tapping the TOTAL LIQUIDITY *label*
still navigates to ManageAccounts while tapping the number opens the reveal
sheet.

---

### Task 8: Wire `MaskedValue` into `ManageAccounts`, `AccountDetail`, `Transactions`

**Model tier:** standard / sonnet — three screens, one of which renders inside a
virtualized list.

**Files:**
- Modify: `apps/raqm/src/screens/main/ManageAccountsScreen.tsx`
  (import near line 13; balance at line 120)
- Modify: `apps/raqm/src/screens/main/AccountDetailScreen.tsx`
  (import near line 9; last-known balance at line 175; card outstanding at
  line 219)
- Modify: `apps/raqm/src/screens/main/TransactionsScreen.tsx`
  (import near line 12; day-header total at line 283)

**Interfaces:**
- Consumes: `MaskedValue` from `../../components/MaskedValue` (Task 4).
- Produces: no new exports and no prop-type changes to any shared component.

- [ ] **Step 1: `ManageAccountsScreen` — per-account balance**

Add below the existing `formatAmount` import (line 13):

```tsx
import { MaskedValue } from '../../components/MaskedValue';
```

Replace line 120:

```tsx
                  <Text className="font-mono-medium text-numeric-sm text-on-surface mr-xs">{formatAmount(account.balance)}</Text>
```

with:

```tsx
                  <MaskedValue
                    kind="bank_balance"
                    value={account.balance}
                    className="font-mono-medium text-numeric-sm text-on-surface mr-xs"
                  />
```

No `currency` prop — the call it replaces passed none, so `formatAmount`'s `₹`
default applies exactly as before. This `Text` is inside a `TouchableOpacity`
that navigates to AccountDetail; as on Analytics, a tap on the number itself
reveals rather than navigates, which is intended.

Note the surrounding `{account.balance != null && (…)}` guard stays exactly as
it is — it is what narrows `account.balance` to `number` for the `value` prop.

- [ ] **Step 2: `AccountDetailScreen` — last known balance and card outstanding**

Add below the existing `formatAmount` import (line 9):

```tsx
import { MaskedValue } from '../../components/MaskedValue';
```

Replace the last-known-balance block at lines 174–176:

```tsx
          <Text className="font-mono-medium text-numeric-xl text-on-surface">
            {lastBalanceTx?.balance != null ? formatAmount(lastBalanceTx.balance, currency) : '—'}
          </Text>
```

with:

```tsx
          {lastBalanceTx?.balance != null ? (
            <MaskedValue
              kind="bank_balance"
              value={lastBalanceTx.balance}
              currency={currency}
              className="font-mono-medium text-numeric-xl text-on-surface"
            />
          ) : (
            <Text className="font-mono-medium text-numeric-xl text-on-surface">—</Text>
          )}
```

The em-dash placeholder keeps its own `Text` with the identical classes — there
is no balance to mask in that branch, so it must not be routed through
`MaskedValue`.

Replace the outstanding figure at line 219:

```tsx
                <Text className="font-mono-medium text-[16px] leading-[28px] text-error">{formatAmount(outstanding, currency)}</Text>
```

with:

```tsx
                <MaskedValue
                  kind="bank_balance"
                  value={outstanding}
                  currency={currency}
                  className="font-mono-medium text-[16px] leading-[28px] text-error"
                />
```

The enclosing `{outstanding != null && (…)}` guard stays as-is and is what
narrows `outstanding` to `number`.

Leave line 304 (the transaction row amount) untouched.

**Note on this file's styling:** `AccountDetailScreen.tsx` is already fully
NativeWind (`className` throughout, no `StyleSheet`), so these edits need no
migration work — do not restyle anything else in it.

- [ ] **Step 3: `TransactionsScreen` — day-header total**

Add below the existing `formatAmount` import (line 12):

```tsx
import { MaskedValue } from '../../components/MaskedValue';
```

Replace line 283:

```tsx
          <Text className="font-mono text-[13px] leading-[20px] text-ink-label">{formatAmount(item.total, currency)}</Text>
```

with:

```tsx
          <MaskedValue
            kind="expense"
            value={item.total}
            currency={currency}
            className="font-mono text-[13px] leading-[20px] text-ink-label"
          />
```

`item.total` is `dayTotals` — the sum of that day's transaction amounts (built
at line 182) — so `expense` is the right kind. This renders inside the
`FlatList`'s `renderItem`, which is already a stable `useCallback`;
`MaskedValue` is `React.memo`'d with primitive props, so the list's render
characteristics are unchanged.

Leave line 301 (merged-group sum) and line 503 (`TxRow` amount) untouched — both
are row amounts, out of scope.

- [ ] **Step 4: Typecheck**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm/apps/raqm && npx tsc --noEmit
```

Expected: clean. `formatAmount` must still be imported in
`AccountDetailScreen.tsx` (line 304) and `TransactionsScreen.tsx` (lines 301,
503). In `ManageAccountsScreen.tsx`, line 120 was its **only** use — if
typecheck or lint reports `formatAmount` as unused there, remove that import
line.

- [ ] **Step 5: Commit**

```bash
cd /Users/copods/Documents/Projects/personal/Raqm
git add apps/raqm/src/screens/main/ManageAccountsScreen.tsx apps/raqm/src/screens/main/AccountDetailScreen.tsx apps/raqm/src/screens/main/TransactionsScreen.tsx
git commit -m "feat(raqm): mask account balances and timeline day totals"
```

**Pending device verification (not a blocker):** with `bank_balance` hidden,
ManageAccounts rows and AccountDetail's hero balance + card outstanding all show
`****` without the rows changing height; with `expense` hidden, Timeline day
headers show `****` while the individual transaction amounts under them stay
visible (intended — row amounts are out of scope); scrolling the Timeline with a
few headers revealed stays smooth and no VirtualizedList warning appears.

---

## Post-implementation

- **Final whole-branch review** — the only step that should use the
  most-capable model tier. Review all eight commits together against
  `docs/superpowers/specs/2026-08-16-hide-balances-design.md`, with particular
  attention to:
  - the `expo-crypto` call shapes actually used vs. the v56 docs;
  - that `getRevealAuthMethod()` is genuinely re-evaluated on every sheet open
    and nothing caches it (the spec's "keeps working if App Lock is later turned
    off" requirement);
  - that `sessionUnlocked` is never persisted anywhere;
  - that each `MaskedValue` call site's `className` matches the `Text` it
    replaced, so no layout or font changed;
  - that only the in-scope call sites changed, and every out-of-scope
    `formatAmount` listed in "Call sites in scope" is still untouched.
- **Manual on-device verification** — the accumulated "Pending device
  verification" notes from Tasks 1, 3, 4, 5, 6, 7 and 8, run in one pass after
  `npm run raqm:android` succeeds on a real device. Required before the feature
  is considered shipped, but explicitly **not** a gate on any task in this plan.
- **Known v0 gap to re-confirm with the user:** there is no reset flow for a
  forgotten custom app password (spec's "Out of scope"). The setup sheet warns
  about this in copy; nothing else mitigates it.
- **Do not push.** Per `CLAUDE.md`, pushing requires explicit user confirmation.
