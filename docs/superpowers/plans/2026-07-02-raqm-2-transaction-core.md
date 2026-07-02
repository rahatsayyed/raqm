# Raqm Plan 2: Transaction Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the transaction data layer and CRUD UI for Raqm: a real `TxRecord` schema-backed store (`txStore`), category system (15 defaults + subcategories + custom + rules), manual transaction add/edit, transaction detail with notes/tags/soft-delete-undo, and a category picker. Everything downstream (Plans 3–7) depends on the exact function signatures and types produced here.

**Architecture:** `apps/raqm` is an Expo SDK 56 / RN 0.85 Android-only app. SQLite (`expo-sqlite` v15 async API) is the single source of truth, wrapped by `src/db/database.ts`. A new zustand store `src/store/txStore.ts` becomes the main-app read/write layer for transactions (replacing `onboardingStore` for Dashboard/Transactions/Analytics — `onboardingStore` keeps owning the onboarding scan flow only). Screens are dumb consumers of the store.

**Tech Stack:** React Native 0.85, Expo SDK 56, TypeScript ~6.0.3, zustand 5, expo-sqlite ~56.0.5, `@rahatsayyed/bank-sms-parser`, `@react-native-community/datetimepicker` 9.1.0, React Navigation 7 (native-stack + bottom-tabs).

## Global Constraints

- **expo-sqlite async API only** — `runAsync` / `getAllAsync` / `getFirstAsync`. **Never** use `withTransactionAsync`; multi-statement transactions use explicit `runAsync('BEGIN')` / `COMMIT` / `ROLLBACK` inside try/catch (see existing `runMigrations` and `insertTransactions` for the pattern).
- **Dark theme tokens only** — import `Colors`, `Typography`, `Spacing`, `Radius` from `../../theme` (or `../theme` for non-screen files). Never hardcode hex colors, `'white'`, `rgba(255,...)`, etc.
- **TypeScript must compile clean per task** — every task ends with `npx tsc --noEmit` run from `apps/raqm/`, expected output: no errors.
- **Contract signatures are law** — every type and function signature below is copied verbatim from `docs/superpowers/plans/2026-07-02-raqm-shared-interfaces.md` §1–2. Do not rename, do not change parameter order, do not change return types. Plans 3–7 depend on these exactly as written.
- **Git** — include a commit step at the end of every task with a suggested conventional-commit message, but do **not** run `git commit` unless the session controller states the user has approved commits. Otherwise leave the changes in the working tree and report what would have been committed.
- No test runner exists in this repo (no jest/vitest). Verification is `tsc --noEmit` plus a manual device-verification checklist referencing spec checkbox IDs (`npx expo run:android` on a physical Android device).

---

## Task 1: DB layer — types, CRUD, seeds, category rules

**Files:**
- Modify: `apps/raqm/src/db/database.ts`

**Interfaces:**
- Produces (verbatim from contract §2): `TxRecord`, `NewTxInput`, `TxPatch`, `Category`, `Subcategory`, `loadTxRecords`, `getTxById`, `insertTx`, `insertParsedTx`, `updateTx`, `softDeleteTx`, `restoreTx`, `seedDefaults`, `getCategories`, `getSubcategories`, `addCategory`, `addSubcategory`, `getCategoryRuleForMerchant`, `upsertCategoryRule`.
- Consumes: existing `getDb()`, existing `transactions`/`categories`/`subcategories`/`category_rules`/`grocery_lists` tables from the v2 migration (already merged — do not add a new migration; all needed columns/tables exist).

### Steps

- [ ] Add the `TransactionType` value import (not type-only) at the top of `apps/raqm/src/db/database.ts`. Find:

```ts
import * as SQLite from 'expo-sqlite';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';
```

Replace with:

```ts
import * as SQLite from 'expo-sqlite';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';
```

- [ ] Insert the new types and `rowToTxRecord` mapper immediately after the existing `rowToTx` function (after the closing `}` of `rowToTx`, before the `// ── Transaction queries ──` comment). Find:

```ts
function rowToTx(row: Record<string, unknown>): ParsedTransaction {
  return {
    amount: row.amount as number,
    type: row.type as ParsedTransaction['type'],
    merchant: (row.merchant as string | null) ?? undefined,
    bankName: row.bankName as string,
    accountLast4: (row.accountLast4 as string | null) ?? undefined,
    timestamp: row.timestamp as number,
    balance: (row.balance as number | null) ?? undefined,
    currency: row.currency as string,
    isFromCard: (row.isFromCard as number) === 1,
  } as ParsedTransaction;
}

// ── Transaction queries ───────────────────────────────────────────────────────
```

Replace with:

```ts
function rowToTx(row: Record<string, unknown>): ParsedTransaction {
  return {
    amount: row.amount as number,
    type: row.type as ParsedTransaction['type'],
    merchant: (row.merchant as string | null) ?? undefined,
    bankName: row.bankName as string,
    accountLast4: (row.accountLast4 as string | null) ?? undefined,
    timestamp: row.timestamp as number,
    balance: (row.balance as number | null) ?? undefined,
    currency: row.currency as string,
    isFromCard: (row.isFromCard as number) === 1,
  } as ParsedTransaction;
}

// ── Plan 2: TxRecord types ────────────────────────────────────────────────────

export interface TxRecord {
  id: number;
  amount: number;
  type: TransactionType;
  merchant: string | null;
  bankName: string;
  accountLast4: string | null;
  timestamp: number;
  balance: number | null;
  currency: string;
  isFromCard: boolean;
  categoryId: number | null;
  subcategoryId: number | null;
  notes: string | null;
  tags: string[];
  rawSms: string | null;
  lat: number | null;
  lng: number | null;
  deletedAt: number | null;
  recurring: boolean;
  isManual: boolean;
  linkType: 'manual' | 'self_transfer' | 'refund' | null;
  linkPartnerId: number | null;
  linkSettled: boolean;
  isSplitChild: boolean;
  splitParentId: number | null;
  groupId: number | null;
}

export interface NewTxInput {
  amount: number;
  type: TransactionType;
  merchant?: string | null;
  bankName: string;
  accountLast4?: string | null;
  timestamp: number;
  balance?: number | null;
  currency?: string;
  isFromCard?: boolean;
  categoryId?: number | null;
  subcategoryId?: number | null;
  notes?: string | null;
  tags?: string[];
  rawSms?: string | null;
  lat?: number | null;
  lng?: number | null;
  isManual?: boolean;
}

export interface TxPatch {
  amount?: number;
  type?: TransactionType;
  merchant?: string | null;
  timestamp?: number;
  categoryId?: number | null;
  subcategoryId?: number | null;
  notes?: string | null;
  tags?: string[];
  recurring?: boolean;
  linkType?: TxRecord['linkType'];
  linkPartnerId?: number | null;
  linkSettled?: boolean;
  groupId?: number | null;
  isSplitChild?: boolean;
  splitParentId?: number | null;
  deletedAt?: number | null;
  lat?: number | null;
  lng?: number | null;
}

export interface Category {
  id: number;
  name: string;
  emoji: string;
  isCustom: boolean;
}

export interface Subcategory {
  id: number;
  categoryId: number;
  name: string;
  isCustom: boolean;
}

function rowToTxRecord(row: Record<string, unknown>): TxRecord {
  return {
    id: row.id as number,
    amount: row.amount as number,
    type: row.type as TransactionType,
    merchant: (row.merchant as string | null) ?? null,
    bankName: row.bankName as string,
    accountLast4: (row.accountLast4 as string | null) ?? null,
    timestamp: row.timestamp as number,
    balance: (row.balance as number | null) ?? null,
    currency: row.currency as string,
    isFromCard: (row.isFromCard as number) === 1,
    categoryId: (row.category_id as number | null) ?? null,
    subcategoryId: (row.subcategory_id as number | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    tags: row.tags ? (JSON.parse(row.tags as string) as string[]) : [],
    rawSms: (row.raw_sms as string | null) ?? null,
    lat: (row.lat as number | null) ?? null,
    lng: (row.lng as number | null) ?? null,
    deletedAt: (row.deleted_at as number | null) ?? null,
    recurring: (row.recurring as number) === 1,
    isManual: (row.is_manual as number) === 1,
    linkType: (row.link_type as TxRecord['linkType']) ?? null,
    linkPartnerId: (row.link_partner_id as number | null) ?? null,
    linkSettled: (row.link_settled as number) === 1,
    isSplitChild: (row.is_split_child as number) === 1,
    splitParentId: (row.split_parent_id as number | null) ?? null,
    groupId: (row.group_id as number | null) ?? null,
  };
}

// ── Transaction queries ───────────────────────────────────────────────────────
```

- [ ] Append the new `TxRecord` CRUD functions at the very end of `apps/raqm/src/db/database.ts` (after the existing `setSetting` function). Add:

