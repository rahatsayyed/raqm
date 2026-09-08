# Split with Friends v2 — Plan 6: Settings / Bills & Reminders Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the global "Auto-send split reminders" toggle in favor of each split's own auto-remind setting (from Plan 2), and surface open splits in the "Bills & Reminders" screen. Also close the known diagnostic-logging gap in `splitReminders.ts` while reworking it anyway.

**Architecture:** `checkAndSendReminders()` moves from reading one global setting key to iterating open splits and reading each split's own `auto_remind_enabled`/`remind_interval_days` (Plan 2's migration v15 columns), throttled per participant via the existing `last_reminded_at` column. `MoreScreen.tsx` loses its global toggle row entirely. `DuesRemindersScreen` gains a new `DueItem` source (`'split'`) built from open splits with unpaid/attention participants, merged into the existing `mergeDues()` output.

**Tech Stack:** TypeScript, expo-sqlite (async API), React Native, NativeWind.

**Spec:** `docs/superpowers/specs/2026-09-08-split-with-friends-v2-design.md` (section 6: "Settings / Bills & Reminders integration"; also closes the "Known gaps carried over from the v1 final review" item about missing `logEvent` calls). Depends on Plan 2 (migration v15 columns already exist by the time this plan runs) and Plan 4 (this plan's `checkAndSendReminders` calls the updated `sendReminderNow(participant, split)` signature from Plan 4 Task 2 — confirm that signature is in place before starting).

## Global Constraints

- `checkAndSendReminders()` "runs on every app open and must never block startup" (existing doc comment in `splitReminders.ts`) — keep the outer try/catch that swallows all errors silently; only ADD `logEvent` calls inside it, never let a `logEvent` call itself throw uncaught (it's already fire-and-forget/self-catching per `src/services/logger.ts`, so this is automatic, not something to add extra guards for).
- Removing the global toggle must not orphan its setting key silently — `checkAndSendReminders()` must stop reading `'auto_sms_reminders'` in the SAME task that removes the `MoreScreen.tsx` row, or auto-reminders would be permanently stuck at whatever that key's last value was.
- No test runner — verify with `cd apps/raqm && npx tsc --noEmit` plus manual device verification.
- All SQL parameterized; async button handlers keep in-flight guards.

---

### Task 1: Rework `checkAndSendReminders()` to per-split settings, and add `logEvent` calls

**Files:**
- Modify: `apps/raqm/src/services/splitReminders.ts`

**Interfaces:**
- Consumes: `Split.autoRemindEnabled`, `Split.remindIntervalDays` (Plan 2 Task 1), `sendReminderNow(participant, split: { title, description })` (Plan 4 Task 2's signature), `getSplits()` (existing, confirm exact name via grep `export async function getSplits` in `database.ts`), `logEvent` (`src/services/logger.ts`, signature `logEvent(tag: string, message?: string)`).

- [ ] **Step 1: Read the current full file and confirm `getSplits`'s signature**

Read `apps/raqm/src/services/splitReminders.ts` in full (67 lines, already partly rewritten by Plan 4 Task 2 — confirm that `sendReminderNow`'s new `(participant, split)` signature is in place before starting this task). Grep `export async function getSplits` in `apps/raqm/src/db/database.ts` to confirm its return type includes every open split with the new v15 columns (it will, since `rowToSplit` was updated in Plan 2 Task 1).

- [ ] **Step 2: Rewrite `checkAndSendReminders()`**

```ts
export async function checkAndSendReminders(): Promise<void> {
  try {
    const now = Date.now();
    const splits = await getSplits();
    const openSplits = splits.filter((s) => s.status === 'open' && s.autoRemindEnabled);
    logEvent('splitReminders.check', `${openSplits.length} auto-remind splits open`);
    for (const split of openSplits) {
      const participants = await getSplitParticipants(split.id);
      for (const p of participants) {
        if (p.isSelf || p.status !== 'unpaid' || !p.phoneNumber) continue;
        // remindIntervalDays === null means "every app open" — no throttle.
        // Otherwise, only send once the configured number of days has passed
        // since this participant's last reminder (or if never reminded).
        if (split.remindIntervalDays != null && p.lastRemindedAt != null) {
          const elapsedMs = now - p.lastRemindedAt;
          const intervalMs = split.remindIntervalDays * 24 * 60 * 60 * 1000;
          if (elapsedMs < intervalMs) continue;
        }
        const sent = await sendReminderNow(p, { title: split.title, description: split.description });
        logEvent(
          sent ? 'splitReminders.sent' : 'splitReminders.failed',
          `split ${split.id} participant ${p.id}`,
        );
      }
    }
  } catch (e) {
    logEvent('splitReminders.checkFailed', e instanceof Error ? e.message : String(e));
    // Silent to the user — this runs on every app open and must never block startup.
  }
}
```

Remove the old `REMINDER_INTERVAL_MS` constant and the `getSetting('auto_sms_reminders')`/`PermissionsAndroid.check` gate at the top of the old function (per-split `autoRemindEnabled` replaces the global setting check; `sendReminderNow` itself already calls `requestSendSmsPermission()` per-send, so the permission check doesn't need to be duplicated here). Add `logEvent` to this file's imports: `import { logEvent } from './logger';` (confirm the relative path — `splitReminders.ts` and `logger.ts` are both directly under `src/services/`, so `./logger` is correct).

- [ ] **Step 3: Add a `logEvent` call inside `sendReminderNow` too**

While in this file, close the other half of the known gap — `sendReminderNow` itself currently has no `logEvent` calls either. Add one on each exit path:

```ts
export async function sendReminderNow(
  participant: SplitParticipant,
  split: { title: string; description: string | null },
): Promise<boolean> {
  if (!participant.phoneNumber) {
    logEvent('splitReminders.noPhone', `participant ${participant.id}`);
    return false;
  }
  try {
    const granted = await requestSendSmsPermission();
    if (!granted) {
      logEvent('splitReminders.permissionDenied', `participant ${participant.id}`);
      return false;
    }
    const upiId = await getSetting('upi_id');
    const message = reminderMessage({
      splitTitle: split.title,
      description: split.description,
      participantName: participant.name,
      shareAmount: participant.shareAmount,
      upiId: upiId ?? null,
    });
    await sendSms(participant.phoneNumber, message);
    await setSplitParticipantLastReminded(participant.id, Date.now());
    logEvent('splitReminders.sms.sent', `participant ${participant.id}`);
    return true;
  } catch (e) {
    logEvent('splitReminders.sms.failed', e instanceof Error ? e.message : String(e));
    return false;
  }
}
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual verification**

Trigger `checkAndSendReminders()` (it runs on app open per the existing doc comment — restart the app, or find its call site in `AppNavigator.tsx` and confirm it's still wired the same way) with a test split that has `autoRemindEnabled: true` and `remindIntervalDays: null` (every app open) — confirm the reminder attempt fires without needing the removed global toggle. Then check the diagnostic log export (More → share diagnostic logs) includes `splitReminders.*` lines.

- [ ] **Step 6: Commit**

```bash
git add apps/raqm/src/services/splitReminders.ts
git commit -m "feat(raqm): move reminder scheduling to per-split settings and add diagnostic logging"
```

---

### Task 2: Remove the global "Auto-send split reminders" toggle from `MoreScreen`

**Files:**
- Modify: `apps/raqm/src/screens/main/MoreScreen.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing — pure removal.

- [ ] **Step 1: Remove the toggle's state, loader, handler, and row**

Delete, in `apps/raqm/src/screens/main/MoreScreen.tsx`:
- The state: `const [autoSmsReminders, setAutoSmsReminders] = useState(false);` (line 109).
- The loader inside the existing `useFocusEffect`: `getSetting('auto_sms_reminders').then((v) => setAutoSmsReminders(v === '1'));` (line 120).
- The handler: `handleToggleAutoSmsReminders` (lines 153-160).
- The settings-list row object: `{ key: 'auto-sms-reminders', label: 'Auto-send split reminders', ... }` (line 342).

Leave everything else in the settings list array untouched — only this one row is removed, per the spec's explicit instruction that it's "fully replaced by the per-split toggle + cadence" (Plan 2's `SplitReviewScreen`).

- [ ] **Step 2: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Open More screen and confirm the "Auto-send split reminders" row is gone and every other row still works.

- [ ] **Step 4: Commit**

```bash
git add apps/raqm/src/screens/main/MoreScreen.tsx
git commit -m "fix(raqm): remove global auto-send-split-reminders toggle from MoreScreen"
```

---

### Task 3: Surface open splits in "Bills & Reminders"

**Files:**
- Modify: `apps/raqm/src/services/dues.ts`
- Modify: `apps/raqm/src/screens/main/DuesRemindersScreen.tsx`

**Interfaces:**
- Consumes: `getSplits()`, `getSplitParticipants(splitId)` (existing DB functions).
- Produces:
  ```ts
  export interface DueItem {
    key: string;
    name: string;
    amount: number;
    dueTs: number;
    currency?: string | null;
    source: 'detected' | 'manual' | 'split';
    reminderId?: number;
    splitId?: number;
  }

  export function splitDues(splits: Split[], participantsBySplit: Map<number, SplitParticipant[]>): DueItem[]

  export function mergeDues(detected: DueItem[], reminders: Reminder[], splitDues?: DueItem[]): DueItem[]
  ```

- [ ] **Step 1: Read `dues.ts` in full**

Read `apps/raqm/src/services/dues.ts` in full (the `DueItem` interface at lines 11-19, `mergeDues` at lines 52-63, and whatever `detectRecurringDues` looks like in between) before editing — this file is small enough to read whole rather than by line range.

- [ ] **Step 2: Extend `DueItem` and add `splitDues()`**

```ts
export interface DueItem {
  key: string;
  name: string;
  amount: number;
  dueTs: number;
  currency?: string | null;
  source: 'detected' | 'manual' | 'split';
  reminderId?: number;
  splitId?: number;
}

/**
 * One DueItem per open split that still has unpaid/attention participants,
 * summing only the outstanding (non-self, non-settled) shares. dueTs uses
 * the split's createdAt — splits have no separate due date concept.
 */
export function splitDues(
  splits: { id: number; title: string; status: 'open' | 'settled'; createdAt: number }[],
  participantsBySplit: Map<number, { isSelf: boolean; status: 'unpaid' | 'attention' | 'settled'; shareAmount: number }[]>,
): DueItem[] {
  const items: DueItem[] = [];
  for (const split of splits) {
    if (split.status !== 'open') continue;
    const participants = participantsBySplit.get(split.id) ?? [];
    const outstanding = participants.filter((p) => !p.isSelf && p.status !== 'settled');
    if (outstanding.length === 0) continue;
    const amount = outstanding.reduce((s, p) => s + p.shareAmount, 0);
    items.push({
      key: `split|${split.id}`,
      name: split.title,
      amount,
      dueTs: split.createdAt,
      source: 'split',
      splitId: split.id,
    });
  }
  return items;
}
```

- [ ] **Step 3: Widen `mergeDues` with an optional third parameter**

Change the signature from `mergeDues(detected: DueItem[], reminders: Reminder[])` to:

```ts
export function mergeDues(detected: DueItem[], reminders: Reminder[], splitItems: DueItem[] = []): DueItem[] {
  // (keep the existing reminder-to-DueItem mapping logic exactly as-is)
  const reminderItems: DueItem[] = reminders.map((r) => ({ /* ...existing mapping... */ }));
  return [...detected, ...reminderItems, ...splitItems].sort((a, b) => a.dueTs - b.dueTs);
}
```

Preserve the exact existing reminder-mapping object shape from the file you read in Step 1 — only add `splitItems` to the concatenation and re-sort.

- [ ] **Step 4: Wire it up in `DuesRemindersScreen.tsx`**

Read `apps/raqm/src/screens/main/DuesRemindersScreen.tsx`'s data-loading code (where it currently calls `detectRecurringDues(...)`, `getReminders()`, and `mergeDues(...)`) and add a third data source:

```ts
const splits = await getSplits();
const participantsBySplit = new Map<number, SplitParticipant[]>();
for (const split of splits) {
  participantsBySplit.set(split.id, await getSplitParticipants(split.id));
}
const splitItems = splitDues(splits, participantsBySplit);
```

Pass `splitItems` as `mergeDues`'s third argument. Add `getSplits`, `getSplitParticipants` to this screen's existing `../../db/database` import line, and `splitDues` to its `../../services/dues` import line.

Add a way to distinguish `source: 'split'` rows visually in the list render (e.g. a small "Split" tag/icon next to the amount, reusing the `PeopleIcon` from `TabIcon.tsx` since it's already used elsewhere for split-related UI) and make tapping such a row navigate to `SplitDetail` with that row's `splitId`:

```ts
onPress={() => {
  if (item.source === 'split' && item.splitId != null) {
    navigation.getParent<NavigationProp<MainStackParamList>>()?.navigate('SplitDetail', { splitId: item.splitId });
    return;
  }
  // ...existing tap behavior for detected/manual rows...
}}
```

(Confirm whether `DuesRemindersScreen` is a tab screen needing `getParent()` per the `CLAUDE.md` navigation pattern, or already a stack screen with direct `navigate` access — check its existing navigation calls for reminders/detected-due taps to match the same pattern rather than guessing.)

- [ ] **Step 5: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Create an open split with at least one unpaid non-self participant, open More → Bills & Reminders, and confirm it appears in the list (tagged as a split) alongside detected/manual dues, sorted by date, and tapping it navigates to that split's detail screen. Settle every participant and confirm the split disappears from this list.

- [ ] **Step 7: Commit**

```bash
git add apps/raqm/src/services/dues.ts apps/raqm/src/screens/main/DuesRemindersScreen.tsx
git commit -m "feat(raqm): surface open splits in Bills & Reminders"
```
