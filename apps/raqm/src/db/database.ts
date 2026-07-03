import * as SQLite from 'expo-sqlite';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';

let db: SQLite.SQLiteDatabase | null = null;

async function runMigrations(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.runAsync(
    `CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER NOT NULL)`,
  );
  const row = await database.getFirstAsync<{ v: number | null }>(
    `SELECT MAX(version) as v FROM schema_migrations`,
  );
  const current = row?.v ?? 0;

  if (current < 1) {
    await database.runAsync(`BEGIN`);
    try {
      await database.runAsync(`
        CREATE TABLE IF NOT EXISTS transactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount REAL NOT NULL,
          type TEXT NOT NULL,
          merchant TEXT,
          bankName TEXT NOT NULL,
          accountLast4 TEXT,
          timestamp INTEGER NOT NULL,
          balance REAL,
          currency TEXT NOT NULL DEFAULT '₹',
          isFromCard INTEGER NOT NULL DEFAULT 0
        )
      `);
      await database.runAsync(
        `CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC)`,
      );
      await database.runAsync(`INSERT INTO schema_migrations VALUES (1)`);
      await database.runAsync(`COMMIT`);
    } catch (e) {
      await database.runAsync(`ROLLBACK`);
      throw e;
    }
  }

  if (current < 2) {
    await database.runAsync(`BEGIN`);
    try {
      // New columns on transactions
      const newCols: [string, string][] = [
        ['category_id', 'INTEGER'],
        ['subcategory_id', 'INTEGER'],
        ['notes', 'TEXT'],
        ['tags', 'TEXT'],
        ['raw_sms', 'TEXT'],
        ['lat', 'REAL'],
        ['lng', 'REAL'],
        ['deleted_at', 'INTEGER'],
        ['recurring', 'INTEGER DEFAULT 0'],
        ['is_manual', 'INTEGER DEFAULT 0'],
        ['link_type', 'TEXT'],
        ['link_partner_id', 'INTEGER'],
        ['link_settled', 'INTEGER DEFAULT 0'],
        ['is_split_child', 'INTEGER DEFAULT 0'],
        ['split_parent_id', 'INTEGER'],
        ['group_id', 'INTEGER'],
      ];
      for (const [col, type] of newCols) {
        try {
          await database.runAsync(
            `ALTER TABLE transactions ADD COLUMN ${col} ${type}`,
          );
        } catch {
          // column already exists — safe to ignore
        }
      }

      // Categories
      await database.runAsync(`
        CREATE TABLE IF NOT EXISTS categories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          emoji TEXT NOT NULL DEFAULT '💰',
          is_custom INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
        )
      `);
      await database.runAsync(`
        CREATE TABLE IF NOT EXISTS subcategories (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL REFERENCES categories(id),
          name TEXT NOT NULL,
          is_custom INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
        )
      `);
      await database.runAsync(`
        CREATE TABLE IF NOT EXISTS category_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          merchant_pattern TEXT NOT NULL,
          category_id INTEGER NOT NULL REFERENCES categories(id),
          subcategory_id INTEGER
        )
      `);

      // Transaction groups
      await database.runAsync(`
        CREATE TABLE IF NOT EXISTS transaction_groups (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
        )
      `);

      // Accounts
      await database.runAsync(`
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bank_name TEXT NOT NULL,
          last4 TEXT,
          is_card INTEGER NOT NULL DEFAULT 0,
          is_manual INTEGER NOT NULL DEFAULT 0,
          nickname TEXT,
          credit_limit REAL,
          due_date TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
        )
      `);

      // Budgets
      await database.runAsync(`
        CREATE TABLE IF NOT EXISTS budgets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          category_id INTEGER NOT NULL REFERENCES categories(id),
          amount REAL NOT NULL,
          period_type TEXT NOT NULL DEFAULT 'monthly',
          rollover INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
        )
      `);

      // Grocery
      await database.runAsync(`
        CREATE TABLE IF NOT EXISTS grocery_lists (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          budget_cap REAL,
          completed_at INTEGER,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
        )
      `);
      await database.runAsync(`
        CREATE TABLE IF NOT EXISTS grocery_items (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          list_id INTEGER NOT NULL REFERENCES grocery_lists(id),
          name TEXT NOT NULL,
          price REAL,
          checked_at INTEGER,
          sort_order INTEGER NOT NULL DEFAULT 0,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
        )
      `);

      // App settings
      await database.runAsync(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        )
      `);

      await database.runAsync(`INSERT INTO schema_migrations VALUES (2)`);
      await database.runAsync(`COMMIT`);
    } catch (e) {
      await database.runAsync(`ROLLBACK`);
      throw e;
    }
  }
}

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('raqm.db');
  await runMigrations(db);
  return db;
}

// ── Type helpers ─────────────────────────────────────────────────────────────

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

function parseTags(raw: unknown): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw as string);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
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
    tags: parseTags(row.tags),
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

export async function loadTransactions(): Promise<ParsedTransaction[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY timestamp DESC`,
  );
  return rows.map(rowToTx);
}

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

export async function clearTransactions(): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM transactions');
}

