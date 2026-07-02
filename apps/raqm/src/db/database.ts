import * as SQLite from 'expo-sqlite';
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
