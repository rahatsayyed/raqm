import * as SQLite from 'expo-sqlite';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';
import type { ReconciliationCandidate, PlannedUpdate, PlannedInsert } from '../services/imports/reconcile';


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

  if (current < 3) {
    await database.runAsync(`BEGIN`);
    try {
      try {
        await database.runAsync(`ALTER TABLE grocery_lists ADD COLUMN linked_tx_id INTEGER`);
      } catch {
        // column already exists — safe to ignore
      }
      await database.runAsync(`INSERT INTO schema_migrations VALUES (3)`);
      await database.runAsync(`COMMIT`);
    } catch (e) {
      await database.runAsync(`ROLLBACK`);
      throw e;
    }
  }

  if (current < 4) {
    await database.runAsync(`BEGIN`);
    try {
      try {
        // Remembers the pre-toggle type when a transaction is marked "doesn't
        // count toward totals" (type flipped to BALANCE_UPDATE), so re-enabling
        // restores the original type instead of guessing EXPENSE for everything.
        await database.runAsync(`ALTER TABLE transactions ADD COLUMN original_type TEXT`);
      } catch {
        // column already exists — safe to ignore
      }
      await database.runAsync(`INSERT INTO schema_migrations VALUES (4)`);
      await database.runAsync(`COMMIT`);
    } catch (e) {
      await database.runAsync(`ROLLBACK`);
      throw e;
    }
  }

  if (current < 5) {
    await database.runAsync(`BEGIN`);
    try {
      try {
        // The parser already extracts a bank reference/UTR number
        // (ParsedTransaction.reference) — this column persists it so the
        // Transaction Detail screen can show it instead of fabricating one.
        await database.runAsync(`ALTER TABLE transactions ADD COLUMN reference TEXT`);
      } catch {
        // column already exists — safe to ignore
      }
      await database.runAsync(`INSERT INTO schema_migrations VALUES (5)`);
      await database.runAsync(`COMMIT`);
    } catch (e) {
      await database.runAsync(`ROLLBACK`);
      throw e;
    }
  }

  if (current < 6) {
    await database.runAsync(`BEGIN`);
    try {
      // Manually-added dues (rent, EMIs, anything not detected from SMS as a
      // recurring merchant) — surfaced alongside detected recurring charges on
      // the Dues & Reminders section.
      await database.runAsync(`
        CREATE TABLE IF NOT EXISTS reminders (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          amount REAL NOT NULL,
          due_date INTEGER NOT NULL,
          currency TEXT,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s','now') * 1000)
        )
      `);
      await database.runAsync(`INSERT INTO schema_migrations VALUES (6)`);
      await database.runAsync(`COMMIT`);
    } catch (e) {
      await database.runAsync(`ROLLBACK`);
      throw e;
    }
  }

  if (current < 7) {
    await database.runAsync(`BEGIN`);
    try {
      // Persisted running balance per account, kept in sync as transactions with a
      // parsed balance arrive — see updateAccountBalanceFromTx.
      await database.runAsync(`ALTER TABLE accounts ADD COLUMN balance REAL`);
      await database.runAsync(`ALTER TABLE accounts ADD COLUMN balance_updated_at INTEGER`);
      await database.runAsync(`INSERT INTO schema_migrations VALUES (7)`);
      await database.runAsync(`COMMIT`);
    } catch (e) {
      await database.runAsync(`ROLLBACK`);
      throw e;
    }
  }

  if (current < 8) {
    await database.runAsync(`BEGIN`);
    try {
      // Category picker was showing the exact same expense-flavored list (Groceries,
      // Transport, ...) for income/credit transactions too. 'direction' tags each
      // category so the picker can filter to what's relevant; 'both' categories (Gifts,
      // Investments, Other) show up regardless of the transaction's direction.
      await database.runAsync(`ALTER TABLE categories ADD COLUMN direction TEXT NOT NULL DEFAULT 'expense'`);

      // Only backfill for an install that was already seeded under the old flat category
      // list — a brand-new install (categories table still empty at this point) gets the
      // full new set from DEFAULT_CATEGORIES via seedDefaults() instead. Inserting here
      // unconditionally would make seedDefaults() see a non-zero count and skip its own
      // seeding, leaving a fresh install with only these rows and none of the rest.
      const catCountRow = await database.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count FROM categories`,
      );
      if ((catCountRow?.count ?? 0) > 0) {
        await database.runAsync(`UPDATE categories SET direction = 'income' WHERE name = 'Salary'`);
        await database.runAsync(`UPDATE categories SET direction = 'both' WHERE name IN ('Gifts', 'Investments', 'Other')`);
        await database.runAsync(`UPDATE categories SET name = 'Food & Drinks' WHERE name = 'Food & Dining'`);
        await database.runAsync(`UPDATE categories SET name = 'Bills' WHERE name = 'Bills & Utilities'`);

        for (const [name, emoji, direction] of NEW_V8_CATEGORIES) {
          const existing = await database.getFirstAsync<{ id: number }>(
            `SELECT id FROM categories WHERE name = ?`,
            name,
          );
          if (!existing) {
            await database.runAsync(
              `INSERT INTO categories (name, emoji, is_custom, direction) VALUES (?, ?, 0, ?)`,
              name,
              emoji,
              direction,
            );
          }
        }
      }

      await database.runAsync(`INSERT INTO schema_migrations VALUES (8)`);
      await database.runAsync(`COMMIT`);
    } catch (e) {
      await database.runAsync(`ROLLBACK`);
      throw e;
    }
  }

  if (current < 9) {
    await database.runAsync(`BEGIN`);
    try {
      // Nullable timestamp (not a boolean), matching the deleted_at idiom already used on
      // transactions — lets a hidden account remember when it was hidden.
      await database.runAsync(`ALTER TABLE accounts ADD COLUMN hidden_at INTEGER`);
      await database.runAsync(`INSERT INTO schema_migrations VALUES (9)`);
      await database.runAsync(`COMMIT`);
    } catch (e) {
      await database.runAsync(`ROLLBACK`);
      throw e;
    }
  }

  if (current < 10) {
    await database.runAsync(`BEGIN`);
    try {
      // "Not an expense" used to be represented by flipping type to BALANCE_UPDATE (stashing
      // the real type in original_type) — a second, separate mechanism from link_settled,
      // which countsTowardTotals() actually checks and which the "Not An Expense" notification
      // action already used. The two never agreed, so TransactionDetailScreen's toggle and the
      // notification action silently diverged. Standardizing on link_settled as the one
      // "excluded from totals" flag: migrate any row previously toggled off via the old
      // mechanism (recognizable by having original_type set — genuine balance-correction stub
      // rows from the balance-mismatch flow never set it) back to its real type, marked settled.
      await database.runAsync(
        `UPDATE transactions SET type = original_type, link_settled = 1, original_type = NULL
         WHERE type = 'balance_update' AND original_type IS NOT NULL`,
      );
      await database.runAsync(`INSERT INTO schema_migrations VALUES (10)`);
      await database.runAsync(`COMMIT`);
    } catch (e) {
      await database.runAsync(`ROLLBACK`);
      throw e;
    }
  }

  if (current < 11) {
    await database.runAsync(`BEGIN`);
    try {
      // Speeds up the merchant majority-vote categorization lookup (categorizeParsedTx),
      // which groups this merchant's transactions by category_id — cheap even without the
      // index at real-world per-merchant row counts, but keeps it cheap during full rescans.
      await database.runAsync(
        `CREATE INDEX IF NOT EXISTS idx_transactions_merchant ON transactions(merchant)`,
      );
      await database.runAsync(`INSERT INTO schema_migrations VALUES (11)`);
      await database.runAsync(`COMMIT`);
    } catch (e) {
      await database.runAsync(`ROLLBACK`);
      throw e;
    }
  }

  if (current < 12) {
    await database.runAsync(`BEGIN`);
    try {
      // Second ingestion source: bank/UPI app notifications (opt-in). DEFAULT 'sms' means
      // every pre-existing row is correctly labelled with no backfill pass, and every
      // insert path that doesn't know about sources keeps producing 'sms' rows.
      await database.runAsync(
        `ALTER TABLE transactions ADD COLUMN source TEXT NOT NULL DEFAULT 'sms'`,
      );
      // The cross-source duplicate check (findCrossSourceDuplicate) filters by
      // source + amount inside a ±2 min timestamp window on every single insert —
      // keep that a range scan, not a full-table scan, at 5k+ rows.
      await database.runAsync(
        `CREATE INDEX IF NOT EXISTS idx_transactions_source_amount ON transactions(source, amount)`,
      );
      await database.runAsync(`INSERT INTO schema_migrations VALUES (12)`);
      await database.runAsync(`COMMIT`);
    } catch (e) {
      await database.runAsync(`ROLLBACK`);
      throw e;
    }
  }

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
}

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export function getDb(): Promise<SQLite.SQLiteDatabase> {
  // Cache the promise, not the handle: concurrent callers during startup must all
  // await the same open+migrate sequence. Caching the handle after migrations let a
  // second caller open a duplicate connection (finalized handle → prepareAsync NPE)
  // or query a half-migrated database.
  if (!dbPromise) {
    dbPromise = (async () => {
      const database = await SQLite.openDatabaseAsync('raqm.db');
      await runMigrations(database);
      return database;
    })().catch((e) => {
      dbPromise = null; // allow retry after a failed open/migration
      throw e;
    });
  }
  return dbPromise;
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

/** Which ingestion pipeline produced a transaction row. Added in migration v12. */
export type TxSource = 'sms' | 'notification';

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
  reference: string | null;
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
  /** Type to restore when re-enabling "counts toward totals" (see TxPatch.type). */
  originalType: TransactionType | null;
  /** Ingestion source. Legacy rows and every SMS/CSV/manual path are 'sms'. */
  source: TxSource;
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
  reference?: string | null;
  lat?: number | null;
  lng?: number | null;
  isManual?: boolean;
  linkSettled?: boolean;
  source?: TxSource;
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
  originalType?: TransactionType | null;
  rawSms?: string | null;
  reference?: string | null;
  bankName?: string;
  accountLast4?: string | null;
}

export interface Category {
  id: number;
  name: string;
  emoji: string;
  isCustom: boolean;
  direction: 'expense' | 'income' | 'both';
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
    reference: (row.reference as string | null) ?? null,
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
    originalType: (row.original_type as TransactionType | null) ?? null,
    source: (row.source as TxSource | null) ?? 'sms',
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
       (amount, type, merchant, bankName, accountLast4, timestamp, balance, currency, isFromCard, raw_sms, reference)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    tx.reference ?? null,
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

export async function clearScannedTransactions(): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM transactions WHERE is_manual = 0');
}

/**
 * Newest scanned-transaction timestamp INCLUDING soft-deleted rows — the incremental
 * scan uses this as its lower bound, so a pulled refresh never resurrects an SMS the
 * user deleted (deleted rows still mark their timestamp as "already seen").
 */
export async function getNewestScannedTimestamp(): Promise<number | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ m: number | null }>(
    'SELECT MAX(timestamp) as m FROM transactions WHERE is_manual = 0',
  );
  return row?.m ?? null;
}

/**
 * Identity keys (`bankName|amount|timestamp`) of every scanned transaction in a window,
 * INCLUDING soft-deleted rows — a missing-only scan must treat user-deleted transactions
 * as "already seen" so it never re-adds them.
 */
export async function getScannedIdentitiesSince(from: number): Promise<Set<string>> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ bankName: string; amount: number; timestamp: number }>(
    'SELECT bankName, amount, timestamp FROM transactions WHERE is_manual = 0 AND timestamp >= ?',
    from,
  );
  return new Set(rows.map(r => `${r.bankName}|${r.amount}|${r.timestamp}`));
}

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
    link_settled: number;
  }>(
    `SELECT id, amount, type, timestamp, category_id, notes, tags, accountLast4, link_settled
     FROM transactions
     WHERE deleted_at IS NULL AND type IN ('EXPENSE', 'INCOME')`,
  );
  return rows.map((r) => ({
    id: r.id,
    amount: r.amount,
    type: r.type === 'EXPENSE' ? 'expense' : 'income',
    timestamp: r.timestamp,
    categoryId: r.category_id,
    notes: r.notes,
    tags: parseTags(r.tags),
    last4: r.accountLast4,
    linkSettled: r.link_settled === 1,
  }));
}

/** Soft-deleted transactions, newest deletion first — the "Deleted transactions" screen. */
export async function loadDeletedTxRecords(): Promise<TxRecord[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM transactions WHERE deleted_at IS NOT NULL ORDER BY deleted_at DESC',
  );
  return rows.map(rowToTxRecord);
}

/** Soft-deletes every live transaction of an account (recoverable via the Deleted screen). */
export async function softDeleteAccountTxs(bankName: string, last4: string | null): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `UPDATE transactions SET deleted_at = ?
     WHERE deleted_at IS NULL AND bankName = ? AND COALESCE(accountLast4, '') = ?`,
    Date.now(),
    bankName,
    last4 ?? '',
  );
  return result.changes;
}

/**
 * Restores every soft-deleted transaction of an account — their categories, notes, tags,
 * and links come back intact, which is why account re-add restores instead of re-inserting.
 */
export async function restoreAccountTxs(bankName: string, last4: string | null): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `UPDATE transactions SET deleted_at = NULL
     WHERE deleted_at IS NOT NULL AND bankName = ? AND COALESCE(accountLast4, '') = ?`,
    bankName,
    last4 ?? '',
  );
  return result.changes;
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

const DISMISSED_MISMATCHES_KEY = 'dismissed_balance_mismatches';
const DISMISSED_MISMATCHES_MAX = 200;

/**
 * Balance-mismatch cards dismissed from Dashboard's Needs Attention stack — keyed per
 * specific mismatch (bank+last4+txId), not per account, so a *new* mismatch on the same
 * account still surfaces even after an older one was dismissed.
 */
export async function getDismissedMismatchKeys(): Promise<Set<string>> {
  const raw = await getSetting(DISMISSED_MISMATCHES_KEY);
  if (!raw) return new Set();
  try {
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export async function dismissMismatchKey(key: string): Promise<void> {
  const existing = await getDismissedMismatchKeys();
  existing.add(key);
  const trimmed = Array.from(existing).slice(-DISMISSED_MISMATCHES_MAX);
  await setSetting(DISMISSED_MISMATCHES_KEY, JSON.stringify(trimmed));
}

const NOTIFICATION_SOURCE_ENABLED_KEY = 'notification_source_enabled';
const MONITORED_PACKAGES_KEY = 'notification_monitored_packages';

/** Master opt-in for reading bank/UPI app notifications as a transaction source. Default off. */
export async function getNotificationSourceEnabled(): Promise<boolean> {
  return (await getSetting(NOTIFICATION_SOURCE_ENABLED_KEY)) === '1';
}

export async function setNotificationSourceEnabled(enabled: boolean): Promise<void> {
  await setSetting(NOTIFICATION_SOURCE_ENABLED_KEY, enabled ? '1' : '0');
}

/**
 * App package names the user has opted into monitoring. Stored as a JSON array in the
 * string-valued app_settings table (same convention as dismissed_balance_mismatches) and
 * serialized/deserialized here at the call site.
 */
export async function getMonitoredNotificationPackages(): Promise<string[]> {
  const raw = await getSetting(MONITORED_PACKAGES_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === 'string') : [];
  } catch {
    return [];
  }
}

export async function setMonitoredNotificationPackages(packages: string[]): Promise<void> {
  await setSetting(MONITORED_PACKAGES_KEY, JSON.stringify(Array.from(new Set(packages))));
}

const UNSUPPORTED_NOTIFICATIONS_KEY = 'unsupported_notifications';
const UNSUPPORTED_NOTIFICATIONS_MAX = 100;

export interface UnsupportedNotification {
  packageName: string;
  appName: string;
  title: string;
  text: string;
  timestamp: number;
}

/**
 * Notifications from a monitored app that no parser understood. Kept so the user can
 * surface and report the format (Report Undetected SMS & Apps) — notifications are
 * transient, so unlike SMS there is nothing to re-read later if we don't keep it.
 * Capped, newest-last, and de-duplicated on app+text so a repeated format doesn't
 * flood out the other apps' samples.
 */
export async function getUnsupportedNotifications(): Promise<UnsupportedNotification[]> {
  const raw = await getSetting(UNSUPPORTED_NOTIFICATIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as UnsupportedNotification[]) : [];
  } catch {
    return [];
  }
}

export async function recordUnsupportedNotification(entry: UnsupportedNotification): Promise<void> {
  const existing = await getUnsupportedNotifications();
  const isSame = (e: UnsupportedNotification) =>
    e.packageName === entry.packageName && e.title === entry.title && e.text === entry.text;
  const next = [...existing.filter((e) => !isSame(e)), entry].slice(-UNSUPPORTED_NOTIFICATIONS_MAX);
  await setSetting(UNSUPPORTED_NOTIFICATIONS_KEY, JSON.stringify(next));
}

// ── Plan 2: TxRecord CRUD ─────────────────────────────────────────────────────

// Hidden accounts are excluded here — the single source txStore loads from — rather than
// filtered per-screen, so hiding an account removes its transactions from every list/total
// consistently (Dashboard, Analytics, Transactions, budgets, exports...) with one change.
// Unlike soft-delete, nothing is mutated on the transactions themselves: unhiding restores
// full visibility immediately, and the `accounts` table (tiny) makes this correlated
// subquery cheap even against thousands of transaction rows.
export async function loadTxRecords(): Promise<TxRecord[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM transactions t WHERE deleted_at IS NULL
     AND NOT EXISTS (
       SELECT 1 FROM accounts a
       WHERE a.hidden_at IS NOT NULL AND a.bank_name = t.bankName AND IFNULL(a.last4, '') = IFNULL(t.accountLast4, '')
     )
     ORDER BY timestamp DESC`,
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
        category_id, subcategory_id, notes, tags, raw_sms, reference, lat, lng, is_manual, link_settled, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
    input.reference ?? null,
    input.lat ?? null,
    input.lng ?? null,
    input.isManual ? 1 : 0,
    input.linkSettled ? 1 : 0,
    input.source ?? 'sms',
  );
  if (input.balance != null) {
    await updateAccountBalanceFromTx({
      bankName: input.bankName,
      last4: input.accountLast4 ?? null,
      balance: input.balance,
      timestamp: input.timestamp,
      isFromCard: input.isFromCard ?? false,
    });
  }
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

// Merchant names for well-known online/e-commerce and food-delivery platforms. There's no
// structured "online vs in-person" signal anywhere in a bank SMS or the parser's output —
// this is the same keyword-heuristic approach already used for grocery detection
// (GROCERY_KEYWORDS in DashboardScreen.tsx), just centralized here so it applies to every
// insert path (live SMS and bulk rescan) instead of only one screen.
const ONLINE_MERCHANT_KEYWORDS =
  /amazon|flipkart|myntra|ajio|nykaa|meesho|swiggy|zomato|dominos|domino's|pizza\s*hut|uber\s*eats|zepto|blinkit|bigbasket|instamart/i;

function getAutoTags(merchant: string | null | undefined): string[] {
  return merchant && ONLINE_MERCHANT_KEYWORDS.test(merchant) ? ['online'] : [];
}

// Majority-vote-with-recency-tiebreak fallback for categorizeParsedTx: when a merchant
// has no explicit category_rules row, look at how this merchant's past (non-deleted,
// categorized) transactions were actually categorized and reuse whichever category was
// used most often, tie-broken by most recently used (the SQL ORDER BY already implements
// the tiebreak). Everyday categorization (TransactionDetailScreen's category picker) only
// ever updates the single transaction's category_id/subcategory_id and never writes a
// category_rules row, so this is what lets the *next* transaction from that merchant pick
// up a sensible category instead of falling through to keyword rules/Uncategorized.
async function getMajorityCategoryForMerchant(
  merchant: string,
): Promise<{ categoryId: number; subcategoryId: number | null } | null> {
  const database = await getDb();
  const winner = await database.getFirstAsync<{ category_id: number }>(
    `SELECT category_id, COUNT(*) as cnt, MAX(timestamp) as last_ts
     FROM transactions
     WHERE merchant = ? AND category_id IS NOT NULL AND deleted_at IS NULL
     GROUP BY category_id
     ORDER BY cnt DESC, last_ts DESC
     LIMIT 1`,
    merchant,
  );
  if (!winner) return null;

  const subRow = await database.getFirstAsync<{ subcategory_id: number | null }>(
    `SELECT subcategory_id FROM transactions
     WHERE merchant = ? AND category_id = ? AND deleted_at IS NULL AND subcategory_id IS NOT NULL
     ORDER BY timestamp DESC
     LIMIT 1`,
    merchant,
    winner.category_id,
  );

  return { categoryId: winner.category_id, subcategoryId: subRow?.subcategory_id ?? null };
}

// Shared categorization decision used by both insertParsedTx and insertParsedTxs.
// ruleCache/majorityCache let batch callers avoid repeat DB lookups for the same merchant
// across one insertParsedTxs batch.
async function categorizeParsedTx(
  tx: ParsedTransaction,
  ruleCache?: Map<string, { categoryId: number; subcategoryId: number | null } | null>,
  majorityCache?: Map<string, { categoryId: number; subcategoryId: number | null } | null>,
): Promise<{ categoryId: number | null; subcategoryId: number | null }> {
  let categoryId: number | null = null;
  let subcategoryId: number | null = null;

  // C7: apply an existing category rule for this merchant, if any. This represents a
  // deliberate user override (written via EditTransactionScreen's "always categorize
  // as" flow) and always wins over the majority-vote fallback below.
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

  // Fallback: majority category used historically for this merchant (recency tiebreak).
  if (categoryId === null && tx.merchant) {
    const merchantKey = tx.merchant.toLowerCase();
    let majority: { categoryId: number; subcategoryId: number | null } | null | undefined;
    if (majorityCache && majorityCache.has(merchantKey)) {
      majority = majorityCache.get(merchantKey);
    } else {
      majority = await getMajorityCategoryForMerchant(tx.merchant);
      majorityCache?.set(merchantKey, majority ?? null);
    }
    if (majority) {
      categoryId = majority.categoryId;
      subcategoryId = majority.subcategoryId;
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

  // Starter keyword rules — user-taught rules (above) always win; this is the
  // fallback so a fresh scan isn't 100% Uncategorized.
  if (categoryId === null && tx.merchant) {
    const cat = matchDefaultKeywordCategory(tx.merchant);
    if (cat) {
      categoryId = await getCategoryIdByName(cat);
    }
  }

  return { categoryId, subcategoryId };
}

// Merchant-keyword → default category name. Ordered: first match wins.
const DEFAULT_KEYWORD_RULES: Array<[RegExp, string]> = [
  [/bigbasket|blinkit|zepto|instamart|dmart|grofers|grocer|supermarket|kirana/i, 'Groceries'],
  [/swiggy|zomato|dominos|mcdonald|kfc|pizza|burger|biryani|restaurant|cafe|eatfit|faasos/i, 'Food & Dining'],
  [/\buber\b|\bola\b|rapido|irctc|redbus|metro card|petrol|fuel|hpcl|iocl|bpcl|fastag/i, 'Transport'],
  [/amazon|flipkart|myntra|ajio|meesho|nykaa|snapdeal|tatacliq/i, 'Shopping'],
  [/netflix|spotify|hotstar|primevideo|prime video|bookmyshow|sonyliv|zee5|gaana|youtube/i, 'Entertainment'],
  [/jio|airtel|\bvi\b|vodafone|bsnl|electricity|broadband|\bdth\b|tata power|bescom|recharge/i, 'Bills & Utilities'],
  [/pharmacy|apollo|medplus|1mg|pharmeasy|netmeds|hospital|clinic|diagnostic/i, 'Health'],
  [/makemytrip|goibibo|\boyo\b|air india|indigo|spicejet|vistara|cleartrip|airbnb/i, 'Travel'],
  [/udemy|coursera|byjus|unacademy|school|college|tuition/i, 'Education'],
];

function matchDefaultKeywordCategory(merchant: string): string | null {
  for (const [pattern, category] of DEFAULT_KEYWORD_RULES) {
    if (pattern.test(merchant)) return category;
  }
  return null;
}

const categoryIdByNameCache = new Map<string, number | null>();

async function getCategoryIdByName(name: string): Promise<number | null> {
  if (categoryIdByNameCache.has(name)) return categoryIdByNameCache.get(name)!;
  const database = await getDb();
  const row = await database.getFirstAsync<{ id: number }>(
    `SELECT id FROM categories WHERE name = ?`,
    name,
  );
  const id = row?.id ?? null;
  categoryIdByNameCache.set(name, id);
  return id;
}

const REFERENCE_DUP_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * Cross-sender duplicate guard: the same real transfer sometimes triggers two SMS from
 * different identities (e.g. the receiving bank's own alert plus a second alert under a
 * different bank/PSP name) — same reference number (RRN/UTR), same amount, same day.
 * `isDuplicateSms`'s same-sender-within-60s check can't catch this since the sender
 * differs; reference numbers are unique per real transaction, so matching on them is safe
 * across a wider (48h) window without risking false positives.
 *
 * Must also match `type` — a self-transfer between two of the user's own accounts is a
 * DEBIT leg and a CREDIT leg that legitimately share the same UPI/RRN reference (money
 * leaving one account and arriving in another). Matching on reference+amount alone would
 * wrongly drop the second leg as a "duplicate" of the first, when it's a distinct real
 * transaction `pairSelfTransfers` is meant to link, not delete.
 */
async function isReferenceDuplicate(
  reference: string,
  amount: number,
  type: TransactionType,
  timestamp: number,
): Promise<boolean> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ id: number }>(
    `SELECT id FROM transactions
     WHERE reference = ? AND amount = ? AND type = ? AND deleted_at IS NULL AND ABS(timestamp - ?) <= ?
     LIMIT 1`,
    reference,
    amount,
    type,
    timestamp,
    REFERENCE_DUP_WINDOW_MS,
  );
  return row != null;
}

/** Keys (`bankName|last4`, last4 normalized to '') of accounts hidden via the manage-accounts screen. */
export async function getHiddenAccountKeys(): Promise<Set<string>> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ bank_name: string; last4: string | null }>(
    `SELECT bank_name, last4 FROM accounts WHERE hidden_at IS NOT NULL`,
  );
  return new Set(rows.map((r) => `${r.bank_name}|${r.last4 ?? ''}`));
}

