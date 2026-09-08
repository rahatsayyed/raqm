# Split with Friends v2 — Design Spec

**Status:** approved by user in chat (not yet through the full brainstorming visual-review loop — this doc is a handoff artifact written to survive a context compaction mid-conversation). Re-confirm scope with the user before writing the implementation plan(s).

**Depends on:** the v1 "Split with Friends" feature (already merged into `build/v0-mvp`) — `splits`, `split_participants`, `split_circles`, `split_circle_members` tables (migrations v13-v14), `SplitCreateScreen`, `SplitDetailScreen`, `SplitCirclesScreen`, `SplitScreen`, `matchSplitPayments`, `splitReminders.ts`, `buildUpiLink`/`openExternalLink`.

## Why this spec exists

After v1 shipped, the user tried it and asked for a second round of changes — richer split math, a proper review step, per-split reminders, and (the important one) making a confirmed split payment actually net against real spend instead of quietly becoming phantom income. This is architectural-sized work: it touches the spend-math invariants in `CLAUDE.md`, restructures the creation flow across several screens, and adds new schema. It is being brainstormed as its own initiative rather than folded into quick patches.

## Already fixed (v1 bugs — already committed directly to `build/v0-mvp`, not part of this spec's scope)

- `babel.config.js` was missing `material-symbols:group-rounded` from `react-native-iconify/babel`'s allowlist, so `PeopleIcon` (Split tab, transaction 3-dot menu, MoreScreen row) rendered blank. Fixed, commit `0f7985e`.
- `SplitDetailScreen` read `split.creatorUpiId`, frozen at split-creation time — a split created before the user set their UPI ID never picked it up later. Fixed to read live via `getSetting('upi_id')` on focus. Commit `5052f93`.
- Adding a contact or re-selecting the same circle duplicated participants; selecting a different circle appended instead of replacing. Fixed with an `isSameParticipant` dedupe check (phone number, else case-insensitive name) and a `fromCircleId` tag so switching circles replaces only that circle's rows. Commit `ce04c9c`.

## Scope of this spec (v2)

1. Split math overhaul (4 modes, pin-and-redistribute, "You" as a real row)
2. Creation flow additions (description field, inline circle-creation, final review step)
3. Circle creation UX (WhatsApp-style two-step)
4. Messaging overhaul (drop "Pay via UPI", embed UPI link + description + receiver name)
5. Payment confirmation + netting (auto-link via `linkPartnerId`, manual bottom-sheet fallback, cash-received path)
6. Settings / Bills & Reminders integration (per-split reminder control replaces the global toggle, splits surface in Bills & Reminders)

## Non-goals

- General manual account management. Section 5's "Received as cash" reuses the existing `bankName: 'Cash'` manual-transaction path (already used by `QuickAddCashScreen` for cash expenses) — no new account concept, no accounts table, no account-management UI.
- Multi-currency, cross-device sync — unchanged from v1's non-goals.
- True background task scheduling for reminders — still app-open-triggered; this spec only makes the check interval configurable per split, not a real background job.

---

## 1. Split math overhaul

### Four modes, replacing v1's Equal/Custom toggle

- **Equal** — total ÷ N people, including "You" as one of the N (see below). Same paise-based rounding as v1's `computeEqualShares`.
- **Exact** — the user types a rupee amount per person.
- **Percentage** — the user types a percentage per person, up to 2 decimal places, must reconcile to 100%.
- **Shares** — the user types a relative weight per person (e.g. 2 / 1 / 1 → 50% / 25% / 25%); amounts are computed from the ratio. Not an additive quantity, so it does not use the pin/redistribute behavior below.

### "You" becomes a real participant row

v1 never stored the creator's own share — it was an implicit remainder, never written as a `split_participants` row. v2 makes "You" a first-class row in every mode:

- Add an `is_self BOOLEAN NOT NULL DEFAULT 0` column to `split_participants` (new migration, v15 — confirm the next free version number at plan time).
- In Equal mode, the "You" row is auto-computed like everyone else.
- In Exact/Percentage/Shares modes, "You" is an adjustable row like any other participant — needed so the remaining-amount math always has something to reconcile against.
- `SplitDetailScreen`'s participant list must visually distinguish the `is_self` row (e.g. label "You" instead of a name) and must NOT show Pay-via-UPI/WhatsApp/Remind-now/Confirm-paid buttons on that row — you don't pay or remind yourself.

### Pin-and-redistribute algorithm (Exact and Percentage modes only)

This is the core new interaction, specified precisely by the user:

