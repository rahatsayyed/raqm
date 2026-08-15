# Axio CSV Reconciliation Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user import an Axio expense-report CSV and reconcile it against transactions Raqm already has — filling in category/notes/tags on matching rows, creating new manual transactions for rows with no match — instead of duplicating already-scanned transactions.

**Architecture:** A pure parser turns the Axio CSV into typed rows; a pure matcher stages each row as an update, a conflicting update, or a new-row insert against a lean read of existing transactions; a thin DB-layer function applies the staged plan in one SQLite transaction. Two new screens (a source picker, and the Axio flow itself) sit on the existing push-stack navigator, reachable from More.

**Tech Stack:** TypeScript, React Native (Expo SDK 56), expo-sqlite (async API), expo-file-system (`File.pickFileAsync`), NativeWind for the new screens.

**Spec:** `docs/superpowers/specs/2026-08-15-axio-import-design.md`

## Global Constraints

- No `Promise.all` over per-row DB writes — categorize/insert/update sequentially (project-wide invariant; see `insertParsedTxs`/`insertCsvRows` in `apps/raqm/src/db/database.ts`).
- All multi-row SQLite writes wrapped in explicit `runAsync('BEGIN')` / `COMMIT` / `ROLLBACK` — never `withTransactionAsync`.
- New/significantly-edited screens use NativeWind `className`, not `StyleSheet.create` (project is mid-migration; `TransactionDetailScreen` is the one screen still on `StyleSheet` and stays that way — do not touch it in this plan).
- Dark-only theme: colors/spacing/type from `src/theme`/`tailwind.config.js` tokens, never hardcoded hex.
- Amounts formatted via `src/utils/format.ts`'s `formatAmount`.
- `apps/raqm` has no test runner. Verify pure logic (Tasks 1–2) with a throwaway script run via `npx tsx` (delete the script after verifying — it is not committed). Verify DB/UI tasks with `cd apps/raqm && npx tsc --noEmit` (must be run from `apps/raqm`, not the repo root) plus manual reasoning/review — there is no device available this session to manually verify on.
- Existing generic CSV importer (`src/services/csvImport.ts`, `insertCsvRows` in `database.ts`, `handleImportCsv` in `MoreScreen.tsx`) is left in place but its More-screen entry point is repointed to the new `Import` screen — per the approved spec, it becomes unreferenced-but-not-deleted code. Do not delete it.

---

### Task 1: Axio CSV parser

**Files:**
- Create: `apps/raqm/src/services/imports/axioCsv.ts`

**Interfaces:**
- Consumes: `parseCsvText` (already exported from `apps/raqm/src/services/csvImport.ts`) — `(text: string) => string[][]`.
- Produces: `AxioRow` interface and `parseAxioCsv(text: string): { rows: AxioRow[]; skipped: number }`, used by Task 2 and Task 5.

```ts
export interface AxioRow {
  timestamp: number;
  place: string | null;
  amount: number;
  type: 'expense' | 'income';
  bankAbbrev: string;
  last4: string;
  categoryRaw: string | null;
  tags: string[];
  note: string | null;
}

export interface AxioParseResult {
  rows: AxioRow[];
  skipped: number;
}
```

Axio's real layout (see `axio_expense_report_9075459597_1786797960453851.csv` at the repo root for a live sample): a variable-length metadata preamble (`"","axio","EXPENSE","REPORT",...`, `"Name",...`, `"Phone Number",...`, `"FROM",...,"TO",...`, a blank line), then the real header row `"DATE","TIME","PLACE","AMOUNT","DR/CR","ACCOUNT","EXPENSE","INCOME","CATEGORY","TAGS","NOTE"`, then data rows like:

```
"2026-08-01","10:43 AM","SAI DAIRY FARM","66","DR","HDFC  1202","Yes","'-","DAIRY POULTRY MEAT","","milk dahi"
"2026-08-01","12:58 PM","RELIANCE RETAIL","139","DR","HDFC  1202","Yes","'-","HEALTH","#Online","iron capsule"
```

- [ ] **Step 1: Write the throwaway verification script**