/** Half of PennywiseAI's ±2 min window on each side — see the design doc. */
const CROSS_SOURCE_WINDOW_MS = 2 * 60 * 1000;
const MIN_MERCHANT_KEY_LEN = 3;

/** Lowercase, punctuation-free merchant key. "SWIGGY LIMITED*IN" -> "swiggy limited in". */
export function normalizeMerchantKey(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function merchantKeysMatch(a: string, b: string): boolean {
  if (a.length < MIN_MERCHANT_KEY_LEN || b.length < MIN_MERCHANT_KEY_LEN) return false;
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * Finds an existing transaction from the OTHER ingestion source that is the same real-world
 * transaction as `tx`: same amount, overlapping merchant, within ±2 minutes.
 *
 * Deliberately does NOT match on bankName/accountLast4, unlike the design doc's first draft:
 * an SMS row for a Swiggy payment carries bankName 'HDFC Bank' while the GPay notification
 * for that same payment carries 'Google Pay' and no account digits, so requiring bank
 * identity to match would make this check never fire — i.e. ship the duplicate-row bug it
 * exists to prevent. Merchant containment covers the naming gap ('SWIGGY LIMITED' vs
 * 'Swiggy'); a row with no usable merchant on either side is never matched, because
 * amount+time alone would collapse genuinely distinct transactions.
 *
 * Soft-deleted rows are excluded — a transaction the user deleted must not be silently
 * resurrected by an update-in-place.
 */
export async function findCrossSourceDuplicate(
  tx: { amount: number; merchant: string | null; timestamp: number },
  source: TxSource,
  options?: { includeDeleted?: boolean },
): Promise<TxRecord | null> {
  const key = normalizeMerchantKey(tx.merchant);
  if (key.length < MIN_MERCHANT_KEY_LEN) return null;

  const otherSource: TxSource = source === 'sms' ? 'notification' : 'sms';
  const database = await getDb();
  // includeDeleted is used only by the bulk-scan path, to detect (and not resurrect) a
  // cross-source transaction the user has since soft-deleted — see insertParsedTxs.
  const deletedClause = options?.includeDeleted ? '' : 'AND deleted_at IS NULL';
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM transactions
     WHERE source = ? AND amount = ? ${deletedClause} AND ABS(timestamp - ?) <= ?`,
    otherSource,
    tx.amount,
    tx.timestamp,
    CROSS_SOURCE_WINDOW_MS,
  );

  const match = rows
    .map(rowToTxRecord)
    .find((r) => merchantKeysMatch(normalizeMerchantKey(r.merchant), key));
  return match ?? null;
}

/**
 * `null` means a true no-op: reference-based duplicate or a hidden account — nothing in the
 * DB changed. `{ id, merged: true }` means an existing row (from the other source) was
 * updated in place rather than a new one inserted — callers must still refresh the store
 * (the DB did change) but must NOT treat it as a freshly-inserted transaction (no duplicate
 * notification, no self-transfer pairing). `{ id, merged: false }` is a normal new insert.
 */
export async function insertParsedTx(
  tx: ParsedTransaction,
  source: TxSource = 'sms',
): Promise<{ id: number; merged: boolean } | null> {
  if (tx.reference && (await isReferenceDuplicate(tx.reference, tx.amount, tx.type, tx.timestamp))) {
    return null;
  }

  // A hidden account is the user saying "stop tracking this one" — new SMS from it
  // shouldn't get parsed into the ledger at all (distinct from delete, which soft-deletes
  // what's already there; hide just stops future intake).
  const hiddenKeys = await getHiddenAccountKeys();
  if (hiddenKeys.has(`${tx.bankName}|${tx.accountLast4 ?? ''}`)) {
    return null;
  }

  const { categoryId, subcategoryId } = await categorizeParsedTx(tx);
  const autoTags = getAutoTags(tx.merchant);

  // Symmetric cross-source dedup: whichever source arrives second finds the first and
  // does NOT insert a second row. SMS content wins when both exist (SMS parsing is the
  // mature path), so an SMS landing on top of an existing notification row overwrites
  // that row's content in place; a notification landing on top of an SMS row is simply
  // dropped. The stored timestamp is whichever arrived first.
  const crossDup = await findCrossSourceDuplicate(
    { amount: tx.amount, merchant: tx.merchant ?? null, timestamp: tx.timestamp },
    source,
  );
  if (crossDup) {
    if (source === 'sms') {
      await updateTx(crossDup.id, {
        amount: tx.amount,
        type: tx.type,
        merchant: tx.merchant ?? crossDup.merchant,
        timestamp: Math.min(crossDup.timestamp, tx.timestamp),
        rawSms: tx.smsBody,
        reference: tx.reference ?? crossDup.reference,
        // The merged row's identity must become the SMS's — the notification app's
        // bankName ('Google Pay') would otherwise stick around forever, breaking account
        // labels, hidden-account filtering (keyed on bankName|accountLast4), and balance sync.
        bankName: tx.bankName,
        accountLast4: tx.accountLast4 ?? null,
        ...(categoryId != null ? { categoryId, subcategoryId } : {}),
      });
      return { id: crossDup.id, merged: true };
    }
    // Notification arriving second onto an SMS row: dropped, nothing changed.
    return null;
  }

  const newId = await insertTx({
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
    reference: tx.reference ?? null,
    tags: autoTags.length > 0 ? autoTags : undefined,
    isManual: false,
    source,
  });
  return { id: newId, merged: false };
}

export async function insertParsedTxs(txs: ParsedTransaction[]): Promise<void> {
  if (txs.length === 0) return;

  // Resolve categorization outside the transaction — SEQUENTIALLY. Promise.all here
  // fired thousands of concurrent statements (every call misses the ruleCache before
  // any lookup resolves), which both defeated the cache and could crash expo-sqlite
  // on large scans. Sequential, the cache limits DB reads to one per unique merchant.
  const ruleCache = new Map<string, { categoryId: number; subcategoryId: number | null } | null>();
  const majorityCache = new Map<string, { categoryId: number; subcategoryId: number | null } | null>();
  const decisions: Array<{ categoryId: number | null; subcategoryId: number | null }> = [];
  for (const tx of txs) {
    decisions.push(await categorizeParsedTx(tx, ruleCache, majorityCache));
  }

  const hiddenKeys = await getHiddenAccountKeys();

  const database = await getDb();
  await database.runAsync('BEGIN');
  try {
    for (let i = 0; i < txs.length; i++) {
      const tx = txs[i];
      // See isReferenceDuplicate above insertParsedTx — catches the same real transfer
      // reported by two different bank/sender identities, which a bulk scan can just as
      // easily pull in together as the live-SMS path can.
      if (tx.reference && (await isReferenceDuplicate(tx.reference, tx.amount, tx.type, tx.timestamp))) {
        continue;
      }
      // Same "hide stops intake" rule as insertParsedTx — checked once against an
      // in-memory Set rather than per-row, to keep this loop's per-iteration DB calls flat.
      if (hiddenKeys.has(`${tx.bankName}|${tx.accountLast4 ?? ''}`)) {
        continue;
      }
      // Same cross-source guard as insertParsedTx — a rescan re-reading the SMS for a
      // transaction already captured from an app notification must update that row,
      // not add a second one. This runs inside the open BEGIN; both statements are
      // plain runAsync on the same connection, so no nested transaction is created.
      // includeDeleted: true — a rescan must also see a soft-deleted cross-source row, so it
      // can recognize "the user already deleted this real-world transaction" and skip
      // re-inserting it, rather than only ever finding (and merging into) live rows.
      const crossDup = await findCrossSourceDuplicate(
        { amount: tx.amount, merchant: tx.merchant ?? null, timestamp: tx.timestamp },
        'sms',
        { includeDeleted: true },
      );
      if (crossDup) {
        if (crossDup.deletedAt != null) {
          // The user already deleted the notification-sourced transaction this SMS
          // represents. Deletions must survive every scan — do not resurrect it by
          // inserting a fresh SMS-sourced row for the same real-world transaction.
          continue;
        }
        await database.runAsync(
          `UPDATE transactions
             SET amount = ?, type = ?, merchant = ?, timestamp = ?, raw_sms = ?, reference = ?, bankName = ?, accountLast4 = ?
           WHERE id = ?`,
          tx.amount,
          tx.type,
          tx.merchant ?? crossDup.merchant,
          Math.min(crossDup.timestamp, tx.timestamp),
          tx.smsBody ?? null,
          tx.reference ?? crossDup.reference,
          tx.bankName,
          tx.accountLast4 ?? null,
          crossDup.id,
        );
        continue;
      }
      const { categoryId, subcategoryId } = decisions[i];
      const autoTags = getAutoTags(tx.merchant);
      await database.runAsync(
        `INSERT INTO transactions
           (amount, type, merchant, bankName, accountLast4, timestamp, balance, currency, isFromCard,
            category_id, subcategory_id, tags, raw_sms, reference, is_manual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
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
        autoTags.length > 0 ? JSON.stringify(autoTags) : null,
        tx.smsBody ?? null,
        tx.reference ?? null,
      );
    }
    await database.runAsync('COMMIT');
  } catch (e) {
    await database.runAsync('ROLLBACK');
    throw e;
  }

  // Balance sync runs after commit, sequentially (same rationale as categorization
  // above) — each call is timestamp-guarded so processing order doesn't matter.
  for (const tx of txs) {
    if (tx.balance == null) continue;
    await updateAccountBalanceFromTx({
      bankName: tx.bankName,
      last4: tx.accountLast4 ?? null,
      balance: tx.balance,
      timestamp: tx.timestamp,
      isFromCard: tx.isFromCard ?? false,
    });
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
    ['originalType', 'original_type', (v) => v],
    ['rawSms', 'raw_sms', (v) => v],
    ['reference', 'reference', (v) => v],
    ['bankName', 'bankName', (v) => v],
    ['accountLast4', 'accountLast4', (v) => v],
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

type CategoryDirection = 'expense' | 'income' | 'both';

// Expense/income are genuinely different vocabularies (Groceries vs Salary) — a single
// flat list shown regardless of transaction direction meant the category picker offered
// nonsense choices for credits. 'both' categories (Gifts, Investments, Other) can go
// either way and show up for both directions.
const DEFAULT_CATEGORIES: [string, string, CategoryDirection][] = [
  // Expense
  ['Food & Drinks', '🍔', 'expense'],
  ['Groceries', '🛒', 'expense'],
  ['Transport', '🚕', 'expense'],
  ['Shopping', '🛍️', 'expense'],
  ['Bills', '📱', 'expense'],
  ['Rent & Housing', '🏠', 'expense'],
  ['Health', '💊', 'expense'],
  ['Entertainment', '🎬', 'expense'],
  ['Travel', '✈️', 'expense'],
  ['Education', '📚', 'expense'],
  ['Personal Care', '👤', 'expense'],
  ['EMI', '💳', 'expense'],
  ['Fuel', '⛽', 'expense'],
  ['Transfer', '🔁', 'expense'],
  // Both
  ['Investments', '📈', 'both'],
  ['Gifts', '🎁', 'both'],
  ['Other', '📦', 'both'],
  // Income / credit
  ['Salary', '💰', 'income'],
  ['A/C Transfer', '🔄', 'income'],
  ['Bank Deposit', '🏦', 'income'],
  ['Bill Payment', '🧾', 'income'],
  ['Business', '🏪', 'income'],
  ['Credit', '➕', 'income'],
  ['Interest', '🐖', 'income'],
  ['Loan', '🤝', 'income'],
  ['Recharge', '🔋', 'income'],
  ['Refund', '↩️', 'income'],
  ['Reimbursement', '📝', 'income'],
  ['Rewards', '⭐', 'income'],
];

// Categories added in migration v8 (see runMigrations) — backfilled for an install
// already seeded under the old flat list. Kept separate from DEFAULT_CATEGORIES (which
// only runs on a truly empty categories table) so the two lists' purposes don't blur.
const NEW_V8_CATEGORIES: [string, string, CategoryDirection][] = [
  ['EMI', '💳', 'expense'],
  ['Fuel', '⛽', 'expense'],
  ['Transfer', '🔁', 'expense'],
  ['A/C Transfer', '🔄', 'income'],
  ['Bank Deposit', '🏦', 'income'],
  ['Bill Payment', '🧾', 'income'],
  ['Business', '🏪', 'income'],
  ['Credit', '➕', 'income'],
  ['Interest', '🐖', 'income'],
  ['Loan', '🤝', 'income'],
  ['Recharge', '🔋', 'income'],
  ['Refund', '↩️', 'income'],
  ['Reimbursement', '📝', 'income'],
  ['Rewards', '⭐', 'income'],
];

const DEFAULT_SUBCATEGORIES: [string, string[]][] = [
  ['Food & Drinks', ['Restaurants', 'Delivery', 'Coffee']],
  ['Groceries', ['Supermarket', 'Vegetables', 'Meat']],
  ['Transport', ['Cab', 'Public Transit']],
  ['Bills', ['Electricity', 'Internet', 'Mobile']],
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
      for (const [name, emoji, direction] of DEFAULT_CATEGORIES) {
        const result = await database.runAsync(
          `INSERT INTO categories (name, emoji, is_custom, direction) VALUES (?, ?, 0, ?)`,
          name,
          emoji,
          direction,
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

/**
 * `direction` filters to categories relevant for that transaction direction — 'expense'
 * or 'income' returns matching-direction categories plus 'both' ones; omit it to get
 * every category (used by Settings/budgets, which iterate all categories regardless
 * of direction).
 */
export async function getCategories(direction?: 'expense' | 'income'): Promise<Category[]> {
  const database = await getDb();
  const rows = direction
    ? await database.getAllAsync<{ id: number; name: string; emoji: string; is_custom: number; direction: string }>(
        `SELECT id, name, emoji, is_custom, direction FROM categories WHERE direction = ? OR direction = 'both' ORDER BY id ASC`,
        direction,
      )
    : await database.getAllAsync<{ id: number; name: string; emoji: string; is_custom: number; direction: string }>(
        `SELECT id, name, emoji, is_custom, direction FROM categories ORDER BY id ASC`,
      );
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    emoji: r.emoji,
    isCustom: r.is_custom === 1,
    direction: r.direction as Category['direction'],
  }));
}

export async function getSubcategories(categoryId: number): Promise<Subcategory[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ id: number; category_id: number; name: string; is_custom: number }>(
    `SELECT id, category_id, name, is_custom FROM subcategories WHERE category_id = ? ORDER BY id ASC`,
    categoryId,
  );
  return rows.map((r) => ({ id: r.id, categoryId: r.category_id, name: r.name, isCustom: r.is_custom === 1 }));
}

export async function addCategory(
  name: string,
  emoji: string,
  direction: Category['direction'] = 'both',
): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO categories (name, emoji, is_custom, direction) VALUES (?, ?, 1, ?)`,
    name,
    emoji,
    direction,
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

export async function deleteSubcategory(subcategoryId: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('BEGIN');
  try {
    await database.runAsync(
      `UPDATE transactions SET subcategory_id = NULL WHERE subcategory_id = ?`,
      subcategoryId,
    );
    await database.runAsync(
      `UPDATE category_rules SET subcategory_id = NULL WHERE subcategory_id = ?`,
      subcategoryId,
    );
    await database.runAsync(`DELETE FROM subcategories WHERE id = ?`, subcategoryId);
    await database.runAsync('COMMIT');
  } catch (err) {
    await database.runAsync('ROLLBACK');
    throw err;
  }
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

export interface CategoryRule {
  id: number;
  merchantPattern: string;
  categoryId: number;
  categoryName: string;
  subcategoryId: number | null;
  subcategoryName: string | null;
}

export async function getCategoryRules(): Promise<CategoryRule[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    id: number;
    merchant_pattern: string;
    category_id: number;
    category_name: string;
    subcategory_id: number | null;
    subcategory_name: string | null;
  }>(
    `SELECT cr.id, cr.merchant_pattern, cr.category_id, c.name AS category_name,
            cr.subcategory_id, s.name AS subcategory_name
     FROM category_rules cr
     JOIN categories c ON c.id = cr.category_id
     LEFT JOIN subcategories s ON s.id = cr.subcategory_id
     ORDER BY cr.id DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    merchantPattern: row.merchant_pattern,
    categoryId: row.category_id,
    categoryName: row.category_name,
    subcategoryId: row.subcategory_id,
    subcategoryName: row.subcategory_name,
  }));
}

