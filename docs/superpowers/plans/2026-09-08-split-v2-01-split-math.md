# Split with Friends v2 — Plan 1: Split Math Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace v1's Equal/Custom split toggle with four modes (Equal, Exact, Percentage, Shares), make "You" a real stored participant row, and implement the pin-and-redistribute input UX for Exact/Percentage.

**Architecture:** Add pure calculation functions to `src/utils/splitShares.ts` (no DB, no React — testable via `npx tsx`). Add migration v15 to `src/db/database.ts` for the new `is_self` column plus columns needed by later plans in this series (`description`, `auto_remind_enabled`, `remind_interval_days`) so one migration covers the whole v2 effort. Rewrite `SplitCreateScreen.tsx`'s mode/participant section to use the new functions and store a `is_self` row for the creator.

**Tech Stack:** TypeScript, expo-sqlite (async API), React Native, NativeWind.

**Spec:** `docs/superpowers/specs/2026-09-08-split-with-friends-v2-design.md` (section 1: "Split math overhaul"; also the migration listed under sections 2 and 6, applied here as v15 in full).

## Global Constraints

- expo-sqlite async API only — every migration/write uses explicit `BEGIN`/`COMMIT`/`ROLLBACK` via `runAsync`, never `withTransactionAsync`.
- New/touched screens use NativeWind `className`, never `StyleSheet.create`.
- Any screen with text inputs uses `KeyboardAwareScrollView`, never plain `ScrollView`.
- Dynamically-mounted inputs use ref + delayed `.focus()` (~80ms), not bare `autoFocus`.
- Async button handlers need in-flight guards (double-tap must not double-submit).
- All SQL is parameterized.
- The app has no test runner. Pure logic (this plan's `splitShares.ts` functions) is verified with a throwaway `npx tsx` script, not jest. UI changes are verified by `cd apps/raqm && npx tsc --noEmit` plus a manual-verification checklist item.
- Money is always paise-rounded so per-participant shares sum to exactly the total (see `computeEqualShares`'s existing paise-rounding convention in `splitShares.ts`).
- Percentages are capped at 2 decimal places.

---

### Task 1: Migration v15 — new split columns

**Files:**
- Modify: `apps/raqm/src/db/database.ts` (append after the v14 block, which ends at line 479 with `INSERT INTO schema_migrations VALUES (14)` — confirmed current highest version is 14)

**Interfaces:**
- Produces: `splits.description TEXT`, `splits.auto_remind_enabled INTEGER NOT NULL DEFAULT 0`, `splits.remind_interval_days INTEGER`, `split_participants.is_self INTEGER NOT NULL DEFAULT 0` — every later task and plan in this series depends on these four columns existing.

- [ ] **Step 1: Read the v14 migration block for the exact pattern to copy**

Read `apps/raqm/src/db/database.ts` lines 465-480 to confirm the closing brace/catch structure of the v14 block so v15 is appended in the same shape (this file is >1500 lines; do not read the whole file, only this range plus the migration runner's opening, lines 1-20, to see the `current` variable name).

- [ ] **Step 2: Add the v15 migration block**

Insert immediately after the v14 block closes:

```ts
if (current < 15) {
  await database.runAsync(`BEGIN`);
  try {
    await database.runAsync(`ALTER TABLE splits ADD COLUMN description TEXT`);
    await database.runAsync(
      `ALTER TABLE splits ADD COLUMN auto_remind_enabled INTEGER NOT NULL DEFAULT 0`,
    );
    await database.runAsync(`ALTER TABLE splits ADD COLUMN remind_interval_days INTEGER`);
    await database.runAsync(
      `ALTER TABLE split_participants ADD COLUMN is_self INTEGER NOT NULL DEFAULT 0`,
    );
    await database.runAsync(`INSERT INTO schema_migrations VALUES (15)`);
    await database.runAsync(`COMMIT`);
  } catch (e) {
    await database.runAsync(`ROLLBACK`);
    throw e;
  }
}
```

`remind_interval_days` is nullable: `null` means "every app open" (section 2/6's reminder-cadence design — resolved during planning: the four cadence options are "Every app open" → `null`, "Every 2 days" → `2`, "Every 3 days" → `3`, "Weekly" → `7`).

- [ ] **Step 3: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no new errors (this is additive SQL only, no TS surface yet).

- [ ] **Step 4: Manual verification**

Run the app once via `npm run raqm` (Metro reload is enough, no native rebuild needed — this is a JS/SQL-only change) and confirm it starts without a migration error. Check via the existing "Deleted transactions"/DB-adjacent screen or a quick `console.log` that `schema_migrations` now has a row for version 15 (or trust a clean startup as the signal — expo-sqlite throws on migration failure and the app would crash on launch if this broke).

- [ ] **Step 5: Commit**

```bash
git add apps/raqm/src/db/database.ts
git commit -m "feat(raqm): add migration v15 for split v2 columns"
```

---

### Task 2: Split-share calculation functions

**Files:**
- Modify: `apps/raqm/src/utils/splitShares.ts`
- Test: throwaway script at `<scratchpad>/verify-split-shares.ts`, run via `npx tsx`, not committed

**Interfaces:**
- Consumes: nothing (pure functions, no imports needed beyond what's already in the file)
- Produces:
  - `computeEqualSharesInclusive(totalAmount: number, totalCount: number): number[]` — replaces the old `computeEqualShares`'s role now that "You" is a stored row (see rationale below); returns exactly `totalCount` shares summing to `totalAmount`.
  - `computePercentageShares(totalAmount: number, percentages: number[]): number[]` — converts a reconciled (sums-to-100, ≤2-decimal) percentage array into paise-rounded rupee amounts summing exactly to `totalAmount`.
  - `computeShareWeightAmounts(totalAmount: number, weights: number[]): number[]` — converts relative weights into paise-rounded rupee amounts summing exactly to `totalAmount`.
  - `redistributeUnpinned(totalAmount: number, pinned: Map<number, number>, totalCount: number): number[]` — the pin-and-redistribute core: given which row-indices are pinned and their pinned rupee amounts, returns a full `totalCount`-length array where pinned indices keep their pinned value and unpinned indices split the remainder equally (paise-rounded, remainder-to-last-unpinned-row). If the pinned sum exceeds `totalAmount`, every unpinned row is `0`.

- [ ] **Step 1: Replace `computeEqualShares` with `computeEqualSharesInclusive`**

v1's `computeEqualShares(totalAmount, participantCount)` divided among `participantCount + 1` shares and silently dropped the creator's implicit share (never stored). v2 stores "You" as a real row, so every share must be stored and the array must sum to exactly `totalAmount` with no implicit remainder. Grep confirmed `computeEqualShares`'s only caller is `SplitCreateScreen.tsx`, which Task 1 of Plan 2 rewrites — so this is a safe rename-and-reshape, not an additive function.

Replace the full file content:

```ts
/**
 * Equal-split rule (v2): the total is divided evenly among totalCount rows —
 * every row, including the creator's own "You" row, is a real stored share.
 * Division happens in integer paise so every row gets an exact two-decimal
 * amount; any leftover paise from the division land on the LAST row, so the
 * array always sums to exactly totalAmount.
 */
export function computeEqualSharesInclusive(totalAmount: number, totalCount: number): number[] {
  if (totalCount <= 0) return [];
  const totalPaise = Math.round(totalAmount * 100);
  const basePaise = Math.floor(totalPaise / totalCount);
  const remainderPaise = totalPaise - basePaise * totalCount;
  const shares = Array(totalCount).fill(basePaise);
  shares[totalCount - 1] += remainderPaise;
  return shares.map((p) => p / 100);
}

/**
 * Converts percentages (assumed already reconciled to sum to 100, each
 * capped at 2 decimal places by the UI) into rupee amounts. Paise-rounded;
 * remainder from rounding lands on the last row so the array sums exactly
 * to totalAmount.
 */
export function computePercentageShares(totalAmount: number, percentages: number[]): number[] {
  if (percentages.length === 0) return [];
  const totalPaise = Math.round(totalAmount * 100);
  const paise = percentages.map((pct) => Math.floor((totalPaise * pct) / 100));
  const usedPaise = paise.reduce((s, p) => s + p, 0);
  paise[paise.length - 1] += totalPaise - usedPaise;
  return paise.map((p) => p / 100);
}

/**
 * Converts relative weights (e.g. 2/1/1) into rupee amounts proportional to
 * each weight's share of the total weight. Paise-rounded; remainder lands on
 * the last row.
 */
export function computeShareWeightAmounts(totalAmount: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (totalWeight <= 0) return weights.map(() => 0);
  const totalPaise = Math.round(totalAmount * 100);
  const paise = weights.map((w) => Math.floor((totalPaise * w) / totalWeight));
  const usedPaise = paise.reduce((s, p) => s + p, 0);
  paise[paise.length - 1] += totalPaise - usedPaise;
  return paise.map((p) => p / 100);
}

/**
 * Pin-and-redistribute (Exact/Percentage modes): rows the user has typed
 * into are "pinned" at their typed value; every other row splits whatever
 * remains equally. If pinned values already exceed the total, unpinned rows
 * clamp to 0 (the caller is expected to also show an over-allocation
 * warning in that case — this function only computes amounts).
 */
export function redistributeUnpinned(
  totalAmount: number,
  pinned: Map<number, number>,
  totalCount: number,
): number[] {
  const result = Array(totalCount).fill(0);
  let pinnedSum = 0;
  for (const [index, amount] of pinned) {
    result[index] = amount;
    pinnedSum += amount;
  }
  const unpinnedIndices: number[] = [];
  for (let i = 0; i < totalCount; i++) {
    if (!pinned.has(i)) unpinnedIndices.push(i);
  }
  if (unpinnedIndices.length === 0) return result;
  const remaining = totalAmount - pinnedSum;
  if (remaining <= 0) return result; // unpinned rows stay 0; caller shows over-allocation warning
  const shares = computeEqualSharesInclusive(remaining, unpinnedIndices.length);
  unpinnedIndices.forEach((idx, i) => {
    result[idx] = shares[i];
  });
  return result;
}
```

- [ ] **Step 2: Write and run a verification script**

Write `<scratchpad>/verify-split-shares.ts`:

```ts
import {
  computeEqualSharesInclusive,
  computePercentageShares,
  computeShareWeightAmounts,
  redistributeUnpinned,
} from '../../../Documents/Projects/personal/Raqm/apps/raqm/src/utils/splitShares';

function assertEqual(actual: number[], expected: number[], label: string) {
  const ok = actual.length === expected.length && actual.every((v, i) => Math.abs(v - expected[i]) < 0.001);
  console.log(ok ? `PASS: ${label}` : `FAIL: ${label} — got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

// Equal split among 3 (creator + 2 participants), ₹100 — one row absorbs the 1-paise remainder
assertEqual(computeEqualSharesInclusive(100, 3), [33.33, 33.33, 33.34], 'equal 100/3');

// Percentage: 50/25/25 of ₹100
assertEqual(computePercentageShares(100, [50, 25, 25]), [50, 25, 25], 'pct 50/25/25');

// Shares: weights 2/1/1 of ₹100
assertEqual(computeShareWeightAmounts(100, [2, 1, 1]), [50, 25, 25], 'weights 2/1/1');

// Redistribute: total 300, row 0 pinned at 100, rows 1 and 2 unpinned split the remaining 200
assertEqual(redistributeUnpinned(300, new Map([[0, 100]]), 3), [100, 100, 100], 'redistribute one pinned');

// Redistribute: pinned sum exceeds total — unpinned clamp to 0
assertEqual(redistributeUnpinned(100, new Map([[0, 150]]), 3), [150, 0, 0], 'redistribute over-allocated');

// Redistribute: nothing pinned yet — equal split via the same function
assertEqual(redistributeUnpinned(90, new Map(), 3), [30, 30, 30], 'redistribute nothing pinned');

console.log('done');
```

Adjust the relative import path to match wherever the scratchpad directory actually sits relative to the repo (use an absolute path if simpler).

Run: `npx tsx <scratchpad>/verify-split-shares.ts`
Expected: every line prints `PASS: ...`, ending with `done`.

- [ ] **Step 3: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors (the old `computeEqualShares` name no longer exists — this step's real job is confirming Task 3 already updated its one caller; if this fails with "computeEqualShares is not exported", Task 3 must land in the same commit).

- [ ] **Step 4: Commit**

```bash
git add apps/raqm/src/utils/splitShares.ts
git commit -m "feat(raqm): add v2 split-share calculation functions (equal/percentage/shares/redistribute)"
```

---

### Task 3: Wire four modes + "You" row + pin-and-redistribute into SplitCreateScreen

**Files:**
- Modify: `apps/raqm/src/screens/main/SplitCreateScreen.tsx`

**Interfaces:**
- Consumes: `computeEqualSharesInclusive`, `computePercentageShares`, `computeShareWeightAmounts`, `redistributeUnpinned` (Task 2); `addSplitWithParticipants` (existing, but its participants array must now include the self row — see Task 4 in Plan 2, which changes its DB-layer signature; THIS task only changes what `SplitCreateScreen` computes and displays, and passes the self row through the existing `participants` array shape it already has, tagged so Task 4 can recognize it).
- Produces: a `mode: 'equal' | 'exact' | 'percentage' | 'shares'` state and a `pinned: Map<number, number>` state that later tasks (final review step in Plan 2) read.

This task changes the participant list to always include a synthetic "You" entry at a fixed index (index 0), tagged `isSelf: true` on the `Participant` type, so it participates in every mode's math like any other row but renders as "You" and never shows action buttons (that renders in `SplitDetailScreen`, handled in Plan 1 Task 4 below).

- [ ] **Step 1: Extend the `Participant` type and mode state**

In `SplitCreateScreen.tsx`, extend the existing `Participant` type (already has `fromCircleId: number | null` from the v1 dedupe fix):

```ts
type Participant = {
  name: string;
  phoneNumber: string | null;
  shareAmount: number;
  shareText: string;
  fromCircleId: number | null;
  isSelf: boolean;
};

type SplitMode = 'equal' | 'exact' | 'percentage' | 'shares';
```

Replace the `customShares` boolean state with:

```ts
const [mode, setMode] = useState<SplitMode>('equal');
const [pinned, setPinned] = useState<Map<number, number>>(new Map());
```

Seed the participant list with a permanent "You" row at index 0 on mount (replace the `useState<Participant[]>([])` initializer):

```ts
const [participants, setParticipants] = useState<Participant[]>([
  { name: 'You', phoneNumber: null, shareAmount: 0, shareText: '', fromCircleId: null, isSelf: true },
]);
```

Every place that previously did `participants.map(...)` or computed `participants.length` for share math now naturally includes this row — no separate "N+1" math needed anymore (this is the whole point of the "You" row becoming real).

- [ ] **Step 2: Replace the equal/custom re-derivation effect with a per-mode effect**

Replace the existing `useEffect` that called `computeEqualShares` (around line 53-58) with:

```ts
useEffect(() => {
  if (!validTotal || participants.length === 0) return;
  if (mode === 'equal') {
    const shares = computeEqualSharesInclusive(totalAmount, participants.length);
    setParticipants((prev) => prev.map((p, i) => ({ ...p, shareAmount: shares[i], shareText: String(shares[i]) })));
  } else if (mode === 'shares') {
    // Shares mode never pins — every row's weight lives in shareText (typed
    // as a plain number, default weight 1 for a not-yet-typed row), and
    // amounts are always fully re-derived from the ratio of all weights.
    const weights = participants.map((p) => parseFloat(p.shareText) || 1);
    const amounts = computeShareWeightAmounts(totalAmount, weights);
    setParticipants((prev) => prev.map((p, i) => ({ ...p, shareAmount: amounts[i] })));
  } else if (mode === 'exact') {
    const amounts = redistributeUnpinned(totalAmount, pinned, participants.length);
    setParticipants((prev) => prev.map((p, i) => ({ ...p, shareAmount: amounts[i] })));
  } else if (mode === 'percentage') {
    const pctAmounts = redistributeUnpinned(100, pinned, participants.length);
    const amounts = computePercentageShares(totalAmount, pctAmounts);
    setParticipants((prev) => prev.map((p, i) => ({ ...p, shareAmount: amounts[i] })));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [totalAmount, participants.length, mode, pinned]);
```

Note percentage mode redistributes percentages (0-100 scale) via `redistributeUnpinned(100, pinned, ...)`, then converts the resulting percentage array to rupee amounts via `computePercentageShares`. `pinned`'s stored values are always in the mode's native unit (rupees for Exact, percentage points for Percentage) — this is why switching modes should clear `pinned` (Step 4).

- [ ] **Step 3: Add the four-mode selector UI**

Replace the existing "Switch to custom amounts" toggle (around line 200-206) with a segmented row:

```tsx
<View className="flex-row bg-surface-container-lowest rounded-xl border border-outline-variant mt-md p-[4px]">
  {(['equal', 'exact', 'percentage', 'shares'] as SplitMode[]).map((m) => (
    <TouchableOpacity
      key={m}
      className={`flex-1 py-[8px] items-center rounded-lg ${mode === m ? 'bg-primary' : ''}`}
      onPress={() => {
        setMode(m);
        setPinned(new Map());
      }}
    >
      <Text className={`font-inter-medium text-body-sm ${mode === m ? 'text-on-primary' : 'text-on-surface-variant'}`}>
        {m === 'equal' ? 'Equal' : m === 'exact' ? 'Exact' : m === 'percentage' ? 'Percentage' : 'Shares'}
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

- [ ] **Step 4: Update the per-participant row input to pin on edit**

Replace `setShare` (around line 110-113) with a mode-aware version:

```ts
// All rows start blank in Exact/Percentage mode — typing into a row pins it
// at that value and redistributes the remainder across every other
// still-unpinned row. Percentage values are capped at 2 decimal places.
const setShare = (index: number, text: string) => {
  if (mode === 'shares') {
    setParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, shareText: text } : p)));
    return;
  }
  const raw = parseFloat(text) || 0;
  const value = mode === 'percentage' ? Math.round(raw * 100) / 100 : raw;
  setPinned((prev) => {
    const next = new Map(prev);
    next.set(index, value);
    return next;
  });
  setParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, shareText: text } : p)));
};
```

Update the row render (around line 207-224) so the text input shows in every mode except Equal (Shares mode's input holds the weight, not the amount — label it accordingly), and the "You" row (`p.isSelf`) is visually labeled "You" instead of showing a remove button:

```tsx
{participants.map((p, i) => (
  <View key={p.isSelf ? 'self' : `${p.name}-${i}`} className="flex-row items-center justify-between py-[6px]">
    <Text className="font-inter text-body-sm text-on-surface flex-1">{p.isSelf ? 'You' : p.name}</Text>
    {mode === 'equal' ? (
      <Text className="font-mono text-body-sm text-on-surface-variant">{formatAmount(p.shareAmount)}</Text>
    ) : mode === 'shares' ? (
      <TextInput
        className="w-[70px] font-mono text-body-sm text-on-surface bg-surface rounded-lg border border-outline-variant px-sm py-[6px] text-right"
        keyboardType="decimal-pad"
        placeholder="1"
        placeholderTextColor={Colors.outline}
        value={p.shareText}
        onChangeText={(v) => setShare(i, v)}
      />
    ) : (
      <TextInput
        className="w-[90px] font-mono text-body-sm text-on-surface bg-surface rounded-lg border border-outline-variant px-sm py-[6px] text-right"
        keyboardType="decimal-pad"
        placeholder={mode === 'percentage' ? '0%' : '0'}
        placeholderTextColor={Colors.outline}
        value={p.shareText}
        onChangeText={(v) => setShare(i, v)}
      />
    )}
    {mode !== 'shares' && <Text className="font-mono text-body-sm text-on-surface-variant ml-sm">{formatAmount(p.shareAmount)}</Text>}
    {!p.isSelf && (
      <TouchableOpacity className="ml-sm" onPress={() => removeParticipant(i)}>
        <Text className="font-inter text-body-sm text-error">✕</Text>
      </TouchableOpacity>
    )}
  </View>
))}
```

(For Percentage/Exact modes this shows both the typed input and the computed `formatAmount` alongside it, so the user sees the redistributed rupee amount even while typing a percentage — remove the duplicate `formatAmount` text for Shares mode since amounts are shown once, not twice, there's no separate "typed" vs "computed" split.)

- [ ] **Step 5: Update `sharesValid`/`canSave` and the over-allocation warning**

Replace `shareSum`/`sharesValid` (lines 60-61) with a mode-aware check:

```ts
const shareSum = participants.reduce((s, p) => s + p.shareAmount, 0);
const pinnedOverAllocated =
  (mode === 'exact' || mode === 'percentage') &&
  Array.from(pinned.values()).reduce((s, v) => s + v, 0) > (mode === 'percentage' ? 100 : totalAmount) + 0.001;
const sharesValid = mode === 'equal' || mode === 'shares' || !pinnedOverAllocated;
const canSave = validTotal && participants.length > 1 && sharesValid && !saving;
```

(`participants.length > 1` because index 0 is now always "You" — a split needs at least one other participant.)

Update every place that previously fed `addFromCircle`/`addFromContacts`/`addManual` new rows (existing dedupe logic from the v1 bugfix) to include `isSelf: false` on the new object literals, since `Participant` now requires that field.

- [ ] **Step 6: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 7: Manual verification**

Launch the app (`npm run raqm`), open Split → New Split, and check:
- "You" appears as the first row in every mode, with no remove button.
- Equal mode: adding/removing participants re-splits evenly across everyone including "You".
- Exact mode: typing into the first row pins it; the rest split the remainder evenly; typing a second row pins that one too and reflows the rest; order of typing doesn't matter for correctness.
- Percentage mode: same pin behavior, values capped to 2 decimals, and the row shows the equivalent rupee amount.
- Shares mode: typing weights (e.g. 2, 1, 1) splits the total proportionally with no pin/remainder concept.
- Over-allocating (pinned sum > total, or > 100% in Percentage mode) shows the existing red warning and disables Save.

- [ ] **Step 8: Commit**

```bash
git add apps/raqm/src/screens/main/SplitCreateScreen.tsx
git commit -m "feat(raqm): add 4 split modes, You row, and pin-and-redistribute UX to SplitCreateScreen"
```

---

### Task 4: Hide action buttons on the "You" row in SplitDetailScreen

**Files:**
- Modify: `apps/raqm/src/screens/main/SplitDetailScreen.tsx`

**Interfaces:**
- Consumes: `SplitParticipant.isSelf` (new field — Plan 2 Task 4 updates `getSplitParticipants`'s row-mapper to read the `is_self` column added in this plan's Task 1; this task only consumes the field on the type, so add `isSelf: boolean` to the local understanding of `SplitParticipant` now and coordinate with Plan 2 Task 4 so the mapper lands before this renders correctly — if executed before Plan 2 Task 4, `isSelf` will be `undefined`/falsy for every row, which is a safe default (buttons show, matching current v1 behavior) rather than a crash).

- [ ] **Step 1: Skip action rows for the self participant**

In the `FlatList`'s `renderItem` (around line 81-169), wrap the existing `{item.status === 'unpaid' && (...)}` and `{item.status === 'attention' && (...)}` blocks in an additional guard: change both conditions to `item.status === 'unpaid' && !item.isSelf` and `item.status === 'attention' && !item.isSelf`. Also update the header label so the self row displays "You" instead of `item.name`:

```tsx
<Text className="font-inter-medium text-body-md text-on-surface">{item.isSelf ? 'You' : item.name}</Text>
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors (if `isSelf` isn't yet on the `SplitParticipant` type from `database.ts`, add `isSelf: boolean` to that type now as a forward-declared field — Plan 2 Task 4 supplies the actual DB-backed value).

- [ ] **Step 3: Commit**

```bash
git add apps/raqm/src/screens/main/SplitDetailScreen.tsx
git commit -m "fix(raqm): hide payment actions on the You row in SplitDetailScreen"
```
