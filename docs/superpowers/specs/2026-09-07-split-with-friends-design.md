# Split with Friends — Design

## Problem

Raqm has a `Split` tab (already wired into `MainTabParamList`) that only shows
a "coming soon" placeholder (`src/screens/main/SplitScreen.tsx`). Users want
to split a bill or expense with friends the way apps like Bharpai/Splitwise
do — record who owes what, nudge them to pay, and mark it settled — without
Raqm gaining a backend, accounts, or cross-device sync (Raqm is on-device
only by design). Research into Bharpai (a UPI-native bill-splitting app)
confirmed the parts of that model that translate to an on-device app
(itemized receipt splitting, UPI deep links, proportional tax splitting) and
the parts that don't (live cross-device settle-status requires a server —
explicitly out of scope here, same as Bharpai's own creator-side tracking
model doesn't require it either).

## Goals

- Record a group/1:1 expense, split it between named participants (equal or
  custom shares), and track who has paid.
- Let the user generate a prefilled UPI payment link and hand it to a
  participant (share sheet), so paying is one tap in the participant's own
  UPI app.
- Detect likely payments automatically from Raqm's existing SMS-parsed
  transactions (a friend paying the user shows up as an incoming credit SMS
  on the user's own phone) — but never auto-confirm a match; surface
  candidates for the user to approve.
- Let the user save a reusable named list of people ("Circle") instead of
  re-picking the same contacts every time.
- Offer a reminder path: an opt-in auto-sent SMS, and a manual WhatsApp
  share button, for nudging a participant to pay.
- Support both entry points the user actually has today: turning an
  existing transaction into a split, and creating a split from scratch.

## Non-goals (this round)

- **Receipt OCR / itemized splitting.** Deferred. v1 splits are equal or
  manually-entered custom shares only, no camera/photo step. The
  participant list must still be a fully editable pre-save list (add/
  remove/adjust share) so the OCR phase can later slot in as just another
  way of populating the same list, not a rearchitecture.
- **PDF bank/card statement import.** Unrelated feature, explicitly held
  off until after Split ships.
- **Recurring/templated splits** (e.g. auto-recreate "rent" every month).
  Circles (below) are designed so this can be added later as "create a
  split from this Circle on a schedule" without changing the Circle or
  Split schema.
- **Cross-device / live settle-status sync.** Raqm has no accounts, no
  server, no push between devices. A participant's status only changes
  when *this* device sees evidence (a matched incoming SMS, or the user
  manually marking them paid). Bharpai's own live-updating settle page
  needs a backend for exactly this reason — Raqm doesn't get it, by design.
- **Payment processing.** Raqm never moves money and never touches a
  payment gateway — only generates a UPI deep link and lets the
  participant's own UPI app handle the actual transfer.
- **Multi-currency.** UPI is INR-only, so Split is INR-only; no currency
  picker.
- **Debt-simplification / netting algorithm** across multiple open splits
  with the same person (Splitwise's "minimize transactions"). Each split
  settles independently in v1.

## Naming — avoid existing collisions

`TransactionDetailScreen.tsx`'s `ActionsSheet` (~line 1064-1146) **already
has** a "Split Transaction" action (splits one transaction across multiple
*categories* — `splitTx`, unrelated) and a "Group with..." action (links
self-transfers/refunds — unrelated). Reusing "Split" or "Group" as labels
in that same sheet would confuse two unrelated existing features with this
new one. This spec uses:

- **"Split with Friends"** — the new action label in `ActionsSheet`, and
  the general feature name.
- **"Circle"** — the saved-friend-list entity (instead of "Group").

Code identifiers (table/column names, service names) may still use `group`
internally where that's the clearer word (e.g. `split_circles` is fine as
a table name) — the collision only matters for user-facing copy in that one
shared action sheet.

## Scope

1. Data model: circles, splits, participants (schema v13).
2. Split tab: list of open/settled splits, "New Split" entry point.
3. Split creation flow (from scratch, and from an existing transaction).
4. Circles: create/edit, pick members via contacts or manual entry.
5. UPI deep link generation (needs a one-time "Your UPI ID" setting).
6. WhatsApp share button (current feature, not deferred).
7. Reminders: opt-in auto-SMS setting + manual "send now".
8. Payment-match detection job + "Attention needed" review section.
9. Edit / soft-delete a split or a participant.

## Data model

New tables, migration v13 (current version is v12 per `schema_migrations`
in `src/db/database.ts` — CLAUDE.md's "currently v3" is stale, confirmed
against the live migration list; the plan will note this without fixing the
doc as part of this feature). Migration follows the existing pattern: one
numbered block, `runAsync('BEGIN')` … `INSERT INTO schema_migrations VALUES
(13)` … `COMMIT`, `ROLLBACK` in the `catch`, matching the v12 block already
in the file. All new tables get a `deleted_at` column and follow the
existing soft-delete convention (never a hard `DELETE`).

- **`split_circles`**: `id`, `name`, `created_at`, `deleted_at`.
- **`split_circle_members`**: `id`, `circle_id` (FK), `name`,
  `phone_number`, `created_at`, `deleted_at`. A member is a plain
  name+phone snapshot, not a live link to Android Contacts — editing an
  Android contact later doesn't retroactively change a saved circle member
  (avoids needing to keep a contacts-permission-backed live query around).
- **`splits`**: `id`, `title`, `total_amount`, `source_tx_id` (nullable FK
  to `transactions` — set when created via "Split with Friends" on an
  existing transaction), `creator_upi_id` snapshot (copied from the
  Settings value at creation time, so a later change to the user's UPI ID
  doesn't rewrite links already shared), `status` (`open` | `settled` —
  computed as `settled` once every participant is `settled`, not stored
  redundantly... actually store it: recompute-and-write on every
  participant status change, since list screens need to filter/sort by it
  without joining), `created_at`, `deleted_at`.
- **`split_participants`**: `id`, `split_id` (FK), `name`, `phone_number`,
  `share_amount`, `status` (`unpaid` | `attention` | `settled`),
  `matched_tx_id` (nullable FK to `transactions`, set once a match is
  confirmed), `created_at`, `deleted_at`. `attention` means the detection
  job found a plausible matching incoming transaction that needs the
  user's confirmation — it is never set to `settled` automatically.

**Rounding rule**: when a total doesn't divide evenly across participants,
the remainder (a few paise) is added to the *creator's own share* (the
implicit participant representing the user, not stored as a row — the
creator's share is `total_amount` minus the sum of all `split_participants`
rows). This keeps the rule in one place (the subtraction) rather than
needing special-casing during share calculation.