export async function deleteCategoryRule(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM category_rules WHERE id = ?`, id);
}

export interface CsvImportRow {
  amount: number;
  type: TransactionType;
  merchant: string | null;
  timestamp: number;
  notes: string | null;
  categoryName: string | null;
  bankName: string;
  currency: string | null;
}

export interface CsvImportResult {
  inserted: number;
  duplicates: number;
}

/**
 * More → Import CSV. Dedupes against every existing row (live or soft-deleted, any source)
 * on the same `bankName|amount|timestamp` identity used by SMS scans, so re-importing the
 * same file twice is a no-op. categoryName resolves against existing categories by name;
 * failing that, an existing category rule for the merchant is applied (same C7 lookup used
 * by EditTransactionScreen) — otherwise the row is left uncategorized.
 */
export async function insertCsvRows(rows: CsvImportRow[]): Promise<CsvImportResult> {
  if (rows.length === 0) return { inserted: 0, duplicates: 0 };

  const database = await getDb();
  const existing = await database.getAllAsync<{ bankName: string; amount: number; timestamp: number }>(
    'SELECT bankName, amount, timestamp FROM transactions',
  );
  const seen = new Set(existing.map((r) => `${r.bankName}|${r.amount}|${r.timestamp}`));

  const categories = await getCategories();
  const categoryByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  // Resolve categorization sequentially — see insertParsedTxs above for why Promise.all here
  // would defeat the rule cache and risk crashing expo-sqlite on a large file.
  const ruleCache = new Map<string, { categoryId: number; subcategoryId: number | null } | null>();
  const decisions: Array<{ categoryId: number | null; subcategoryId: number | null }> = [];
  for (const row of rows) {
    if (row.categoryName) {
      decisions.push({ categoryId: categoryByName.get(row.categoryName.toLowerCase()) ?? null, subcategoryId: null });
      continue;
    }
    if (row.merchant) {
      const key = row.merchant.toLowerCase();
      let rule = ruleCache.has(key) ? ruleCache.get(key) : await getCategoryRuleForMerchant(row.merchant);
      if (!ruleCache.has(key)) ruleCache.set(key, rule ?? null);
      decisions.push({ categoryId: rule?.categoryId ?? null, subcategoryId: rule?.subcategoryId ?? null });
      continue;
    }
    decisions.push({ categoryId: null, subcategoryId: null });
  }

  let inserted = 0;
  let duplicates = 0;
  await database.runAsync('BEGIN');
  try {
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const identity = `${row.bankName}|${row.amount}|${row.timestamp}`;
      if (seen.has(identity)) {
        duplicates++;
        continue;
      }
      seen.add(identity);
      const { categoryId, subcategoryId } = decisions[i];
      await database.runAsync(
        `INSERT INTO transactions
           (amount, type, merchant, bankName, timestamp, currency, category_id, subcategory_id, notes, is_manual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        row.amount,
        row.type,
        row.merchant,
        row.bankName,
        row.timestamp,
        row.currency ?? '₹',
        categoryId,
        subcategoryId,
        row.notes,
      );
      inserted++;
    }
    await database.runAsync('COMMIT');
  } catch (e) {
    await database.runAsync('ROLLBACK');
    throw e;
  }

  return { inserted, duplicates };
}

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
      // categoryRaw === null means the CSV row had no category data at all for this row —
      // omit categoryId from the patch entirely (updateTx only touches a column when its key
      // is present) so we don't overwrite an existing real category with null.
      const patch: TxPatch = {};
      if (u.categoryRaw !== null) {
        patch.categoryId = u.categoryId;
      }
      if (u.notes !== null) {
        patch.notes = u.notes;
      }
      if (u.tags.length > 0) {
        patch.tags = u.tags;
      }
      if (u.excluded !== u.existingLinkSettled) {
        patch.linkSettled = u.excluded;
      }
      if (Object.keys(patch).length > 0) {
        await updateTx(u.txId, patch);
      }
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
        accountLast4: ins.last4,
        isManual: true,
        linkSettled: ins.excluded,
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

