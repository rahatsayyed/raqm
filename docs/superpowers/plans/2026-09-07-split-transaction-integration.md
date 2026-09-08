# Split with Friends — Transaction Integration, UPI Link, WhatsApp Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user start a split directly from an existing transaction ("Split with Friends" in the 3-dot menu, pre-filling title/amount), and let them hand a participant a prefilled UPI payment link or a WhatsApp share — both via the share sheet, no new backend, no payment processing.

**Architecture:** A new `PeopleIcon` (distinct from the existing "Split Transaction"/"Group with..." icons in the same sheet) plus one new `ActionsSheet` entry in `TransactionDetailScreen.tsx` that navigates to `SplitCreate` with `sourceTxId` and prefill params. A one-time "Your UPI ID" Settings field (same `getSetting`/`setSetting` mechanism as `month_start_day`, same `EditFieldSheet` component as name/phone/email). Two small pure-ish utilities (`buildUpiLink`, `shareOnWhatsApp`) that only compose a URI and call `Linking.openURL` — no new native code, no new permission.

**Tech Stack:** Expo SDK 56, React Native 0.85, TypeScript, NativeWind, `Linking` (React Native core, already used elsewhere in this codebase for `sms:`/`tel:`/`mailto:`).

**Spec:** `docs/superpowers/specs/2026-09-07-split-with-friends-design.md`

**Depends on:** `docs/superpowers/plans/2026-09-07-split-foundation.md` and `docs/superpowers/plans/2026-09-07-split-creation-ui.md` (must be merged first — this plan modifies `SplitCreateScreen.tsx` and `SplitDetailScreen.tsx` those plans created).

**Correction to Plan 2's claim:** Plan 2's `SplitCreateScreen` accepted `sourceTxId` and said a later plan "needs zero further change to this screen." That undersold it slightly — accepting the param and passing it to `addSplit` genuinely needed no change, but *pre-filling* title/amount from the transaction is new code this plan adds (Task 3). Flagging this rather than silently contradicting Plan 2's note.

## Global Constraints

