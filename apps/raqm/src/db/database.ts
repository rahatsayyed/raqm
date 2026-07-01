import * as SQLite from 'expo-sqlite';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('raqm.db');
  await db.runAsync(`
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
  await db.runAsync(
    'CREATE INDEX IF NOT EXISTS idx_transactions_timestamp ON transactions(timestamp DESC)',
  );
  return db;
}

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

export async function loadTransactions(): Promise<ParsedTransaction[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM transactions ORDER BY timestamp DESC',
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
    'SELECT COUNT(*) as count FROM transactions',
  );
  return row?.count ?? 0;
}