// ── Multi-row transaction ops (Plan 3) ─────────────────────────────────────────

export async function splitTx(
  parentId: number,
  parts: { amount: number; merchant?: string | null; categoryId?: number | null }[],
): Promise<void> {
  const parent = await getTxById(parentId);
  if (!parent) throw new Error(`splitTx: parent ${parentId} not found`);
  if (parent.deletedAt != null) throw new Error('This transaction was already split or deleted');
  if (parts.length === 0) throw new Error(`splitTx: parts array is empty`);
  const partsSum = parts.reduce((s, p) => s + p.amount, 0);
  if (Math.abs(partsSum - parent.amount) > 0.01) {
    throw new Error(`splitTx: parts sum ${partsSum} does not match parent amount ${parent.amount}`);
  }
  const database = await getDb();
  await database.runAsync('BEGIN');
  try {
    // Clear link state if parent is linked
    if (parent.linkPartnerId != null) {
      // Clear partner's link state
      await database.runAsync(
        `UPDATE transactions SET link_type = NULL, link_partner_id = NULL, link_settled = 0 WHERE id = ?`,
        parent.linkPartnerId,
      );
      // Clear parent's link state
      await database.runAsync(
        `UPDATE transactions SET link_type = NULL, link_partner_id = NULL, link_settled = 0 WHERE id = ?`,
        parentId,
      );
    }

    // Soft-delete parent
    await database.runAsync(`UPDATE transactions SET deleted_at = ? WHERE id = ?`, Date.now(), parentId);

    // Insert split children
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

function isDebitType(type: TransactionType): boolean {
  return (
    type === TransactionType.EXPENSE ||
    type === TransactionType.TRANSFER ||
    type === TransactionType.INVESTMENT
  );
}

function isCreditType(type: TransactionType): boolean {
  return type === TransactionType.INCOME || type === TransactionType.CREDIT;
}

export async function mergeTxs(ids: number[], merchant: string): Promise<number> {
  if (ids.length < 2) throw new Error('mergeTxs: need at least 2 ids');
  const rows = await Promise.all(ids.map(id => getTxById(id)));
  const txs = rows.filter((t): t is NonNullable<typeof t> => t !== null);
  if (txs.length !== ids.length) throw new Error('mergeTxs: some ids not found');
  // Backstop against duplicate invocations: a second call with the same ids would
  // otherwise re-merge the already-soft-deleted originals into a second merged row.
  if (txs.some(t => t.deletedAt != null)) {
    throw new Error('These transactions were already merged or deleted');
  }

  const hasDebit = txs.some((t) => isDebitType(t.type));
  const hasCredit = txs.some((t) => isCreditType(t.type));
  if (hasDebit && hasCredit) {
    throw new Error('Cannot merge debit and credit transactions together');
  }

  const sum = txs.reduce((s, t) => s + t.amount, 0);
  const earliest = txs.reduce((min, t) => Math.min(min, t.timestamp), txs[0].timestamp);
  const first = txs[0];

  const database = await getDb();
  let newId = 0;
  await database.runAsync('BEGIN');
  try {
    // Clear link state for any merged transactions that are linked
    for (const tx of txs) {
      if (tx.linkPartnerId != null) {
        // Clear partner's link state
        await database.runAsync(
          `UPDATE transactions SET link_type = NULL, link_partner_id = NULL, link_settled = 0 WHERE id = ?`,
          tx.linkPartnerId,
        );
        // Clear tx's link state
        await database.runAsync(
          `UPDATE transactions SET link_type = NULL, link_partner_id = NULL, link_settled = 0 WHERE id = ?`,
          tx.id,
        );
      }
    }

    // Create merged transaction
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

    // Soft-delete original transactions
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

export interface TransactionGroupSummary {
  id: number;
  name: string | null;
  txCount: number;
  totalAmount: number;
}

export async function getTransactionGroups(): Promise<TransactionGroupSummary[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    id: number;
    name: string | null;
    tx_count: number;
    total_amount: number | null;
  }>(
    `SELECT tg.id, tg.name, COUNT(t.id) AS tx_count, SUM(t.amount) AS total_amount
     FROM transaction_groups tg
     JOIN transactions t ON t.group_id = tg.id AND t.deleted_at IS NULL
     GROUP BY tg.id
     HAVING tx_count > 0
     ORDER BY tg.created_at DESC`,
  );
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    txCount: row.tx_count,
    totalAmount: row.total_amount ?? 0,
  }));
}

