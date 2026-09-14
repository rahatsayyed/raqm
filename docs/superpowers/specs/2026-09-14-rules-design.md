# Rules — Design

## Problem

Raqm has one hidden automation today: an exact-merchant → category rule,
written silently whenever a user edits a transaction's category
(`category_rules` table, `EditTransactionScreen.tsx`). The user wants a
visible, editable set of automation rules that go further than category
memory: matching merchants by substring (not just exact name), hiding
noise merchants entirely, masking large/small amounts for privacy, treating
large amounts as transfers automatically, and excluding specific merchants
from budget tracking.

A "Rules" entry and screen already exist (MoreScreen → Rules,
`RulesScreen.tsx`), with three tabs:

- **Category** — lists the existing exact-merchant → category/subcategory
  rules. Stays as-is.
- **Merchant** — unrelated to this feature: manual transaction grouping
  (`transaction_groups`). Stays as-is, not touched or renamed.
- **Amount** — a stub ("Not built yet. Coming soon."). This spec fills it
  in and adds new tabs alongside it.

## Goals

- A user can define, edit, reorder, and delete rules from the Rules screen,
  without needing to touch code or wait for a manual edit to teach the app.
- Five rule kinds, described below, each with a clear single purpose.
- Every rule integrates through the app's existing single-source-of-truth
  functions (`countsTowardTotals`, `categorizeParsedTx`, `sumSpend`,
  `insertParsedTx`) rather than adding a parallel check that each screen
  must remember to call.
- Saving a rule lets the user choose whether it also re-applies to past
  transactions, or only affects transactions from that point forward.

## Non-goals

- No rule-on-rule chaining or scripting language — each rule kind has a
  small fixed set of fields, no user-authored conditions/expressions.
- No merging of the existing "Merchant" (grouping) tab into this feature.
- No changes to the existing exact-merchant category-rule behavior or its
  "Category" tab beyond what's needed to define step ordering against the
  new Word Match rules.
- No new self-transfer pairing logic for the amount-transfer rule — it only
  sets `type = TRANSFER` on the matching transaction; it does not attempt to
  find or link an opposite transaction.

## Rule kinds

### 1. Word Match (new "Word Match" tab)

Substring, case-insensitive category rule: e.g. pattern `"kirana"` matches
merchant `"Sri Kirana Store"` → sets category (and optional subcategory).

- Stored as an ordered list; the user can reorder rules (drag to reorder).
  The first matching rule (top to bottom) wins.
- The existing exact-merchant rule (`category_rules` table) always takes
  priority over any Word Match rule — exact beats substring.
- Slots into `categorizeParsedTx` (database.ts) as a new step between the
  existing exact-merchant-rule lookup and the merchant majority-vote
  fallback.

### 2. Mask Amount (new "Amount" tab, first section)

Hides the amount (shows a masked placeholder) for any transaction whose
amount is above or below a user-set threshold.

- Fields: threshold, direction (`above`/`below`), scope
  (`everywhere` or `list_widgets` — detail screen still shows the real
  value in the `list_widgets` scope).
- Reveal reuses the app's existing auth-gated reveal flow (the same one
  `HideBalancesScreen`/`MaskedValue`/`hiddenBalanceStore` already use for
  income/expense/net/balance figures) — no new auth mechanism, no plain
  tap-to-reveal. This keeps one privacy mental model across the app.
- Rendering hooks: every existing amount display wraps in the existing
  `MaskedValue` component today only for the four aggregate figures; this
  adds a new `getAmountMaskRule(tx)` lookup so `MaskedValue` (or a thin
  per-transaction wrapper around it) can also mask a single transaction's
  amount in lists, detail, widgets, and notifications per the rule's scope.

### 3. Amount → Transfer (new "Amount" tab, second section)

Any transaction above a threshold is treated as a transfer.