- **Work dir:** paths below are relative to `/Users/copods/Documents/Projects/personal/Raqm/apps/raqm`. Branch: `build/v0-mvp`.
- **Typecheck gate.** `cd apps/raqm && npx tsc --noEmit`, run from `apps/raqm`. Clean typecheck + manual device check is the completion gate for every task.
- **Naming/icon collision avoidance.** The existing `ActionsSheet` already has "Split Transaction" (`SplitIcon`, `material-symbols:call-split-rounded`) and "Group with..." (`GroupWorkIcon`, `material-symbols:group-work-outline`) — both unrelated to this feature. The new entry is labeled **"Split with Friends"** and uses a **new, distinct icon** (`PeopleIcon`, Task 4) so it's never visually confused with either existing row.
- **Async button handlers need in-flight guards.**
- **Route params must be serializable.**
- **NativeWind for anything new**; `style`/`Colors`/`Spacing` only where NativeWind can't reach.
- **`Linking.openURL` failures must degrade gracefully** (per the spec's Error handling section) — copy-to-clipboard + toast fallback, never a dead tap or a crash.
- **Git.** Never commit or push without explicit user confirmation. Commit messages are conventional (`feat(raqm): …`). Never append a `Claude-Session:` trailer.

## File Structure

**New:**

| File | Responsibility |
|---|---|
| `src/utils/upi.ts` | `buildUpiLink(...)` — pure URI builder, no I/O. |
| `src/utils/shareLinks.ts` | `openExternalLink(url, fallbackMessage)` — the shared `Linking.openURL` + clipboard-fallback wrapper both UPI and WhatsApp buttons use. |

**Modified:**

| File | Change |
|---|---|
| `src/screens/main/MoreScreen.tsx` | New "Your UPI ID" settings row + `EditFieldSheet`, backed by `getSetting`/`setSetting('upi_id', ...)`. |
| `src/components/TabIcon.tsx` | New `PeopleIcon` export. |
| `src/screens/main/TransactionDetailScreen.tsx` | New "Split with Friends" `ActionsSheet` entry, navigates to `SplitCreate`. |
| `src/navigation/types.ts` | Widen `SplitCreate` params: `{ sourceTxId?: number; prefillTitle?: string; prefillAmount?: number } \| undefined`. |
| `src/screens/main/SplitCreateScreen.tsx` | Read `prefillTitle`/`prefillAmount` on mount; read the `upi_id` setting and pass it as `creatorUpiId` to `addSplit` (was hardcoded `null` in Plan 2). |
| `src/screens/main/SplitDetailScreen.tsx` | Per-participant "Pay via UPI" and "Share on WhatsApp" buttons. |

---

### Task 1: "Your UPI ID" setting

**Files:**
- Modify: `apps/raqm/src/screens/main/MoreScreen.tsx`
- Test: none (manual device check below)

**Interfaces:**
- Consumes: `getSetting`, `setSetting` (existing, from `src/db/database.ts`); `EditFieldSheet` (existing, `src/components/EditFieldSheet.tsx`).
- Produces: the `app_settings` key `'upi_id'` — consumed by Task 3 (`SplitCreateScreen`).

- [ ] **Step 1: Add state and load it alongside `month_start_day`**

In `apps/raqm/src/screens/main/MoreScreen.tsx`, add state near the existing `editField` line:

```ts
  const [upiId, setUpiId] = useState('');
```

and widen the `editField` union (currently `'name' | 'phone' | 'email' | null`) to include `'upiId'`:

```ts
  const [editField, setEditField] = useState<'name' | 'phone' | 'email' | 'upiId' | null>(null);
```

In the existing `useFocusEffect` block (the one that already loads `month_start_day`), add:

```ts
      getSetting('upi_id').then((id) => setUpiId(id ?? ''));
```

- [ ] **Step 2: Add the display row**

Immediately after the existing email row (the `<TouchableOpacity ... onPress={() => setEditField('email')}>` block), add:

```tsx
        <TouchableOpacity className="flex-row items-center gap-sm mt-xs" activeOpacity={0.6} onPress={() => setEditField('upiId')}>
          <Text className="font-inter text-annotation text-ink-label">{upiId || 'Add your UPI ID (for Split with Friends)'}</Text>
        </TouchableOpacity>
```

- [ ] **Step 3: Add the `EditFieldSheet`**

Immediately after the existing `email` `EditFieldSheet` block, add:

```tsx
      <EditFieldSheet
        visible={editField === 'upiId'}
        onClose={() => setEditField(null)}
        title="Your UPI ID"
        placeholder="name@bank"
        initialValue={upiId}
        onConfirm={async (value) => {
          setUpiId(value);
          await setSetting('upi_id', value);
          setEditField(null);
        }}
      />
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Manual device check**

Open More → tap the new UPI ID row → enter a VPA → confirm it persists across an app reload.

- [ ] **Step 6: Commit**

```bash
git add apps/raqm/src/screens/main/MoreScreen.tsx
git commit -m "feat(raqm): add Your UPI ID setting for Split with Friends"
```

---

### Task 2: UPI link + share-link fallback utilities

**Files:**
- Create: `apps/raqm/src/utils/upi.ts`
- Create: `apps/raqm/src/utils/shareLinks.ts`
- Test: none (pure/near-pure functions, exercised via Task 5's device check)

**Interfaces:**
- Produces:
  - `buildUpiLink(input: { upiId: string; payeeName: string; amount: number; note: string }): string`
  - `openExternalLink(url: string, fallbackMessage: string): Promise<void>` — tries `Linking.openURL(url)`; on failure, copies `fallbackMessage` to the clipboard and shows a toast instead of failing silently.

- [ ] **Step 1: Write `buildUpiLink`**

Create `apps/raqm/src/utils/upi.ts`:

```ts
/**
 * Builds a UPI deep link with the amount prefilled, per the UPI Deep Linking
 * spec (pa = payee VPA, pn = payee name, am = amount, cu = currency, tn = note).
 * Raqm never touches the money — this only prefills the payer's own UPI app;
 * the transfer itself happens entirely inside that app.
 */
export function buildUpiLink(input: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}): string {
  const params = new URLSearchParams({
    pa: input.upiId,
    pn: input.payeeName,
    am: input.amount.toFixed(2),
    cu: 'INR',
    tn: input.note,
  });
  return `upi://pay?${params.toString()}`;
}
```

- [ ] **Step 2: Write the share-link fallback wrapper**

Create `apps/raqm/src/utils/shareLinks.ts`:

```ts
import { Linking, ToastAndroid } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/**
 * Opens an external URL (a upi:// or whatsapp:// link). If nothing on the
 * device can handle it (no UPI app installed, WhatsApp not installed), falls
 * back to copying fallbackMessage to the clipboard with a toast, rather than
 * a dead tap — per the spec's error-handling section.
 */
