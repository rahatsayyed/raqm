# Split with Friends v2 — Plan 3: Circle Creation UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current "create empty circle, then separately expand to add members" flow with a WhatsApp-style two-step flow: pick members first, then name and save the circle in one step.

**Architecture:** Add a transactional `addSplitCircleWithMembers` DB function (circle + all members in one `BEGIN`/`COMMIT`). Replace `SplitCirclesScreen`'s bottom "new circle name + Create" block with a 2-step in-screen flow (step state: `'pick-members' | 'name'`). `expo-contacts` (`~56.0.13`) has no multi-select picker — `Contacts.Contact.presentPicker()` is single-contact only — so "pick members" means repeated single-picks via the existing `pickContact()`, exactly like every other add-participant flow in this app already does.

**Tech Stack:** TypeScript, expo-sqlite (async API), React Native, NativeWind.

**Spec:** `docs/superpowers/specs/2026-09-08-split-with-friends-v2-design.md` (section 3: "Circle creation UX"). Depends on Plan 2 Task 3 (the `returnTo`/`popTo` contract on `SplitCircles` — this plan must preserve it).

## Global Constraints

- expo-sqlite async API only — explicit `BEGIN`/`COMMIT`/`ROLLBACK`, never `withTransactionAsync`.
- New/touched screens use NativeWind `className`, never `StyleSheet.create`.
- Async button handlers need in-flight guards.
- Renaming an existing circle, adding more members later, or removing members from an existing circle keep the CURRENT expand-inline UI (`CircleRow`'s existing rename/add/remove controls) — only the initial creation path changes.
- The `returnTo`/`popTo('SplitCreate', { pickedCircleId }, { merge: true })` contract added in Plan 2 Task 3 must keep working after this plan's changes — the "Use this circle" action stays on every circle row, including newly created ones.
- Same duplicate-prevention rule as everywhere else: match by phone number when both have one, else case-insensitive name (the `isSameParticipant` function, already defined in `SplitCreateScreen.tsx` — for this screen, either import it if that's convenient, or duplicate the same two-line logic locally with an identical comment, since `SplitCirclesScreen.tsx` doesn't currently import from `SplitCreateScreen.tsx` and introducing that cross-import is a judgment call the implementer should make based on whether a shared `src/utils/participants.ts` helper is cleaner — if so, extract `isSameParticipant` there and update `SplitCreateScreen.tsx` to import it too, in this same task, so there's exactly one copy).
- No test runner — verify with `cd apps/raqm && npx tsc --noEmit` plus manual device verification.

---

### Task 1: `addSplitCircleWithMembers` — one-transaction circle creation

**Files:**
- Modify: `apps/raqm/src/db/database.ts` (near the existing `addSplitCircle`/`getSplitCircles`/`getSplitCircleMembers`/`addSplitCircleMember` functions, lines ~2509-2577)

**Interfaces:**
- Consumes: `split_circles`, `split_circle_members` tables (existing schema, unchanged by this plan).
- Produces:
  ```ts
  export async function addSplitCircleWithMembers(
    name: string,
    members: { name: string; phoneNumber: string | null }[],
  ): Promise<number>
  ```

- [ ] **Step 1: Read the existing `addSplitCircle`/`addSplitCircleMember` implementations**

Read `apps/raqm/src/db/database.ts` around the `addSplitCircle` and `addSplitCircleMember` functions (grep `export async function addSplitCircle` for exact line numbers) to copy their exact INSERT statement shapes.

- [ ] **Step 2: Add the transactional function**

```ts
export async function addSplitCircleWithMembers(
  name: string,
  members: { name: string; phoneNumber: string | null }[],
): Promise<number> {
  await database.runAsync(`BEGIN`);
  try {
    const now = Date.now();
    const circleResult = await database.runAsync(
      `INSERT INTO split_circles (name, created_at) VALUES (?, ?)`,
      [name, now],
    );
    const circleId = circleResult.lastInsertRowId;
    for (const m of members) {
      await database.runAsync(
        `INSERT INTO split_circle_members (circle_id, name, phone_number, created_at) VALUES (?, ?, ?, ?)`,
        [circleId, m.name, m.phoneNumber, now],
      );
    }
    await database.runAsync(`COMMIT`);
    return circleId;
  } catch (e) {
    await database.runAsync(`ROLLBACK`);
    throw e;
  }
}
```

(Match the exact column list/order to whatever Step 1 revealed for `addSplitCircle`'s own INSERT — this function should look like a natural extension of it, not a divergent rewrite.)

- [ ] **Step 3: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors (additive export, no existing callers yet).

- [ ] **Step 4: Commit**

```bash
git add apps/raqm/src/db/database.ts
git commit -m "feat(raqm): add addSplitCircleWithMembers for one-transaction circle creation"
```

---

### Task 2: Two-step "pick members → name circle" creation flow in `SplitCirclesScreen`

**Files:**
- Modify: `apps/raqm/src/screens/main/SplitCirclesScreen.tsx`

**Interfaces:**
- Consumes: `addSplitCircleWithMembers` (Task 1), `pickContact` (existing, `src/utils/contacts.ts`).
- Produces: nothing consumed elsewhere — this is a self-contained UI change.

- [ ] **Step 1: Read the full current file**

Read `apps/raqm/src/screens/main/SplitCirclesScreen.tsx` in full (251 lines) to see the exact current state names (`circles, newName, creating, deletingCircleId`) and the `createCircle` function (lines 182-193) and the bottom name-input block (lines 236-247) that this task replaces.

- [ ] **Step 2: Add two-step creation state**

Add alongside the screen's existing state:

```ts
type CreateStep = 'closed' | 'pick-members' | 'name';
const [createStep, setCreateStep] = useState<CreateStep>('closed');
const [draftMembers, setDraftMembers] = useState<{ name: string; phoneNumber: string | null }[]>([]);
const [draftManualName, setDraftManualName] = useState('');
const [draftCircleName, setDraftCircleName] = useState('');
const [creatingCircle, setCreatingCircle] = useState(false);
```

Same duplicate-check helper as `SplitCreateScreen.tsx` (see Global Constraints — extract to a shared file or duplicate the two-line check):

```ts
function isSameParticipant(a: { name: string; phoneNumber: string | null }, b: { name: string; phoneNumber: string | null }): boolean {
  if (a.phoneNumber && b.phoneNumber) return a.phoneNumber === b.phoneNumber;
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
}
```

- [ ] **Step 3: Replace the bottom "new circle name + Create" block with a "+ Create circle" entry point**

Replace lines 236-247 (the flat name-input + Create button) with:

```tsx
<TouchableOpacity
  className="mt-lg py-md items-center bg-primary rounded-xl"
  onPress={() => {
    setDraftMembers([]);
    setDraftManualName('');
    setDraftCircleName('');
    setCreateStep('pick-members');
  }}
>
  <Text className="font-inter-medium text-body-md text-on-primary">+ Create circle</Text>
</TouchableOpacity>
```

Remove the now-unused `newName`/`creating`/`createCircle` from the screen (their responsibility moves into the new step-1/step-2 UI below).

- [ ] **Step 4: Add the "pick members" step (step 1)**

Render this block when `createStep === 'pick-members'` (as a full-screen replacement of the circle list, matching how `SplitCreateScreen` structures its own full-screen sections — not a modal, since it needs its own header with a way back to the circle list):

```tsx
{createStep === 'pick-members' && (
  <View className="flex-1 bg-background">
    <View className="flex-row items-center justify-between px-container-margin pt-sm pb-md">
      <TouchableOpacity onPress={() => setCreateStep('closed')}>
        <Text className="font-inter text-body-md text-primary w-[70px]">✕ Cancel</Text>
      </TouchableOpacity>
      <Text className="font-inter-bold text-title-lg text-on-surface">Add members</Text>
      <View className="w-[60px]" />
    </View>
    <KeyboardAwareScrollView contentContainerClassName="px-container-margin pb-[48px]" enableOnAndroid keyboardShouldPersistTaps="handled">
      <TouchableOpacity
        className="py-[8px]"
        onPress={async () => {
          const picked = await pickContact();
          if (!picked) return;
          if (draftMembers.some((m) => isSameParticipant(m, picked))) {
            ToastAndroid.show(`${picked.name} is already added`, ToastAndroid.SHORT);
            return;
          }
          setDraftMembers((prev) => [...prev, picked]);
        }}
      >
        <Text className="font-inter text-body-sm text-primary">+ Add from contacts</Text>
      </TouchableOpacity>
      <View className="flex-row items-center mt-sm">
        <TextInput
          className="flex-1 font-inter text-body-sm text-on-surface bg-surface-container-lowest rounded-lg border border-outline-variant px-sm py-[8px]"
          placeholder="Or type a name…"
          placeholderTextColor={Colors.outline}
          value={draftManualName}
          onChangeText={setDraftManualName}
        />
        <TouchableOpacity
          className="ml-sm px-md py-[8px] bg-primary rounded-lg"
          onPress={() => {
            const name = draftManualName.trim();
            if (!name) return;
            if (draftMembers.some((m) => isSameParticipant(m, { name, phoneNumber: null }))) {
              ToastAndroid.show(`${name} is already added`, ToastAndroid.SHORT);
              return;
            }
            setDraftMembers((prev) => [...prev, { name, phoneNumber: null }]);
            setDraftManualName('');
          }}
        >
          <Text className="font-inter-medium text-body-sm text-on-primary">Add</Text>
        </TouchableOpacity>
      </View>

      {draftMembers.map((m, i) => (
        <View key={`${m.name}-${i}`} className="flex-row items-center justify-between py-[6px]">
          <Text className="font-inter text-body-sm text-on-surface flex-1">{m.name}</Text>
          <TouchableOpacity onPress={() => setDraftMembers((prev) => prev.filter((_, idx) => idx !== i))}>
            <Text className="font-inter text-body-sm text-error">✕</Text>
          </TouchableOpacity>
        </View>
      ))}

      <TouchableOpacity
        className={`mt-xl py-md items-center bg-primary rounded-xl ${draftMembers.length === 0 ? 'opacity-40' : ''}`}
        disabled={draftMembers.length === 0}
        onPress={() => setCreateStep('name')}
      >
        <Text className="font-inter-medium text-body-md text-on-primary">Next</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  </View>
)}
```

- [ ] **Step 5: Add the "name circle" step (step 2)**

Render this block when `createStep === 'name'`:

```tsx
{createStep === 'name' && (
  <View className="flex-1 bg-background">
    <View className="flex-row items-center justify-between px-container-margin pt-sm pb-md">
      <TouchableOpacity onPress={() => setCreateStep('pick-members')}>
        <Text className="font-inter text-body-md text-primary w-[70px]">‹ Back</Text>
      </TouchableOpacity>
      <Text className="font-inter-bold text-title-lg text-on-surface">Name circle</Text>
      <View className="w-[60px]" />
    </View>
    <KeyboardAwareScrollView contentContainerClassName="px-container-margin pb-[48px]" enableOnAndroid keyboardShouldPersistTaps="handled">
      <TextInput
        className="font-inter text-body-md text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-[12px]"
        placeholder="e.g. Goa Trip"
        placeholderTextColor={Colors.outline}
        value={draftCircleName}
        onChangeText={setDraftCircleName}
      />
      <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">{draftMembers.length} members</Text>
      <TouchableOpacity
        className={`mt-xl py-md items-center bg-primary rounded-xl ${!draftCircleName.trim() || creatingCircle ? 'opacity-40' : ''}`}
        disabled={!draftCircleName.trim() || creatingCircle}
        onPress={async () => {
          if (creatingCircle) return;
          setCreatingCircle(true);
          try {
            await addSplitCircleWithMembers(draftCircleName.trim(), draftMembers);
            ToastAndroid.show('Circle created', ToastAndroid.SHORT);
            setCreateStep('closed');
            load();
          } finally {
            setCreatingCircle(false);
          }
        }}
      >
        <Text className="font-inter-medium text-body-md text-on-primary">Save circle</Text>
      </TouchableOpacity>
    </KeyboardAwareScrollView>
  </View>
)}
```

- [ ] **Step 6: Guard the existing circle list render**

Wrap the screen's existing top-level return (the circle list + header) so it only renders when `createStep === 'closed'` — the two new steps above are full-screen replacements, not overlays, matching how `SplitCreateScreen` is structured. This means the outer `return` becomes a conditional: `if (createStep === 'pick-members') return (...)`, `if (createStep === 'name') return (...)`, then the existing circle-list JSX as the final `return`.

- [ ] **Step 7: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Manual verification**

Launch the app, go to Split → Circles → "+ Create circle" → add 2 members (one via contacts, one typed) → Next → name it → Save circle → confirm the new circle appears in the list with both members (expand it to check), and that re-adding the same contact during step 1 shows the "already added" toast instead of duplicating.

- [ ] **Step 9: Commit**

```bash
git add apps/raqm/src/screens/main/SplitCirclesScreen.tsx
git commit -m "feat(raqm): replace circle creation with WhatsApp-style two-step flow"
```