- All rows start blank — no prefilled equal split like v1's Custom mode did.
- The first row the user types a value into becomes "pinned" at that value. The remaining amount (total minus the sum of all pinned values so far) is divided equally across every row that is NOT yet pinned, using the existing paise-rounding rule (remainder falls to the last unpinned row, same convention as `computeEqualShares`).
- Typing into a second row pins that one too; the remaining amount is redistributed again across whatever rows are still unpinned. This is order-independent — pinning is keyed by which specific rows the user has actually edited, not by row position.
- If the sum of pinned values exceeds the total (Exact mode) or 100 (Percentage mode), unpinned rows clamp to 0, and the existing red "remaining" over-allocation indicator (already built in v1) fires.
- Percentage mode follows the identical algorithm, with two differences: values are capped at 2 decimal places, and the reconciliation target is 100 instead of the total rupee amount.
- Shares mode does not use this algorithm at all — every row's amount is always derived from the ratio of all rows' weights, with no concept of "remaining" to redistribute.

Implementation note for planning: this needs a `pinned: boolean` (or a `Set` of pinned participant indices/ids) alongside the existing `shareAmount`/`shareText` per-participant state in `SplitCreateScreen`, and the existing `computeEqualShares`-style redistribution logic needs a variant that operates over a subset of rows (the unpinned ones) rather than all of them.

---

## 2. Creation flow additions

### Description field