export async function openExternalLink(url: string, fallbackMessage: string): Promise<void> {
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) throw new Error('unsupported');
    await Linking.openURL(url);
  } catch {
    await Clipboard.setStringAsync(fallbackMessage);
    ToastAndroid.show('No app found — copied the link instead', ToastAndroid.LONG);
  }
}
```

- [ ] **Step 3: Add the `expo-clipboard` dependency**

```bash
cd apps/raqm && npx expo install expo-clipboard
```

- [ ] **Step 4: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/raqm/package.json apps/raqm/package-lock.json apps/raqm/src/utils/upi.ts apps/raqm/src/utils/shareLinks.ts
git commit -m "feat(raqm): add UPI link builder and share-link fallback for Split with Friends"
```

---

### Task 3: Wire `creatorUpiId` + transaction prefill into `SplitCreateScreen`

**Files:**
- Modify: `apps/raqm/src/navigation/types.ts` (widen `SplitCreate` params)
- Modify: `apps/raqm/src/screens/main/SplitCreateScreen.tsx`
- Test: none (manual device check below)

**Interfaces:**
- Consumes: `getSetting` (existing); the widened `SplitCreate` route params.
- Produces: `addSplit(...)` now receives a real `creatorUpiId` (was `null`) — no signature change, since `addSplit` already typed `creatorUpiId: string | null`.

- [ ] **Step 1: Widen the route params**

In `apps/raqm/src/navigation/types.ts`, replace:

```ts
  SplitCreate: { sourceTxId?: number } | undefined;
```

with:

```ts
  SplitCreate: { sourceTxId?: number; prefillTitle?: string; prefillAmount?: number } | undefined;
```

- [ ] **Step 2: Prefill on mount and read the UPI ID setting**

In `apps/raqm/src/screens/main/SplitCreateScreen.tsx`, change the initial state and the mount effect:

```tsx
  const [title, setTitle] = useState(route.params?.prefillTitle ?? '');
  const [amount, setAmount] = useState(route.params?.prefillAmount ? String(route.params.prefillAmount) : '');
```

and in the existing mount `useEffect` (the one that currently does `getSplitCircles().then(setCircles)`), add a `getSetting('upi_id')` read into a new piece of state:

```ts
  const [creatorUpiId, setCreatorUpiId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus(), 80);
    getSplitCircles().then(setCircles);
    getSetting('upi_id').then((id) => setCreatorUpiId(id ?? null));
    return () => clearTimeout(t);
  }, []);
```

and in `handleSave`, replace the hardcoded `creatorUpiId: null,` with `creatorUpiId,`. Add `getSetting` to the existing `../../db/database` import line.

- [ ] **Step 3: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual device check**

Navigate to `SplitCreate` passing `prefillTitle`/`prefillAmount` (temporarily, until Task 4 wires the real entry point) — confirm both fields arrive pre-filled and are still editable, and confirm a split created after setting a UPI ID in Task 1 stores that UPI ID (inspect via `SplitDetailScreen` in Task 5, or a temporary log).

- [ ] **Step 5: Commit**

