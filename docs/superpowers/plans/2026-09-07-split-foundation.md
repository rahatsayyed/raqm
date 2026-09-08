# Split with Friends — Foundation (Schema + Data Layer) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the SQLite schema and CRUD data layer for Split with Friends — circles (saved friend lists), splits, and participants — with no UI yet. This is the first of several plan files for this feature; later plans (creation UI, transaction integration, reminders/matching) all build on the functions this plan produces.

**Architecture:** Everything lives in `src/db/database.ts`, following the project's existing single-data-layer convention (no new files) — one migration (v13) adds four tables, plus plain async CRUD functions matching the shape already used for `grocery_lists`/`grocery_items` (the closest existing parent/child precedent). No soft-delete: only `transactions` uses `deleted_at` in this codebase: every other entity (including `grocery_lists`/`grocery_items`) hard-deletes, and splits/circles follow that closer precedent, not the transactions-specific one.

**Tech Stack:** expo-sqlite (async API), TypeScript.

**Spec:** `docs/superpowers/specs/2026-09-07-split-with-friends-design.md`

## Global Constraints

- **Work dir:** all paths below are relative to `/Users/copods/Documents/Projects/personal/Raqm/apps/raqm`. Branch: `build/v0-mvp`.
- **Typecheck gate.** `cd apps/raqm && npx tsc --noEmit` — must be run from `apps/raqm` (root tsconfig errors with TS6305). Clean typecheck is the completion gate for every task in this plan.
- **No test runner.** This plan adds SQLite-backed functions with no UI yet, so they cannot be meaningfully exercised end-to-end until a later plan wires a screen to them — each task's gate here is `tsc --noEmit` only; functional device verification happens once Plan 2 (creation UI) calls these functions.
- **expo-sqlite async API only.** Every multi-statement change uses explicit `await database.runAsync('BEGIN')` / `COMMIT`, with `ROLLBACK` + re-throw in a `catch` — never `withTransactionAsync` (nested-transaction crash risk).
- **`getDb()` caches the open+migrate promise, not the handle** — do not add a second SQLite connection anywhere in this plan.
- **No universal soft-delete.** Only `transactions.deleted_at` exists. `grocery_lists`/`grocery_items`/`budgets`/`reminders` all hard-delete via `DELETE FROM ... WHERE id = ?`. New tables in this plan (`split_circles`, `split_circle_members`, `splits`, `split_participants`) hard-delete the same way — no `deleted_at` column.
- **Migration numbering.** Current max version is **12** (confirmed live in `schema_migrations`). This plan adds **v13**.
- **Every migration is one `BEGIN`/try/`COMMIT` block**, `ROLLBACK` + re-throw in `catch` — copy the v12 block's exact shape (quoted in Task 1).
- **Git.** Never commit or push without explicit user confirmation. Commit messages are conventional (`feat(raqm): …`). Never append a `Claude-Session:` trailer to any commit.

## File Structure

**Modified only — no new files:**

| File | Change |
|---|---|
| `src/db/database.ts` | v13 migration (4 new tables + indexes); types `SplitCircle`, `SplitCircleMember`, `Split`, `SplitParticipant`; CRUD functions for all four (see Interfaces in each task). |

---

### Task 1: Migration v13 — schema for circles, splits, participants

**Files:**
- Modify: `apps/raqm/src/db/database.ts` (add a new `if (current < 13)` block immediately after the existing v12 block, ~line 393)
- Test: none (schema-only; gate is `tsc --noEmit` plus a successful app boot, verified manually once Plan 2 exercises it)

**Interfaces:**
- Consumes: nothing new — this task only adds SQL executed by the existing migration runner.
- Produces: tables `split_circles`, `split_circle_members`, `splits`, `split_participants`, and their indexes — consumed by Tasks 2 and 3 below, and by every later plan.

- [ ] **Step 1: Add the v13 migration block**

In `apps/raqm/src/db/database.ts`, immediately after the closing `}` of the `if (current < 12)` block (the one ending `INSERT INTO schema_migrations VALUES (12)`), add:

```ts
  if (current < 13) {
    await database.runAsync(`BEGIN`);
    try {
      // Split with Friends: circles (saved friend lists), splits, and participants.
      // No deleted_at here — this codebase's soft-delete convention is specific to
      // `transactions`; every other entity table (grocery_lists, grocery_items,
      // budgets, reminders) hard-deletes, and these follow that closer precedent.
      await database.runAsync(
        `CREATE TABLE IF NOT EXISTS split_circles (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          created_at INTEGER NOT NULL
        )`,
      );
      await database.runAsync(
        `CREATE TABLE IF NOT EXISTS split_circle_members (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          circle_id INTEGER NOT NULL REFERENCES split_circles(id),
          name TEXT NOT NULL,
          phone_number TEXT,
          created_at INTEGER NOT NULL
        )`,
      );
      await database.runAsync(
        `CREATE INDEX IF NOT EXISTS idx_split_circle_members_circle_id
         ON split_circle_members(circle_id)`,
      );
      // status: 'open' | 'settled'. source_tx_id is set when a split is created via
      // the "Split with Friends" action on an existing transaction (added in a later
      // plan); creator_upi_id is a snapshot of the user's Settings UPI ID at creation
      // time, so a later change to that setting doesn't rewrite links already shared.
      await database.runAsync(
        `CREATE TABLE IF NOT EXISTS splits (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          total_amount REAL NOT NULL,
          source_tx_id INTEGER REFERENCES transactions(id),
          creator_upi_id TEXT,
          status TEXT NOT NULL DEFAULT 'open',
          created_at INTEGER NOT NULL
        )`,
      );
      // status: 'unpaid' | 'attention' | 'settled'. 'attention' means the payment-match
      // detection job (a later plan) found a plausible matching incoming transaction
      // that needs the user's confirmation — it is never set to 'settled' automatically.
      await database.runAsync(
        `CREATE TABLE IF NOT EXISTS split_participants (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          split_id INTEGER NOT NULL REFERENCES splits(id),
          name TEXT NOT NULL,
          phone_number TEXT,
          share_amount REAL NOT NULL,
          status TEXT NOT NULL DEFAULT 'unpaid',
          matched_tx_id INTEGER REFERENCES transactions(id),
          created_at INTEGER NOT NULL
        )`,
      );
      await database.runAsync(
        `CREATE INDEX IF NOT EXISTS idx_split_participants_split_id
         ON split_participants(split_id)`,
      );
      // The payment-match job (a later plan) scans unpaid participants by status —
      // keep that an index lookup, not a full-table scan, matching CLAUDE.md's
      // amount-bucketed / ~O(n) requirement for detection jobs.
      await database.runAsync(
        `CREATE INDEX IF NOT EXISTS idx_split_participants_status
         ON split_participants(status)`,
      );
      await database.runAsync(`INSERT INTO schema_migrations VALUES (13)`);
      await database.runAsync(`COMMIT`);
    } catch (e) {
      await database.runAsync(`ROLLBACK`);
      throw e;
    }
  }
```

- [ ] **Step 2: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no new errors (this step is pure SQL inside an existing function — nothing to typecheck yet beyond syntax validity of the surrounding TS).

- [ ] **Step 3: Manual smoke check**

Run `npm run raqm:android` (or reload Metro if already installed), open the app. Expected: app boots normally, no migration crash. (A crash here means a syntax error in the SQL block — check the Metro/logcat error message, which will name the failing statement.)

- [ ] **Step 4: Commit**

```bash
git add apps/raqm/src/db/database.ts
git commit -m "feat(raqm): add Split with Friends schema (migration v13)"
```

---

### Task 2: Circles CRUD

**Files:**
- Modify: `apps/raqm/src/db/database.ts` (add types + functions near the existing grocery-list functions, for locality with the closest precedent)
- Test: none (gate is `tsc --noEmit`; functional check deferred to Plan 2's Circles screen)

**Interfaces:**
- Consumes: `getDb()` (existing, private to `database.ts`).
- Produces (all exported from `src/db/database.ts`, consumed by later plans):
  - `type SplitCircle = { id: number; name: string; createdAt: number }`
  - `type SplitCircleMember = { id: number; circleId: number; name: string; phoneNumber: string | null; createdAt: number }`
  - `getSplitCircles(): Promise<SplitCircle[]>`
  - `addSplitCircle(name: string): Promise<number>`
  - `renameSplitCircle(id: number, name: string): Promise<void>`
  - `deleteSplitCircle(id: number): Promise<void>` (also deletes its members)
  - `getSplitCircleMembers(circleId: number): Promise<SplitCircleMember[]>`
  - `addSplitCircleMember(circleId: number, name: string, phoneNumber: string | null): Promise<number>`
  - `deleteSplitCircleMember(id: number): Promise<void>`

- [ ] **Step 1: Add the types and row-mapping helpers**

```ts
export type SplitCircle = {
  id: number;
  name: string;
  createdAt: number;
};

export type SplitCircleMember = {
  id: number;
  circleId: number;
  name: string;
  phoneNumber: string | null;
  createdAt: number;
};

function rowToSplitCircle(row: Record<string, unknown>): SplitCircle {
  return {
    id: row.id as number,
    name: row.name as string,
    createdAt: row.created_at as number,
  };
}

function rowToSplitCircleMember(row: Record<string, unknown>): SplitCircleMember {
  return {
    id: row.id as number,
    circleId: row.circle_id as number,
    name: row.name as string,
    phoneNumber: (row.phone_number as string | null) ?? null,
    createdAt: row.created_at as number,
  };
}
```

- [ ] **Step 2: Add the CRUD functions**

```ts
export async function getSplitCircles(): Promise<SplitCircle[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM split_circles ORDER BY created_at DESC`,
  );
  return rows.map(rowToSplitCircle);
}