```ts

// ── Plan 2: TxRecord CRUD ─────────────────────────────────────────────────────

export async function loadTxRecords(): Promise<TxRecord[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY timestamp DESC`,
  );
  return rows.map(rowToTxRecord);
}

export async function getTxById(id: number): Promise<TxRecord | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<Record<string, unknown>>(
    `SELECT * FROM transactions WHERE id = ?`,
    id,
  );
  return row ? rowToTxRecord(row) : null;
}

export async function insertTx(input: NewTxInput): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO transactions
       (amount, type, merchant, bankName, accountLast4, timestamp, balance, currency, isFromCard,
        category_id, subcategory_id, notes, tags, raw_sms, lat, lng, is_manual)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    input.amount,
    input.type,
    input.merchant ?? null,
    input.bankName,
    input.accountLast4 ?? null,
    input.timestamp,
    input.balance ?? null,
    input.currency ?? '₹',
    input.isFromCard ? 1 : 0,
    input.categoryId ?? null,
    input.subcategoryId ?? null,
    input.notes ?? null,
    input.tags ? JSON.stringify(input.tags) : null,
    input.rawSms ?? null,
    input.lat ?? null,
    input.lng ?? null,
    input.isManual ? 1 : 0,
  );
  return result.lastInsertRowId;
}

export async function insertParsedTx(tx: ParsedTransaction): Promise<number> {
  let categoryId: number | null = null;
  let subcategoryId: number | null = null;

  // C7: apply an existing category rule for this merchant, if any.
  if (tx.merchant) {
    const rule = await getCategoryRuleForMerchant(tx.merchant);
    if (rule) {
      categoryId = rule.categoryId;
      subcategoryId = rule.subcategoryId;
    }
  }

  // C2: salary auto-detection — only if no rule already matched.
  if (categoryId === null) {
    const isCredit = tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT;
    const salaryRegex = /salary|sal credited/i;
    const matchesSalary = salaryRegex.test(tx.smsBody) || (!!tx.merchant && salaryRegex.test(tx.merchant));
    if (isCredit && matchesSalary) {
      const database = await getDb();
      const salaryCat = await database.getFirstAsync<{ id: number }>(
        `SELECT id FROM categories WHERE name = 'Salary' LIMIT 1`,
      );
      if (salaryCat) categoryId = salaryCat.id;
    }
  }

  return insertTx({
    amount: tx.amount,
    type: tx.type,
    merchant: tx.merchant ?? null,
    bankName: tx.bankName,
    accountLast4: tx.accountLast4 ?? null,
    timestamp: tx.timestamp,
    balance: tx.balance ?? null,
    currency: tx.currency ?? '₹',
    isFromCard: tx.isFromCard ?? false,
    categoryId,
    subcategoryId,
    rawSms: tx.smsBody,
    isManual: false,
  });
}

export async function updateTx(id: number, patch: TxPatch): Promise<void> {
  const database = await getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  type ColumnEntry = [keyof TxPatch, string, (v: unknown) => unknown];
  const columnMap: ColumnEntry[] = [
    ['amount', 'amount', (v) => v],
    ['type', 'type', (v) => v],
    ['merchant', 'merchant', (v) => v],
    ['timestamp', 'timestamp', (v) => v],
    ['categoryId', 'category_id', (v) => v],
    ['subcategoryId', 'subcategory_id', (v) => v],
    ['notes', 'notes', (v) => v],
    ['tags', 'tags', (v) => JSON.stringify(v)],
    ['recurring', 'recurring', (v) => (v ? 1 : 0)],
    ['linkType', 'link_type', (v) => v],
    ['linkPartnerId', 'link_partner_id', (v) => v],
    ['linkSettled', 'link_settled', (v) => (v ? 1 : 0)],
    ['groupId', 'group_id', (v) => v],
    ['isSplitChild', 'is_split_child', (v) => (v ? 1 : 0)],
    ['splitParentId', 'split_parent_id', (v) => v],
    ['deletedAt', 'deleted_at', (v) => v],
    ['lat', 'lat', (v) => v],
    ['lng', 'lng', (v) => v],
  ];

  for (const [key, column, transform] of columnMap) {
    if (key in patch) {
      fields.push(`${column} = ?`);
      values.push(transform(patch[key]));
    }
  }

  if (fields.length === 0) return;
  values.push(id);
  await database.runAsync(
    `UPDATE transactions SET ${fields.join(', ')} WHERE id = ?`,
    ...(values as (string | number | null)[]),
  );
}

export async function softDeleteTx(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`UPDATE transactions SET deleted_at = ? WHERE id = ?`, Date.now(), id);
}

export async function restoreTx(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`UPDATE transactions SET deleted_at = NULL WHERE id = ?`, id);
}

// ── Plan 2: Categories, subcategories, rules, seeding ─────────────────────────

const DEFAULT_CATEGORIES: [string, string][] = [
  ['Food & Dining', '🍔'],
  ['Groceries', '🛒'],
  ['Transport', '🚕'],
  ['Shopping', '🛍️'],
  ['Bills & Utilities', '📱'],
  ['Rent & Housing', '🏠'],
  ['Health', '💊'],
  ['Entertainment', '🎬'],
  ['Travel', '✈️'],
  ['Education', '📚'],
  ['Salary', '💰'],
  ['Investments', '📈'],
  ['Gifts', '🎁'],
  ['Personal Care', '👤'],
  ['Other', '📦'],
];

const DEFAULT_SUBCATEGORIES: [string, string[]][] = [
  ['Food & Dining', ['Restaurants', 'Delivery', 'Coffee']],
  ['Groceries', ['Supermarket', 'Vegetables', 'Meat']],
  ['Transport', ['Fuel', 'Cab', 'Public Transit']],
  ['Bills & Utilities', ['Electricity', 'Internet', 'Mobile']],
  ['Entertainment', ['Streaming', 'Movies', 'Games']],
];

const DEFAULT_GROCERY_LISTS = ['Weekly Groceries', 'Monthly Staples', 'Household', 'Personal Care'];

export async function seedDefaults(): Promise<void> {
  const database = await getDb();

  const catCountRow = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM categories`,
  );
  if ((catCountRow?.count ?? 0) === 0) {
    const idByName = new Map<string, number>();
    for (const [name, emoji] of DEFAULT_CATEGORIES) {
      const result = await database.runAsync(
        `INSERT INTO categories (name, emoji, is_custom) VALUES (?, ?, 0)`,
        name,
        emoji,
      );
      idByName.set(name, result.lastInsertRowId);
    }
    for (const [parentName, children] of DEFAULT_SUBCATEGORIES) {
      const categoryId = idByName.get(parentName);
      if (categoryId === undefined) continue;
      for (const child of children) {
        await database.runAsync(
          `INSERT INTO subcategories (category_id, name, is_custom) VALUES (?, ?, 0)`,
          categoryId,
          child,
        );
      }
    }
  }

  const listCountRow = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM grocery_lists`,
  );
  if ((listCountRow?.count ?? 0) === 0) {
    for (const name of DEFAULT_GROCERY_LISTS) {
      await database.runAsync(
        `INSERT INTO grocery_lists (name, budget_cap, completed_at) VALUES (?, NULL, NULL)`,
        name,
      );
    }
  }
}

export async function getCategories(): Promise<Category[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ id: number; name: string; emoji: string; is_custom: number }>(
    `SELECT id, name, emoji, is_custom FROM categories ORDER BY id ASC`,
  );
  return rows.map((r) => ({ id: r.id, name: r.name, emoji: r.emoji, isCustom: r.is_custom === 1 }));
}

export async function getSubcategories(categoryId: number): Promise<Subcategory[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ id: number; category_id: number; name: string; is_custom: number }>(
    `SELECT id, category_id, name, is_custom FROM subcategories WHERE category_id = ? ORDER BY id ASC`,
    categoryId,
  );
  return rows.map((r) => ({ id: r.id, categoryId: r.category_id, name: r.name, isCustom: r.is_custom === 1 }));
}

export async function addCategory(name: string, emoji: string): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO categories (name, emoji, is_custom) VALUES (?, ?, 1)`,
    name,
    emoji,
  );
  return result.lastInsertRowId;
}

export async function addSubcategory(categoryId: number, name: string): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO subcategories (category_id, name, is_custom) VALUES (?, ?, 1)`,
    categoryId,
    name,
  );
  return result.lastInsertRowId;
}

export async function getCategoryRuleForMerchant(
  merchant: string,
): Promise<{ categoryId: number; subcategoryId: number | null } | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ category_id: number; subcategory_id: number | null }>(
    `SELECT category_id, subcategory_id FROM category_rules WHERE LOWER(merchant_pattern) = LOWER(?) LIMIT 1`,
    merchant,
  );
  if (!row) return null;
  return { categoryId: row.category_id, subcategoryId: row.subcategory_id };
}

