# Axio CSV Reconciliation Import — Design

## Context

Raqm already ingests transactions from live/scanned SMS. Users of other
expense trackers (Axio, Pennywise, etc.) have already spent time
categorizing/tagging/noting transactions there. This feature lets a user
import that data and reconcile it against transactions Raqm already has —
filling in category/notes/tags on existing rows — rather than creating
duplicate transactions.

v0 scope: **Axio CSV only**. The UI is built to hold future source types
(Pennywise export, bank statement PDF, GPay/PhonePe PDF) as disabled
placeholders, but only Axio is implemented now.

This is distinct from the existing generic `parseImportCsv` /
`insertCsvRows` path (`src/services/csvImport.ts`, wired into
`MoreScreen.tsx`'s current "Import" action), which always inserts new rows
and treats an identical `bankName|amount|timestamp` triple as a duplicate to
skip. That exact-identity dedup doesn't work for Axio exports, since Axio's
bank names ("HDFC", "SBI", "Indian Bnk") and timestamps (minute precision,
no seconds) don't match Raqm's stored `bankName` ("HDFC Bank", etc.) or
SMS-derived `timestamp` byte-for-byte. This feature adds a **new**,
match-then-reconcile path alongside (not replacing) the existing importer.

## Entry point

A new `ImportScreen`, pushed from More (added to `MainStackParamList`),
replaces the current single-action "Import" row in `MoreScreen.tsx`
(`handleImportCsv`, line ~134, and the `import-csv` quick-action entry, line
~276). It shows a list of source cards:

- **Axio CSV** — active, opens the flow below.
- **Pennywise**, **Bank statement PDF**, **GPay/PhonePe PDF** — visually
  present but disabled with a "Coming soon" chip. No parsing logic behind
  them in v0.

The existing generic CSV importer (`csvImport.ts` / `insertCsvRows`) is left
untouched and unreferenced by this new screen — it's a separate, still-valid
tool for "just add these as new transactions" use cases.

## File picking

Reuse `File.pickFileAsync` from `expo-file-system` (already used by the
existing `handleImportCsv`) — no new dependency needed.

## Axio CSV format

Sample layout (`axio_expense_report_*.csv`):

```
"","axio","EXPENSE","REPORT",...          <- metadata preamble, ignored
"Name","Rahat",...
"Phone Number","'+919075459597",...
"FROM","2026-08-01","TO","2026-08-31"
                                            <- blank line
"DATE","TIME","PLACE","AMOUNT","DR/CR","ACCOUNT","EXPENSE","INCOME","CATEGORY","TAGS","NOTE"
"2026-08-01","10:43 AM","SAI DAIRY FARM","66","DR","HDFC  1202","Yes","'-","DAIRY POULTRY MEAT","","milk dahi"
...
```

Parser (`src/services/imports/axioCsv.ts`):

- Scans rows for the one whose first cell is exactly `"DATE"` and treats it
  as the header — ignores everything before it (preamble is variable-length
  metadata, not a fixed row offset).
- Reuses the existing RFC4180-ish tokenizer (`parseCsvText` from
  `csvImport.ts`) rather than writing a second one.
- Per data row, produces:

```ts
interface AxioRow {
  timestamp: number;       // DATE + TIME combined, parsed as local time
  place: string | null;    // merchant/payee
  amount: number;          // absolute value, commas stripped
  type: 'expense' | 'income'; // DR -> expense, CR -> income
  bankAbbrev: string;      // e.g. "HDFC", "SBI", "Indian Bnk" (free text, loose use only)
  last4: string;           // digits parsed out of the ACCOUNT column
  categoryRaw: string | null;
  tags: string[];          // split on '#', trimmed, empties dropped
  note: string | null;
}
```

- Rows missing a parseable date, amount, or ACCOUNT/last4 are skipped and
  counted (same "skip and count, don't throw" convention as
  `parseImportCsv`).

## Matching existing transactions

`src/services/imports/reconcile.ts`:

For each `AxioRow`, look up existing transactions (excluding soft-deleted)
matching:

- `accountLast4 === row.last4` (exact)
- `amount === row.amount` (exact)
- `type === row.type`
- same calendar day as `row.timestamp`

Among candidates, pick the one with the closest `timestamp`. Bank name
(`bankAbbrev`) is **not** used as a hard filter — Axio's abbreviations don't
reliably map to Raqm's stored full bank names — it's only informational in
the preview if ever needed for debugging, not part of the match logic.

Each row resolves to one of:

- **Matched, no conflict** — the existing tx has no `categoryId`, empty
  `notes`, and empty `tags` — stage a `TxPatch` applying the CSV's mapped
  category/notes/tags directly.
- **Matched, conflict** — the existing tx already has a non-null
  `categoryId` and/or non-empty `notes`/`tags` that differ from the CSV's
  values — staged as a conflict, resolved at commit time by one global
  choice (see below), not per-row.
- **No match** — staged as a new transaction to insert: `is_manual: true`,
  amount/type/timestamp/category/notes/tags from the CSV row, `bankName`
  falls back to the raw `bankAbbrev` text (best effort, matches today's
  generic importer's behavior for CSV-sourced rows with no bank match). No
  separate "imported" flag — it's just a manual transaction like any other.

Nothing is written to SQLite during matching — it all stays staged in
memory until the user confirms.

## Category resolution

For a `categoryRaw` string, look up an exact case-insensitive name match
against `getCategories()` (all directions, no direction filter — Axio's
category vocabulary doesn't cleanly split by direction the way Raqm's does).

- **Match found** → use that category's id.
- **No match** → leave `categoryId` unset for that row for now, and record
  the distinct raw name in an "unmapped categories" set.

Before showing the final preview/confirm screen, if there are any unmapped
category names, show a small review screen: one row per distinct unmapped
name, with a category picker (reusing the existing category-picker UI
pattern) defaulting to "leave unmapped" (Uncategorized). The user's choice
here applies only to this import's rows carrying that raw name — it is
**not** persisted anywhere. (If the user later creates an actual category
whose name exactly matches a raw Axio category string, e.g. "Account
Transfer," future imports will match it for free via the exact-name lookup
above — no extra bookkeeping needed to support that.)

## Preview / confirm screen

After parsing, matching, and category resolution (including the unmapped-category
step if needed), show a summary:

- N transactions matched and will be updated
- N of those are conflicts (already had category/notes/tags) — user picks
  **Overwrite** or **Skip these** (applies to all conflicts at once)
- N new transactions will be created
- N rows skipped (unparseable)

On confirm: apply everything in one flow —

- Sequential `updateTx(id, patch)` calls for matched rows (overwritten
  conflicts included per the chosen policy; skipped conflicts get no patch
  at all) — sequential per the project's existing "never `Promise.all` over
  many DB writes" rule (see `insertParsedTxs`/`insertCsvRows`).
- Reuse `insertCsvRows`'s insert path (or a shared helper extracted from it)
  for the no-match rows.
- Both phases run inside one `BEGIN`/`COMMIT`/`ROLLBACK` transaction.
- `useTxStore.getState().refresh()` after commit.

## Error handling

- Malformed file / no header row found → alert, abort before any DB writes.
- Zero parseable rows → alert "nothing to import," abort.
- Any exception during the write phase → `ROLLBACK`, surface via `Alert`,
  same pattern as the existing importer.

## Out of scope (v0)

- Pennywise, bank statement PDF, GPay/PhonePe PDF parsers — UI placeholders
  only.
- Persisting category-name mapping choices across imports.
- Per-row conflict resolution (only the single global Overwrite/Skip
  choice).