```bash
git add apps/raqm/src/navigation/types.ts apps/raqm/src/screens/main/SplitCreateScreen.tsx
git commit -m "feat(raqm): prefill SplitCreateScreen from a transaction, wire creatorUpiId"
```

---

### Task 4: "Split with Friends" action on `TransactionDetailScreen`

**Files:**
- Modify: `apps/raqm/src/components/TabIcon.tsx` (add `PeopleIcon`)
- Modify: `apps/raqm/src/screens/main/TransactionDetailScreen.tsx`
- Test: none (manual device check below)

**Interfaces:**
- Consumes: `PeopleIcon` (this task); `SplitCreate` route (Task 3).
- Produces: nothing consumed elsewhere.

- [ ] **Step 1: Add the icon**

In `apps/raqm/src/components/TabIcon.tsx`, alongside `SplitIcon`/`GroupWorkIcon`:

```ts
export function PeopleIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:group-rounded" size={size} color={color} />;
}
```

- [ ] **Step 2: Import it in `TransactionDetailScreen.tsx`**

Add `PeopleIcon` to the existing icon import block (alongside `RepeatIcon, SplitIcon, LinkIcon, GroupWorkIcon, TrashIcon, ...`).

- [ ] **Step 3: Add the `ActionsSheet` prop and entry**

In `ActionsSheet`'s prop destructuring and type (lines ~1064-1088), add `canSplitWithFriends`/`onSplitWithFriends` alongside `canSplit`/`onSplit`:

```ts
  canSplitWithFriends,
  onSplitWithFriends,
```
```ts
  canSplitWithFriends: boolean;
  onSplitWithFriends: () => void;
```

In the JSX body, add a new entry — placed after the existing "Group with..." block and before "Mark as Recurring" (so it needs its own `border-b`, matching every other non-last item):

```tsx
        {canSplitWithFriends && (
          <TouchableOpacity
            className="flex-row items-center gap-md py-md border-b border-[#24312880]"
            onPress={onSplitWithFriends}
          >
            <PeopleIcon color={Colors.onSurfaceVariant} size={24} />
            <Text className="font-inter-medium text-insight-reading text-on-surface">
              Split with Friends
            </Text>
          </TouchableOpacity>
        )}
```

- [ ] **Step 4: Wire the caller**

At the `<ActionsSheet ... />` call site (~lines 869-890), add:

```tsx
        canSplitWithFriends={!tx.isSplitChild}
```

