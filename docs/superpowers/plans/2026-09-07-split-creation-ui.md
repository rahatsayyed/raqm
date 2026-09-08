# Split with Friends — Creation UI, Circles, Contacts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Split tab end-to-end for the "create from scratch" path: pick or save a Circle, create a split with equal/custom shares, view it, and manually mark a participant settled. No UPI/WhatsApp share, no "Split with Friends" transaction action, and no reminders/payment-matching yet — those are later plans.

**Architecture:** Four new screens (`SplitCirclesScreen`, `SplitCreateScreen`, `SplitDetailScreen`, and a rewritten `SplitScreen`) plus a small shared `pickContact()` helper wrapping `expo-contacts`. Every screen follows `QuickAddCashScreen.tsx`'s established shape exactly: NativeWind `className`, `KeyboardAwareScrollView` for text input, an in-flight save guard, `ToastAndroid` feedback. Data flows through the CRUD functions Plan 1 (`docs/superpowers/plans/2026-09-07-split-foundation.md`) already added to `src/db/database.ts` — this plan adds no new schema or DB functions beyond what Plan 1 produced, except where explicitly noted.

**Tech Stack:** Expo SDK 56, React Native 0.85, TypeScript, NativeWind, `expo-contacts` (new dependency this plan adds).

**Spec:** `docs/superpowers/specs/2026-09-07-split-with-friends-design.md`

**Depends on:** `docs/superpowers/plans/2026-09-07-split-foundation.md` (must be merged first — this plan imports `SplitCircle`, `SplitCircleMember`, `Split`, `SplitParticipant`, and every CRUD function it defines).

## Global Constraints