export async function deleteTransactionGroup(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync('BEGIN');
  try {
    await database.runAsync(`UPDATE transactions SET group_id = NULL WHERE group_id = ?`, id);
    await database.runAsync(`DELETE FROM transaction_groups WHERE id = ?`, id);
    await database.runAsync('COMMIT');
  } catch (e) {
    await database.runAsync('ROLLBACK');
    throw e;
  }
}

export async function linkTxs(
  aId: number,
  bId: number,
  type: 'manual' | 'self_transfer' | 'refund',
): Promise<void> {
  if (aId === bId) throw new Error(`linkTxs: cannot link transaction to itself (id=${aId})`);

  const a = await getTxById(aId);
  const b = await getTxById(bId);
  if (!a) throw new Error(`linkTxs: transaction ${aId} not found`);
  if (!b) throw new Error(`linkTxs: transaction ${bId} not found`);

  const database = await getDb();
  await database.runAsync('BEGIN');
  try {
    // Clear existing partners of aId and bId before linking
    if (a.linkPartnerId != null && a.linkPartnerId !== bId) {
      await database.runAsync(
        `UPDATE transactions SET link_type = NULL, link_partner_id = NULL, link_settled = 0 WHERE id = ?`,
        a.linkPartnerId,
      );
    }
    if (b.linkPartnerId != null && b.linkPartnerId !== aId) {
      await database.runAsync(
        `UPDATE transactions SET link_type = NULL, link_partner_id = NULL, link_settled = 0 WHERE id = ?`,
        b.linkPartnerId,
      );
    }

    // Set the new mutual link
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

// ── Budgets ────────────────────────────────────────────────────────────────

export interface Budget {
  id: number;
  categoryId: number;
  amount: number;
  periodType: 'monthly' | 'weekly';
  rollover: boolean;
}

function rowToBudget(row: Record<string, unknown>): Budget {
  return {
    id: row.id as number,
    categoryId: row.category_id as number,
    amount: row.amount as number,
    periodType: row.period_type as 'monthly' | 'weekly',
    rollover: (row.rollover as number) === 1,
  };
}

export async function getBudgets(): Promise<Budget[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM budgets ORDER BY created_at ASC`,
  );
  return rows.map(rowToBudget);
}

export async function upsertBudget(
  categoryId: number,
  amount: number,
  periodType: 'monthly' | 'weekly',
  rollover: boolean,
): Promise<void> {
  const database = await getDb();
  const existing = await database.getFirstAsync<{ id: number }>(
    `SELECT id FROM budgets WHERE category_id = ?`,
    categoryId,
  );
  if (existing) {
    await database.runAsync(
      `UPDATE budgets SET amount = ?, period_type = ?, rollover = ? WHERE id = ?`,
      amount,
      periodType,
      rollover ? 1 : 0,
      existing.id,
    );
  } else {
    await database.runAsync(
      `INSERT INTO budgets (category_id, amount, period_type, rollover) VALUES (?, ?, ?, ?)`,
      categoryId,
      amount,
      periodType,
      rollover ? 1 : 0,
    );
  }
}

export async function deleteBudget(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM budgets WHERE id = ?`, id);
}

// ── Grocery ───────────────────────────────────────────────────────────────────

export interface GroceryList {
  id: number;
  name: string;
  budgetCap: number | null;
  completedAt: number | null;
  createdAt: number;
  linkedTxId: number | null;
}

export interface GroceryItem {
  id: number;
  listId: number;
  name: string;
  price: number | null;
  checkedAt: number | null;
  sortOrder: number;
}

function rowToGroceryList(row: Record<string, unknown>): GroceryList {
  return {
    id: row.id as number,
    name: row.name as string,
    budgetCap: (row.budget_cap as number | null) ?? null,
    completedAt: (row.completed_at as number | null) ?? null,
    createdAt: row.created_at as number,
    linkedTxId: (row.linked_tx_id as number | null) ?? null,
  };
}

function rowToGroceryItem(row: Record<string, unknown>): GroceryItem {
  return {
    id: row.id as number,
    listId: row.list_id as number,
    name: row.name as string,
    price: (row.price as number | null) ?? null,
    checkedAt: (row.checked_at as number | null) ?? null,
    sortOrder: row.sort_order as number,
  };
}

export async function getGroceryLists(): Promise<GroceryList[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM grocery_lists
     ORDER BY (completed_at IS NOT NULL) ASC, created_at DESC`,
  );
  return rows.map(rowToGroceryList);
}

export async function addGroceryList(name: string, budgetCap: number | null): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO grocery_lists (name, budget_cap) VALUES (?, ?)`,
    name,
    budgetCap,
  );
  return result.lastInsertRowId;
}