## Split tab (`src/screens/main/SplitScreen.tsx`)

Replaces the current `ComingSoonNotice` placeholder. Shows:
- An "Attention needed" section at the top when any `split_participants`
  row has `status = 'attention'` (see Payment matching, below) — tapping
  it opens that split with the ambiguous match highlighted for
  confirm/reject.
- A list of open splits (most recent first), each row showing title, total,
  and a compact "3 of 5 paid" style progress indicator.
- A "New Split" button, pushing a new `SplitCreateScreen` (added to
  `MainStackParamList`, following the same push-screen wiring `Grocery` uses
  in `MainNavigator.tsx`).
- Settled splits collapse into a "Settled" section (or a toggle) rather
  than disappearing, so the user can still review history.

## Split creation flow

One shared `SplitCreateScreen`/flow, two entry points:

1. **From scratch** — via Split tab's "New Split" button. User enters a
   title and total amount (`KeyboardAwareScrollView`, matching the
   established input-screen pattern from `QuickAddCashScreen.tsx`).
2. **From an existing transaction** — a new "Split with Friends" action in
   `TransactionDetailScreen.tsx`'s `ActionsSheet`. Pre-fills title
   (merchant) and total amount from the transaction, and sets
   `source_tx_id` on the resulting split.

Both then continue to the same participant step:

- **Pick participants**: either "Use a Circle" (select a saved
  `split_circles` row, its members become participants) or pick people
  one at a time — via the device contact picker (needs `expo-contacts`,
  not currently a dependency — added as part of this feature) or manual
  name+phone entry, for a user with no saved contact.
- **Set shares**: default equal split across all participants (including
  the creator); toggle to custom per-person amounts, validated to sum to
  the total (remainder handling per the rounding rule above).
- **Review & save**: writes one `splits` row and one `split_participants`
  row per participant. The screen stays fully editable up to this point —
  the same editable-list requirement OCR-based assignment will need later.

After saving, the split's detail view is shown, with each participant row
offering: a UPI share link/button, a WhatsApp share button, and (once the
reminders setting is on) an automatic SMS status.

## UPI deep link generation

Needs a one-time **Settings** field: "Your UPI ID" (free-text VPA, e.g.
`name@bank`), stored via the existing `setSetting`/`getSetting`
(`app_settings` table) convention. For each participant, Raqm builds:

```
upi://pay?pa=<creator_upi_id>&pn=<creator_display_name>&am=<share_amount>&cu=INR&tn=<split_title>
```

and hands it off via `Linking.openURL(...)` inside Android's share sheet
(so the user picks how to deliver it — SMS, WhatsApp, anything) rather than
Raqm hosting or tracking the link itself. No new capability beyond
composing this URI is required; `expo-sharing` is already a dependency.

