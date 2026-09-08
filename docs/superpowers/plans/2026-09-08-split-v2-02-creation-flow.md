# Split with Friends v2 — Plan 2: Creation Flow Additions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a description field, an inline "create a circle" suggestion, and a final review step (with per-split auto-remind toggle and reminder-cadence picker) to the split creation flow.

**Architecture:** Extend the DB write path (`addSplitWithParticipants`) to carry the new columns from Plan 1's migration v15. Add a description `TextInput` to `SplitCreateScreen`. Wire a serializable-params round trip to `SplitCirclesScreen` for the inline circle-creation suggestion (Plan 3 later upgrades that screen's internal UI without changing this contract). Add a new `SplitReviewScreen` pushed after "Save split", which becomes the actual point of DB commit.

**Tech Stack:** TypeScript, expo-sqlite (async API), React Native, NativeWind, React Navigation.

**Spec:** `docs/superpowers/specs/2026-09-08-split-with-friends-v2-design.md` (section 2: "Creation flow additions"). Depends on Plan 1 (migration v15, `is_self` column, `SplitCreateScreen`'s 4-mode participant state).

## Global Constraints

- expo-sqlite async API only — explicit `BEGIN`/`COMMIT`/`ROLLBACK`, never `withTransactionAsync`.
- New/touched screens use NativeWind `className`, never `StyleSheet.create`.
- Any screen with text inputs uses `KeyboardAwareScrollView`, never plain `ScrollView`.
- Dynamically-mounted inputs use ref + delayed `.focus()` (~80ms), not bare `autoFocus`.
- Async button handlers need in-flight guards.
- Route params must be serializable (numbers/strings/booleans/plain objects/arrays only, no functions/class instances) — this is how `SplitReview` receives the whole draft split and how the circle-picker round trip works, per the existing `CategoryPicker` `popTo(returnTo, {picked...}, {merge:true})` pattern.
- All SQL parameterized.
- Reminder cadence resolved during Plan 1 planning: "Every app open" → `remindIntervalDays: null`, "Every 2 days" → `2`, "Every 3 days" → `3`, "Weekly" → `7`.
- No test runner — verify with `cd apps/raqm && npx tsc --noEmit` plus manual device verification.

---

### Task 1: Extend `addSplitWithParticipants` and split/participant row mappers

**Files:**
- Modify: `apps/raqm/src/db/database.ts` (function at line 2695; `SplitParticipant` type at lines 2619-2629; row-mapper functions `rowToSplit`/`rowToSplitParticipant` — grep for their exact names/lines before editing, they weren't captured verbatim in prior research)
- Modify: `apps/raqm/src/screens/main/SplitDetailScreen.tsx` and `apps/raqm/src/screens/main/SplitCreateScreen.tsx` (both import `Split`/`SplitParticipant` types — confirm no other importers via `grep -rn "from '../../db/database'" apps/raqm/src | grep -i split`)

**Interfaces:**
- Consumes: `is_self` column (Plan 1 Task 1), `description`/`auto_remind_enabled`/`remind_interval_days` columns (Plan 1 Task 1).
- Produces:
  ```ts
  export async function addSplitWithParticipants(
    input: {
      title: string;
      totalAmount: number;
      sourceTxId: number | null;
      creatorUpiId: string | null;
      description: string | null;
      autoRemindEnabled: boolean;
      remindIntervalDays: number | null;
    },
    participants: { name: string; phoneNumber: string | null; shareAmount: number; isSelf: boolean }[],
  ): Promise<number>
  ```
  `Split` type gains `description: string | null`, `autoRemindEnabled: boolean`, `remindIntervalDays: number | null`. `SplitParticipant` type gains `isSelf: boolean`.

- [ ] **Step 1: Read the current implementation**

Read `apps/raqm/src/db/database.ts` around lines 2695-2790 (the `addSplitWithParticipants` function through `setSplitParticipantStatus`) to see the exact current INSERT statements and row-mapper calls before editing.

- [ ] **Step 2: Update the `Split` and `SplitParticipant` types**

Add the new fields to both type declarations (near lines 2509-2629, alongside `SplitCircle`/`SplitCircleMember`):

```ts
export type Split = {
  id: number;
  title: string;
  totalAmount: number;
  sourceTxId: number | null;
  creatorUpiId: string | null;
  status: 'open' | 'settled';
  description: string | null;
  autoRemindEnabled: boolean;
  remindIntervalDays: number | null;
  createdAt: number;
};

export type SplitParticipant = {
  id: number;
  splitId: number;
  name: string;
  phoneNumber: string | null;
  shareAmount: number;
  status: 'unpaid' | 'attention' | 'settled';
  matchedTxId: number | null;
  isSelf: boolean;
  createdAt: number;
  lastRemindedAt: number | null;
};
```

- [ ] **Step 3: Update the row-mapper functions**

Find `rowToSplit` and `rowToSplitParticipant` (grep `function rowToSplit` in `database.ts`) and add the two new fields to each, reading `row.description`, `row.auto_remind_enabled` (SQLite has no native boolean — read as `row.auto_remind_enabled === 1`), `row.remind_interval_days`, and `row.is_self === 1`.

- [ ] **Step 4: Update `addSplitWithParticipants`**

Change the signature and the two INSERT statements:

```ts
export async function addSplitWithParticipants(
  input: {
    title: string;
    totalAmount: number;
    sourceTxId: number | null;
    creatorUpiId: string | null;
    description: string | null;
    autoRemindEnabled: boolean;
    remindIntervalDays: number | null;
  },
  participants: { name: string; phoneNumber: string | null; shareAmount: number; isSelf: boolean }[],
): Promise<number> {
  await database.runAsync(`BEGIN`);
  try {
    const now = Date.now();
    const splitResult = await database.runAsync(
      `INSERT INTO splits (title, total_amount, source_tx_id, creator_upi_id, status, description, auto_remind_enabled, remind_interval_days, created_at) VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?)`,
      [
        input.title,
        input.totalAmount,
        input.sourceTxId,
        input.creatorUpiId,
        input.description,
        input.autoRemindEnabled ? 1 : 0,
        input.remindIntervalDays,
        now,
      ],
    );
    const splitId = splitResult.lastInsertRowId;
    for (const p of participants) {
      await database.runAsync(
        `INSERT INTO split_participants (split_id, name, phone_number, share_amount, status, is_self, created_at) VALUES (?, ?, ?, ?, 'unpaid', ?, ?)`,
        [splitId, p.name, p.phoneNumber, p.shareAmount, p.isSelf ? 1 : 0, now],
      );
    }
    await database.runAsync(`COMMIT`);
    return splitId;
  } catch (e) {
    await database.runAsync(`ROLLBACK`);
    throw e;
  }
}
```

(Keep the exact original INSERT column order/casing if Step 1's read showed a different existing shape — the goal is additive columns on the same statement, not a rewrite of unrelated behavior.)

- [ ] **Step 5: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: errors at every call site of `addSplitWithParticipants` (currently just `SplitCreateScreen.tsx`) and every read of `Split`/`SplitParticipant` fields that assumed the old shape — this is expected until Task 2 below updates the call site. Confirm the errors are ONLY about the changed signature, not something else.

- [ ] **Step 6: Commit**

```bash
git add apps/raqm/src/db/database.ts
git commit -m "feat(raqm): extend addSplitWithParticipants with description, auto-remind, and is_self"
```

(Committing here even though the call site is momentarily broken is fine — the next task fixes it in the same plan, before the plan's final review — but if this plan is executed one task-commit-review cycle at a time, note the intermediate broken state to the task reviewer as expected, not a regression.)

---

### Task 2: Description field + navigate-to-review on Save

**Files:**
- Modify: `apps/raqm/src/screens/main/SplitCreateScreen.tsx`
- Modify: `apps/raqm/src/navigation/types.ts` (add `SplitReview` route)

**Interfaces:**
- Consumes: `MainStackParamList` (existing type at lines 29-72).
- Produces: `SplitReview` route param shape, consumed by Task 4's new screen.

- [ ] **Step 1: Add the `SplitReview` route param type**

In `apps/raqm/src/navigation/types.ts`, add to `MainStackParamList`:

```ts
SplitReview: {
  title: string;
  totalAmount: number;
  sourceTxId: number | null;
  description: string | null;
  participants: { name: string; phoneNumber: string | null; shareAmount: number; isSelf: boolean }[];
};
```

- [ ] **Step 2: Add a description `TextInput` to `SplitCreateScreen`**

Add state and a field, following the same `KeyboardAwareScrollView` + labeled-input pattern already used for Title/Total amount in this screen:

```ts
const [description, setDescription] = useState('');
```

```tsx
<Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Description (optional)</Text>
<TextInput
  className="font-inter text-body-md text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-[12px]"
  placeholder="What's this for?"
  placeholderTextColor={Colors.outline}
  value={description}
  onChangeText={setDescription}
  multiline
/>
```

Place it directly below the Total amount field and above the Participants section.

- [ ] **Step 3: Change `handleSave` into "go to review" instead of the DB write**

Replace the current `handleSave` (which calls `addSplitWithParticipants` directly) with a navigation call — the actual DB write moves to the new `SplitReview` screen (Task 4):

```ts
const goToReview = () => {
  if (!canSave) return;
  navigation.navigate('SplitReview', {
    title: title.trim() || 'Split',
    totalAmount,
    sourceTxId,
    description: description.trim() || null,
    participants: participants.map((p) => ({
      name: p.name,
      phoneNumber: p.phoneNumber,
      shareAmount: p.shareAmount,
      isSelf: p.isSelf,
    })),
  });
};
```

Update the "Save split" button's `onPress` to call `goToReview` instead of `handleSave`, and remove the now-unused `saving`/`addSplitWithParticipants`/`getSetting('upi_id')`-for-creatorUpiId plumbing from this screen if nothing else in it needs `creatorUpiId` (it's read once at the top for `addSplitWithParticipants`'s old `creatorUpiId` field — Task 4's review screen now reads it itself right before the write, matching the "read live, not frozen" v1 bugfix already applied to `SplitDetailScreen`). Keep `getSplitCircles`/`getSplitCircleMembers` and everything else in this screen unchanged.

- [ ] **Step 4: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: an error that `'SplitReview'` isn't a valid screen in the navigator yet — expected until Task 4 registers it. Confirm no other errors.

- [ ] **Step 5: Commit**

```bash
git add apps/raqm/src/screens/main/SplitCreateScreen.tsx apps/raqm/src/navigation/types.ts
git commit -m "feat(raqm): add description field to SplitCreateScreen and route Save to a review step"
```

---

### Task 3: Inline "create a circle" suggestion with return-navigation contract

**Files:**
- Modify: `apps/raqm/src/navigation/types.ts` (extend `SplitCircles` route params)
- Modify: `apps/raqm/src/screens/main/SplitCirclesScreen.tsx`
- Modify: `apps/raqm/src/screens/main/SplitCreateScreen.tsx`

**Interfaces:**
- Produces: `SplitCircles: { returnTo?: 'SplitCreate' } | undefined` param shape and a `popTo('SplitCreate', { pickedCircleId }, { merge: true })` contract that Plan 3 must preserve when it rebuilds this screen's internal creation UI.

- [ ] **Step 1: Extend the `SplitCircles` route param type**

In `apps/raqm/src/navigation/types.ts`, change:

```ts
SplitCircles: { returnTo?: 'SplitCreate' } | undefined;
```

And add `pickedCircleId?: number` to `SplitCreate`'s existing param type (already has `sourceTxId?`, `prefillTitle?`, `prefillAmount?`).

- [ ] **Step 2: Add a "+ Create new circle" row to `SplitCreateScreen`**

Below the existing "+ Add from contacts" button, add:

```tsx
<TouchableOpacity
  className="py-[8px]"
  onPress={() => navigation.navigate('SplitCircles', { returnTo: 'SplitCreate' })}
>
  <Text className="font-inter text-body-sm text-primary">+ Create new circle</Text>
</TouchableOpacity>
```

- [ ] **Step 3: Handle the return trip in `SplitCreateScreen`**

Add a `useEffect` reading `route.params?.pickedCircleId` (following the same "consume once, then clear via setParams" pattern already documented for `Transactions`'s `initialQuery`/`focusSearch` params in `MainStackParamList`'s comments):

```ts
useEffect(() => {
  const pickedCircleId = route.params?.pickedCircleId;
  if (pickedCircleId == null) return;
  getSplitCircleMembers(pickedCircleId).then((members) => {
    setParticipants((prev) => {
      const withoutOldCircle = prev.filter((p) => p.isSelf || p.fromCircleId === null);
      const deduped = members.filter((m) => !withoutOldCircle.some((p) => isSameParticipant(p, m)));
      return [
        ...withoutOldCircle,
        ...deduped.map((m) => ({ name: m.name, phoneNumber: m.phoneNumber, shareAmount: 0, shareText: '', fromCircleId: pickedCircleId, isSelf: false })),
      ];
    });
  });
  navigation.setParams({ pickedCircleId: undefined });
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [route.params?.pickedCircleId]);
```

Note `withoutOldCircle` now also keeps `p.isSelf` rows (the "You" row from Plan 1 has `fromCircleId: null` but must never be dropped by this filter) — this differs from the v1-era `addFromCircle`'s filter, which predates the "You" row. Update `addFromCircle` itself (existing function, same file) with the identical `p.isSelf ||` guard for consistency, since it has the same bug now that a permanent non-circle "You" row with `fromCircleId: null` exists.

- [ ] **Step 4: Add the return-picker behavior to `SplitCirclesScreen`**

In `apps/raqm/src/screens/main/SplitCirclesScreen.tsx`, read `route.params?.returnTo` and, when present, show a "Use this circle" affordance per circle row (instead of / alongside the existing expand-to-view-members row) that calls:

```ts
navigation.popTo('SplitCreate', { pickedCircleId: circle.id }, { merge: true });
```

Add this as a new button in `CircleRow` (only rendered when `returnTo === 'SplitCreate'` is passed down as a prop from the screen component), positioned above the existing expand/rename/delete controls. Do NOT touch `createCircle`/the bottom name-input UI in this task — Plan 3 replaces that entirely; this task only adds the "Use this circle" return action to the EXISTING per-row UI, so a user can create a circle here today (name it, add members via the current inline `CircleRow` controls) and then tap "Use this circle" to return to `SplitCreateScreen` with it already selected.

- [ ] **Step 5: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

Launch the app, go to Split → New Split → "+ Create new circle", create a circle with 2 members on that screen, tap "Use this circle", and confirm you land back on `SplitCreateScreen` with those 2 members added (and not duplicated if you repeat the flow with the same circle).

- [ ] **Step 7: Commit**

```bash
git add apps/raqm/src/navigation/types.ts apps/raqm/src/screens/main/SplitCirclesScreen.tsx apps/raqm/src/screens/main/SplitCreateScreen.tsx
git commit -m "feat(raqm): add inline circle-creation suggestion to SplitCreateScreen"
```

---

### Task 4: `SplitReviewScreen` — final review, auto-remind toggle, cadence picker, DB commit

**Files:**
- Create: `apps/raqm/src/screens/main/SplitReviewScreen.tsx`
- Modify: `apps/raqm/src/navigation/MainNavigator.tsx` (or wherever `MainStackParamList` screens are registered — grep `SplitCreate` in `src/navigation/` to find the exact registration file/pattern before editing)

**Interfaces:**
- Consumes: `SplitReview` route params (Task 2), `addSplitWithParticipants` (Task 1), `getSetting('upi_id')` (existing).
- Produces: nothing further downstream — this is the terminal screen of the creation flow, replacing navigation to `SplitDetail` on success (same as v1's `handleSave` used to).

- [ ] **Step 1: Write `SplitReviewScreen.tsx`**

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ToastAndroid } from 'react-native';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { MainStackScreenProps } from '../../navigation/types';
import { addSplitWithParticipants, getSetting } from '../../db/database';
import { formatAmount } from '../../utils/format';

const CADENCE_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'Every app open', days: null },
  { label: 'Every 2 days', days: 2 },
  { label: 'Every 3 days', days: 3 },
  { label: 'Weekly', days: 7 },
];