export async function upsertCategoryRule(
  merchantPattern: string,
  categoryId: number,
  subcategoryId: number | null,
): Promise<void> {
  const database = await getDb();
  const existing = await database.getFirstAsync<{ id: number }>(
    `SELECT id FROM category_rules WHERE LOWER(merchant_pattern) = LOWER(?) LIMIT 1`,
    merchantPattern,
  );
  if (existing) {
    await database.runAsync(
      `UPDATE category_rules SET category_id = ?, subcategory_id = ? WHERE id = ?`,
      categoryId,
      subcategoryId,
      existing.id,
    );
  } else {
    await database.runAsync(
      `INSERT INTO category_rules (merchant_pattern, category_id, subcategory_id) VALUES (?, ?, ?)`,
      merchantPattern,
      categoryId,
      subcategoryId,
    );
  }
}
```

- [ ] Also fix S6 for the bulk scan path: update `insertTransactions` to persist `raw_sms`. Find:

```ts
export async function insertTransactions(txs: ParsedTransaction[]): Promise<void> {
  if (txs.length === 0) return;
  const database = await getDb();
  await database.runAsync('BEGIN');
  try {
    for (const tx of txs) {
      await database.runAsync(
        `INSERT INTO transactions
           (amount, type, merchant, bankName, accountLast4, timestamp, balance, currency, isFromCard)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        tx.amount,
        tx.type,
        tx.merchant ?? null,
        tx.bankName,
        tx.accountLast4 ?? null,
        tx.timestamp,
        tx.balance ?? null,
        tx.currency ?? '₹',
        tx.isFromCard ? 1 : 0,
      );
    }
    await database.runAsync('COMMIT');
  } catch (e) {
    await database.runAsync('ROLLBACK');
    throw e;
  }
}
```

Replace with:

```ts
export async function insertTransactions(txs: ParsedTransaction[]): Promise<void> {
  if (txs.length === 0) return;
  const database = await getDb();
  await database.runAsync('BEGIN');
  try {
    for (const tx of txs) {
      await database.runAsync(
        `INSERT INTO transactions
           (amount, type, merchant, bankName, accountLast4, timestamp, balance, currency, isFromCard, raw_sms)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        tx.amount,
        tx.type,
        tx.merchant ?? null,
        tx.bankName,
        tx.accountLast4 ?? null,
        tx.timestamp,
        tx.balance ?? null,
        tx.currency ?? '₹',
        tx.isFromCard ? 1 : 0,
        tx.smsBody ?? null,
      );
    }
    await database.runAsync('COMMIT');
  } catch (e) {
    await database.runAsync('ROLLBACK');
    throw e;
  }
}
```

- [ ] Also update the singular `insertTransaction` for consistency (it is currently dead code after Task 2 rewires Dashboard, but keep it correct). Find:

```ts
export async function insertTransaction(tx: ParsedTransaction): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO transactions
       (amount, type, merchant, bankName, accountLast4, timestamp, balance, currency, isFromCard)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    tx.amount,
    tx.type,
    tx.merchant ?? null,
    tx.bankName,
    tx.accountLast4 ?? null,
    tx.timestamp,
    tx.balance ?? null,
    tx.currency ?? '₹',
    tx.isFromCard ? 1 : 0,
  );
}
```

Replace with:

```ts
export async function insertTransaction(tx: ParsedTransaction): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO transactions
       (amount, type, merchant, bankName, accountLast4, timestamp, balance, currency, isFromCard, raw_sms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    tx.amount,
    tx.type,
    tx.merchant ?? null,
    tx.bankName,
    tx.accountLast4 ?? null,
    tx.timestamp,
    tx.balance ?? null,
    tx.currency ?? '₹',
    tx.isFromCard ? 1 : 0,
    tx.smsBody ?? null,
  );
}
```

- [ ] Verify: run `npx tsc --noEmit` from `apps/raqm/`. Expected: no errors.
- [ ] Device verification: none for this task alone (no UI change yet) — covered by Tasks 2–5.
- [ ] Commit (skip if user has not approved commits): `feat(raqm): add TxRecord CRUD, category seeding, and category rules to db layer`

---

## Task 2: txStore + rewire AppNavigator/Dashboard/Transactions/Analytics

**Files:**
- Create: `apps/raqm/src/store/txStore.ts`
- Modify: `apps/raqm/src/navigation/AppNavigator.tsx`
- Modify: `apps/raqm/src/screens/main/DashboardScreen.tsx`
- Modify: `apps/raqm/src/screens/main/TransactionsScreen.tsx`
- Modify: `apps/raqm/src/screens/main/AnalyticsScreen.tsx`
- Modify: `apps/raqm/src/screens/main/MoreScreen.tsx`

**Interfaces:**
- Consumes: `loadTxRecords`, `insertTx`, `insertParsedTx`, `updateTx`, `softDeleteTx`, `restoreTx`, `seedDefaults`, `TxRecord`, `NewTxInput`, `TxPatch` from Task 1.
- Produces (verbatim from contract §2): `useTxStore` with shape `{ txs, ready, load, refresh, add, addParsed, update, remove, restore }`.

### Steps

- [ ] Create `apps/raqm/src/store/txStore.ts`:

```ts
import { create } from 'zustand';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';
import {
  loadTxRecords,
  insertTx,
  insertParsedTx,
  updateTx,
  softDeleteTx,
  restoreTx,
  seedDefaults,
  type TxRecord,
  type NewTxInput,
  type TxPatch,
} from '../db/database';

interface TxStore {
  txs: TxRecord[];
  ready: boolean;
  load: () => Promise<void>;
  refresh: () => Promise<void>;
  add: (input: NewTxInput) => Promise<number>;
  addParsed: (tx: ParsedTransaction) => Promise<void>;
  update: (id: number, patch: TxPatch) => Promise<void>;
  remove: (id: number) => Promise<void>;
  restore: (id: number) => Promise<void>;
}

export const useTxStore = create<TxStore>((set, get) => ({
  txs: [],
  ready: false,

  load: async () => {
    await seedDefaults();
    const txs = await loadTxRecords();
    set({ txs, ready: true });
  },

  refresh: async () => {
    const txs = await loadTxRecords();
    set({ txs });
  },

  add: async (input) => {
    const id = await insertTx(input);
    await get().refresh();
    return id;
  },

  addParsed: async (tx) => {
    await insertParsedTx(tx);
    await get().refresh();
  },

  update: async (id, patch) => {
    await updateTx(id, patch);
    await get().refresh();
  },

  remove: async (id) => {
    await softDeleteTx(id);
    set((s) => ({ txs: s.txs.filter((t) => t.id !== id) }));
  },

  restore: async (id) => {
    await restoreTx(id);
    await get().refresh();
  },
}));
```

- [ ] Rewire `apps/raqm/src/navigation/AppNavigator.tsx` to seed/load via `useTxStore` at startup instead of `onboardingStore.initDb`. Find:

```ts
import { NavigationContainer } from '@react-navigation/native';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainNavigator } from './MainNavigator';
import { useAppStore } from '../store/appStore';
import { useOnboardingStore } from '../store/onboardingStore';
import { Colors } from '../theme';

export function AppNavigator() {
  const isOnboardingComplete = useAppStore(s => s.isOnboardingComplete);
  const initDb = useOnboardingStore(s => s.initDb);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const unsub = useAppStore.persist.onFinishHydration(async () => {
      await initDb();
      if (!cancelled) setReady(true);
    });
    if (useAppStore.persist.hasHydrated()) {
      initDb().then(() => { if (!cancelled) setReady(true); });
    }
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);
```

Replace with:

```ts
import { NavigationContainer } from '@react-navigation/native';
import { OnboardingNavigator } from './OnboardingNavigator';
import { MainNavigator } from './MainNavigator';
import { useAppStore } from '../store/appStore';
import { useTxStore } from '../store/txStore';
import { Colors } from '../theme';

export function AppNavigator() {
  const isOnboardingComplete = useAppStore(s => s.isOnboardingComplete);
  const loadTxs = useTxStore(s => s.load);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const unsub = useAppStore.persist.onFinishHydration(async () => {
      await loadTxs();
      if (!cancelled) setReady(true);
    });
    if (useAppStore.persist.hasHydrated()) {
      loadTxs().then(() => { if (!cancelled) setReady(true); });
    }
    return () => {
      cancelled = true;
      unsub();
    };
  }, []);