export async function updateGroceryList(
  id: number,
  patch: { name?: string; budgetCap?: number | null; completedAt?: number | null },
): Promise<void> {
  const database = await getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name); }
  if (patch.budgetCap !== undefined) { fields.push('budget_cap = ?'); values.push(patch.budgetCap); }
  if (patch.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(patch.completedAt); }
  if (fields.length === 0) return;
  values.push(id);
  await database.runAsync(`UPDATE grocery_lists SET ${fields.join(', ')} WHERE id = ?`, ...values);
}

export async function getGroceryItems(listId: number): Promise<GroceryItem[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM grocery_items WHERE list_id = ?
     ORDER BY (checked_at IS NOT NULL) ASC, checked_at DESC, sort_order ASC`,
    listId,
  );
  return rows.map(rowToGroceryItem);
}

export async function addGroceryItem(listId: number, name: string, price: number | null): Promise<number> {
  const database = await getDb();
  const maxRow = await database.getFirstAsync<{ m: number | null }>(
    `SELECT MAX(sort_order) as m FROM grocery_items WHERE list_id = ?`,
    listId,
  );
  const nextOrder = (maxRow?.m ?? -1) + 1;
  const result = await database.runAsync(
    `INSERT INTO grocery_items (list_id, name, price, sort_order) VALUES (?, ?, ?, ?)`,
    listId,
    name,
    price,
    nextOrder,
  );
  return result.lastInsertRowId;
}

export async function updateGroceryItem(
  id: number,
  patch: { name?: string; price?: number | null; checkedAt?: number | null },
): Promise<void> {
  const database = await getDb();
  const fields: string[] = [];
  const values: (string | number | null)[] = [];
  if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name); }
  if (patch.price !== undefined) { fields.push('price = ?'); values.push(patch.price); }
  if (patch.checkedAt !== undefined) { fields.push('checked_at = ?'); values.push(patch.checkedAt); }
  if (fields.length === 0) return;
  values.push(id);
  await database.runAsync(`UPDATE grocery_items SET ${fields.join(', ')} WHERE id = ?`, ...values);
}

export async function deleteGroceryItem(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM grocery_items WHERE id = ?`, id);
}