export function SplitReviewScreen({ route, navigation }: MainStackScreenProps<'SplitReview'>) {
  const { title, totalAmount, sourceTxId, description, participants } = route.params;
  const [autoRemind, setAutoRemind] = useState(false);
  const [cadenceDays, setCadenceDays] = useState<number | null>(2);
  const [creatorUpiId, setCreatorUpiId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSetting('upi_id').then((id) => setCreatorUpiId(id ?? null));
  }, []);

  const confirmCreate = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const splitId = await addSplitWithParticipants(
        {
          title,
          totalAmount,
          sourceTxId,
          creatorUpiId,
          description,
          autoRemindEnabled: autoRemind,
          remindIntervalDays: autoRemind ? cadenceDays : null,
        },
        participants,
      );
      ToastAndroid.show('Split created', ToastAndroid.SHORT);
      navigation.replace('SplitDetail', { splitId });
    } catch {
      ToastAndroid.show("Couldn't create split", ToastAndroid.SHORT);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-container-margin pt-sm pb-md">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="font-inter text-body-md text-primary w-[70px]">‹ Back</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-title-lg text-on-surface">Review Split</Text>
        <View className="w-[60px]" />
      </View>

      <KeyboardAwareScrollView
        contentContainerClassName="px-container-margin pb-[48px]"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
      >
        <Text className="font-inter-bold text-title-md text-on-surface">{title}</Text>
        {description && <Text className="font-inter text-body-sm text-on-surface-variant mt-sm">{description}</Text>}
        <Text className="font-mono-medium text-numeric-lg text-on-surface mt-sm">{formatAmount(totalAmount)}</Text>

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Participants</Text>
        {participants.map((p, i) => (
          <View key={i} className="flex-row items-center justify-between py-[6px]">
            <Text className="font-inter text-body-sm text-on-surface">{p.isSelf ? 'You' : p.name}</Text>
            <Text className="font-mono text-body-sm text-on-surface-variant">{formatAmount(p.shareAmount)}</Text>
          </View>
        ))}

        <View className="flex-row items-center justify-between mt-lg">
          <Text className="font-inter text-body-md text-on-surface">Auto-remind participants</Text>
          <TouchableOpacity
            className={`px-md py-[6px] rounded-lg ${autoRemind ? 'bg-primary' : 'bg-surface-container-lowest border border-outline-variant'}`}
            onPress={() => setAutoRemind((v) => !v)}
          >
            <Text className={`font-inter-medium text-body-sm ${autoRemind ? 'text-on-primary' : 'text-on-surface'}`}>
              {autoRemind ? 'On' : 'Off'}
            </Text>
          </TouchableOpacity>
        </View>

        {autoRemind && (
          <View className="mt-md">
            <Text className="font-mono text-label-sm text-on-surface-variant mb-sm">Remind every</Text>
            <View className="flex-row flex-wrap gap-sm">
              {CADENCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  className={`px-md py-[8px] rounded-lg ${cadenceDays === opt.days ? 'bg-primary' : 'bg-surface-container-lowest border border-outline-variant'}`}
                  onPress={() => setCadenceDays(opt.days)}
                >
                  <Text className={`font-inter-medium text-body-sm ${cadenceDays === opt.days ? 'text-on-primary' : 'text-on-surface'}`}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          className={`mt-xl py-md items-center bg-primary rounded-xl ${saving ? 'opacity-40' : ''}`}
          onPress={confirmCreate}
          disabled={saving}
        >
          <Text className="font-inter-medium text-body-md text-on-primary">Confirm & Create</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}
```

- [ ] **Step 2: Register the screen in the navigator**

Grep `SplitCreate` in `apps/raqm/src/navigation/` to find the `<Stack.Screen name="SplitCreate" .../>` registration, and add an identical entry for `SplitReview` immediately after it:

```tsx
<Stack.Screen name="SplitReview" component={SplitReviewScreen} />
```

Import `SplitReviewScreen` at the top of that file alongside the existing `SplitCreateScreen`/`SplitDetailScreen` imports.

- [ ] **Step 3: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors — this resolves the `'SplitReview' is not a valid screen` error from Task 2 Step 4.

- [ ] **Step 4: Manual verification**

Create a split end-to-end: New Split → fill title/amount/description → add participants → Save split → land on Review screen showing the description and every participant's share including "You" → toggle Auto-remind on → pick "Every 2 days" → Confirm & Create → land on `SplitDetail` for the new split.

- [ ] **Step 5: Commit**

```bash
git add apps/raqm/src/screens/main/SplitReviewScreen.tsx apps/raqm/src/navigation/
git commit -m "feat(raqm): add SplitReviewScreen with auto-remind toggle and cadence picker"
```