## WhatsApp share (current feature, not deferred)

A per-participant "Share on WhatsApp" button opens
`whatsapp://send?text=<prefilled message with amount + UPI link>` via
`Linking.openURL`, with **no phone number in the URI** — WhatsApp's own
contact picker opens and the user picks who to send it to. This needs no
new permission and no `expo-contacts` dependency on its own (contacts
access is only needed for the participant-picking step above, not for
this share action).

## Reminders

- **Settings toggle**: "Auto-send SMS reminders" (default **off**).
  Turning it on is itself the safety gate the user opted into — no
  additional per-message confirmation once it's enabled, matching the
  decision to keep this simple.
- When on, a scheduled local job (piggybacking on the existing
  notification/background-task mechanism — exact hook confirmed at
  implementation time, not a new always-running service) sends an SMS via
  Android's `SmsManager` to any `unpaid` participant with a phone number,
  on a simple cadence (e.g. once every 24h while still unpaid) — reusing
  the `SEND_SMS`/native-module pattern the app already has for reading
  SMS, extended to sending.
- Regardless of the setting, a manual **"Send reminder now"** button is
  always available per participant (works whether or not auto-send is on).

## Payment matching ("Attention needed")

A new detection job, `matchSplitPayments()`, added next to
`runDetectionJobs` (`src/services/txIntelligence.ts`) and called from the
same three call sites (`AppNavigator.tsx` on app start,
`ScanningProgressScreen.tsx` after onboarding scan, `rescan.ts` after a
manual rescan) — **before** `useTxStore.refresh()`, matching the existing
"detection jobs write to the DB directly" invariant. It runs as a
**post-hoc pass over already-inserted `TxRecord` rows** (not inside the
native SMS-parsing path) — this mirrors how self-transfer/refund detection
already works, and avoids touching the Kotlin
`BroadcastReceiver`→`BankParserFactory` pipeline at all.

For every `unpaid` `split_participants` row, it looks for an incoming
credit transaction (any bank, any time after the split's `created_at`)
whose amount matches `share_amount` within a small tolerance. A match sets
the participant's status to `attention` (never straight to `settled`) and
records the candidate `matched_tx_id`. Two participants owing the same
amount, or an unrelated credit of the same size, are real collision risks
— this is exactly why the status is a review queue, not an auto-settle.
The Split tab surfaces every `attention` row up front; the user confirms
(→ `settled`, `matched_tx_id` kept) or rejects (→ back to `unpaid`,
`matched_tx_id` cleared) it from there.

## Circles

A `SplitCirclesScreen` (reachable from the Split tab, and from the
participant-picking step during split creation) lists saved circles, each
editable (rename, add/remove members via the same contact-picker/manual
entry used during split creation). No scheduling, no recurring behavior —
a Circle is only a saved name+member list, so a future recurring-split
feature can read from it without changing this schema.

## Error handling

- `matchSplitPayments()` never throws (same invariant as every other
  detection job) — a failed match pass silently leaves participants
  `unpaid` rather than crashing app start.
- Sending an SMS reminder failing (no SIM, permission revoked mid-session,
  etc.) fails silently into a per-participant "reminder failed" state the
  user can retry, not a crash.
- `Linking.openURL` for the UPI or WhatsApp link failing (app not
  installed) falls back to copying the link/message to the clipboard with
  a toast, rather than a dead tap.
- Deleting a split or a participant is always a soft delete
  (`deleted_at`), consistent with every other entity in the app —
  restorable, never destructive.

## Testing

No automated test runner for `apps/raqm` (project convention) — verified
via `npx tsc --noEmit` plus manual device verification:

- Create a split from scratch with 3 participants (mixed Circle + manual
  entry), equal split, confirm shares sum correctly including the rounding
  remainder landing on the creator.
- Create a split via "Split with Friends" from an existing transaction,
  confirm title/amount pre-fill and `source_tx_id` linkage.
- Generate a UPI link and a WhatsApp share for a participant, confirm both
  open the correct external app with the right prefilled amount.
- Toggle "Auto-send SMS reminders" on, confirm a reminder actually sends
  to an unpaid participant; toggle off, confirm no further auto-sends.
- Simulate an incoming credit SMS matching an open participant's share,
  confirm it surfaces under "Attention needed" and never auto-settles;
  confirm both confirm and reject paths work.
- Create, rename, and edit members of a Circle; confirm a new split can
  populate its participant list from it.
- Soft-delete a split, confirm it disappears from the active list but the
  row still exists (restorable), matching the rest of the app's delete
  convention.