export async function addSplitCircle(name: string): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO split_circles (name, created_at) VALUES (?, ?)`,
    name,
    Date.now(),
  );
  return result.lastInsertRowId;
}

export async function renameSplitCircle(id: number, name: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(`UPDATE split_circles SET name = ? WHERE id = ?`, name, id);
}

export async function deleteSplitCircle(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM split_circle_members WHERE circle_id = ?`, id);
  await database.runAsync(`DELETE FROM split_circles WHERE id = ?`, id);
}

export async function getSplitCircleMembers(circleId: number): Promise<SplitCircleMember[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM split_circle_members WHERE circle_id = ? ORDER BY created_at ASC`,
    circleId,
  );
  return rows.map(rowToSplitCircleMember);
}

export async function addSplitCircleMember(
  circleId: number,
  name: string,
  phoneNumber: string | null,
): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO split_circle_members (circle_id, name, phone_number, created_at) VALUES (?, ?, ?, ?)`,
    circleId,
    name,
    phoneNumber,
    Date.now(),
  );
  return result.lastInsertRowId;
}

export async function deleteSplitCircleMember(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM split_circle_members WHERE id = ?`, id);
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/raqm/src/db/database.ts
git commit -m "feat(raqm): add Circles CRUD for Split with Friends"
```

---

### Task 3: Splits + participants CRUD

**Files:**
- Modify: `apps/raqm/src/db/database.ts`
- Test: none (gate is `tsc --noEmit`; functional check deferred to Plan 2)

**Interfaces:**
- Consumes: `getDb()`.
- Produces (consumed by every later plan):
  - `type Split = { id: number; title: string; totalAmount: number; sourceTxId: number | null; creatorUpiId: string | null; status: 'open' | 'settled'; createdAt: number }`
  - `type SplitParticipant = { id: number; splitId: number; name: string; phoneNumber: string | null; shareAmount: number; status: 'unpaid' | 'attention' | 'settled'; matchedTxId: number | null; createdAt: number }`
  - `getSplits(): Promise<Split[]>`
  - `getSplit(id: number): Promise<Split | null>`
  - `addSplit(input: { title: string; totalAmount: number; sourceTxId: number | null; creatorUpiId: string | null }): Promise<number>`
  - `deleteSplit(id: number): Promise<void>` (also deletes its participants)
  - `getSplitParticipants(splitId: number): Promise<SplitParticipant[]>`
  - `addSplitParticipant(splitId: number, input: { name: string; phoneNumber: string | null; shareAmount: number }): Promise<number>`
  - `deleteSplitParticipant(id: number): Promise<void>`
  - `setSplitParticipantStatus(id: number, status: 'unpaid' | 'attention' | 'settled', matchedTxId: number | null): Promise<void>` — also recomputes and writes the parent split's `status` (see Step 2).

- [ ] **Step 1: Add the types, row mappers, and read/write functions**

```ts
export type Split = {
  id: number;
  title: string;
  totalAmount: number;
  sourceTxId: number | null;
  creatorUpiId: string | null;
  status: 'open' | 'settled';
  createdAt: number;
};

export type SplitParticipant = {
  id: number;
  splitId: number;
  name: string;
  phoneNumber: string | null;
  shareAmount: number;
  status: 'unpaid' | 'attention' | 'settled';
  matchedTxId: number | null;
  createdAt: number;
};

function rowToSplit(row: Record<string, unknown>): Split {
  return {
    id: row.id as number,
    title: row.title as string,
    totalAmount: row.total_amount as number,
    sourceTxId: (row.source_tx_id as number | null) ?? null,
    creatorUpiId: (row.creator_upi_id as string | null) ?? null,
    status: row.status as 'open' | 'settled',
    createdAt: row.created_at as number,
  };
}

function rowToSplitParticipant(row: Record<string, unknown>): SplitParticipant {
  return {
    id: row.id as number,
    splitId: row.split_id as number,
    name: row.name as string,
    phoneNumber: (row.phone_number as string | null) ?? null,
    shareAmount: row.share_amount as number,
    status: row.status as 'unpaid' | 'attention' | 'settled',
    matchedTxId: (row.matched_tx_id as number | null) ?? null,
    createdAt: row.created_at as number,
  };
}

export async function getSplits(): Promise<Split[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM splits ORDER BY (status = 'settled') ASC, created_at DESC`,
  );
  return rows.map(rowToSplit);
}