Create a scratch script (e.g. in this session's scratchpad directory — do not put it under `apps/raqm`), `verify-axio-parser.ts`:

```ts
import { parseAxioCsv } from '<absolute-path-to>/apps/raqm/src/services/imports/axioCsv';

const sample = `"","axio","EXPENSE","REPORT","","","","","","",""
"Name","Rahat","","","","","","","","",""
"Phone Number","'+919075459597","","","","","","","","",""
"FROM","2026-08-01","TO","2026-08-31"

"DATE","TIME","PLACE","AMOUNT","DR/CR","ACCOUNT","EXPENSE","INCOME","CATEGORY","TAGS","NOTE"
"2026-08-01","10:43 AM","SAI DAIRY FARM","66","DR","HDFC  1202","Yes","'-","DAIRY POULTRY MEAT","","milk dahi"
"2026-08-01","12:58 PM","RELIANCE RETAIL","139","DR","HDFC  1202","Yes","'-","HEALTH","#Online","iron capsule"
"2026-08-01","10:52 PM","RAHAT SAMIR SAYYED","20,000","CR","SBI  2987","'-","No","ACCOUNT TRANSFER","",""
"garbage","row","with","too","few","cells"
`;

const { rows, skipped } = parseAxioCsv(sample);
console.log('rows:', rows.length, 'skipped:', skipped);
console.log(JSON.stringify(rows, null, 2));

if (rows.length !== 3) throw new Error(`expected 3 rows, got ${rows.length}`);
if (rows[0].amount !== 66 || rows[0].type !== 'expense') throw new Error('row 0 mismatch');
if (rows[0].last4 !== '1202' || rows[0].bankAbbrev !== 'HDFC') throw new Error('row 0 account mismatch');
if (rows[0].categoryRaw !== 'DAIRY POULTRY MEAT') throw new Error('row 0 category mismatch');
if (rows[1].tags.length !== 1 || rows[1].tags[0] !== 'Online') throw new Error('row 1 tags mismatch');
if (rows[2].amount !== 20000 || rows[2].type !== 'income') throw new Error('row 2 (comma-amount, CR) mismatch');
if (rows[2].last4 !== '2987' || rows[2].bankAbbrev !== 'SBI') throw new Error('row 2 account mismatch');

console.log('ALL CHECKS PASSED');
```

- [ ] **Step 2: Run it to confirm it currently fails (module doesn't exist yet)**

Run: `npx tsx <path-to-script>` (from `apps/raqm`, since `tsx` is its devDependency — `cd apps/raqm && npx tsx <absolute-path-to-script>` if module resolution otherwise fails).
Expected: fails to resolve `.../axioCsv` (file doesn't exist yet).

- [ ] **Step 3: Implement the parser**

```ts
// apps/raqm/src/services/imports/axioCsv.ts
import { parseCsvText } from '../csvImport';

export interface AxioRow {
  timestamp: number;
  place: string | null;
  amount: number;
  type: 'expense' | 'income';
  bankAbbrev: string;
  last4: string;
  categoryRaw: string | null;
  tags: string[];
  note: string | null;
}

export interface AxioParseResult {
  rows: AxioRow[];
  skipped: number;
}

const COL = {
  DATE: 0,
  TIME: 1,
  PLACE: 2,
  AMOUNT: 3,
  DRCR: 4,
  ACCOUNT: 5,
  CATEGORY: 8,
  TAGS: 9,
  NOTE: 10,
} as const;

function parseAxioAmount(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  return Number.isNaN(n) ? null : Math.abs(n);
}

// Axio's DATE is "YYYY-MM-DD", TIME is "H:MM AM/PM" (e.g. "10:43 AM", "10:52 PM").
function parseAxioTimestamp(dateRaw: string, timeRaw: string): number | null {
  const dateMatch = dateRaw.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) return null;
  const timeMatch = timeRaw.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!timeMatch) return null;

  const [, y, mo, d] = dateMatch;
  let hour = Number(timeMatch[1]) % 12;
  if (/pm/i.test(timeMatch[3])) hour += 12;
  const minute = Number(timeMatch[2]);

  const ts = new Date(Number(y), Number(mo) - 1, Number(d), hour, minute).getTime();
  return Number.isNaN(ts) ? null : ts;
}

// Axio's ACCOUNT column is a free-text bank abbreviation followed by the last 4
// account digits, e.g. "HDFC  1202", "Indian Bnk  2987" — the digits are always
// the trailing token, the rest (trimmed) is the abbreviation.
function parseAccountColumn(raw: string): { bankAbbrev: string; last4: string } | null {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(.*?)\s*(\d{3,})$/);
  if (!match) return null;
  const bankAbbrev = match[1].trim();
  const last4 = match[2].slice(-4);
  if (!bankAbbrev || !last4) return null;
  return { bankAbbrev, last4 };
}

function parseAxioTags(raw: string): string[] {
  return raw
    .split('#')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Parses an Axio expense-report CSV export. Axio prepends a variable-length metadata
 * preamble (name, phone number, date range) before the real header row — this scans for
 * the row whose first cell is exactly "DATE" rather than assuming a fixed row offset.
 */
export function parseAxioCsv(text: string): AxioParseResult {
  const table = parseCsvText(text);
  const headerIdx = table.findIndex((row) => (row[0] ?? '').trim() === 'DATE');
  if (headerIdx === -1) return { rows: [], skipped: 0 };

  const rows: AxioRow[] = [];
  let skipped = 0;

  for (const line of table.slice(headerIdx + 1)) {
    const timestamp = parseAxioTimestamp(line[COL.DATE] ?? '', line[COL.TIME] ?? '');
    const amount = parseAxioAmount(line[COL.AMOUNT] ?? '');
    const drcr = (line[COL.DRCR] ?? '').trim().toUpperCase();
    const account = parseAccountColumn(line[COL.ACCOUNT] ?? '');

    if (timestamp == null || amount == null || amount <= 0 || account == null || (drcr !== 'DR' && drcr !== 'CR')) {
      skipped++;
      continue;
    }

    rows.push({
      timestamp,
      place: (line[COL.PLACE] ?? '').trim() || null,
      amount,
      type: drcr === 'DR' ? 'expense' : 'income',
      bankAbbrev: account.bankAbbrev,
      last4: account.last4,
      categoryRaw: (line[COL.CATEGORY] ?? '').trim() || null,
      tags: parseAxioTags(line[COL.TAGS] ?? ''),
      note: (line[COL.NOTE] ?? '').trim() || null,
    });
  }

  return { rows, skipped };
}
```

- [ ] **Step 4: Run the verification script**

Run: `npx tsx <path-to-script>`
Expected: `ALL CHECKS PASSED` printed, no thrown error.

- [ ] **Step 5: Typecheck and delete the scratch script**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no new errors.
Delete the scratch script (it was never part of the repo).

- [ ] **Step 6: Commit**

```bash
git add apps/raqm/src/services/imports/axioCsv.ts
git commit -m "feat(raqm): add Axio CSV parser for import reconciliation"
```

---

### Task 2: Reconciliation matcher (pure logic)

**Files:**
- Create: `apps/raqm/src/services/imports/reconcile.ts`

**Interfaces:**
- Consumes: `AxioRow` from Task 1 (`apps/raqm/src/services/imports/axioCsv.ts`).
- Produces: `ReconciliationCandidate`, `PlannedUpdate`, `PlannedInsert`, `ReconciliationPlan`, `buildReconciliationPlan(rows: AxioRow[], candidates: ReconciliationCandidate[], categories: { id: number; name: string }[]): ReconciliationPlan` — consumed by Task 3 (DB layer) and Task 6 (screen).

```ts
export interface ReconciliationCandidate {
  id: number;
  amount: number;
  type: 'expense' | 'income';
  timestamp: number;
  categoryId: number | null;
  notes: string | null;
  tags: string[];
  last4: string | null;
}

export interface PlannedUpdate {
  txId: number;
  categoryId: number | null;
  categoryRaw: string | null;
  notes: string | null;
  tags: string[];
  conflict: boolean;
}

export interface PlannedInsert {
  amount: number;
  type: 'expense' | 'income';
  timestamp: number;
  merchant: string | null;
  bankName: string;
  categoryId: number | null;
  categoryRaw: string | null;
  notes: string | null;
  tags: string[];
}

export interface ReconciliationPlan {
  updates: PlannedUpdate[];
  inserts: PlannedInsert[];
  skippedRows: number;
  unmappedCategoryNames: string[];
}
```

Note `categoryRaw` is carried on both planned types from the start (not added later) — it's needed by Task 6 to apply the user's per-import category overrides for names that didn't match an existing category.

- [ ] **Step 1: Write the throwaway verification script**

Create `verify-reconcile.ts` in the scratchpad:

```ts
import { buildReconciliationPlan, type ReconciliationCandidate } from '<path>/apps/raqm/src/services/imports/reconcile';
import type { AxioRow } from '<path>/apps/raqm/src/services/imports/axioCsv';

const categories = [
  { id: 1, name: 'Groceries' },
  { id: 2, name: 'Health' },
];

const baseRow: AxioRow = {
  timestamp: new Date(2026, 7, 1, 10, 43).getTime(),
  place: 'SAI DAIRY FARM',
  amount: 66,
  type: 'expense',
  bankAbbrev: 'HDFC',
  last4: '1202',
  categoryRaw: 'Groceries',
  tags: ['Online'],
  note: 'milk dahi',
};

// Case 1: clean match, no conflict.
const noConflictCandidate: ReconciliationCandidate = {
  id: 101,
  amount: 66,
  type: 'expense',
  timestamp: new Date(2026, 7, 1, 10, 45).getTime(), // 2 min off, same day
  categoryId: null,
  notes: null,
  tags: [],
  last4: '1202',
};

const plan1 = buildReconciliationPlan([baseRow], [noConflictCandidate], categories);
if (plan1.updates.length !== 1) throw new Error('expected 1 update');
if (plan1.updates[0].txId !== 101 || plan1.updates[0].conflict) throw new Error('expected non-conflict match on 101');
if (plan1.updates[0].categoryId !== 1) throw new Error('expected Groceries (id 1) resolved');
if (plan1.inserts.length !== 0) throw new Error('expected no inserts');

// Case 2: matching candidate already has a category -> conflict.
const conflictCandidate: ReconciliationCandidate = { ...noConflictCandidate, categoryId: 2 };
const plan2 = buildReconciliationPlan([baseRow], [conflictCandidate], categories);
if (plan2.updates.length !== 1 || !plan2.updates[0].conflict) throw new Error('expected a conflict');

// Case 3: no candidate at all -> insert.
const plan3 = buildReconciliationPlan([baseRow], [], categories);
if (plan3.inserts.length !== 1 || plan3.updates.length !== 0) throw new Error('expected 1 insert, 0 updates');
if (plan3.inserts[0].bankName !== 'HDFC') throw new Error('insert bankName fallback mismatch');

// Case 4: unmapped category name is collected, and categoryRaw is carried through.
const unmappedRow: AxioRow = { ...baseRow, categoryRaw: 'DAIRY POULTRY MEAT' };
const plan4 = buildReconciliationPlan([unmappedRow], [], categories);
if (!plan4.unmappedCategoryNames.includes('DAIRY POULTRY MEAT')) throw new Error('expected unmapped category collected');
if (plan4.inserts[0].categoryId !== null) throw new Error('expected null categoryId for unmapped row');
if (plan4.inserts[0].categoryRaw !== 'DAIRY POULTRY MEAT') throw new Error('expected categoryRaw carried through');

// Case 5: two candidates same day/amount/type — nearer timestamp wins.
const far: ReconciliationCandidate = { ...noConflictCandidate, id: 201, timestamp: new Date(2026, 7, 1, 8, 0).getTime() };
const near: ReconciliationCandidate = { ...noConflictCandidate, id: 202, timestamp: new Date(2026, 7, 1, 10, 44).getTime() };
const plan5 = buildReconciliationPlan([baseRow], [far, near], categories);
if (plan5.updates[0].txId !== 202) throw new Error('expected nearer timestamp (202) to win');

console.log('ALL CHECKS PASSED');
```

- [ ] **Step 2: Run it to confirm it fails (module doesn't exist yet)**

Run: `npx tsx <path-to-script>` — expect a module-resolution failure.

- [ ] **Step 3: Implement the matcher**

```ts
// apps/raqm/src/services/imports/reconcile.ts
import type { AxioRow } from './axioCsv';

export interface ReconciliationCandidate {
  id: number;
  amount: number;
  type: 'expense' | 'income';
  timestamp: number;
  categoryId: number | null;
  notes: string | null;
  tags: string[];
  last4: string | null;
}

export interface PlannedUpdate {
  txId: number;
  categoryId: number | null;
  categoryRaw: string | null;
  notes: string | null;
  tags: string[];
  conflict: boolean;
}

export interface PlannedInsert {
  amount: number;
  type: 'expense' | 'income';
  timestamp: number;
  merchant: string | null;
  bankName: string;
  categoryId: number | null;
  categoryRaw: string | null;
  notes: string | null;
  tags: string[];
}

export interface ReconciliationPlan {
  updates: PlannedUpdate[];
  inserts: PlannedInsert[];
  skippedRows: number;
  unmappedCategoryNames: string[];
}

function isSameCalendarDay(a: number, b: number): boolean {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function findBestMatch(row: AxioRow, candidates: ReconciliationCandidate[]): ReconciliationCandidate | null {
  let best: ReconciliationCandidate | null = null;
  let bestDelta = Infinity;
  for (const c of candidates) {
    if (c.last4 !== row.last4) continue;
    if (c.amount !== row.amount) continue;
    if (c.type !== row.type) continue;
    if (!isSameCalendarDay(c.timestamp, row.timestamp)) continue;
    const delta = Math.abs(c.timestamp - row.timestamp);
    if (delta < bestDelta) {
      best = c;
      bestDelta = delta;
    }
  }
  return best;
}

function resolveCategoryId(categoryRaw: string | null, categories: { id: number; name: string }[]): number | null {
  if (!categoryRaw) return null;
  const lower = categoryRaw.toLowerCase();
  const match = categories.find((c) => c.name.toLowerCase() === lower);
  return match ? match.id : null;
}

export function buildReconciliationPlan(
  rows: AxioRow[],
  candidates: ReconciliationCandidate[],
  categories: { id: number; name: string }[],
): ReconciliationPlan {
  // Once a candidate is claimed by one row, it can't also match a different row —
  // otherwise two rows with identical amount/day/type could both "match" the same
  // existing transaction.
  const claimed = new Set<number>();
  const updates: PlannedUpdate[] = [];
  const inserts: PlannedInsert[] = [];
  const unmappedCategoryNames = new Set<string>();

  for (const row of rows) {
    const categoryId = resolveCategoryId(row.categoryRaw, categories);
    if (row.categoryRaw && categoryId === null) unmappedCategoryNames.add(row.categoryRaw);

    const available = candidates.filter((c) => !claimed.has(c.id));
    const match = findBestMatch(row, available);

    if (match) {
      claimed.add(match.id);
      const conflict =
        (match.categoryId !== null && match.categoryId !== categoryId) ||
        (match.notes !== null && match.notes !== '' && match.notes !== row.note) ||
        (match.tags.length > 0 && JSON.stringify([...match.tags].sort()) !== JSON.stringify([...row.tags].sort()));
      updates.push({
        txId: match.id,
        categoryId,
        categoryRaw: row.categoryRaw,
        notes: row.note,
        tags: row.tags,
        conflict,
      });
    } else {
      inserts.push({
        amount: row.amount,
        type: row.type,
        timestamp: row.timestamp,
        merchant: row.place,
        bankName: row.bankAbbrev,
        categoryId,
        categoryRaw: row.categoryRaw,
        notes: row.note,
        tags: row.tags,
      });
    }
  }

  return {
    updates,
    inserts,
    skippedRows: 0,
    unmappedCategoryNames: [...unmappedCategoryNames],
  };
}
```

- [ ] **Step 4: Run the verification script again**

Run: `npx tsx <path-to-script>`
Expected: `ALL CHECKS PASSED`.

- [ ] **Step 5: Typecheck and delete the scratch script**

Run: `cd apps/raqm && npx tsc --noEmit` — expect no new errors. Delete the scratch script.

- [ ] **Step 6: Commit**

```bash
git add apps/raqm/src/services/imports/reconcile.ts
git commit -m "feat(raqm): add reconciliation matcher for Axio import"
```

---

### Task 3: Database layer — read candidates, apply plan

**Files:**
- Modify: `apps/raqm/src/db/database.ts`

**Interfaces:**
- Consumes: `ReconciliationCandidate`, `PlannedUpdate`, `PlannedInsert` from Task 2 (`reconcile.ts`); existing `updateTx(id, patch: TxPatch)`, `insertTx(input: NewTxInput)`, `getDb()`, `getCategories()`, the private `parseTags` helper already defined in this file.
- Produces:
  - `getReconciliationCandidates(): Promise<ReconciliationCandidate[]>` — consumed by Task 6.
  - `applyImportReconciliation(input: ApplyReconciliationInput): Promise<ApplyReconciliationResult>` — consumed by Task 6.

- [ ] **Step 1: Add `getReconciliationCandidates`**

Add near `getScannedIdentitiesInWindow` (around line 609) in `apps/raqm/src/db/database.ts`. Add the import at the top of the file alongside the other local imports:

```ts
import type { ReconciliationCandidate, PlannedUpdate, PlannedInsert } from '../services/imports/reconcile';
```

```ts
/**
 * Lean read of every live (non-deleted) transaction for Axio-import matching — only the
 * columns `buildReconciliationPlan` needs, not the full `TxRecord` shape (thousands of rows
 * would otherwise mean thousands of unused joined/parsed fields).
 */
export async function getReconciliationCandidates(): Promise<ReconciliationCandidate[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    id: number;
    amount: number;
    type: string;
    timestamp: number;
    category_id: number | null;
    notes: string | null;
    tags: string | null;
    accountLast4: string | null;
  }>(
    `SELECT id, amount, type, timestamp, category_id, notes, tags, accountLast4
     FROM transactions
     WHERE deleted_at IS NULL AND type IN ('expense', 'income')`,
  );
  return rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    type: r.type as 'expense' | 'income',
    timestamp: r.timestamp,
    categoryId: r.category_id,
    notes: r.notes,
    tags: parseTags(r.tags),
    last4: r.accountLast4,
  }));
}
```

- [ ] **Step 2: Add `applyImportReconciliation`**

Add directly below `insertCsvRows` (after line ~1465):

```ts
export interface ApplyReconciliationInput {
  updates: PlannedUpdate[];
  inserts: PlannedInsert[];
  conflictPolicy: 'overwrite' | 'skip';
}

export interface ApplyReconciliationResult {
  updated: number;
  inserted: number;
}

/**
 * Writes a reconciliation plan (see reconcile.ts's buildReconciliationPlan) to SQLite —
 * matched rows via updateTx, unmatched rows via insertTx, all in one transaction. Conflicting
 * matches (the existing tx already had a category/notes/tags that differ) are skipped
 * entirely when conflictPolicy is 'skip', or applied like any other update when 'overwrite' —
 * this is a single all-or-nothing choice for the whole import, not resolved per row.
 */
export async function applyImportReconciliation(
  input: ApplyReconciliationInput,
): Promise<ApplyReconciliationResult> {
  const database = await getDb();
  let updated = 0;
  let inserted = 0;

  await database.runAsync('BEGIN');
  try {
    // Sequential, not Promise.all — see insertParsedTxs/insertCsvRows for why a batch of
    // concurrent expo-sqlite writes crashes on large imports.
    for (const u of input.updates) {
      if (u.conflict && input.conflictPolicy === 'skip') continue;
      await updateTx(u.txId, { categoryId: u.categoryId, notes: u.notes, tags: u.tags });
      updated++;
    }
    for (const ins of input.inserts) {
      await insertTx({
        amount: ins.amount,
        type: ins.type === 'expense' ? TransactionType.EXPENSE : TransactionType.INCOME,
        merchant: ins.merchant,
        bankName: ins.bankName,
        timestamp: ins.timestamp,
        categoryId: ins.categoryId,
        notes: ins.notes,
        tags: ins.tags,
        isManual: true,
      });
      inserted++;
    }
    await database.runAsync('COMMIT');
  } catch (e) {
    await database.runAsync('ROLLBACK');
    throw e;
  }

  return { updated, inserted };
}
```

Check the top of `database.ts` for its existing `TransactionType` import (used elsewhere in the file, e.g. by `isDebitType`/`isCreditType`) — reuse it, don't add a duplicate import.

- [ ] **Step 3: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors. Fix any import-path or type mismatches (e.g. if `PlannedUpdate`'s `categoryId`/`notes`/`tags` types don't line up with `TxPatch`'s).

- [ ] **Step 4: Commit**

```bash
git add apps/raqm/src/db/database.ts
git commit -m "feat(raqm): add DB layer for Axio import reconciliation"
```

---

### Task 4: Navigation + ImportScreen (source picker)

**Files:**
- Modify: `apps/raqm/src/navigation/types.ts`
- Modify: `apps/raqm/src/navigation/MainNavigator.tsx`
- Modify: `apps/raqm/src/screens/main/MoreScreen.tsx`
- Create: `apps/raqm/src/screens/main/ImportScreen.tsx`

**Interfaces:**
- Consumes: `MainStackParamList`, existing `Stack.Screen` registration pattern (see `DeletedTransactions`/`Rules` entries in `MainNavigator.tsx:105-107`).
- Produces: `Import` and `AxioImport` routes, navigable via `navigation.navigate('Import')` — consumed by Task 5/6 and by `MoreScreen`'s existing "Import" tile.

- [ ] **Step 1: Add routes to `MainStackParamList`**

In `apps/raqm/src/navigation/types.ts`, add two entries to `MainStackParamList` (near `DeletedTransactions: undefined;`):

```ts
  Import: undefined;
  AxioImport: undefined;
```

- [ ] **Step 2: Register the screens in the stack navigator**

First, check `apps/raqm/src/screens/main/DeletedTransactionsScreen.tsx` for its exact header component/props convention (whatever it uses for a back-button header) — use that same convention in Steps 3 (this task) and in Task 5/6, rather than guessing prop names.

In `apps/raqm/src/navigation/MainNavigator.tsx`, add imports alongside the existing `DeletedTransactionsScreen` import:

```ts
import { ImportScreen } from '../screens/main/ImportScreen';
import { AxioImportScreen } from '../screens/main/AxioImportScreen';
```

And register both screens next to the `DeletedTransactions`/`Rules` entries (~line 105-107):

```tsx
<Stack.Screen name="Import" component={ImportScreen} options={{ animation: 'slide_from_right' }} />
<Stack.Screen name="AxioImport" component={AxioImportScreen} options={{ animation: 'slide_from_right' }} />
```

(`AxioImportScreen` is created in Task 5 — this line will not typecheck until then; that's expected mid-plan and is fixed by Task 5, not a blocker for finishing this task's own steps.)

- [ ] **Step 3: Build `ImportScreen`**

Create `apps/raqm/src/screens/main/ImportScreen.tsx`, using the exact header convention found in Step 2, NativeWind tokens confirmed to exist in `apps/raqm/tailwind.config.js` (substitute the closest real token names if `bgBase`/`bgSurfaceRaised`/`borderSubtle`/`inkHeadline`/`inkMuted` below don't match exactly — check the config before finalizing), and this structure:

```tsx
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

interface SourceOption {
  key: 'axio' | 'pennywise' | 'bank-pdf' | 'upi-pdf';
  title: string;
  subtitle: string;
  enabled: boolean;
}

const SOURCES: SourceOption[] = [
  { key: 'axio', title: 'Axio CSV', subtitle: 'Import categories, notes, and tags from an Axio expense report', enabled: true },
  { key: 'pennywise', title: 'Pennywise', subtitle: 'Coming soon', enabled: false },
  { key: 'bank-pdf', title: 'Bank statement (PDF)', subtitle: 'Coming soon', enabled: false },
  { key: 'upi-pdf', title: 'GPay / PhonePe (PDF)', subtitle: 'Coming soon', enabled: false },
];

export function ImportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <View className="flex-1 bg-bgBase">
      {/* Replace with DeletedTransactionsScreen's actual header component/props */}
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 32 }}>
        {SOURCES.map((source) => (
          <TouchableOpacity
            key={source.key}
            disabled={!source.enabled}
            onPress={() => navigation.navigate('AxioImport')}
            className={`mb-3 rounded-2xl border p-4 ${
              source.enabled ? 'border-borderSubtle bg-bgSurfaceRaised' : 'border-borderSubtle bg-bgSurfaceRaised opacity-50'
            }`}
          >
            <Text className="font-inter text-base font-semibold text-inkHeadline">{source.title}</Text>
            <Text className="mt-1 font-inter text-sm text-inkMuted">{source.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
```

- [ ] **Step 4: Repoint the More screen's Import tile**

In `apps/raqm/src/screens/main/MoreScreen.tsx`, change the `import-csv` entry (~line 276) from calling `handleImportCsv` to navigating to the new screen:

```ts
{ key: 'import-csv', label: 'Import', Icon: ImportIcon, onPress: () => navigation.navigate('Import') },
```

Leave `handleImportCsv`, the `parseImportCsv` import, and the `csvImporting` state variable in place in the file (unused by this new wiring, but the spec keeps the generic importer's code intact) — do not delete them in this task.

- [ ] **Step 5: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: one remaining error only — `AxioImportScreen` module not found (resolved in Task 5). If any other errors appear (check `apps/raqm/tsconfig.json` for `noUnusedLocals` before assuming an "unused variable" report is one of them), fix only those genuinely new errors.

- [ ] **Step 6: Commit**

```bash
git add apps/raqm/src/navigation/types.ts apps/raqm/src/navigation/MainNavigator.tsx apps/raqm/src/screens/main/MoreScreen.tsx apps/raqm/src/screens/main/ImportScreen.tsx
git commit -m "feat(raqm): add Import screen with source picker"
```

---

### Task 5: AxioImportScreen — pick file, parse, resolve unmapped categories

**Files:**
- Create: `apps/raqm/src/screens/main/AxioImportScreen.tsx`

**Interfaces:**
- Consumes: `parseAxioCsv` (Task 1), `buildReconciliationPlan`, `ReconciliationPlan` (Task 2), `getReconciliationCandidates`, `getCategories` (Task 3/existing `database.ts`), `File.pickFileAsync` (from `expo-file-system`, same call already used in `MoreScreen.tsx`'s `handleImportCsv` — copy that exact usage, including how it reads `pick.result.text()`, rather than re-guessing the shape).
- Produces: the `AxioImportScreen` component registered in Task 4; internal state consumed by Task 6 (preview/confirm step, added in the same file/component).

This task builds the screen through the "pick file → parse → resolve unmapped categories" steps, ending in an internal state ready for Task 6's preview/confirm UI. Use a single internal state machine (`'idle' | 'unmapped-categories' | 'preview' | 'importing' | 'done'`) rather than separate screens/routes, per the design doc.

- [ ] **Step 1: Scaffold the screen with file-pick and parse wiring**

```tsx
// apps/raqm/src/screens/main/AxioImportScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { File } from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';
import { parseAxioCsv } from '../../services/imports/axioCsv';
import { buildReconciliationPlan, type ReconciliationPlan } from '../../services/imports/reconcile';
import { getReconciliationCandidates, getCategories, applyImportReconciliation, type Category } from '../../db/database';
import { useTxStore } from '../../store/txStore';

type Step = 'idle' | 'unmapped-categories' | 'preview' | 'importing' | 'done';

export function AxioImportScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [step, setStep] = useState<Step>('idle');
  const [plan, setPlan] = useState<ReconciliationPlan | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, number | null>>({});
  const [conflictPolicy, setConflictPolicy] = useState<'overwrite' | 'skip'>('skip');
  const [busy, setBusy] = useState(false);

  const handlePickFile = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const pick = await File.pickFileAsync({
        mimeTypes: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain'],
      });
      if (pick.canceled || !pick.result) return;

      const text = await pick.result.text();
      const { rows, skipped } = parseAxioCsv(text);
      if (rows.length === 0) {
        Alert.alert('Nothing to import', 'No Axio transaction rows were found in that file.');
        return;
      }

      const [candidates, cats] = await Promise.all([getReconciliationCandidates(), getCategories()]);
      const builtPlan = buildReconciliationPlan(rows, candidates, cats);
      const finalPlan: ReconciliationPlan = { ...builtPlan, skippedRows: skipped };
      setPlan(finalPlan);
      setCategories(cats);
      setStep(finalPlan.unmappedCategoryNames.length > 0 ? 'unmapped-categories' : 'preview');
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'idle') {
    return (
      <View className="flex-1 bg-bgBase">
        {/* header — match ImportScreen.tsx's convention */}
        <View className="flex-1 items-center justify-center px-6">
          <Text className="mb-4 text-center font-inter text-sm text-inkMuted">
            Pick an Axio expense report CSV to match against your existing transactions.
          </Text>
          <TouchableOpacity disabled={busy} onPress={handlePickFile} className="rounded-xl bg-primary px-6 py-3">
            <Text className="font-inter font-semibold text-bgBase">{busy ? 'Reading file…' : 'Choose file'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // 'unmapped-categories', 'preview', 'importing', 'done' states are handled in Task 6.
  return null;
}
```

Verify `getCategories()`'s exported return type is named `Category` (confirmed in the spec's research: `interface Category { id: number; name: string; emoji: string; isCustom: boolean; direction: ... }` around line 468 of `database.ts`) — import it as a type from `../../db/database` as shown.

- [ ] **Step 2: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors related to this file (the earlier "AxioImportScreen module not found" error from Task 4 should now be gone).

- [ ] **Step 3: Commit**

```bash
git add apps/raqm/src/screens/main/AxioImportScreen.tsx
git commit -m "feat(raqm): scaffold Axio import screen with file pick and parsing"
```

---

### Task 6: AxioImportScreen — unmapped-category review, preview/confirm, apply

**Files:**
- Modify: `apps/raqm/src/screens/main/AxioImportScreen.tsx`

**Interfaces:**
- Consumes: everything from Task 5's scaffold (including its `step`/`plan`/`categories`/`categoryOverrides`/`conflictPolicy`/`navigation` state), plus `applyImportReconciliation` (Task 3).
- Produces: the finished end-to-end flow — nothing downstream depends on this task's internals beyond the screen being reachable and functional.

- [ ] **Step 1: Add the unmapped-category review step**

Extend the component from Task 5. Since `CategorySheet` in `TransactionDetailScreen.tsx` is a private, non-exported component, build a small local list here instead of extracting/exporting it (avoids touching a screen out of this feature's scope). Insert this block right before the final `return null;` in the component:

```tsx
  if (step === 'unmapped-categories' && plan) {
    return (
      <View className="flex-1 bg-bgBase">
        {/* header — match ImportScreen.tsx's convention */}
        <View className="flex-1 px-4 pt-4">
          <Text className="mb-4 font-inter text-sm text-inkMuted">
            These Axio categories don't match any of your existing categories. Pick one to use, or leave blank.
          </Text>
          {plan.unmappedCategoryNames.map((rawName) => (
            <View key={rawName} className="mb-4">
              <Text className="mb-2 font-inter text-sm font-semibold text-inkHeadline">{rawName}</Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setCategoryOverrides((prev) => ({ ...prev, [rawName]: null }))}
                  className={`rounded-lg border px-3 py-2 ${
                    categoryOverrides[rawName] === null ? 'border-primary bg-primary/10' : 'border-borderSubtle'
                  }`}
                >
                  <Text className="font-inter text-xs text-inkHeadline">Leave blank</Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategoryOverrides((prev) => ({ ...prev, [rawName]: cat.id }))}
                    className={`rounded-lg border px-3 py-2 ${
                      categoryOverrides[rawName] === cat.id ? 'border-primary bg-primary/10' : 'border-borderSubtle'
                    }`}
                  >
                    <Text className="font-inter text-xs text-inkHeadline">{cat.emoji} {cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
          <TouchableOpacity onPress={() => setStep('preview')} className="mt-2 rounded-xl bg-primary px-6 py-3">
            <Text className="text-center font-inter font-semibold text-bgBase">Continue</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
```

`categoryOverrides` maps a raw Axio category name to a chosen category id (or `null` for "leave blank"). It is read fresh from this in-memory state each time `resolvePlanWithOverrides` (Step 2) runs — it is never persisted to SQLite or anywhere else, matching the approved spec.

- [ ] **Step 2: Add a plain function to apply `categoryOverrides` to the plan**

Add this as a module-level function (not a hook, not state) above the component, since it's pure and doesn't need to close over component state — pass everything it needs as arguments:

```tsx
function resolvePlanWithOverrides(
  basePlan: ReconciliationPlan,
  overrides: Record<string, number | null>,
): ReconciliationPlan {
  if (Object.keys(overrides).length === 0) return basePlan;
  return {
    ...basePlan,
    updates: basePlan.updates.map((u) =>
      u.categoryId === null && u.categoryRaw && u.categoryRaw in overrides
        ? { ...u, categoryId: overrides[u.categoryRaw] }
        : u,
    ),
    inserts: basePlan.inserts.map((ins) =>
      ins.categoryId === null && ins.categoryRaw && ins.categoryRaw in overrides
        ? { ...ins, categoryId: overrides[ins.categoryRaw] }
        : ins,
    ),
  };
}
```

- [ ] **Step 3: Add the preview/confirm step**

Insert this block after the `unmapped-categories` block from Step 1, still before the final `return null;`:

```tsx
  if (step === 'preview' && plan) {
    const resolved = resolvePlanWithOverrides(plan, categoryOverrides);
    const conflictCount = resolved.updates.filter((u) => u.conflict).length;
    const cleanUpdateCount = resolved.updates.length - conflictCount;

    const handleConfirm = async () => {
      setStep('importing');
      try {
        const { updated, inserted } = await applyImportReconciliation({
          updates: resolved.updates,
          inserts: resolved.inserts,
          conflictPolicy,
        });
        await useTxStore.getState().refresh();
        Alert.alert(
          'Import complete',
          `${updated} transaction${updated === 1 ? '' : 's'} updated, ${inserted} new transaction${inserted === 1 ? '' : 's'} added.`,
        );
        navigation.goBack();
      } catch (e) {
        Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
        setStep('preview');
      }
    };

    return (
      <View className="flex-1 bg-bgBase">
        {/* header — match ImportScreen.tsx's convention */}
        <View className="flex-1 px-4 pt-4">
          <Text className="mb-2 font-inter text-sm text-inkHeadline">
            {cleanUpdateCount} transaction{cleanUpdateCount === 1 ? '' : 's'} will be updated
          </Text>
          <Text className="mb-2 font-inter text-sm text-inkHeadline">
            {resolved.inserts.length} new transaction{resolved.inserts.length === 1 ? '' : 's'} will be created
          </Text>
          {resolved.skippedRows > 0 && (
            <Text className="mb-2 font-inter text-sm text-inkMuted">
              {resolved.skippedRows} row{resolved.skippedRows === 1 ? '' : 's'} skipped (unparseable)
            </Text>
          )}
          {conflictCount > 0 && (
            <View className="mt-2">
              <Text className="mb-2 font-inter text-sm text-inkHeadline">
                {conflictCount} of those already have a category, note, or tags set. What should happen to them?
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setConflictPolicy('overwrite')}
                  className={`rounded-lg border px-3 py-2 ${conflictPolicy === 'overwrite' ? 'border-primary bg-primary/10' : 'border-borderSubtle'}`}
                >
                  <Text className="font-inter text-xs text-inkHeadline">Overwrite</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setConflictPolicy('skip')}
                  className={`rounded-lg border px-3 py-2 ${conflictPolicy === 'skip' ? 'border-primary bg-primary/10' : 'border-borderSubtle'}`}
                >
                  <Text className="font-inter text-xs text-inkHeadline">Skip conflicts</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <TouchableOpacity onPress={handleConfirm} className="mt-6 rounded-xl bg-primary px-6 py-3">
            <Text className="text-center font-inter font-semibold text-bgBase">Import</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 'importing') {
    return (
      <View className="flex-1 items-center justify-center bg-bgBase">
        <Text className="font-inter text-sm text-inkMuted">Importing…</Text>
      </View>
    );
  }
```

`navigation.goBack()` is called directly after `Alert.alert(...)`, not inside a callback — `Alert.alert` doesn't block execution, so this returns the user to `ImportScreen`/`More` right away while the alert is still visible, matching how `MoreScreen.tsx`'s existing handlers behave. Verify this against `MoreScreen.tsx`'s actual `handleImportCsv`/rescan handlers and adjust if they use a different convention (e.g. an alert button's `onPress` callback) — copy whichever pattern is actually there rather than assuming.

- [ ] **Step 4: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors. In particular confirm:
- `ApplyReconciliationInput`'s `updates`/`inserts` fields accept `PlannedUpdate[]`/`PlannedInsert[]` as-is (they should — `resolvePlanWithOverrides` only ever changes `categoryId`, never the shape).
- The `Category` type import in Task 5 (`{ id, name, emoji, ... }`) matches how `cat.emoji`/`cat.name` are used in Step 1 here.

- [ ] **Step 5: Manual review checklist (no device available this session)**

Since there's no device to verify on, do a careful read-through instead:
- Confirm `getCategories()` (existing function) returns objects with `id`, `name`, `emoji` — used directly in Step 1's category-chip list.
- Confirm `File.pickFileAsync`'s return shape (`{ canceled, result }` where `result.text()` exists) matches `MoreScreen.tsx`'s existing `handleImportCsv` usage exactly (Task 5 already copies this — just double check nothing drifted).
- Confirm the `conflict` flag computed in `reconcile.ts`'s `buildReconciliationPlan` (Task 2) correctly treats an existing transaction with a category/notes/tags that are *identical* to the CSV's as non-conflicting (already handled by the `!== categoryId`/`!== row.note`/sorted-JSON-tags comparisons in that function) — re-read Task 2's implementation if unsure, don't re-derive it here.

- [ ] **Step 6: Commit**

```bash
git add apps/raqm/src/screens/main/AxioImportScreen.tsx
git commit -m "feat(raqm): complete Axio import review, conflict resolution, and apply flow"
```