export async function getTransactionCount(): Promise<number> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE deleted_at IS NULL',
  );
  return row?.count ?? 0;
}

// ── Settings helpers ──────────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ value: string }>(
    `SELECT value FROM app_settings WHERE key = ?`,
    key,
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDb();
  await database.runAsync(
    `INSERT INTO app_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    key,
    value,
  );
}

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

let cachedSalaryCategoryId: number | null | undefined;

async function getSalaryCategoryId(): Promise<number | null> {
  if (cachedSalaryCategoryId !== undefined) return cachedSalaryCategoryId;
  const database = await getDb();
  const salaryCat = await database.getFirstAsync<{ id: number }>(
    `SELECT id FROM categories WHERE name = 'Salary' LIMIT 1`,
  );
  cachedSalaryCategoryId = salaryCat ? salaryCat.id : null;
  return cachedSalaryCategoryId;
}

// Shared categorization decision used by both insertParsedTx and insertParsedTxs.
// ruleCache lets batch callers avoid repeat DB lookups for the same merchant.
async function categorizeParsedTx(
  tx: ParsedTransaction,
  ruleCache?: Map<string, { categoryId: number; subcategoryId: number | null } | null>,
): Promise<{ categoryId: number | null; subcategoryId: number | null }> {
  let categoryId: number | null = null;
  let subcategoryId: number | null = null;

  // C7: apply an existing category rule for this merchant, if any.
  if (tx.merchant) {
    const merchantKey = tx.merchant.toLowerCase();
    let rule: { categoryId: number; subcategoryId: number | null } | null | undefined;
    if (ruleCache && ruleCache.has(merchantKey)) {
      rule = ruleCache.get(merchantKey);
    } else {
      rule = await getCategoryRuleForMerchant(tx.merchant);
      ruleCache?.set(merchantKey, rule ?? null);
    }
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
      categoryId = await getSalaryCategoryId();
    }
  }

  return { categoryId, subcategoryId };
}

export async function insertParsedTx(tx: ParsedTransaction): Promise<number> {
  const { categoryId, subcategoryId } = await categorizeParsedTx(tx);

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

export async function insertParsedTxs(txs: ParsedTransaction[]): Promise<void> {
  if (txs.length === 0) return;

  // Resolve categorization outside the transaction, caching rule lookups per unique merchant.
  const ruleCache = new Map<string, { categoryId: number; subcategoryId: number | null } | null>();
  const decisions = await Promise.all(txs.map((tx) => categorizeParsedTx(tx, ruleCache)));

  const database = await getDb();
  await database.runAsync('BEGIN');
  try {
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      const { categoryId, subcategoryId } = decisions[i];
      await database.runAsync(
        `INSERT INTO transactions
           (amount, type, merchant, bankName, accountLast4, timestamp, balance, currency, isFromCard,
            category_id, subcategory_id, raw_sms, is_manual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
        tx.amount,
        tx.type,
        tx.merchant ?? null,
        tx.bankName,
        tx.accountLast4 ?? null,
        tx.timestamp,
        tx.balance ?? null,
        tx.currency ?? '₹',
        tx.isFromCard ? 1 : 0,
        categoryId,
        subcategoryId,
        tx.smsBody ?? null,
      );
    }
    await database.runAsync('COMMIT');
  } catch (e) {
    await database.runAsync('ROLLBACK');
    throw e;
  }
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
  await database.runAsync('BEGIN');
  try {
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
    await database.runAsync('COMMIT');
  } catch (e) {
    await database.runAsync('ROLLBACK');
    throw e;
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

// ── Multi-row transaction ops (Plan 3) ─────────────────────────────────────────

export async function splitTx(
  parentId: number,
  parts: { amount: number; merchant?: string | null; categoryId?: number | null }[],
): Promise<void> {
  const parent = await getTxById(parentId);
  if (!parent) throw new Error(`splitTx: parent ${parentId} not found`);
  const partsSum = parts.reduce((s, p) => s + p.amount, 0);
  if (Math.abs(partsSum - parent.amount) > 0.01) {
    throw new Error(`splitTx: parts sum ${partsSum} does not match parent amount ${parent.amount}`);
  }
  const database = await getDb();
  await database.runAsync('BEGIN');
  try {
    await database.runAsync(`UPDATE transactions SET deleted_at = ? WHERE id = ?`, Date.now(), parentId);
    for (const part of parts) {
      await database.runAsync(
        `INSERT INTO transactions
           (amount, type, merchant, bankName, accountLast4, timestamp, balance, currency,
            isFromCard, category_id, raw_sms, is_manual, is_split_child, split_parent_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`,
        part.amount,
        parent.type,
        part.merchant ?? parent.merchant,
        parent.bankName,
        parent.accountLast4,
        parent.timestamp,
        null,
        parent.currency,
        parent.isFromCard ? 1 : 0,
        part.categoryId ?? null,
        parent.rawSms,
        parentId,
      );
    }
    await database.runAsync('COMMIT');
  } catch (e) {
    await database.runAsync('ROLLBACK');
    throw e;
  }
}

export async function mergeTxs(ids: number[], merchant: string): Promise<number> {
  if (ids.length < 2) throw new Error('mergeTxs: need at least 2 ids');
  const rows = await Promise.all(ids.map(id => getTxById(id)));
  const txs = rows.filter((t): t is NonNullable<typeof t> => t !== null);
  if (txs.length !== ids.length) throw new Error('mergeTxs: some ids not found');
  const sum = txs.reduce((s, t) => s + t.amount, 0);
  const earliest = txs.reduce((min, t) => Math.min(min, t.timestamp), txs[0].timestamp);
  const first = txs[0];

  const database = await getDb();
  let newId = 0;
  await database.runAsync('BEGIN');
  try {
    const result = await database.runAsync(
      `INSERT INTO transactions
         (amount, type, merchant, bankName, accountLast4, timestamp, balance, currency, isFromCard, is_manual)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      sum,
      first.type,
      merchant,
      first.bankName,
      first.accountLast4,
      earliest,
      null,
      first.currency,
      first.isFromCard ? 1 : 0,
    );
    newId = result.lastInsertRowId;
    const placeholders = ids.map(() => '?').join(',');
    await database.runAsync(
      `UPDATE transactions SET deleted_at = ? WHERE id IN (${placeholders})`,
      Date.now(),
      ...ids,
    );
    await database.runAsync('COMMIT');
  } catch (e) {
    await database.runAsync('ROLLBACK');
    throw e;
  }
  return newId;
}

export async function groupTxs(ids: number[], name: string): Promise<number> {
  if (ids.length < 2) throw new Error('groupTxs: need at least 2 ids');
  const database = await getDb();
  let groupId = 0;
  await database.runAsync('BEGIN');
  try {
    const result = await database.runAsync(`INSERT INTO transaction_groups (name) VALUES (?)`, name);
    groupId = result.lastInsertRowId;
    const placeholders = ids.map(() => '?').join(',');
    await database.runAsync(
      `UPDATE transactions SET group_id = ? WHERE id IN (${placeholders})`,
      groupId,
      ...ids,
    );
    await database.runAsync('COMMIT');
  } catch (e) {
    await database.runAsync('ROLLBACK');
    throw e;
  }
  return groupId;
}

export async function ungroupTx(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`UPDATE transactions SET group_id = NULL WHERE id = ?`, id);
}

export async function linkTxs(
  aId: number,
  bId: number,
  type: 'manual' | 'self_transfer' | 'refund',
): Promise<void> {
  const database = await getDb();
  await database.runAsync('BEGIN');
  try {
    await database.runAsync(
      `UPDATE transactions SET link_type = ?, link_partner_id = ? WHERE id = ?`,
      type, bId, aId,
    );
    await database.runAsync(
      `UPDATE transactions SET link_type = ?, link_partner_id = ? WHERE id = ?`,
      type, aId, bId,
    );
    await database.runAsync('COMMIT');
  } catch (e) {
    await database.runAsync('ROLLBACK');
    throw e;
  }
}

export async function unlinkTxs(aId: number): Promise<void> {
  const a = await getTxById(aId);
  if (!a) return;
  const database = await getDb();
  await database.runAsync('BEGIN');
  try {
    await database.runAsync(
      `UPDATE transactions SET link_type = NULL, link_partner_id = NULL, link_settled = 0 WHERE id = ?`,
      aId,
    );
    if (a.linkPartnerId != null) {
      await database.runAsync(
        `UPDATE transactions SET link_type = NULL, link_partner_id = NULL, link_settled = 0 WHERE id = ?`,
        a.linkPartnerId,
      );
    }
    await database.runAsync('COMMIT');
  } catch (e) {
    await database.runAsync('ROLLBACK');
    throw e;
  }
}

export async function setLinkSettled(aId: number, settled: boolean): Promise<void> {
  const a = await getTxById(aId);
  if (!a) return;
  const database = await getDb();
  await database.runAsync('BEGIN');
  try {
    await database.runAsync(`UPDATE transactions SET link_settled = ? WHERE id = ?`, settled ? 1 : 0, aId);
    if (a.linkPartnerId != null) {
      await database.runAsync(`UPDATE transactions SET link_settled = ? WHERE id = ?`, settled ? 1 : 0, a.linkPartnerId);
    }
    await database.runAsync('COMMIT');
  } catch (e) {
    await database.runAsync('ROLLBACK');
    throw e;
  }
}