- Field: threshold (an "above" comparison only — a transfer-by-size
  assumption doesn't make sense as a "below" rule).
- At categorization time (`categorizeParsedTx` or immediately after amount
  parsing in `insertParsedTx`), if `amount > threshold`, force
  `type = TRANSFER`. This makes it excluded from totals the same way a
  detected self-transfer already is, since `countsTowardTotals()` and the
  various `isDebit`/`credit` helpers already treat `TRANSFER` as
  non-income/expense. No pairing/linking is attempted (see Non-goals).
- Still runs normal categorization (assigns the real "Transfer" category,
  the same one self-transfer debit legs already get — see
  `database.ts:1583/1609`) rather than leaving `categoryId` null. Leaving it
  null would recreate the credit-leg category bug already fixed for
  detected self-transfers.

### 4. Hide Merchant (new "Privacy" tab, first section)

Drops matching SMS entirely — never inserted into the database. Same
mechanism as the existing hidden-account check.

- Field: merchant pattern (case-insensitive substring, same matching as
  Word Match).
- Hooks into `insertParsedTx` (database.ts) immediately after the existing
  hidden-account check (`getHiddenAccountKeys`), before any row is created:
  a new `getHiddenMerchantPatterns()` check that returns `null` (skip
  insert) on a match.
- Because this only affects insertion, it cannot be un-done by disabling
  the rule after the fact for transactions that were never saved. The "past
  transactions" choice for this rule kind (see below) controls whether
  matching **existing** transactions get soft-deleted (via the existing
  `deleted_at` soft-delete path) when the rule is saved — not whether
  future ones are dropped, which always happens once the rule exists.

### 5. Exclude Merchant From Budgeting (new "Privacy" tab, second section)

Transaction is saved and shown everywhere normally; only excluded from
budget spend totals.

- Field: merchant pattern (case-insensitive substring).
- Hooks into `budgets.ts`'s `sumSpend`: one additional check alongside the
  existing `countsTowardTotals(tx)` check, skipping the transaction if its
  merchant matches an exclusion pattern. Analytics/Dashboard/export totals
  are untouched — this only affects budget math, per the rule's name.

## Data model

New migration, current version 15 → **16**:

```sql
CREATE TABLE word_match_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  pattern TEXT NOT NULL,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  subcategory_id INTEGER,
  priority INTEGER NOT NULL
);

CREATE TABLE amount_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('mask', 'transfer')),
  threshold REAL NOT NULL,
  direction TEXT CHECK (direction IN ('above', 'below')), -- NULL for kind='transfer' (always "above")
  scope TEXT CHECK (scope IN ('everywhere', 'list_widgets')) -- NULL for kind='transfer'
);

CREATE TABLE merchant_privacy_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_pattern TEXT NOT NULL,
  hide INTEGER NOT NULL DEFAULT 0,      -- boolean: drop entirely at ingest
  exclude_from_budget INTEGER NOT NULL DEFAULT 0
);
```

`merchant_privacy_rules` holds one row per merchant pattern with either or
both flags set, rather than two separate tables — a merchant can be both
hidden and excluded from budgeting, and there's no reason to force the user
to create two rules for that.

## Past-transactions choice

Every rule-creation/edit flow (except the ingest-only half of Hide
Merchant, see above) ends with a choice, presented as a two-option prompt
right after saving:

- **"Apply to past transactions too"** — runs a background re-apply pass,
  serialized through one in-flight promise the same way `rescan.ts`
  already serializes scan operations (so a rule save can't race a scan or
  another rule save). Re-categorizes (Word Match), re-flags mask/transfer
  amount rules, re-checks budget exclusion, and (Hide Merchant only)
  soft-deletes existing matches.
- **"From now on only"** — no re-apply pass; the rule only changes behavior
  for transactions ingested after this point.

## UI summary

MoreScreen → **Rules** (existing entry, unchanged) opens `RulesScreen.tsx`
with tabs, left to right: **Category** (existing) · **Word Match** (new) ·
**Amount** (existing stub, now built) · **Privacy** (new) · **Merchant**
(existing, unrelated grouping feature, unchanged — kept last since it's not
part of this rules concept and shouldn't crowd the new tabs).

Each new tab follows the existing Category tab's list pattern: a list of
current rules (reorderable for Word Match only), a delete affordance per
row, and a "+" add button opening a small form sheet for that rule kind's
fields, ending in the past/future choice on save.

## Testing

No test runner exists for the app (per project convention); verification
is `tsc --noEmit` plus manual device testing against a checklist covering:
one Word Match rule beating majority-vote but losing to an exact rule,
mask scope in both modes, an amount-transfer threshold excluding a
transaction from Dashboard/Analytics/budgets, a hidden merchant's SMS
never appearing, a budget-excluded merchant still appearing in
lists/Analytics but not counted in its budget, and the past/future choice
actually leaving old transactions alone when "from now on only" is picked.