```

- [ ] Rewrite `apps/raqm/src/screens/main/DashboardScreen.tsx` in full (switches data source from `useOnboardingStore` to `useTxStore`; live-SMS listener now calls `useTxStore.getState().addParsed`; `tx.merchant` is `string | null` on `TxRecord` so the `tx.merchant || tx.bankName` fallback pattern is preserved):

```tsx
import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useAppStore } from '../../store/appStore';
import { useTxStore } from '../../store/txStore';
import { SmsReader } from '../../native/SmsReader';
import { BankParserFactory } from '@rahatsayyed/bank-sms-parser';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import type { TxRecord } from '../../db/database';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatAmount(n: number, currency = '₹'): string {
  return `${currency}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function txIcon(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME:
    case TransactionType.CREDIT: return '⬆';
    case TransactionType.EXPENSE: return '⬇';
    case TransactionType.TRANSFER: return '↔';
    case TransactionType.INVESTMENT: return '📈';
    default: return '·';
  }
}

function txColor(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME:
    case TransactionType.CREDIT: return Colors.primary;
    case TransactionType.EXPENSE: return Colors.error;
    case TransactionType.TRANSFER: return Colors.onSurfaceVariant;
    default: return Colors.onSurfaceVariant;
  }
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

export function DashboardScreen() {
  const { userName } = useAppStore();
  const txs = useTxStore((s) => s.txs);
  const addParsed = useTxStore((s) => s.addParsed);
  const [newTxLabel, setNewTxLabel] = React.useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sub = SmsReader.addNewSmsListener(({ body, sender, timestamp }) => {
      const tx = BankParserFactory.parse(body, sender, timestamp);
      if (tx) {
        addParsed(tx);
        const label = tx.merchant
          ? `${tx.type === TransactionType.EXPENSE ? '-' : '+'}₹${tx.amount.toLocaleString('en-IN')} · ${tx.merchant}`
          : `New transaction from ${tx.bankName}`;
        setNewTxLabel(label);
        Animated.sequence([
          Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(3000),
          Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setNewTxLabel(null));
      }
    });
    return () => sub.remove();
  }, []);

  const stats = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const tx of txs) {
      if (tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT) {
        income += tx.amount;
      } else if (isDebit(tx.type)) {
        expenses += tx.amount;
      }
    }
    return { income, expenses, net: income - expenses };
  }, [txs]);

  const accounts = useMemo(() => {
    const map = new Map<string, { bank: string; last4: string | null; isCard: boolean; count: number }>();
    for (const tx of txs) {
      const key = `${tx.bankName}|${tx.accountLast4 ?? ''}`;
      if (map.has(key)) {
        map.get(key)!.count += 1;
      } else {
        map.set(key, { bank: tx.bankName, last4: tx.accountLast4, isCard: !!tx.isFromCard, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [txs]);

  const recent = useMemo(
    () => [...txs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 15),
    [txs],
  );

  const currency = txs[0]?.currency ?? '₹';
  const firstName = userName.trim().split(' ')[0];
  const netIsPositive = stats.net >= 0;

  return (
    <View style={{ flex: 1 }}>
    {newTxLabel && (
      <Animated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
        <Text style={styles.toastText}>⚡ {newTxLabel}</Text>
      </Animated.View>
    )}
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingLabel}>{greeting()}</Text>
          <Text style={styles.greetingName}>{firstName || 'there'} 👋</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{(firstName?.[0] ?? 'R').toUpperCase()}</Text>
        </View>
      </View>

      {/* Net flow hero card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Net cash flow</Text>
        <Text style={[styles.heroAmount, { color: netIsPositive ? Colors.onPrimary : Colors.onError }]}>
          {netIsPositive ? '+' : '-'}{formatAmount(stats.net, currency)}
        </Text>
        <View style={styles.heroRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>⬆ Income</Text>
            <Text style={styles.heroStatValue}>{formatAmount(stats.income, currency)}</Text>
          </View>
          <View style={styles.heroSeparator} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>⬇ Expenses</Text>
            <Text style={styles.heroStatValue}>{formatAmount(stats.expenses, currency)}</Text>
          </View>
        </View>
        <Text style={styles.heroMeta}>{txs.length} transactions across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Accounts */}
      {accounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
            {accounts.map((acc, i) => (
              <View key={i} style={styles.accountChip}>
                <Text style={styles.accountChipIcon}>{acc.isCard ? '💳' : '🏦'}</Text>
                <View>
                  <Text style={styles.accountChipBank}>{acc.bank}</Text>
                  <Text style={styles.accountChipMeta}>
                    {acc.last4 ? `•••• ${acc.last4}` : 'Account'} · {acc.count} txns
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent transactions</Text>
        <View style={styles.txList}>
          {recent.length === 0 ? (
            <View style={styles.emptyTx}>
              <Text style={styles.emptyTxText}>No transactions found</Text>
            </View>
          ) : (
            recent.map((tx, i) => (
              <TxRow key={tx.id} tx={tx} currency={currency} isLast={i === recent.length - 1} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

function TxRow({ tx, currency, isLast }: { tx: TxRecord; currency: string; isLast: boolean }) {
  const debit = isDebit(tx.type);
  const color = txColor(tx.type);
  const sign = debit ? '-' : '+';

  return (
    <View style={[styles.txRow, !isLast && styles.txRowBorder]}>
      <View style={[styles.txIconBox, { backgroundColor: `${color}18` }]}>
        <Text style={[styles.txIcon, { color }]}>{txIcon(tx.type)}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txMerchant} numberOfLines={1}>
          {tx.merchant || tx.bankName}
        </Text>
        <Text style={styles.txMeta}>
          {tx.bankName}{tx.accountLast4 ? ` ···${tx.accountLast4}` : ''} · {formatDate(tx.timestamp)}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color }]}>
        {sign}{formatAmount(tx.amount, currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  greetingLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  greetingName: { ...Typography.headlineSm, color: Colors.onSurface, marginTop: 2 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Typography.titleLg, color: Colors.onPrimaryContainer, fontSize: 18 },

  heroCard: {
    marginHorizontal: Spacing.containerMargin,
    borderRadius: Radius.xxl,
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    gap: Spacing.sm,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
  },
  heroLabel: { ...Typography.labelSm, color: Colors.onPrimary, letterSpacing: 0.8 },
  heroAmount: { ...Typography.numericXl, color: Colors.onPrimary },
  heroRow: { flexDirection: 'row', marginTop: Spacing.sm },
  heroStat: { flex: 1, gap: 4 },
  heroSeparator: { width: 1, backgroundColor: 'rgba(0,56,35,0.2)', marginHorizontal: Spacing.md },
  heroStatLabel: { ...Typography.labelSm, color: Colors.onPrimary },
  heroStatValue: { ...Typography.numericMd, color: Colors.onPrimary, fontSize: 18 },
  heroMeta: { ...Typography.labelSm, color: Colors.onPrimary, marginTop: 4 },

  section: { marginTop: Spacing.xl, paddingHorizontal: Spacing.containerMargin },
  sectionTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.md, fontSize: 16 },

  accountsRow: { gap: Spacing.sm, paddingRight: Spacing.containerMargin },
  accountChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    minWidth: 160,
  },
  accountChipIcon: { fontSize: 22 },
  accountChipBank: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
  accountChipMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },

  txList: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  txIconBox: {
    width: 40, height: 40, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  txIcon: { fontSize: 16, fontWeight: '700' },
  txInfo: { flex: 1 },
  txMerchant: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
  txMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
  txAmount: { ...Typography.numericSm, fontSize: 15 },

  emptyTx: { padding: Spacing.xl, alignItems: 'center' },
  emptyTxText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },

  toast: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    margin: Spacing.md, borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  toastText: { ...Typography.bodyMd, color: Colors.onPrimaryContainer, fontFamily: 'WorkSans_500Medium' },
});
```

- [ ] Rewrite `apps/raqm/src/screens/main/TransactionsScreen.tsx` in full (switches to `useTxStore`, row tap navigates to `TransactionDetail`, adds a FAB to `AddTransaction`):

```tsx
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useTxStore } from '../../store/txStore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import type { TxRecord } from '../../db/database';

function formatAmount(n: number, currency = '₹'): string {
  return `${currency}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function txColor(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME:
    case TransactionType.CREDIT: return Colors.primary;
    case TransactionType.EXPENSE: return Colors.error;
    default: return Colors.onSurfaceVariant;
  }
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

function txTypeLabel(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME: return 'Income';
    case TransactionType.CREDIT: return 'Credit';
    case TransactionType.EXPENSE: return 'Expense';
    case TransactionType.TRANSFER: return 'Transfer';
    case TransactionType.INVESTMENT: return 'Investment';
    case TransactionType.BALANCE_UPDATE: return 'Balance';
    default: return type;
  }
}

function TxItem({ tx, currency, onPress }: { tx: TxRecord; currency: string; onPress: () => void }) {
  const debit = isDebit(tx.type);
  const color = txColor(tx.type);
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.dot, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.dotText, { color }]}>{debit ? '↓' : '↑'}</Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemMerchant} numberOfLines={1}>{tx.merchant || tx.bankName}</Text>
        <Text style={styles.itemMeta}>
          {txTypeLabel(tx.type)} · {tx.bankName}
          {tx.accountLast4 ? ` ···${tx.accountLast4}` : ''}
        </Text>
        <Text style={styles.itemDate}>{formatDate(tx.timestamp)}</Text>
      </View>
      <Text style={[styles.itemAmount, { color }]}>
        {debit ? '-' : '+'}{formatAmount(tx.amount, currency)}
      </Text>
    </TouchableOpacity>
  );
}

