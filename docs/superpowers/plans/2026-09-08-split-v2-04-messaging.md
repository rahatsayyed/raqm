# Split with Friends v2 — Plan 4: Messaging Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the backwards "Pay via UPI" button, and make both "Share on WhatsApp" and "Remind now" messages include the UPI payment link, the split's description, and the participant's own name.

**Architecture:** `SplitDetailScreen.tsx` already builds its WhatsApp message inline and reads `liveUpiId` live (v1 bugfix) — this plan extends that same message-building code with description and name, and deletes the "Pay via UPI" button entirely. `splitReminders.ts`'s `reminderMessage()` gets the same treatment, requiring its callers to pass more context (split description, live UPI id) than they do today.

**Tech Stack:** TypeScript, React Native.

**Spec:** `docs/superpowers/specs/2026-09-08-split-with-friends-v2-design.md` (section 4: "Messaging overhaul"). Depends on Plan 2 Task 1 (the `Split.description` field).

## Global Constraints

- The split creator is the payee, not the payer — "Pay via UPI" was backwards and is removed, not reworked.
- Live UPI ID only (`getSetting('upi_id')` on focus) — never a frozen `split.creatorUpiId` value, per the v1 bugfix already applied to `SplitDetailScreen`'s WhatsApp button.
- `buildUpiLink` (`src/utils/upi.ts`) and `openExternalLink` (`src/utils/shareLinks.ts`) are unchanged — reuse both exactly as they exist today.
- No test runner — verify with `cd apps/raqm && npx tsc --noEmit` plus manual device verification.

---

### Task 1: Remove "Pay via UPI", extend the WhatsApp message

**Files:**
- Modify: `apps/raqm/src/screens/main/SplitDetailScreen.tsx`

**Interfaces:**
- Consumes: `split.description` (Plan 2 Task 1), `liveUpiId` (existing state), `buildUpiLink`, `openExternalLink` (existing imports).

- [ ] **Step 1: Delete the "Pay via UPI" button**

Remove the entire first `TouchableOpacity` block inside the `{item.status === 'unpaid' && (...)}` section (lines 92-118 in the current file — the one whose `onPress` calls `Share.share({ message: link })` and whose label is "Pay via UPI"). Also remove the now-unused `Share` import from `react-native` if nothing else in this file uses it (grep `Share\.` in this file first to confirm).

- [ ] **Step 2: Extend the WhatsApp message with description and receiver name**

Replace the "Share on WhatsApp" button's `onPress` (currently builds `message` from `split.title` and `formatAmount` only):

```tsx
<TouchableOpacity
  className="flex-1 py-[8px] items-center bg-surface rounded-lg border border-outline-variant"
  onPress={() => {
    const upiLine = liveUpiId
      ? ` Pay here: ${buildUpiLink({ upiId: liveUpiId, payeeName: split.title, amount: item.shareAmount, note: split.title })}`
      : '';
    const descLine = split.description ? ` (${split.description})` : '';
    const message = `Hi ${item.name}, for ${split.title}${descLine} you owe ${formatAmount(item.shareAmount)}.${upiLine}`;
    openExternalLink(`whatsapp://send?text=${encodeURIComponent(message)}`, message);
  }}
>
  <Text className="font-inter-medium text-body-sm text-on-surface">Share on WhatsApp</Text>
</TouchableOpacity>
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Manual verification**

Open an unpaid split participant row and confirm "Pay via UPI" no longer appears, and tapping "Share on WhatsApp" (or checking the fallback clipboard copy if WhatsApp isn't installed on the test device) shows a message addressed to the participant by name, including the split's description (if set) and a `upi://pay?...` link when a UPI ID is configured in Settings.

- [ ] **Step 5: Commit**

```bash
git add apps/raqm/src/screens/main/SplitDetailScreen.tsx
git commit -m "fix(raqm): remove Pay via UPI button, add description and name to WhatsApp share"
```

---

### Task 2: Extend `reminderMessage()` and its callers with UPI link, description, and name

**Files:**
- Modify: `apps/raqm/src/services/splitReminders.ts`
- Modify: `apps/raqm/src/screens/main/SplitDetailScreen.tsx` (the "Remind now" button's call to `sendReminderNow`)

**Interfaces:**
- Consumes: `Split.description` (Plan 2 Task 1), `getSetting('upi_id')` (existing), `buildUpiLink` (existing).
- Produces:
  ```ts
  export function reminderMessage(input: {
    splitTitle: string;
    description: string | null;
    participantName: string;
    shareAmount: number;
    upiId: string | null;
  }): string

  export async function sendReminderNow(
    participant: SplitParticipant,
    split: { title: string; description: string | null },
  ): Promise<boolean>
  ```
  Note `sendReminderNow`'s signature changes from `(participant, splitTitle: string)` to `(participant, split: { title, description })` — it now reads the live UPI id itself via `getSetting('upi_id')`, same as `SplitDetailScreen` already does, rather than trusting a frozen value. This is a breaking signature change with exactly one existing call site (`SplitDetailScreen.tsx`'s "Remind now" button) plus the future automatic path in Plan 6 — grep `sendReminderNow(` across `apps/raqm/src` before editing to confirm there are no other callers yet (Plan 6 adds the automatic one after this plan lands).

- [ ] **Step 1: Read the current `reminderMessage`/`sendReminderNow` implementation**

Read `apps/raqm/src/services/splitReminders.ts` in full (67 lines) to see the exact current `reminderMessage(splitTitle, shareAmount)` signature and every place it's called, before changing it.

- [ ] **Step 2: Rewrite `reminderMessage()`**

```ts
function reminderMessage(input: {
  splitTitle: string;
  description: string | null;
  participantName: string;
  shareAmount: number;
  upiId: string | null;
}): string {
  const descLine = input.description ? ` (${input.description})` : '';
  const upiLine = input.upiId
    ? ` Pay here: ${buildUpiLink({ upiId: input.upiId, payeeName: input.splitTitle, amount: input.shareAmount, note: input.splitTitle })}`
    : '';
  return `Hi ${input.participantName}, for ${input.splitTitle}${descLine} you owe ${formatAmount(input.shareAmount)}.${upiLine}`;
}
```

Add `import { buildUpiLink } from '../utils/upi';` alongside this file's existing `formatAmount` import (grep to confirm it's already imported; if not, add it).

- [ ] **Step 3: Update `sendReminderNow` to read the live UPI id and build the new message**

```ts
export async function sendReminderNow(
  participant: SplitParticipant,
  split: { title: string; description: string | null },
): Promise<boolean> {
  if (!participant.phoneNumber) return false;
  try {
    const granted = await requestSendSmsPermission();
    if (!granted) return false;
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
    return true;
  } catch {
    return false;
  }
}
```

Add `getSetting` to this file's existing `../db/database` import line if not already present.

- [ ] **Step 4: Update the "Remind now" call site in `SplitDetailScreen.tsx`**

Change the existing `onPress` (currently `sendReminderNow(item, split.title)`) to pass the split object instead of just its title:

```ts
const sent = await sendReminderNow(item, { title: split.title, description: split.description });
```

- [ ] **Step 5: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

On an unpaid split participant with a phone number, tap "Remind now" and confirm the resulting SMS (check via a test device or the SMS app's sent log) addresses the participant by name and includes the description (if set) and a UPI link (if a UPI ID is configured).

- [ ] **Step 7: Commit**

```bash
git add apps/raqm/src/services/splitReminders.ts apps/raqm/src/screens/main/SplitDetailScreen.tsx
git commit -m "feat(raqm): include UPI link, description, and name in split reminder messages"
```