export async function getSplit(id: number): Promise<Split | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM splits WHERE id = ?`,
    id,
  );
  return row ? rowToSplit(row) : null;
}

export async function addSplit(input: {
  title: string;
  totalAmount: number;
  sourceTxId: number | null;
  creatorUpiId: string | null;
}): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO splits (title, total_amount, source_tx_id, creator_upi_id, status, created_at)
     VALUES (?, ?, ?, ?, 'open', ?)`,
    input.title,
    input.totalAmount,
    input.sourceTxId,
    input.creatorUpiId,
    Date.now(),
  );
  return result.lastInsertRowId;
}

export async function deleteSplit(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM split_participants WHERE split_id = ?`, id);
  await database.runAsync(`DELETE FROM splits WHERE id = ?`, id);
}

export async function getSplitParticipants(splitId: number): Promise<SplitParticipant[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM split_participants WHERE split_id = ? ORDER BY created_at ASC`,
    splitId,
  );
  return rows.map(rowToSplitParticipant);
}

export async function addSplitParticipant(
  splitId: number,
  input: { name: string; phoneNumber: string | null; shareAmount: number },
): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO split_participants (split_id, name, phone_number, share_amount, status, created_at)
     VALUES (?, ?, ?, ?, 'unpaid', ?)`,
    splitId,
    input.name,
    input.phoneNumber,
    input.shareAmount,
    Date.now(),
  );
  return result.lastInsertRowId;
}

export async function deleteSplitParticipant(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM split_participants WHERE id = ?`, id);
}
```

- [ ] **Step 2: Add `setSplitParticipantStatus`, recomputing the parent split's status**

A split's `status` is stored (not computed on every read) so list screens can filter/sort by it without a join — it must be kept in sync on every participant status change:

```ts
export async function setSplitParticipantStatus(
  id: number,
  status: 'unpaid' | 'attention' | 'settled',
  matchedTxId: number | null,
): Promise<void> {
  const database = await getDb();
  await database.runAsync(`BEGIN`);
  try {
    await database.runAsync(
      `UPDATE split_participants SET status = ?, matched_tx_id = ? WHERE id = ?`,
      status,
      matchedTxId,
      id,
    );
    const row = await database.getFirstAsync<{ split_id: number }>(
      `SELECT split_id FROM split_participants WHERE id = ?`,
      id,
    );
    if (row) {
      const remaining = await database.getFirstAsync<{ c: number }>(
        `SELECT COUNT(*) as c FROM split_participants WHERE split_id = ? AND status != 'settled'`,
        row.split_id,
      );
      const newStatus = (remaining?.c ?? 1) === 0 ? 'settled' : 'open';
      await database.runAsync(`UPDATE splits SET status = ? WHERE id = ?`, newStatus, row.split_id);
    }
    await database.runAsync(`COMMIT`);
  } catch (e) {
    await database.runAsync(`ROLLBACK`);
    throw e;
  }
}
```

- [ ] **Step 3: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/raqm/src/db/database.ts
git commit -m "feat(raqm): add Splits + participants CRUD for Split with Friends"
```

## Self-review notes

- Spec coverage: this plan covers the "Data model" section of the spec in full (all 4 tables), and the rounding-rule note (implemented later, in the creation-UI plan, as it's a UI-time calculation, not a schema concern). All other spec sections (Split tab, creation flow, UPI, WhatsApp, reminders, payment matching, Circles UI) are explicitly deferred to later plans, matching this plan's stated scope.
- Placeholder scan: no TBD/TODO markers; every step has real, runnable SQL/TypeScript.
- Type consistency: `Split.status`, `SplitParticipant.status`, and `SplitCircleMember.phoneNumber` are used identically (same literal union / nullability) across Tasks 2-3 and are the exact names later plans must import.