export function TransactionsScreen() {
  const txs = useTxStore((s) => s.txs);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [query, setQuery] = useState('');

  const currency = txs[0]?.currency ?? '₹';

  const sorted = useMemo(
    () => [...txs].sort((a, b) => b.timestamp - a.timestamp),
    [txs],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      tx => (tx.merchant ?? '').toLowerCase().includes(q) || tx.bankName.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.count}>{filtered.length} total</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search merchant or bank…"
          placeholderTextColor={Colors.outline}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TxItem
            tx={item}
            currency={currency}
            onPress={() => navigation.navigate('TransactionDetail', { transactionId: item.id })}
          />
        )}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddTransaction')}
      >
        <Text style={styles.fabIcon}>＋</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
  },
  title: { ...Typography.headlineSm, color: Colors.onSurface },
  count: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  searchWrap: { paddingHorizontal: Spacing.containerMargin, paddingBottom: Spacing.md },
  search: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...Typography.bodyMd, color: Colors.onSurface,
  },
  list: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 96 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dot: {
    width: 40, height: 40, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  dotText: { fontSize: 16, fontWeight: '700' },
  itemInfo: { flex: 1 },
  itemMerchant: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
  itemMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
  itemDate: { ...Typography.labelSm, color: Colors.outline, letterSpacing: 0, marginTop: 1 },
  itemAmount: { ...Typography.numericSm, fontSize: 15 },
  sep: { height: 1, backgroundColor: Colors.outlineVariant, marginLeft: 56 },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  fab: {
    position: 'absolute', right: Spacing.containerMargin, bottom: Spacing.xl,
    width: 56, height: 56, borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  fabIcon: { fontSize: 26, color: Colors.onPrimary, lineHeight: 28 },
});
```

- [ ] Rewrite `apps/raqm/src/screens/main/AnalyticsScreen.tsx`'s data source only. Find:

```tsx
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
```

Replace with:

```tsx
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useTxStore } from '../../store/txStore';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
```

Then find:

```tsx
export function AnalyticsScreen() {
  const { transactions } = useOnboardingStore();
  const currency = transactions[0]?.currency ?? '₹';

  const byMonth = useMemo(() => {
    const map = new Map<string, { income: number; expenses: number }>();
    for (const tx of transactions) {
```

Replace with:

```tsx
export function AnalyticsScreen() {
  const transactions = useTxStore((s) => s.txs);
  const currency = transactions[0]?.currency ?? '₹';

  const byMonth = useMemo(() => {
    const map = new Map<string, { income: number; expenses: number }>();
    for (const tx of transactions) {
```

(The rest of `AnalyticsScreen.tsx` — the `topMerchants` memo, JSX, and styles — is unchanged; it already reads generic `tx.type`/`tx.amount`/`tx.merchant`/`tx.bankName`/`tx.timestamp` fields present on both `ParsedTransaction` and `TxRecord`.)

- [ ] Update `apps/raqm/src/screens/main/MoreScreen.tsx` so the "N transactions scanned" count stays accurate now that `onboardingStore.transactions` is no longer refreshed on app start (deviation note: the contract only lists Dashboard/Transactions/Analytics for rewire, but leaving `MoreScreen` on `onboardingStore` would show a stale/zero count after this change, so it is switched too for correctness). Find:

```tsx
import { useAppStore } from '../../store/appStore';
import { useOnboardingStore } from '../../store/onboardingStore';
import { useNavigation } from '@react-navigation/native';
```

Replace with:

```tsx
import { useAppStore } from '../../store/appStore';
import { useTxStore } from '../../store/txStore';
import { useNavigation } from '@react-navigation/native';
```

Then find:

```tsx
export function MoreScreen() {
  const { userName } = useAppStore();
  const { transactions } = useOnboardingStore();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
```

Replace with:

```tsx
export function MoreScreen() {
  const { userName } = useAppStore();
  const transactions = useTxStore((s) => s.txs);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
```

- [ ] Verify: run `npx tsc --noEmit` from `apps/raqm/`. Expected: no errors.
- [ ] Device verification: launch the app (`npx expo run:android`). Confirm Dashboard/Transactions/Analytics/More all show data (empty state or seeded categories is fine if no transactions exist yet — a fresh install will show 0 transactions, which is correct since `seedDefaults` only seeds categories/subcategories/grocery lists, not transactions). Confirm no crash on startup. Confirm live SMS (or a test broadcast) still produces the toast and the transaction later appears in the Transactions list.
- [ ] Commit (skip if user has not approved commits): `feat(raqm): add txStore and rewire Dashboard/Transactions/Analytics/More to it`

---

## Task 3: TransactionDetailScreen — full detail, notes, tags, raw SMS, delete/undo

**Files:**
- Modify (full rewrite): `apps/raqm/src/screens/main/TransactionDetailScreen.tsx`

**Interfaces:**
- Consumes: `getTxById`, `getCategories`, `getSubcategories` (Task 1), `useTxStore` (Task 2), `MainStackScreenProps<'TransactionDetail'>` (existing, `{ transactionId: number }`).
- Produces: nothing new — this is a leaf screen.

### Steps

- [ ] Replace the full contents of `apps/raqm/src/screens/main/TransactionDetailScreen.tsx`:

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getCategories, getSubcategories } from '../../db/database';
import type { Category, Subcategory } from '../../db/database';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';

function formatAmount(n: number, currency = '₹'): string {
  return `${currency}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function txTypeLabel(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME: return 'Income';
    case TransactionType.CREDIT: return 'Credit';
    case TransactionType.EXPENSE: return 'Expense';
    case TransactionType.TRANSFER: return 'Transfer';
    case TransactionType.INVESTMENT: return 'Investment';
    case TransactionType.BALANCE_UPDATE: return 'Balance update';
    default: return type;
  }
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

export function TransactionDetailScreen({ route, navigation }: MainStackScreenProps<'TransactionDetail'>) {
  const { transactionId } = route.params;
  const tx = useTxStore((s) => s.txs.find((t) => t.id === transactionId));
  const removeTx = useTxStore((s) => s.remove);
  const restoreTx = useTxStore((s) => s.restore);
  const updateTx = useTxStore((s) => s.update);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [notesDraft, setNotesDraft] = useState(tx?.notes ?? '');
  const [tagsDraft, setTagsDraft] = useState<string[]>(tx?.tags ?? []);
  const [newTag, setNewTag] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (tx?.categoryId != null) {
      getSubcategories(tx.categoryId).then(setSubcategories);
    } else {
      setSubcategories([]);
    }
  }, [tx?.categoryId]);

  useEffect(() => {
    setNotesDraft(tx?.notes ?? '');
    setTagsDraft(tx?.tags ?? []);
  }, [tx?.id]);

  const category = useMemo(
    () => categories.find((c) => c.id === tx?.categoryId) ?? null,
    [categories, tx?.categoryId],
  );
  const subcategory = useMemo(
    () => subcategories.find((s) => s.id === tx?.subcategoryId) ?? null,
    [subcategories, tx?.subcategoryId],
  );

  if (!tx) {
    return (
      <View style={styles.root}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Transaction not found</Text>
      </View>
    );
  }

  const debit = isDebit(tx.type);
  const sign = debit ? '-' : '+';
  const color = debit ? Colors.error : Colors.primary;

  const saveNotes = () => {
    if (notesDraft !== (tx.notes ?? '')) {
      updateTx(tx.id, { notes: notesDraft });
    }
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed || tagsDraft.includes(trimmed)) {
      setNewTag('');
      return;
    }
    const next = [...tagsDraft, trimmed];
    setTagsDraft(next);
    setNewTag('');
    updateTx(tx.id, { tags: next });
  };

  const removeTag = (tag: string) => {
    const next = tagsDraft.filter((t) => t !== tag);
    setTagsDraft(next);
    updateTx(tx.id, { tags: next });
  };

  const handleDelete = () => {
    removeTx(tx.id);
    setDeleting(true);
    setTimeout(() => {
      navigation.goBack();
    }, 5000);
  };

  const handleUndo = () => {
    restoreTx(tx.id);
    setDeleting(false);
  };

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('EditTransaction', { transactionId: tx.id })}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.amount}>
          {sign}{formatAmount(tx.amount, tx.currency)}
        </Text>
        <Text style={styles.merchant}>{tx.merchant || tx.bankName}</Text>

        <View style={styles.card}>
          <Row label="Type" value={txTypeLabel(tx.type)} />
          <Row label="Bank" value={tx.bankName} />
          <Row label="Account" value={tx.accountLast4 ? `•••• ${tx.accountLast4}` : '—'} />
          <Row label="Date" value={formatDateTime(tx.timestamp)} />
          <Row
            label="Category"
            value={category ? `${category.emoji} ${category.name}${subcategory ? ` · ${subcategory.name}` : ''}` : 'Uncategorized'}
            last
          />
        </View>

        <Text style={styles.sectionLabel}>NOTES</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.notesInput}
            placeholder="Add a note…"
            placeholderTextColor={Colors.outline}
            value={notesDraft}
            onChangeText={setNotesDraft}
            onBlur={saveNotes}
            multiline
          />
        </View>

        <Text style={styles.sectionLabel}>TAGS</Text>
        <View style={styles.card}>
          <View style={styles.tagsWrap}>
            {tagsDraft.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
                <TouchableOpacity onPress={() => removeTag(tag)}>
                  <Text style={styles.tagChipRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.tagInput}
              placeholder="Add tag…"
              placeholderTextColor={Colors.outline}
              value={newTag}
              onChangeText={setNewTag}
              onSubmitEditing={addTag}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={addTag} style={styles.tagAddButton}>
              <Text style={styles.tagAddButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionLabel}>OTHER INFO</Text>
        <View style={styles.card}>
          <Text style={styles.rawSmsLabel}>Raw SMS</Text>
          <Text style={styles.rawSmsBody}>{tx.rawSms ?? 'No raw SMS stored (manual entry).'}</Text>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete transaction</Text>
        </TouchableOpacity>
      </ScrollView>

      {deleting && (
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>Transaction deleted</Text>
          <TouchableOpacity onPress={handleUndo}>
            <Text style={styles.snackbarUndo}>UNDO</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  back: {},
  backText: { ...Typography.bodyMd, color: Colors.primary },
  editText: { ...Typography.bodyMd, color: Colors.primary, fontFamily: 'WorkSans_500Medium' },
  content: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 48 },
  title: { ...Typography.headlineSm, color: Colors.onSurface, marginTop: Spacing.md },

  amount: { ...Typography.numericXl, color: Colors.onSurface, marginTop: Spacing.md },
  merchant: { ...Typography.titleLg, color: Colors.onSurfaceVariant, marginTop: 4, marginBottom: Spacing.lg },

  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
    marginBottom: Spacing.lg, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  rowLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  rowValue: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },

  sectionLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginBottom: Spacing.sm, marginLeft: 4 },

  notesInput: {
    ...Typography.bodyMd, color: Colors.onSurface,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    minHeight: 72, textAlignVertical: 'top',
  },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  tagChipText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  tagChipRemove: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  tagInputRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant, paddingTop: Spacing.md,
  },
  tagInput: {
    flex: 1, ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  tagAddButton: {
    paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
  },
  tagAddButtonText: { ...Typography.bodySm, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },

  rawSmsLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, padding: Spacing.md, paddingBottom: 0 },
  rawSmsBody: { ...Typography.bodySm, color: Colors.onSurface, padding: Spacing.md, lineHeight: 20 },

  deleteButton: {
    marginTop: Spacing.sm, paddingVertical: Spacing.md, alignItems: 'center',
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.error,
  },
  deleteButtonText: { ...Typography.bodyMd, color: Colors.error, fontFamily: 'WorkSans_500Medium' },

  snackbar: {
    position: 'absolute', left: Spacing.containerMargin, right: Spacing.containerMargin, bottom: Spacing.xl,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  snackbarText: { ...Typography.bodyMd, color: Colors.inkHeadline },
  snackbarUndo: { ...Typography.bodyMd, color: Colors.primary, fontFamily: 'WorkSans_500Medium' },
});
```

Note on the delete/undo flow: `handleDelete` soft-deletes immediately (row disappears from every other screen right away since `remove()` also drops it from `txStore.txs`), then shows an inline snackbar on this same screen for 5 seconds before calling `navigation.goBack()`. If the user taps UNDO inside that window, `restore()` is called and the snackbar is dismissed without navigating away. This satisfies T10 ("soft delete, show 5s snackbar with Undo, navigate back after delete") without needing a cross-screen snackbar host.

- [ ] Verify: run `npx tsc --noEmit` from `apps/raqm/`. Expected: no errors.
- [ ] Device verification (spec IDs S6, T5, T6, T10):
  - [ ] S6: tapping any transaction row shows raw SMS text under "Other Info" (or "No raw SMS stored" for a manual entry once Task 5 exists).
  - [ ] T5: typing a note, leaving the field (blur), reopening the screen — note persists.
  - [ ] T6: adding a tag shows a chip; removing it via ✕ removes the chip; both persist across screen re-entry.
  - [ ] T10: tapping "Delete transaction" shows the 5s snackbar with UNDO; tapping UNDO restores the transaction and it reappears in Transactions; letting the 5s elapse navigates back and the transaction stays gone.
- [ ] Commit (skip if user has not approved commits): `feat(raqm): implement TransactionDetailScreen with notes, tags, and delete/undo`

---

## Task 4: CategoryPickerScreen — sectioned categories, custom category/subcategory

**Files:**
- Modify (full rewrite): `apps/raqm/src/screens/main/CategoryPickerScreen.tsx`

**Interfaces:**
- Consumes: `getCategories`, `getSubcategories`, `addCategory`, `addSubcategory` (Task 1), `MainStackScreenProps<'CategoryPicker'>` (existing, `{ onSelect: (categoryId: number, subcategoryId?: number) => void }`).
- Produces: nothing new — this is a leaf screen invoked from Add/Edit (Task 5).

### Steps

- [ ] Replace the full contents of `apps/raqm/src/screens/main/CategoryPickerScreen.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { getCategories, getSubcategories, addCategory, addSubcategory } from '../../db/database';
import type { Category, Subcategory } from '../../db/database';

export function CategoryPickerScreen({ route, navigation }: MainStackScreenProps<'CategoryPicker'>) {
  const { onSelect } = route.params;

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState<Record<number, Subcategory[]>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('📦');

  const [addingSubFor, setAddingSubFor] = useState<number | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  const refreshCategories = () => {
    getCategories().then(setCategories);
  };

  useEffect(() => {
    refreshCategories();
  }, []);

  const toggleExpand = async (categoryId: number) => {
    if (expandedId === categoryId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(categoryId);
    if (!subcategoriesByCategory[categoryId]) {
      const subs = await getSubcategories(categoryId);
      setSubcategoriesByCategory((prev) => ({ ...prev, [categoryId]: subs }));
    }
  };

  const handleSelectCategory = (categoryId: number) => {
    onSelect(categoryId, undefined);
    navigation.goBack();
  };

  const handleSelectSubcategory = (categoryId: number, subcategoryId: number) => {
    onSelect(categoryId, subcategoryId);
    navigation.goBack();
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    await addCategory(name, newCategoryEmoji.trim() || '📦');
    setNewCategoryName('');
    setNewCategoryEmoji('📦');
    setShowAddCategory(false);
    refreshCategories();
  };

  const handleAddSubcategory = async (categoryId: number) => {
    const name = newSubcategoryName.trim();
    if (!name) return;
    await addSubcategory(categoryId, name);
    setNewSubcategoryName('');
    setAddingSubFor(null);
    const subs = await getSubcategories(categoryId);
    setSubcategoriesByCategory((prev) => ({ ...prev, [categoryId]: subs }));
  };

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>✕ Close</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pick a category</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {categories.map((cat) => {
          const expanded = expandedId === cat.id;
          const subs = subcategoriesByCategory[cat.id] ?? [];
          return (
            <View key={cat.id} style={styles.categoryCard}>
              <TouchableOpacity style={styles.categoryRow} onPress={() => handleSelectCategory(cat.id)}>
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={styles.categoryName}>{cat.name}</Text>
                <TouchableOpacity onPress={() => toggleExpand(cat.id)} hitSlop={8}>
                  <Text style={styles.chevron}>{expanded ? '︿' : '﹀'}</Text>
                </TouchableOpacity>
              </TouchableOpacity>

              {expanded && (
                <View style={styles.subList}>
                  {subs.map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      style={styles.subRow}
                      onPress={() => handleSelectSubcategory(cat.id, sub.id)}
                    >
                      <Text style={styles.subName}>{sub.name}</Text>
                    </TouchableOpacity>
                  ))}

                  {addingSubFor === cat.id ? (
                    <View style={styles.addSubRow}>
                      <TextInput
                        style={styles.addSubInput}
                        placeholder="Sub-category name…"
                        placeholderTextColor={Colors.outline}
                        value={newSubcategoryName}
                        onChangeText={setNewSubcategoryName}
                        autoFocus
                        onSubmitEditing={() => handleAddSubcategory(cat.id)}
                      />
                      <TouchableOpacity onPress={() => handleAddSubcategory(cat.id)} style={styles.addSubButton}>
                        <Text style={styles.addSubButtonText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.subRow}
                      onPress={() => { setAddingSubFor(cat.id); setNewSubcategoryName(''); }}
                    >
                      <Text style={styles.addSubLabel}>+ New sub-category</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {showAddCategory ? (
          <View style={styles.addCategoryCard}>
            <View style={styles.addCategoryRow}>
              <TextInput
                style={styles.addCategoryEmojiInput}
                placeholder="📦"
                placeholderTextColor={Colors.outline}
                value={newCategoryEmoji}
                onChangeText={setNewCategoryEmoji}
                maxLength={4}
              />
              <TextInput
                style={styles.addCategoryNameInput}
                placeholder="Category name…"
                placeholderTextColor={Colors.outline}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus
                onSubmitEditing={handleAddCategory}
              />
            </View>
            <View style={styles.addCategoryActions}>
              <TouchableOpacity onPress={() => setShowAddCategory(false)} style={styles.addCategoryCancel}>
                <Text style={styles.addCategoryCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddCategory} style={styles.addCategoryConfirm}>
                <Text style={styles.addCategoryConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.newCategoryButton} onPress={() => setShowAddCategory(true)}>
            <Text style={styles.newCategoryButtonText}>+ New category</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  closeText: { ...Typography.bodyMd, color: Colors.primary, width: 70 },
  title: { ...Typography.titleLg, color: Colors.onSurface },

  content: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 48, gap: Spacing.sm },

  categoryCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  categoryEmoji: { fontSize: 22 },
  categoryName: { ...Typography.bodyMd, color: Colors.onSurface, flex: 1, fontFamily: 'WorkSans_500Medium' },
  chevron: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, paddingHorizontal: Spacing.xs },

  subList: { borderTopWidth: 1, borderTopColor: Colors.outlineVariant },
  subRow: { paddingHorizontal: Spacing.md, paddingVertical: 12, paddingLeft: Spacing.xl + Spacing.md },
  subName: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  addSubLabel: { ...Typography.bodySm, color: Colors.primary },
  addSubRow: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 10, paddingLeft: Spacing.xl + Spacing.md,
  },
  addSubInput: {
    flex: 1, ...Typography.bodySm, color: Colors.onSurface,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  addSubButton: {
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
  },
  addSubButtonText: { ...Typography.labelSm, color: Colors.onPrimary, letterSpacing: 0 },

  newCategoryButton: {
    marginTop: Spacing.sm, paddingVertical: Spacing.md, alignItems: 'center',
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant, borderStyle: 'dashed',
  },
  newCategoryButtonText: { ...Typography.bodyMd, color: Colors.primary, fontFamily: 'WorkSans_500Medium' },

  addCategoryCard: {
    marginTop: Spacing.sm, padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
    gap: Spacing.md,
  },
  addCategoryRow: { flexDirection: 'row', gap: Spacing.sm },
  addCategoryEmojiInput: {
    width: 56, textAlign: 'center', ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.md, paddingVertical: 8,
  },
  addCategoryNameInput: {
    flex: 1, ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  addCategoryActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md },
  addCategoryCancel: { paddingVertical: 8, paddingHorizontal: Spacing.md },
  addCategoryCancelText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  addCategoryConfirm: { paddingVertical: 8, paddingHorizontal: Spacing.md, backgroundColor: Colors.primary, borderRadius: Radius.md },
  addCategoryConfirmText: { ...Typography.bodySm, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
});
```

Note: `MainStackParamList['CategoryPicker']` passes a function (`onSelect`) through navigation params. React Navigation will log a "Non-serializable values were found in the navigation state" warning for this route. This is expected and acceptable for v0 — do not attempt to work around it (e.g. with a global event bus or an `id`-based param); the contract fixes this exact signature and Plans 3–7 rely on it unchanged.

- [ ] Verify: run `npx tsc --noEmit` from `apps/raqm/`. Expected: no errors.
- [ ] Device verification (spec IDs C1, C3, C4, C5, C6): this screen has no direct nav entry point until Task 5 wires it from Add/Edit — verify via Task 5's device checklist.
- [ ] Commit (skip if user has not approved commits): `feat(raqm): implement CategoryPickerScreen with custom category/subcategory creation`

---

## Task 5: AddTransactionScreen + EditTransactionScreen — manual entry, edit, category rules on save

**Files:**
- Modify (full rewrite): `apps/raqm/src/screens/main/AddTransactionScreen.tsx`
- Modify (full rewrite): `apps/raqm/src/screens/main/EditTransactionScreen.tsx`

**Interfaces:**
- Consumes: `useTxStore` (`add`, `update`) (Task 2), `getTxById`, `getCategories`, `getSubcategories`, `upsertCategoryRule` (Task 1), `MainStackScreenProps<'AddTransaction' | 'EditTransaction'>`, navigates to `CategoryPicker` (Task 4) via `navigation.navigate('CategoryPicker', { onSelect })`.
- Produces: nothing new — these are leaf screens; C7's "apply" side (`getCategoryRuleForMerchant` inside `insertParsedTx`) was already wired in Task 1.

### Steps

- [ ] Replace the full contents of `apps/raqm/src/screens/main/AddTransactionScreen.tsx`:

```tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getCategories } from '../../db/database';
import type { Category } from '../../db/database';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function AddTransactionScreen({ navigation }: MainStackScreenProps<'AddTransaction'>) {
  const addTx = useTxStore((s) => s.add);

  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [merchant, setMerchant] = useState('');
  const [bankName, setBankName] = useState('Cash');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>(undefined);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  const parsedAmount = parseFloat(amount);
  const canSave = !Number.isNaN(parsedAmount) && parsedAmount > 0 && bankName.trim().length > 0;

  const openCategoryPicker = () => {
    navigation.navigate('CategoryPicker', {
      onSelect: async (selectedCategoryId: number, selectedSubcategoryId?: number) => {
        setCategoryId(selectedCategoryId);
        setSubcategoryId(selectedSubcategoryId);
        const categories: Category[] = await getCategories();
        const cat = categories.find((c) => c.id === selectedCategoryId);
        setCategoryLabel(cat ? `${cat.emoji} ${cat.name}` : null);
      },
    });
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setNewTag('');
      return;
    }
    setTags([...tags, trimmed]);
    setNewTag('');
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSave = async () => {
    if (!canSave) return;
    await addTx({
      amount: parsedAmount,
      type,
      merchant: merchant.trim() || null,
      bankName: bankName.trim(),
      timestamp: date.getTime(),
      categoryId,
      subcategoryId: subcategoryId ?? null,
      notes: notes.trim() || null,
      tags,
      isManual: true,
    });
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>✕ Close</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Transaction</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0"
          placeholderTextColor={Colors.outline}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segment, type === TransactionType.EXPENSE && styles.segmentActive]}
            onPress={() => setType(TransactionType.EXPENSE)}
          >
            <Text style={[styles.segmentText, type === TransactionType.EXPENSE && styles.segmentTextActive]}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, type === TransactionType.INCOME && styles.segmentActive]}
            onPress={() => setType(TransactionType.INCOME)}
          >
            <Text style={[styles.segmentText, type === TransactionType.INCOME && styles.segmentTextActive]}>Income</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Merchant</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Blue Tokai Coffee"
          placeholderTextColor={Colors.outline}
          value={merchant}
          onChangeText={setMerchant}
        />

        <Text style={styles.label}>Account / Bank</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Cash, HDFC"
          placeholderTextColor={Colors.outline}
          value={bankName}
          onChangeText={setBankName}
        />

        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateRowText}>{fmtDate(date.getTime())}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onValueChange={(_event, selected) => {
              setShowDatePicker(false);
              if (selected) setDate(selected);
            }}
            onDismiss={() => setShowDatePicker(false)}
          />
        )}

        <Text style={styles.label}>Category</Text>
        <TouchableOpacity style={styles.categoryRow} onPress={openCategoryPicker}>
          <Text style={styles.categoryRowText}>{categoryLabel ?? 'Choose a category'}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Optional note…"
          placeholderTextColor={Colors.outline}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Text style={styles.label}>Tags</Text>
        <View style={styles.tagsWrap}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagChipText}>{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(tag)}>
                <Text style={styles.tagChipRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={styles.tagInputRow}>
          <TextInput
            style={styles.tagInput}
            placeholder="Add tag…"
            placeholderTextColor={Colors.outline}
            value={newTag}
            onChangeText={setNewTag}
            onSubmitEditing={addTag}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={addTag} style={styles.tagAddButton}>
            <Text style={styles.tagAddButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveButtonText}>Save transaction</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  closeText: { ...Typography.bodyMd, color: Colors.primary, width: 70 },
  title: { ...Typography.titleLg, color: Colors.onSurface },

  content: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 48 },
  label: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginTop: Spacing.lg, marginBottom: Spacing.sm },

  amountInput: {
    ...Typography.numericLg, color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },

  segmentRow: { flexDirection: 'row', gap: Spacing.sm },
  segment: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  segmentActive: { backgroundColor: Colors.primaryContainer, borderColor: Colors.primary },
  segmentText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  segmentTextActive: { color: Colors.onPrimaryContainer, fontFamily: 'WorkSans_500Medium' },

  textInput: {
    ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },

  dateRow: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  dateRowText: { ...Typography.bodyMd, color: Colors.onSurface },

  categoryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  categoryRowText: { ...Typography.bodyMd, color: Colors.onSurface },
  chevron: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },

  notesInput: {
    ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    minHeight: 72, textAlignVertical: 'top',
  },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  tagChipText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  tagChipRemove: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  tagInputRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  tagInput: {
    flex: 1, ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  tagAddButton: {
    paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
  },
  tagAddButtonText: { ...Typography.bodySm, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },

  saveButton: {
    marginTop: Spacing.xl, paddingVertical: Spacing.md, alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.xl,
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { ...Typography.bodyMd, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
});
```

- [ ] Replace the full contents of `apps/raqm/src/screens/main/EditTransactionScreen.tsx`:

```tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getTxById, getCategories, upsertCategoryRule } from '../../db/database';
import type { Category } from '../../db/database';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function EditTransactionScreen({ route, navigation }: MainStackScreenProps<'EditTransaction'>) {
  const { transactionId } = route.params;
  const updateTx = useTxStore((s) => s.update);

  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>(undefined);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    (async () => {
      const tx = await getTxById(transactionId);
      if (!tx) {
        setLoading(false);
        return;
      }
      setAmount(String(tx.amount));
      setType(tx.type);
      setMerchant(tx.merchant ?? '');
      setDate(new Date(tx.timestamp));
      setCategoryId(tx.categoryId);
      setSubcategoryId(tx.subcategoryId ?? undefined);
      setNotes(tx.notes ?? '');
      setTags(tx.tags ?? []);
      if (tx.categoryId != null) {
        const categories = await getCategories();
        const cat = categories.find((c) => c.id === tx.categoryId);
        setCategoryLabel(cat ? `${cat.emoji} ${cat.name}` : null);
      }
      setLoading(false);
    })();
  }, [transactionId]);

  const parsedAmount = parseFloat(amount);
  const canSave = !Number.isNaN(parsedAmount) && parsedAmount > 0;

  const openCategoryPicker = () => {
    navigation.navigate('CategoryPicker', {
      onSelect: async (selectedCategoryId: number, selectedSubcategoryId?: number) => {
        setCategoryId(selectedCategoryId);
        setSubcategoryId(selectedSubcategoryId);
        const categories: Category[] = await getCategories();
        const cat = categories.find((c) => c.id === selectedCategoryId);
        setCategoryLabel(cat ? `${cat.emoji} ${cat.name}` : null);
      },
    });
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setNewTag('');
      return;
    }
    setTags([...tags, trimmed]);
    setNewTag('');
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSave = async () => {
    if (!canSave) return;
    const trimmedMerchant = merchant.trim();
    await updateTx(transactionId, {
      amount: parsedAmount,
      type,
      merchant: trimmedMerchant || null,
      timestamp: date.getTime(),
      categoryId,
      subcategoryId: subcategoryId ?? null,
      notes: notes.trim() || null,
      tags,
    });
    // C7: remember merchant → category mapping for future auto-categorization.
    if (trimmedMerchant && categoryId != null) {
      await upsertCategoryRule(trimmedMerchant, categoryId, subcategoryId ?? null);
    }
    navigation.goBack();
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Transaction</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0"
          placeholderTextColor={Colors.outline}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segment, type === TransactionType.EXPENSE && styles.segmentActive]}
            onPress={() => setType(TransactionType.EXPENSE)}
          >
            <Text style={[styles.segmentText, type === TransactionType.EXPENSE && styles.segmentTextActive]}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, type === TransactionType.INCOME && styles.segmentActive]}
            onPress={() => setType(TransactionType.INCOME)}
          >
            <Text style={[styles.segmentText, type === TransactionType.INCOME && styles.segmentTextActive]}>Income</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Merchant</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Blue Tokai Coffee"
          placeholderTextColor={Colors.outline}
          value={merchant}
          onChangeText={setMerchant}
        />

        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateRowText}>{fmtDate(date.getTime())}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onValueChange={(_event, selected) => {
              setShowDatePicker(false);
              if (selected) setDate(selected);
            }}
            onDismiss={() => setShowDatePicker(false)}
          />
        )}

        <Text style={styles.label}>Category</Text>
        <TouchableOpacity style={styles.categoryRow} onPress={openCategoryPicker}>
          <Text style={styles.categoryRowText}>{categoryLabel ?? 'Choose a category'}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Optional note…"
          placeholderTextColor={Colors.outline}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Text style={styles.label}>Tags</Text>
        <View style={styles.tagsWrap}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagChipText}>{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(tag)}>
                <Text style={styles.tagChipRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={styles.tagInputRow}>
          <TextInput
            style={styles.tagInput}
            placeholder="Add tag…"
            placeholderTextColor={Colors.outline}
            value={newTag}
            onChangeText={setNewTag}
            onSubmitEditing={addTag}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={addTag} style={styles.tagAddButton}>
            <Text style={styles.tagAddButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text style={styles.saveButtonText}>Save changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  backText: { ...Typography.bodyMd, color: Colors.primary, width: 70 },
  title: { ...Typography.titleLg, color: Colors.onSurface },

  content: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 48 },
  label: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginTop: Spacing.lg, marginBottom: Spacing.sm },

  amountInput: {
    ...Typography.numericLg, color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },

  segmentRow: { flexDirection: 'row', gap: Spacing.sm },
  segment: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  segmentActive: { backgroundColor: Colors.primaryContainer, borderColor: Colors.primary },
  segmentText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  segmentTextActive: { color: Colors.onPrimaryContainer, fontFamily: 'WorkSans_500Medium' },

  textInput: {
    ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },

  dateRow: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  dateRowText: { ...Typography.bodyMd, color: Colors.onSurface },

  categoryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  categoryRowText: { ...Typography.bodyMd, color: Colors.onSurface },
  chevron: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },

  notesInput: {
    ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    minHeight: 72, textAlignVertical: 'top',
  },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  tagChipText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  tagChipRemove: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  tagInputRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  tagInput: {
    flex: 1, ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  tagAddButton: {
    paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
  },
  tagAddButtonText: { ...Typography.bodySm, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },

  saveButton: {
    marginTop: Spacing.xl, paddingVertical: Spacing.md, alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.xl,
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { ...Typography.bodyMd, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
});
```

- [ ] Verify: run `npx tsc --noEmit` from `apps/raqm/`. Expected: no errors.
- [ ] Device verification (spec IDs T3, T4, C4, C7):
  - [ ] T3: from Transactions tab, tap the FAB → fill amount/type/merchant/bank/date/category/notes/tags → Save → new row appears at top of Transactions list and updates Dashboard's net cash flow.
  - [ ] C4: tapping "Choose a category" opens `CategoryPickerScreen`; selecting a category (or category+subcategory) closes it and shows the chosen label back on the Add/Edit form.
  - [ ] T4: open a transaction's detail → Edit → change amount/category/merchant/date → Save → detail screen and Transactions list reflect the change.
  - [ ] C7: on Edit, set merchant to a new value and assign a category, Save. Create a new manual transaction (or simulate a parsed SMS via `insertParsedTx`) with the same merchant string — it should auto-receive the same category on insert (verify by checking `category_rules` table content or by re-opening the newly inserted transaction's detail screen and seeing the category pre-filled).
- [ ] Commit (skip if user has not approved commits): `feat(raqm): implement Add/Edit transaction forms with category rule learning on save`

---

## Verification Checklist

Spec checkbox items relevant to this plan (copied verbatim from `docs/superpowers/specs/2026-07-02-raqm-v0-design.md` §7):

### SMS Scanning
- [ ] S6: Raw SMS body visible in TransactionDetailScreen under "Other Info"

### Transaction Management
- [ ] T3: Add cash transaction form submits and appears in Transactions list
- [ ] T4: Edit transaction saves changes to amount, category, merchant, date
- [ ] T5: Notes can be added to a transaction and persist
- [ ] T6: Tags can be added and displayed on detail screen
- [ ] T10: Delete shows undo snackbar; transaction gone after 5s

### Categories
- [ ] C1: 15 default categories visible in CategoryPickerScreen
- [ ] C2: SMS with "salary" keyword auto-categorized as Salary
- [ ] C3: Default sub-categories visible under parent categories
- [ ] C4: Assigning category to transaction persists and shows on detail
- [ ] C5: Custom sub-category can be created and assigned
- [ ] C6: Custom category with emoji can be created
- [ ] C7: Category rule applied on next edit of same merchant