- New optional multi-line "Description" text input on `SplitCreateScreen`, following the same `KeyboardAwareScrollView` + `TextInput` pattern as `QuickAddCashScreen`'s "Note" field.
- New `description TEXT` column on `splits` (same migration as `is_self`, or a separate one — decide at plan time based on whether they're logically the same migration version).
- Consumed by section 4's messaging changes.

### Inline "create a circle" suggestion

- Alongside the existing per-circle "+ Use '{name}'" buttons in the participants section, add a "+ Create new circle" row.
- Navigates into circle creation (section 3's new two-step flow) and returns with the newly created circle already selected as the active circle — needs a serializable-params return path (CLAUDE.md requires this; `CategoryPicker`'s `popTo(returnTo, { picked... }, { merge: true })` pattern is the established template, not a callback).

### Final review step

- A new step shown after the user taps "Save split" and before the actual DB write — either a full screen or a bottom sheet (decide at plan time based on how much content it needs to show).
- Shows: title, total amount, selected mode, every participant with their computed share, and the "You" row.
- Adds two new controls on this step:
  - **Auto-remind toggle** — per-split, replacing v1's global "Auto-send split reminders" MoreScreen toggle entirely (see section 6).
  - **Reminder cadence picker**, shown only when the toggle is on — e.g. "Every app open", "Every 2 days", "Every 3 days", "Weekly" (exact option list to be finalized during planning; the user explicitly rejected "every app open" as the sole option and wants a real interval choice).
- New `splits` columns: `auto_remind_enabled BOOLEAN NOT NULL DEFAULT 0`, `remind_interval_days INTEGER` (nullable; null/0 meaning "every app open" if that option survives planning).
- Tapping "Confirm & Create" on this step is what actually calls `addSplitWithParticipants` (today's `handleSave` in `SplitCreateScreen` becomes this step's confirm action, one step later than today).

---

## 3. Circle creation UX

Replace the current single-screen "type a name, then expand and add members inline" creation flow with a WhatsApp-style two-step flow:

- **Step 1:** multi-select people — via repeated `pickContact()` calls and/or manual-entry rows, subject to the same dedupe rule fixed in v1 (`isSameParticipant`).
- **Step 2:** name the circle, then save — creates the circle and all its members together, ideally in one DB transaction (add an `addSplitCircleWithMembers` function analogous to v1's `addSplitWithParticipants` fix, rather than a circle insert followed by N separate member inserts with no rollback).

This replaces `SplitCirclesScreen`'s existing UI only for the **create** path. Renaming an existing circle, adding more members later, or removing members from an existing circle can keep the current expand-inline UI — only the initial creation flow changes.

Open question for planning: whether `expo-contacts` exposes a native multi-select contact picker, or whether repeated single-picks (as v1 already does) are the only option in SDK 56.

---

## 4. Messaging overhaul

- **Remove "Pay via UPI" from `SplitDetailScreen` entirely.** The user confirmed this button never made sense: the split creator is the payee, not the payer, so a button that opens a UPI app to pay yourself was backwards. (v1's final review already flagged this as a bug and routed it through `Share.share` as a stopgap — v2 removes the button altogether rather than keeping a share-sheet version of it.)
- Both **"Share on WhatsApp"** and **"Remind now"** messages must now include:
  - The UPI payment link (via `buildUpiLink`, using the live UPI ID per the v1 bugfix, not a frozen value).
  - The split's `description`, if set.
  - The participant's own name, addressed directly (e.g. "Hi {name}, ...").
- `splitReminders.ts`'s `reminderMessage()` currently has none of this (no UPI link, no description, no name) — needs the same treatment as the WhatsApp message.

---

## 5. Payment confirmation + netting

This is the highest-risk section — it touches Raqm's core spend-math invariants (`countsTowardTotals()` + refund netting via `linkPartnerId`, documented in `CLAUDE.md`). Read that invariant carefully before implementing, and reuse the existing refund-linking mechanism rather than inventing a parallel spend-math path.

### Linked splits (have a `sourceTxId`, i.e. created from an existing transaction)

- `matchSplitPayments()` (v1, unchanged) still auto-detects a likely incoming credit and sets the participant to `attention`.
- **New:** when the user taps "Confirm paid" on an `attention` participant, ALSO link the matched credit transaction to the split's `sourceTxId` original expense via the same mechanism refunds already use (`linkTxs`/`linkPartnerId` — check the exact existing refund-confirmation code path in `txIntelligenceCore.ts`/`database.ts` and reuse it verbatim rather than reimplementing).
- This happens **per participant as each is confirmed**, not only once the whole split reaches `settled` — confirmed with the user.

### Manual settle path (the plain toggle, not the auto-detected attention flow)

- Today, tapping the manual "Settled" toggle in `SplitDetailScreen` instantly flips status with no confirmation. v2 changes this **only for linked splits** (has `sourceTxId`) — unlinked splits keep the current instant-toggle behavior with no netting, purely informational (explicitly confirmed: "for no transaction linked split we don't worry about income and expense changes").
- For linked splits, tapping "Settled" opens a bottom sheet:
  - Lists recent **incoming** transactions (credits) so the user can manually pick the one that matches this payment — a fallback for when `matchSplitPayments` missed it. Reuse/adapt `TransactionsScreen`'s existing select-mode UI (long-press → select → action bar), simplified to single-select, rather than building a new picker from scratch.
  - Also offers **"Received as cash."** No new account concept is needed for this: `'Cash'` already exists as a `bankName` value (`QuickAddCashScreen` already creates manual EXPENSE transactions with `bankName: 'Cash'`). "Received as cash" creates a manual transaction via the existing `useTxStore.add()` path with `type: TransactionType.CREDIT`, `bankName: 'Cash'`, `isManual: true`, `amount` = the participant's `shareAmount`, `merchant` = the split's title — then immediately nets it via the same `linkPartnerId` mechanism as the auto-detected path above.
  - Either path (picked existing transaction, or newly created cash transaction) ends by calling `setSplitParticipantStatus(id, 'settled', matchedTxId)` with the resolved transaction id.

---

## 6. Settings / Bills & Reminders integration

- **Remove** the global "Auto-send split reminders" toggle from `MoreScreen.tsx` (added in v1 Plan 4) — fully replaced by the per-split toggle + cadence from section 2.
- `checkAndSendReminders()` needs reworking: iterate open splits, read each split's own `auto_remind_enabled` / `remind_interval_days` (section 2's new columns) instead of one global setting key.
- `DuesRemindersScreen` ("Bills & Reminders") should blend open splits with unpaid/attention participants into its existing `mergeDues()` output. Check `DueItem`'s current shape (in `src/services/dues.ts`) before deciding whether to extend that type or render a parallel list in the same screen.

---

## Known gaps carried over from the v1 final review (not addressed by this spec — flag for a future pass)

- `sendReminderNow`/`checkAndSendReminders` still have no `logEvent` calls — a reminder-send failure is invisible in diagnostic log exports. Worth adding while section 6 reworks this service anyway.
- v1's `deleteSplitParticipant`, `source_tx_id`, and the original `matchedTxId` surfacing remain thin/unused in places — revisit once `is_self` and the new bottom-sheet flow land, not blocking.

## Open questions to resolve during planning

1. Final reminder-cadence option list (this spec assumes "Every app open / 2 days / 3 days / Weekly" but the exact set needs to be nailed down).
2. Whether the final review step is a full screen or a bottom sheet.
3. Whether `expo-contacts` supports a native multi-select picker for circle creation, or whether repeated single-picks are the only option.
4. `DueItem`'s exact shape and how cleanly splits blend into it.
5. Exact migration version numbers (`is_self`, `description`, `auto_remind_enabled`, `remind_interval_days` — confirm v15 is still free at plan time, since other work may have landed on `build/v0-mvp` in the meantime).
6. The exact refund-linking function name/signature to reuse for split-payment netting (this spec assumes it exists and is reusable verbatim — confirm by reading `txIntelligenceCore.ts`'s refund-confirmation path before writing the plan).