(same gating condition as `canSplit`, since a category-split child transaction shouldn't itself start a friend-split — reuse rather than invent a new gate) and:

```tsx
        onSplitWithFriends={() => {
          setActionsVisible(false);
          navigation.navigate('SplitCreate', {
            sourceTxId: tx.id,
            prefillTitle: tx.merchant ?? undefined,
            prefillAmount: tx.amount,
          });
        }}
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual device check**

Open any transaction → 3-dot menu → confirm "Split with Friends" appears (distinct icon from "Split Transaction" and "Group with...") → tap it → confirm `SplitCreateScreen` opens with the transaction's merchant and amount pre-filled, and that saving links `source_tx_id` correctly (verify via `SplitDetailScreen` or a temporary log in Task 3's screen).

- [ ] **Step 7: Commit**

```bash
git add apps/raqm/src/components/TabIcon.tsx apps/raqm/src/screens/main/TransactionDetailScreen.tsx
git commit -m "feat(raqm): add Split with Friends action to the transaction 3-dot menu"
```

---

### Task 5: UPI + WhatsApp buttons on `SplitDetailScreen`

**Files:**
- Modify: `apps/raqm/src/screens/main/SplitDetailScreen.tsx`
- Test: none (manual device check below)

**Interfaces:**
- Consumes: `buildUpiLink` (Task 2), `openExternalLink` (Task 2), `split.creatorUpiId` (already on the `Split` type from Plan 1).

- [ ] **Step 1: Add the per-participant action buttons**

In `apps/raqm/src/screens/main/SplitDetailScreen.tsx`, import the new utilities:

```ts
import { buildUpiLink } from '../../utils/upi';
import { openExternalLink } from '../../utils/shareLinks';
```

Replace the participant `renderItem` body (currently a single `TouchableOpacity` wrapping name/status/amount) with a row that keeps the tap-to-toggle-settled behavior but adds two buttons below it:

```tsx
        renderItem={({ item }) => (
          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-md mb-sm">
            <TouchableOpacity className="flex-row items-center justify-between" onPress={() => toggleSettled(item)}>
              <View>
                <Text className="font-inter-medium text-body-md text-on-surface">{item.name}</Text>
                <Text className="font-inter text-body-sm text-on-surface-variant">{statusLabel(item.status)}</Text>
              </View>
              <Text className="font-mono text-body-md text-on-surface">₹{item.shareAmount.toFixed(2)}</Text>
            </TouchableOpacity>

            {item.status !== 'settled' && (
              <View className="flex-row gap-sm mt-sm">
                <TouchableOpacity
                  className="flex-1 py-[8px] items-center bg-primary/10 rounded-lg"
                  onPress={() => {
                    if (!split.creatorUpiId) {
                      ToastAndroid.show('Add your UPI ID in Settings first', ToastAndroid.LONG);
                      return;
                    }
                    const link = buildUpiLink({
                      upiId: split.creatorUpiId,
                      payeeName: split.title,
                      amount: item.shareAmount,
                      note: split.title,
                    });
                    openExternalLink(link, link);
                  }}
                >
                  <Text className="font-inter-medium text-body-sm text-primary">Pay via UPI</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-[8px] items-center bg-surface rounded-lg border border-outline-variant"
                  onPress={() => {
                    const message = split.creatorUpiId
                      ? `${split.title}: you owe ₹${item.shareAmount.toFixed(2)}. Pay here: ${buildUpiLink({
                          upiId: split.creatorUpiId,
                          payeeName: split.title,
                          amount: item.shareAmount,
                          note: split.title,
                        })}`
                      : `${split.title}: you owe ₹${item.shareAmount.toFixed(2)}.`;
                    openExternalLink(`whatsapp://send?text=${encodeURIComponent(message)}`, message);
                  }}
                >
                  <Text className="font-inter-medium text-body-sm text-on-surface">Share on WhatsApp</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
```

Note: the WhatsApp URI has **no phone number** — WhatsApp opens its own contact picker so the user chooses who receives it, per the spec's decision (no `expo-contacts` dependency needed for this specific action).

- [ ] **Step 2: Import `ToastAndroid`**

Add `ToastAndroid` to the existing `react-native` import line in this file if not already present (it is, from the earlier `deleteSplit` toast — confirm, don't duplicate the import).

- [ ] **Step 3: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual device check**

Open a split with a UPI ID set → tap "Pay via UPI" on an unpaid participant → confirm it opens a UPI app (or, on an emulator with none installed, confirm the clipboard-fallback toast fires) with the right amount. Tap "Share on WhatsApp" → confirm WhatsApp opens with the prefilled message and its own contact picker. Clear the UPI ID setting, repeat → confirm the "Add your UPI ID" toast appears instead of a broken link.

- [ ] **Step 5: Commit**

```bash
git add apps/raqm/src/screens/main/SplitDetailScreen.tsx
git commit -m "feat(raqm): add UPI and WhatsApp share buttons to SplitDetailScreen"
```

## Self-review notes

- Spec coverage: "Split with Friends" transaction action, UPI deep link generation (with the one-time Settings field), and WhatsApp share are all covered. Reminders and payment-matching remain for the final plan.
- Placeholder scan: none — every step is real, runnable code against confirmed file line ranges (`ActionsSheet` lines 1064-1146, the caller at 869-890, `MoreScreen.tsx`'s `editField`/`EditFieldSheet` pattern, all read directly from the files rather than assumed).
- Type consistency: `SplitCreate`'s widened param type, `Split.creatorUpiId`, and `SplitParticipant.shareAmount` are used identically to their Plan 1/Plan 2 definitions throughout.