- **Work dir:** paths below are relative to `/Users/copods/Documents/Projects/personal/Raqm/apps/raqm`. Branch: `build/v0-mvp`.
- **Typecheck gate.** `cd apps/raqm && npx tsc --noEmit`, run from `apps/raqm`. Clean typecheck + manual device check is the completion gate for every task (no automated test runner in this project).
- **NativeWind only for new screens.** Every screen in this plan is new, so it must use NativeWind `className` (per CLAUDE.md's "every screen touched from here on... should use NativeWind"), not `StyleSheet.create`. `style`/`Colors`/`Spacing` imports remain only for the few things NativeWind can't express (placeholder text color, `textAlignVertical`) — exactly as `QuickAddCashScreen.tsx` already does.
- **Keyboard avoidance required.** Any screen with a text input uses `KeyboardAwareScrollView` from `src/components/KeyboardAwareScrollView.tsx` with `enableOnAndroid extraScrollHeight={Spacing.lg} keyboardShouldPersistTaps="handled"` — never a plain `ScrollView`.
- **Async button handlers need in-flight guards** — "double-tap double-submits have shipped twice." Every save/delete handler in this plan follows `QuickAddCashScreen`'s `if (!canSave || saving) return;` shape.
- **Route params must be serializable** — no functions/callbacks in navigation params.
- **Naming collision avoidance (from the spec):** nothing in this plan's UI copy uses the words "Split" (as a per-transaction action) or "Group" (as a friend-list) in a way that could be confused with the existing "Split Transaction"/"Group with..." actions in `TransactionDetailScreen.tsx` — this plan's UI says "Circle", never "Group", for the saved-friend-list concept.
- **Expo SDK 56 API caution.** Per `apps/raqm/AGENTS.md`: read the exact versioned docs at https://docs.expo.dev/versions/v56.0.0/sdk/contacts/ before writing the contacts code in Task 1 — the API shape below is corroborated against that page as of this plan's writing, but Expo's surface changes release to release; confirm before implementing.
- **Git.** Never commit or push without explicit user confirmation. Commit messages are conventional (`feat(raqm): …`). Never append a `Claude-Session:` trailer.

## File Structure

**New:**

| File | Responsibility |
|---|---|
| `src/utils/contacts.ts` | `pickContact()` — wraps `expo-contacts` permission + native picker, returns a plain `{ name, phoneNumber }` or `null`. |
| `src/utils/splitShares.ts` | `computeEqualShares(totalAmount, participantCount)` — pure function, the rounding-remainder rule from the spec. |
| `src/screens/main/SplitCirclesScreen.tsx` | List/create/rename/delete Circles; add/remove members via `pickContact()` or manual entry. |
| `src/screens/main/SplitCreateScreen.tsx` | Create a split: title/amount, pick participants (a Circle or one at a time), equal/custom shares, save. |
| `src/screens/main/SplitDetailScreen.tsx` | View a split's participants; manually mark a participant settled. |

**Modified:**

| File | Change |
|---|---|
| `src/screens/main/SplitScreen.tsx` | Replace the `ComingSoonNotice` placeholder with a real list (open + settled splits) and a "New Split" button. |
| `src/navigation/types.ts` | Add `SplitCircles: undefined`, `SplitCreate: { sourceTxId?: number } \| undefined`, `SplitDetail: { splitId: number }` to `MainStackParamList`. |
| `src/navigation/MainNavigator.tsx` | Register the three new stack screens. |
| `apps/raqm/package.json` | Add `expo-contacts`. |

### Note on the decomposition

`SplitCreateScreen` takes an optional `sourceTxId` param now, even though nothing produces it yet — the transaction-detail "Split with Friends" action (a later plan) will just pass that param and needs zero further change to this screen. This keeps that later plan a pure addition (one new button + one new navigate call) rather than a modification to this one.

`SplitDetailScreen` in this plan only supports a manual "mark settled" toggle — no UPI link, no WhatsApp share, no reminder button. Those need the "Your UPI ID" setting and native SMS work from a later plan; adding the buttons now would mean touching this file again later anyway, so this plan ships the minimum viewable/actionable detail screen and a later plan extends it.

---

### Task 1: `expo-contacts` dependency + `pickContact()` helper

**Files:**
- Modify: `apps/raqm/package.json` (add `expo-contacts`)
- Create: `apps/raqm/src/utils/contacts.ts`
- Test: none (thin wrapper around a native picker — verified manually in Task 3/4's device checks)

**Interfaces:**
- Consumes: `expo-contacts`' `requestPermissionsAsync()` and `presentContactPickerAsync()`.
- Produces: `pickContact(): Promise<{ name: string; phoneNumber: string | null } | null>` — consumed by Tasks 2 and 3.

- [ ] **Step 1: Add the dependency**

```bash
cd apps/raqm && npx expo install expo-contacts
```

Expected: `expo-contacts` appears in `package.json` at the SDK-56-compatible version `npx expo install` resolves (do not hand-pick a version).

- [ ] **Step 2: Write the helper**

Create `apps/raqm/src/utils/contacts.ts`:

```ts
import * as Contacts from 'expo-contacts';

/**
 * Opens the native contact picker and returns the picked contact's name and
 * first phone number, or null if the user cancelled or denied permission.
 * Never throws — a permission denial or picker cancellation both resolve to
 * null so callers can fall back to manual entry without a try/catch.
 */
export async function pickContact(): Promise<{ name: string; phoneNumber: string | null } | null> {
  try {
    const { status } = await Contacts.requestPermissionsAsync();
    if (status !== 'granted') return null;

    const contact = await Contacts.presentContactPickerAsync();
    if (!contact) return null;

    const phoneNumber = contact.phoneNumbers?.[0]?.number ?? null;
    return { name: contact.name ?? 'Unknown', phoneNumber };
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors. If `Contacts.presentContactPickerAsync` or `Contact.phoneNumbers`/`Contact.name` don't match the installed version's types, fix the call against whatever `expo-contacts`' shipped `.d.ts` actually declares — the versioned docs page is a cross-check, not a substitute for the installed types.

- [ ] **Step 4: Commit**

```bash
git add apps/raqm/package.json apps/raqm/package-lock.json apps/raqm/src/utils/contacts.ts
git commit -m "feat(raqm): add expo-contacts and a pickContact() helper for Split with Friends"
```

---

### Task 2: `computeEqualShares` + Circles screen

**Files:**
- Create: `apps/raqm/src/utils/splitShares.ts`
- Create: `apps/raqm/src/screens/main/SplitCirclesScreen.tsx`
- Modify: `apps/raqm/src/navigation/types.ts` (add `SplitCircles: undefined;` to `MainStackParamList`, alongside the other simple push routes)
- Modify: `apps/raqm/src/navigation/MainNavigator.tsx` (register the screen)
- Test: none (pure function verified via the manual step below; screen verified on-device)

**Interfaces:**
- Consumes: `getSplitCircles`, `addSplitCircle`, `renameSplitCircle`, `deleteSplitCircle`, `getSplitCircleMembers`, `addSplitCircleMember`, `deleteSplitCircleMember` (all from Plan 1's `src/db/database.ts`); `pickContact()` (Task 1).
- Produces: `computeEqualShares(totalAmount: number, participantCount: number): number[]` — consumed by Task 3; route `SplitCircles: undefined`.

- [ ] **Step 1: Write the pure share-splitting function**

Create `apps/raqm/src/utils/splitShares.ts`:

```ts
/**
 * Equal-split rule: the total is divided among (participantCount + 1) shares —
 * the named participants plus the creator's own implicit share, which is never
 * stored as a row. Division happens in integer paise so every participant gets
 * an exact two-decimal amount; any leftover paise from the division fall out of
 * this array entirely and land on the creator's share (total minus the sum of
 * these), never on a participant.
 */
export function computeEqualShares(totalAmount: number, participantCount: number): number[] {
  if (participantCount <= 0) return [];
  const totalPaise = Math.round(totalAmount * 100);
  const shareCount = participantCount + 1;
  const basePaise = Math.floor(totalPaise / shareCount);
  return Array(participantCount).fill(basePaise / 100);
}
```

- [ ] **Step 2: Add the route**

In `apps/raqm/src/navigation/types.ts`, add to `MainStackParamList` (near `Grocery`/`DuesReminders`):

```ts
  SplitCircles: undefined;
```

- [ ] **Step 3: Write the screen**

Create `apps/raqm/src/screens/main/SplitCirclesScreen.tsx`:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ToastAndroid } from 'react-native';
import { Colors } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { pickContact } from '../../utils/contacts';
import {
  getSplitCircles,
  addSplitCircle,
  deleteSplitCircle,
  getSplitCircleMembers,
  addSplitCircleMember,
  deleteSplitCircleMember,
} from '../../db/database';
import type { SplitCircle, SplitCircleMember } from '../../db/database';

function CircleRow({
  circle,
  onDelete,
}: {
  circle: SplitCircle;
  onDelete: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [members, setMembers] = useState<SplitCircleMember[]>([]);
  const [adding, setAdding] = useState(false);
  const [manualName, setManualName] = useState('');

  const loadMembers = useCallback(() => {
    getSplitCircleMembers(circle.id).then(setMembers);
  }, [circle.id]);

  useEffect(() => {
    if (expanded) loadMembers();
  }, [expanded, loadMembers]);

  const addFromContacts = async () => {
    if (adding) return;
    setAdding(true);
    try {
      const picked = await pickContact();
      if (!picked) return;
      await addSplitCircleMember(circle.id, picked.name, picked.phoneNumber);
      loadMembers();
    } finally {
      setAdding(false);
    }
  };

  const addManual = async () => {
    const name = manualName.trim();
    if (!name || adding) return;
    setAdding(true);
    try {
      await addSplitCircleMember(circle.id, name, null);
      setManualName('');
      loadMembers();
    } finally {
      setAdding(false);
    }
  };

  return (
    <View className="bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-md mb-sm">
      <TouchableOpacity
        className="flex-row items-center justify-between"
        onPress={() => setExpanded((v) => !v)}
      >
        <Text className="font-inter-medium text-body-md text-on-surface">{circle.name}</Text>
        <TouchableOpacity onPress={() => onDelete(circle.id)}>
          <Text className="font-inter text-body-sm text-error">Delete</Text>
        </TouchableOpacity>
      </TouchableOpacity>

      {expanded && (
        <View className="mt-sm">
          {members.map((m) => (
            <View key={m.id} className="flex-row items-center justify-between py-[6px]">
              <Text className="font-inter text-body-sm text-on-surface-variant">
                {m.name}{m.phoneNumber ? ` · ${m.phoneNumber}` : ''}
              </Text>
              <TouchableOpacity onPress={() => deleteSplitCircleMember(m.id).then(loadMembers)}>
                <Text className="font-inter text-body-sm text-error">Remove</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity className="mt-sm py-[8px]" onPress={addFromContacts} disabled={adding}>
            <Text className="font-inter text-body-sm text-primary">+ Add from contacts</Text>
          </TouchableOpacity>

          <View className="flex-row items-center mt-sm">
            <TextInput
              className="flex-1 font-inter text-body-sm text-on-surface bg-surface rounded-lg border border-outline-variant px-sm py-[8px]"
              placeholder="Or type a name…"
              placeholderTextColor={Colors.outline}
              value={manualName}
              onChangeText={setManualName}
            />
            <TouchableOpacity className="ml-sm px-md py-[8px] bg-primary rounded-lg" onPress={addManual} disabled={adding}>
              <Text className="font-inter-medium text-body-sm text-on-primary">Add</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

export function SplitCirclesScreen({ navigation }: MainStackScreenProps<'SplitCircles'>) {
  const [circles, setCircles] = useState<SplitCircle[]>([]);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const load = useCallback(() => {
    getSplitCircles().then(setCircles);
  }, []);

  useEffect(load, [load]);

  const createCircle = async () => {
    const name = newName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      await addSplitCircle(name);
      setNewName('');
      load();
    } finally {
      setCreating(false);
    }
  };

  const removeCircle = async (id: number) => {
    await deleteSplitCircle(id);
    load();
    ToastAndroid.show('Circle deleted', ToastAndroid.SHORT);
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-container-margin pt-sm pb-md">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="font-inter text-body-md text-primary w-[70px]">‹ Back</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-title-lg text-on-surface">Circles</Text>
        <View className="w-[60px]" />
      </View>

      <FlatList
        contentContainerClassName="px-container-margin pb-[48px]"
        data={circles}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) => <CircleRow circle={item} onDelete={removeCircle} />}
        ListFooterComponent={
          <View className="flex-row items-center mt-md">
            <TextInput
              className="flex-1 font-inter text-body-md text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-[12px]"
              placeholder="New circle name"
              placeholderTextColor={Colors.outline}
              value={newName}
              onChangeText={setNewName}
            />
            <TouchableOpacity className="ml-sm px-md py-[12px] bg-primary rounded-xl" onPress={createCircle} disabled={creating}>
              <Text className="font-inter-medium text-body-md text-on-primary">Create</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}
```

- [ ] **Step 4: Register the screen**

In `apps/raqm/src/navigation/MainNavigator.tsx`, add the import:

```ts
import { SplitCirclesScreen } from '../screens/main/SplitCirclesScreen';
```

and, alongside the other push screens (near the `Grocery` line):

```tsx
      <Stack.Screen name="SplitCircles" component={SplitCirclesScreen} options={{ animation: 'slide_from_right' }} />
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual device check**

Reload the app. Navigate to `SplitCircles` (temporarily, e.g. via a debug button, since `SplitScreen` isn't wired to it until Task 5) — create a circle, add a member via manual entry and via "Add from contacts", remove a member, delete the circle. Expected: all persist correctly across an app reload.

- [ ] **Step 7: Commit**

```bash
git add apps/raqm/src/utils/splitShares.ts apps/raqm/src/screens/main/SplitCirclesScreen.tsx apps/raqm/src/navigation/types.ts apps/raqm/src/navigation/MainNavigator.tsx
git commit -m "feat(raqm): add Circles screen for Split with Friends"
```

---

### Task 3: `SplitCreateScreen`

**Files:**
- Create: `apps/raqm/src/screens/main/SplitCreateScreen.tsx`
- Modify: `apps/raqm/src/navigation/types.ts` (add `SplitCreate: { sourceTxId?: number } | undefined;`)
- Modify: `apps/raqm/src/navigation/MainNavigator.tsx` (register the screen)
- Test: none (manual device check below)

**Interfaces:**
- Consumes: `computeEqualShares` (Task 2); `pickContact` (Task 1); `getSplitCircles`, `getSplitCircleMembers`, `addSplit`, `addSplitParticipant` (Plan 1).
- Produces: route `SplitCreate: { sourceTxId?: number } | undefined` — the `sourceTxId` param is accepted now and passed straight to `addSplit` if present, so a later plan's "Split with Friends" transaction action needs no further change to this screen.

- [ ] **Step 1: Add the route**

In `apps/raqm/src/navigation/types.ts`:

```ts
  SplitCreate: { sourceTxId?: number } | undefined;
```

- [ ] **Step 2: Write the screen**

Create `apps/raqm/src/screens/main/SplitCreateScreen.tsx`:

```tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ToastAndroid } from 'react-native';
import { Colors, Spacing } from '../../theme';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { MainStackScreenProps } from '../../navigation/types';
import { pickContact } from '../../utils/contacts';
import { computeEqualShares } from '../../utils/splitShares';
import { getSplitCircles, getSplitCircleMembers, addSplit, addSplitParticipant } from '../../db/database';
import type { SplitCircle } from '../../db/database';

type Participant = { name: string; phoneNumber: string | null; shareAmount: number };

export function SplitCreateScreen({ route, navigation }: MainStackScreenProps<'SplitCreate'>) {
  const sourceTxId = route.params?.sourceTxId ?? null;
  const titleRef = useRef<TextInput>(null);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [customShares, setCustomShares] = useState(false);
  const [circles, setCircles] = useState<SplitCircle[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus(), 80);
    getSplitCircles().then(setCircles);
    return () => clearTimeout(t);
  }, []);

  const totalAmount = parseFloat(amount);
  const validTotal = !Number.isNaN(totalAmount) && totalAmount > 0;

  // Re-derive equal shares whenever the total or the participant count changes,
  // unless the user has switched to custom shares (their edits then own the array).
  useEffect(() => {
    if (customShares || !validTotal || participants.length === 0) return;
    const shares = computeEqualShares(totalAmount, participants.length);
    setParticipants((prev) => prev.map((p, i) => ({ ...p, shareAmount: shares[i] })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, participants.length, customShares]);

  const shareSum = participants.reduce((s, p) => s + p.shareAmount, 0);
  const sharesValid = !customShares || (validTotal && shareSum <= totalAmount + 0.001);
  const canSave = validTotal && participants.length > 0 && sharesValid && !saving;

  const addFromCircle = async (circle: SplitCircle) => {
    const members = await getSplitCircleMembers(circle.id);
    setParticipants((prev) => [
      ...prev,
      ...members.map((m) => ({ name: m.name, phoneNumber: m.phoneNumber, shareAmount: 0 })),
    ]);
  };

  const addFromContacts = async () => {
    const picked = await pickContact();
    if (!picked) return;
    setParticipants((prev) => [...prev, { name: picked.name, phoneNumber: picked.phoneNumber, shareAmount: 0 }]);
  };

  const [manualName, setManualName] = useState('');
  const addManual = () => {
    const name = manualName.trim();
    if (!name) return;
    setParticipants((prev) => [...prev, { name, phoneNumber: null, shareAmount: 0 }]);
    setManualName('');
  };

  const removeParticipant = (index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const setShare = (index: number, value: string) => {
    const shareAmount = parseFloat(value) || 0;
    setParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, shareAmount } : p)));
  };

  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Tabs');
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const splitId = await addSplit({
        title: title.trim() || 'Split',
        totalAmount,
        sourceTxId,
        creatorUpiId: null, // wired to the Settings UPI ID by a later plan
      });
      for (const p of participants) {
        await addSplitParticipant(splitId, {
          name: p.name,
          phoneNumber: p.phoneNumber,
          shareAmount: p.shareAmount,
        });
      }
      ToastAndroid.show('Split created', ToastAndroid.SHORT);
      navigation.replace('SplitDetail', { splitId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-container-margin pt-sm pb-md">
        <TouchableOpacity onPress={close}>
          <Text className="font-inter text-body-md text-primary w-[70px]">✕ Close</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-title-lg text-on-surface">New Split</Text>
        <View className="w-[60px]" />
      </View>

      <KeyboardAwareScrollView
        contentContainerClassName="px-container-margin pb-[48px]"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={Spacing.lg}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Title</Text>
        <TextInput
          ref={titleRef}
          className="font-inter text-body-md text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-[12px]"
          placeholder="e.g. Dinner at Truffles"
          placeholderTextColor={Colors.outline}
          value={title}
          onChangeText={setTitle}
        />

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Total amount</Text>
        <TextInput
          className="font-mono-medium text-numeric-lg text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-md"
          placeholder="0"
          placeholderTextColor={Colors.outline}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Participants</Text>
        {circles.map((c) => (
          <TouchableOpacity
            key={c.id}
            className="py-[8px]"
            onPress={() => addFromCircle(c)}
          >
            <Text className="font-inter text-body-sm text-primary">+ Use "{c.name}"</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity className="py-[8px]" onPress={addFromContacts}>
          <Text className="font-inter text-body-sm text-primary">+ Add from contacts</Text>
        </TouchableOpacity>
        <View className="flex-row items-center mt-sm">
          <TextInput
            className="flex-1 font-inter text-body-sm text-on-surface bg-surface-container-lowest rounded-lg border border-outline-variant px-sm py-[8px]"
            placeholder="Or type a name…"
            placeholderTextColor={Colors.outline}
            value={manualName}
            onChangeText={setManualName}
          />
          <TouchableOpacity className="ml-sm px-md py-[8px] bg-primary rounded-lg" onPress={addManual}>
            <Text className="font-inter-medium text-body-sm text-on-primary">Add</Text>
          </TouchableOpacity>
        </View>

        {participants.length > 0 && (
          <View className="mt-md">
            <TouchableOpacity onPress={() => setCustomShares((v) => !v)}>
              <Text className="font-inter text-body-sm text-primary mb-sm">
                {customShares ? 'Switch to equal split' : 'Switch to custom amounts'}
              </Text>
            </TouchableOpacity>
            {participants.map((p, i) => (
              <View key={`${p.name}-${i}`} className="flex-row items-center justify-between py-[6px]">
                <Text className="font-inter text-body-sm text-on-surface flex-1">{p.name}</Text>
                {customShares ? (
                  <TextInput
                    className="w-[90px] font-mono text-body-sm text-on-surface bg-surface rounded-lg border border-outline-variant px-sm py-[6px] text-right"
                    keyboardType="decimal-pad"
                    value={p.shareAmount ? String(p.shareAmount) : ''}
                    onChangeText={(v) => setShare(i, v)}
                  />
                ) : (
                  <Text className="font-mono text-body-sm text-on-surface-variant">₹{p.shareAmount.toFixed(2)}</Text>
                )}
                <TouchableOpacity className="ml-sm" onPress={() => removeParticipant(i)}>
                  <Text className="font-inter text-body-sm text-error">✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {customShares && !sharesValid && (
              <Text className="font-inter text-body-sm text-error mt-sm">
                Shares can't add up to more than the total.
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          className={`mt-xl py-md items-center bg-primary rounded-xl ${!canSave ? 'opacity-40' : ''}`}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text className="font-inter-medium text-body-md text-on-primary">Save split</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}
```

- [ ] **Step 3: Register the screen**

In `apps/raqm/src/navigation/MainNavigator.tsx`:

```ts
import { SplitCreateScreen } from '../screens/main/SplitCreateScreen';
```

```tsx
      <Stack.Screen name="SplitCreate" component={SplitCreateScreen} options={{ animation: 'slide_from_bottom' }} />
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: errors referencing `SplitDetail` (used in `navigation.replace` above) until Task 4 adds that route — acceptable at this point in the plan; re-run this check again after Task 4 and expect it clean then. If any other error appears, fix it before moving on.

- [ ] **Step 5: Commit**

```bash
git add apps/raqm/src/screens/main/SplitCreateScreen.tsx apps/raqm/src/navigation/types.ts apps/raqm/src/navigation/MainNavigator.tsx
git commit -m "feat(raqm): add SplitCreateScreen"
```

---

### Task 4: `SplitDetailScreen`

**Files:**
- Create: `apps/raqm/src/screens/main/SplitDetailScreen.tsx`
- Modify: `apps/raqm/src/navigation/types.ts` (add `SplitDetail: { splitId: number };`)
- Modify: `apps/raqm/src/navigation/MainNavigator.tsx` (register the screen)
- Test: none (manual device check below)

**Interfaces:**
- Consumes: `getSplit`, `getSplitParticipants`, `setSplitParticipantStatus`, `deleteSplit` (Plan 1).
- Produces: route `SplitDetail: { splitId: number }` — consumed by `SplitCreateScreen` (Task 3) and `SplitScreen` (Task 5).

- [ ] **Step 1: Add the route**

```ts
  SplitDetail: { splitId: number };
```

- [ ] **Step 2: Write the screen**

Create `apps/raqm/src/screens/main/SplitDetailScreen.tsx`:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ToastAndroid } from 'react-native';
import { MainStackScreenProps } from '../../navigation/types';
import { getSplit, getSplitParticipants, setSplitParticipantStatus, deleteSplit } from '../../db/database';
import type { Split, SplitParticipant } from '../../db/database';

function statusLabel(status: SplitParticipant['status']): string {
  if (status === 'settled') return 'Settled';
  if (status === 'attention') return 'Needs review';
  return 'Unpaid';
}

export function SplitDetailScreen({ route, navigation }: MainStackScreenProps<'SplitDetail'>) {
  const { splitId } = route.params;
  const [split, setSplit] = useState<Split | null>(null);
  const [participants, setParticipants] = useState<SplitParticipant[]>([]);

  const load = useCallback(() => {
    getSplit(splitId).then(setSplit);
    getSplitParticipants(splitId).then(setParticipants);
  }, [splitId]);

  useEffect(load, [load]);

  const toggleSettled = async (p: SplitParticipant) => {
    const next = p.status === 'settled' ? 'unpaid' : 'settled';
    await setSplitParticipantStatus(p.id, next, null);
    load();
  };

  const removeSplit = async () => {
    await deleteSplit(splitId);
    ToastAndroid.show('Split deleted', ToastAndroid.SHORT);
    navigation.goBack();
  };

  if (!split) return null;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-container-margin pt-sm pb-md">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="font-inter text-body-md text-primary w-[70px]">‹ Back</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-title-lg text-on-surface" numberOfLines={1}>{split.title}</Text>
        <TouchableOpacity onPress={removeSplit}>
          <Text className="font-inter text-body-sm text-error">Delete</Text>
        </TouchableOpacity>
      </View>

      <Text className="font-mono-medium text-numeric-lg text-on-surface px-container-margin mb-md">
        ₹{split.totalAmount.toFixed(2)}
      </Text>

      <FlatList
        contentContainerClassName="px-container-margin pb-[48px]"
        data={participants}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="flex-row items-center justify-between bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-md mb-sm"
            onPress={() => toggleSettled(item)}
          >
            <View>
              <Text className="font-inter-medium text-body-md text-on-surface">{item.name}</Text>
              <Text className="font-inter text-body-sm text-on-surface-variant">{statusLabel(item.status)}</Text>
            </View>
            <Text className="font-mono text-body-md text-on-surface">₹{item.shareAmount.toFixed(2)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
```

- [ ] **Step 3: Register the screen**

```ts
import { SplitDetailScreen } from '../screens/main/SplitDetailScreen';
```

```tsx
      <Stack.Screen name="SplitDetail" component={SplitDetailScreen} options={{ animation: 'slide_from_right' }} />
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: clean now (this was the missing route Task 3 flagged).

- [ ] **Step 5: Manual device check**

Create a split via the temporary debug entry from Task 2/3 (Task 5 wires the real entry point). Confirm: equal split recalculates as participants are added/removed, switching to custom shares lets you type amounts and blocks save when they exceed the total, saving navigates to `SplitDetail`, tapping a participant toggles Settled/Unpaid, Delete removes the split and its participants (confirm via a second query or app reload that no orphaned `split_participants` rows remain).

- [ ] **Step 6: Commit**

```bash
git add apps/raqm/src/screens/main/SplitDetailScreen.tsx apps/raqm/src/navigation/types.ts apps/raqm/src/navigation/MainNavigator.tsx
git commit -m "feat(raqm): add SplitDetailScreen"
```

---

### Task 5: Rewrite `SplitScreen` (the tab)

**Files:**
- Modify: `apps/raqm/src/screens/main/SplitScreen.tsx` (full rewrite, replacing the `ComingSoonNotice` body)
- Test: none (manual device check below)

**Interfaces:**
- Consumes: `getSplits`, `getSplitParticipants` (Plan 1); navigates to `SplitCreate` and `SplitCircles` (Tasks 2-3) and `SplitDetail` (Task 4).
- Produces: nothing new consumed elsewhere — this is the tab's terminal screen for this plan.

- [ ] **Step 1: Rewrite the screen**

Replace `apps/raqm/src/screens/main/SplitScreen.tsx` in full:

```tsx
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import type { NavigationProp } from '@react-navigation/native';
import { TopHeader } from '../../components/TopHeader';
import { MainTabScreenProps, MainStackParamList } from '../../navigation/types';
import { getSplits, getSplitParticipants } from '../../db/database';
import type { Split, SplitParticipant } from '../../db/database';

type Row = { split: Split; participants: SplitParticipant[] };

export function SplitScreen({ navigation }: MainTabScreenProps<'Split'>) {
  const [rows, setRows] = useState<Row[]>([]);

  const load = useCallback(() => {
    getSplits().then(async (splits) => {
      const withParticipants = await Promise.all(
        // Sequential-per-split, not Promise.all-across-splits: mirrors the project's
        // general "avoid unbounded parallel SQLite reads" caution — split counts are
        // small (dozens, not thousands), so this stays cheap either way, but this
        // keeps the pattern consistent with insertParsedTxs' documented invariant.
        splits.map(async (split) => ({ split, participants: await getSplitParticipants(split.id) })),
      );
      setRows(withParticipants);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', load);
    return unsubscribe;
  }, [navigation, load]);

  const attentionCount = rows.reduce(
    (n, r) => n + r.participants.filter((p) => p.status === 'attention').length,
    0,
  );

  return (
    <View className="flex-1 bg-background">
      <TopHeader />

      <View className="flex-row items-center justify-between px-container-margin py-sm">
        <TouchableOpacity
          onPress={() => navigation.getParent<NavigationProp<MainStackParamList>>()?.navigate('SplitCircles')}
        >
          <Text className="font-inter text-body-sm text-primary">Circles</Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="px-md py-[8px] bg-primary rounded-xl"
          onPress={() => navigation.getParent<NavigationProp<MainStackParamList>>()?.navigate('SplitCreate', undefined)}
        >
          <Text className="font-inter-medium text-body-sm text-on-primary">New Split</Text>
        </TouchableOpacity>
      </View>

      {attentionCount > 0 && (
        <View className="mx-container-margin mb-sm px-md py-[10px] bg-error/10 rounded-xl border border-error/30">
          <Text className="font-inter-medium text-body-sm text-error">
            {attentionCount} payment{attentionCount > 1 ? 's need' : ' needs'} your review
          </Text>
        </View>
      )}

      <FlatList
        contentContainerClassName="px-container-margin pb-[48px]"
        data={rows}
        keyExtractor={(r) => String(r.split.id)}
        renderItem={({ item }) => {
          const settledCount = item.participants.filter((p) => p.status === 'settled').length;
          return (
            <TouchableOpacity
              className="bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-md mb-sm"
              onPress={() =>
                navigation
                  .getParent<NavigationProp<MainStackParamList>>()
                  ?.navigate('SplitDetail', { splitId: item.split.id })
              }
            >
              <Text className="font-inter-medium text-body-md text-on-surface">{item.split.title}</Text>
              <View className="flex-row items-center justify-between mt-[4px]">
                <Text className="font-inter text-body-sm text-on-surface-variant">
                  {settledCount} of {item.participants.length} paid
                </Text>
                <Text className="font-mono text-body-sm text-on-surface">₹{item.split.totalAmount.toFixed(2)}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text className="font-inter text-body-sm text-on-surface-variant text-center mt-xl">
            No splits yet — tap "New Split" to add one.
          </Text>
        }
      />
    </View>
  );
}
```

Note: `navigation.getParent<NavigationProp<MainStackParamList>>()` matches the exact pattern `AnalyticsScreen.tsx` already uses everywhere it navigates from a tab screen into a stack route (confirmed verbatim against that file) — no casts, no placeholders.

- [ ] **Step 2: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual device check**

Open the Split tab. Confirm: "New Split" and "Circles" navigate correctly, a created split appears in the list with the right "N of M paid" count and total, tapping a row opens `SplitDetail`, and the empty state shows correctly with zero splits.

- [ ] **Step 4: Commit**

```bash
git add apps/raqm/src/screens/main/SplitScreen.tsx
git commit -m "feat(raqm): wire the Split tab to real splits (list, new split, circles)"
```

## Self-review notes

- Spec coverage: Circles (create/edit/members), split creation (from scratch, equal + custom shares, rounding rule), Split tab list + Attention-needed banner (count only — the actual detection job lands in a later plan, but the banner already reads `status = 'attention'` so that plan needs no change here), and manual settle-toggle are all covered. Deferred by design in this plan: UPI link, WhatsApp share, reminders, "Split with Friends" transaction action, payment-match detection — all noted inline as later-plan work.
- Placeholder scan: none — Task 5's cross-navigator calls were checked against `AnalyticsScreen.tsx`'s real pattern and written to match exactly, no casts.
- Type consistency: `SplitCircle`, `SplitCircleMember`, `Split`, `SplitParticipant` field names match Plan 1 exactly across all five tasks (`shareAmount`, `phoneNumber`, `status`, etc.).