export async function getLastPriceForItem(name: string): Promise<number | null> {
  const database = await getDb();
  const row = await database.getFirstAsync<{ price: number | null }>(
    `SELECT price FROM grocery_items
     WHERE LOWER(name) = LOWER(?) AND price IS NOT NULL
     ORDER BY created_at DESC LIMIT 1`,
    name,
  );
  return row?.price ?? null;
}

export async function getFrequentItems(limit: number): Promise<{ name: string; count: number }[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ name: string; count: number }>(
    `SELECT MIN(name) as name, COUNT(*) as count FROM grocery_items
     GROUP BY LOWER(name)
     ORDER BY count DESC, MAX(created_at) DESC
     LIMIT ?`,
    limit,
  );
  return rows;
}

export async function linkTxToList(listId: number, txId: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`UPDATE grocery_lists SET linked_tx_id = ? WHERE id = ?`, txId, listId);
}

// ── Split Circles ──────────────────────────────────────────────────────────

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

// ── Accounts ───────────────────────────────────────────────────────────────

export interface Account {
  id: number;
  bankName: string;
  last4: string | null;
  isCard: boolean;
  isManual: boolean;
  nickname: string | null;
  creditLimit: number | null;
  dueDate: string | null;
  balance: number | null;
  balanceUpdatedAt: number | null;
  hiddenAt: number | null;
}

function rowToAccount(row: Record<string, unknown>): Account {
  return {
    id: row.id as number,
    bankName: row.bank_name as string,
    last4: (row.last4 as string | null) ?? null,
    isCard: (row.is_card as number) === 1,
    isManual: (row.is_manual as number) === 1,
    nickname: (row.nickname as string | null) ?? null,
    creditLimit: (row.credit_limit as number | null) ?? null,
    dueDate: (row.due_date as string | null) ?? null,
    balance: (row.balance as number | null) ?? null,
    balanceUpdatedAt: (row.balance_updated_at as number | null) ?? null,
    hiddenAt: (row.hidden_at as number | null) ?? null,
  };
}

/**
 * Keeps `accounts.balance` in sync with the latest transaction balance seen for that
 * account, called from every transaction-insert path that carries a parsed balance
 * (insertTx — and therefore insertParsedTx — plus insertParsedTxs for bulk scans).
 * Guarded by timestamp so an out-of-order historical scan can't clobber a newer balance
 * with an older one; upserts the account row if it doesn't exist yet (mirrors
 * syncDiscoveredAccounts' bankName+last4 identity key). Cards are skipped — a credit
 * card's "balance" isn't a liquidity figure the way a bank account's is.
 */
export async function updateAccountBalanceFromTx(input: {
  bankName: string;
  last4: string | null;
  balance: number;
  timestamp: number;
  isFromCard: boolean;
}): Promise<void> {
  if (input.isFromCard) return;
  const database = await getDb();
  const existing = await database.getFirstAsync<{ id: number; balance_updated_at: number | null }>(
    `SELECT id, balance_updated_at FROM accounts WHERE bank_name = ? AND IFNULL(last4, '') = IFNULL(?, '')`,
    input.bankName,
    input.last4,
  );
  if (existing) {
    if (existing.balance_updated_at != null && existing.balance_updated_at > input.timestamp) return;
    await database.runAsync(
      `UPDATE accounts SET balance = ?, balance_updated_at = ? WHERE id = ?`,
      input.balance,
      input.timestamp,
      existing.id,
    );
  } else {
    await database.runAsync(
      `INSERT INTO accounts (bank_name, last4, is_card, is_manual, balance, balance_updated_at)
       VALUES (?, ?, 0, 0, ?, ?)`,
      input.bankName,
      input.last4,
      input.balance,
      input.timestamp,
    );
  }
}

export async function getAccounts(): Promise<Account[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM accounts ORDER BY bank_name ASC, last4 ASC`,
  );
  return rows.map(rowToAccount);
}

export async function addAccount(input: {
  bankName: string;
  last4?: string | null;
  isCard?: boolean;
  nickname?: string | null;
  creditLimit?: number | null;
  dueDate?: string | null;
}): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO accounts (bank_name, last4, is_card, is_manual, nickname, credit_limit, due_date)
     VALUES (?, ?, ?, 1, ?, ?, ?)`,
    input.bankName,
    input.last4 ?? null,
    input.isCard ? 1 : 0,
    input.nickname ?? null,
    input.creditLimit ?? null,
    input.dueDate ?? null,
  );
  return result.lastInsertRowId;
}

export async function updateAccount(
  id: number,
  patch: Partial<Omit<Account, 'id' | 'isManual'>>,
): Promise<void> {
  const database = await getDb();
  const colByKey: Record<string, string> = {
    bankName: 'bank_name',
    last4: 'last4',
    isCard: 'is_card',
    nickname: 'nickname',
    creditLimit: 'credit_limit',
    dueDate: 'due_date',
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, col] of Object.entries(colByKey)) {
    if (!(key in patch)) continue;
    const v = (patch as Record<string, unknown>)[key];
    sets.push(`${col} = ?`);
    values.push(key === 'isCard' ? (v ? 1 : 0) : v);
  }
  if (sets.length === 0) return;
  values.push(id);
  await database.runAsync(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?`, ...values as never[]);
}

export async function setAccountHidden(id: number, hidden: boolean): Promise<void> {
  const database = await getDb();
  await database.runAsync(`UPDATE accounts SET hidden_at = ? WHERE id = ?`, hidden ? Date.now() : null, id);
}

/**
 * Merges one account into another: every transaction under the source's (bankName, last4)
 * is rewritten to the target's identity, then the now-empty source accounts row is removed.
 * Keeps the target's balance/nickname/card fields as-is — updateAccountBalanceFromTx will
 * re-derive balance from the merged-in transactions on the next scan regardless.
 */
export async function mergeAccounts(sourceId: number, targetId: number): Promise<void> {
  const database = await getDb();
  const rows = await database.getAllAsync<{ id: number; bank_name: string; last4: string | null }>(
    `SELECT id, bank_name, last4 FROM accounts WHERE id IN (?, ?)`,
    sourceId,
    targetId,
  );
  const source = rows.find((r) => r.id === sourceId);
  const target = rows.find((r) => r.id === targetId);
  if (!source || !target) return;
  await database.runAsync(`BEGIN`);
  try {
    await database.runAsync(
      `UPDATE transactions SET bankName = ?, accountLast4 = ? WHERE bankName = ? AND IFNULL(accountLast4, '') = IFNULL(?, '')`,
      target.bank_name,
      target.last4,
      source.bank_name,
      source.last4,
    );
    await database.runAsync(`DELETE FROM accounts WHERE id = ?`, sourceId);
    await database.runAsync(`COMMIT`);
  } catch (e) {
    await database.runAsync(`ROLLBACK`);
    throw e;
  }
}

/**
 * Upserts accounts rows from distinct (bankName, accountLast4, isFromCard) tuples seen in
 * transactions. Skips tuples that already have a matching accounts row (matched on
 * bankName + last4 — last4 null matches null). Idempotent; safe to call on every app start.
 * Credit-limit enrichment (A3) is intentionally NOT attempted here: ParsedTransaction.creditLimit
 * is not persisted on TxRecord (see contract §2), so newly-discovered card accounts get
 * `creditLimit: null` and rely on the manual edit fields in AccountDetailScreen (Task 2).
 */
export async function syncDiscoveredAccounts(): Promise<void> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    bankName: string;
    accountLast4: string | null;
    isFromCard: number;
  }>(
    `SELECT DISTINCT bankName, accountLast4, isFromCard
     FROM transactions
     WHERE deleted_at IS NULL`,
  );
  const existing = await getAccounts();
  const seen = new Set(existing.map(a => `${a.bankName}|${a.last4 ?? ''}`));
  for (const row of rows) {
    const key = `${row.bankName}|${row.accountLast4 ?? ''}`;
    if (seen.has(key)) continue;
    await addAccount({
      bankName: row.bankName,
      last4: row.accountLast4,
      isCard: row.isFromCard === 1,
    });
    seen.add(key);
  }
}

// ── Reminders ──────────────────────────────────────────────────────────────

export interface Reminder {
  id: number;
  name: string;
  amount: number;
  dueDate: number;
  currency: string | null;
}

function rowToReminder(row: Record<string, unknown>): Reminder {
  return {
    id: row.id as number,
    name: row.name as string,
    amount: row.amount as number,
    dueDate: row.due_date as number,
    currency: (row.currency as string | null) ?? null,
  };
}

export async function getReminders(): Promise<Reminder[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM reminders ORDER BY due_date ASC`,
  );
  return rows.map(rowToReminder);
}

export async function addReminder(input: { name: string; amount: number; dueDate: number; currency?: string | null }): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO reminders (name, amount, due_date, currency) VALUES (?, ?, ?, ?)`,
    input.name,
    input.amount,
    input.dueDate,
    input.currency ?? null,
  );
  return result.lastInsertRowId;
}

export async function deleteReminder(id: number): Promise<void> {
  const database = await getDb();
  await database.runAsync(`DELETE FROM reminders WHERE id = ?`, id);
}
