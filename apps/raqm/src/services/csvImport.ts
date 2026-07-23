import { TransactionType } from '@rahatsayyed/bank-sms-parser';

export interface ParsedCsvRow {
  amount: number;
  type: TransactionType.EXPENSE | TransactionType.INCOME;
  merchant: string | null;
  timestamp: number;
  notes: string | null;
  categoryName: string | null;
  bankName: string;
  currency: string | null;
}

export interface CsvParseResult {
  rows: ParsedCsvRow[];
  skipped: number;
}

// Generic column names seen across finance-app CSV exports — matched case/punctuation-insensitively.
const HEADER_ALIASES = {
  date: ['date', 'transactiondate', 'txndate', 'valuedate', 'postingdate'],
  amount: ['amount', 'value', 'txnamount'],
  debit: ['debit', 'withdrawal', 'withdrawalamt', 'debitamount'],
  credit: ['credit', 'deposit', 'depositamt', 'creditamount'],
  merchant: ['merchant', 'description', 'payee', 'narration', 'particulars', 'details'],
  type: ['type', 'transactiontype', 'txntype'],
  category: ['category'],
  notes: ['notes', 'remarks', 'memo'],
  bank: ['bank', 'account', 'source', 'accountname'],
  currency: ['currency'],
} as const;

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function findColumn(headers: string[], aliases: readonly string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx !== -1) return idx;
  }
  return -1;
}

/** RFC4180-ish CSV parser: handles quoted fields with embedded commas, newlines, and escaped quotes. */
export function parseCsvText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim() !== '')) rows.push(row);
  }
  return rows;
}

// Handles thousands separators, currency symbols, a leading/trailing sign, and the
// accounting convention of wrapping negatives in parentheses, e.g. "(1,234.50)".
function parseAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[^0-9.\-]/g, '');
  if (s.startsWith('-')) {
    negative = true;
    s = s.slice(1);
  }
  if (!s) return null;
  const n = Number(s);
  if (Number.isNaN(n)) return null;
  return negative ? -n : n;
}

// Tries ISO (YYYY-MM-DD…) first, then falls back to DD/MM/YYYY or DD-MM-YYYY (the common
// convention in Indian bank/finance-app exports, matching this app's en-IN locale elsewhere).
function parseDate(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const iso = Date.parse(s);
    if (!Number.isNaN(iso)) return iso;
  }
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    let year = Number(m[3]);
    if (year < 100) year += 2000;
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return new Date(year, month - 1, day).getTime();
    }
  }
  const fallback = Date.parse(s);
  return Number.isNaN(fallback) ? null : fallback;
}

/**
 * Parses a generic finance-app CSV export. Supports either a single signed `amount` column
 * (negative = expense) or separate debit/credit columns, plus an optional explicit `type`
 * column that overrides the sign-based guess. Rows missing a valid date or amount are skipped
 * (counted, not thrown) rather than failing the whole import.
 */
export function parseImportCsv(text: string): CsvParseResult {
  const table = parseCsvText(text);
  if (table.length === 0) return { rows: [], skipped: 0 };

  const headers = table[0];
  const dateCol = findColumn(headers, HEADER_ALIASES.date);
  const amountCol = findColumn(headers, HEADER_ALIASES.amount);
  const debitCol = findColumn(headers, HEADER_ALIASES.debit);
  const creditCol = findColumn(headers, HEADER_ALIASES.credit);
  const merchantCol = findColumn(headers, HEADER_ALIASES.merchant);
  const typeCol = findColumn(headers, HEADER_ALIASES.type);
  const categoryCol = findColumn(headers, HEADER_ALIASES.category);
  const notesCol = findColumn(headers, HEADER_ALIASES.notes);
  const bankCol = findColumn(headers, HEADER_ALIASES.bank);
  const currencyCol = findColumn(headers, HEADER_ALIASES.currency);

  const rows: ParsedCsvRow[] = [];
  let skipped = 0;

  for (const line of table.slice(1)) {
    const timestamp = dateCol !== -1 ? parseDate(line[dateCol] ?? '') : null;
    if (timestamp == null) {
      skipped++;
      continue;
    }

    let amount: number | null = null;
    let inferredType: TransactionType.EXPENSE | TransactionType.INCOME | null = null;

    if (debitCol !== -1 && (line[debitCol] ?? '').trim()) {
      const v = parseAmount(line[debitCol]);
      if (v != null) { amount = Math.abs(v); inferredType = TransactionType.EXPENSE; }
    } else if (creditCol !== -1 && (line[creditCol] ?? '').trim()) {
      const v = parseAmount(line[creditCol]);
      if (v != null) { amount = Math.abs(v); inferredType = TransactionType.INCOME; }
    } else if (amountCol !== -1) {
      const v = parseAmount(line[amountCol] ?? '');
      if (v != null) { amount = Math.abs(v); inferredType = v < 0 ? TransactionType.EXPENSE : TransactionType.INCOME; }
    }

    if (amount == null || amount <= 0) {
      skipped++;
      continue;
    }

    if (typeCol !== -1) {
      const t = (line[typeCol] ?? '').trim().toLowerCase();
      if (/credit|income|deposit/.test(t)) inferredType = TransactionType.INCOME;
      else if (/debit|expense|withdrawal|purchase/.test(t)) inferredType = TransactionType.EXPENSE;
    }

    rows.push({
      amount,
      type: inferredType ?? TransactionType.EXPENSE,
      merchant: merchantCol !== -1 ? (line[merchantCol]?.trim() || null) : null,
      timestamp,
      notes: notesCol !== -1 ? (line[notesCol]?.trim() || null) : null,
      categoryName: categoryCol !== -1 ? (line[categoryCol]?.trim() || null) : null,
      bankName: (bankCol !== -1 && line[bankCol]?.trim()) || 'Imported',
      currency: currencyCol !== -1 ? (line[currencyCol]?.trim() || null) : null,
    });
  }

  return { rows, skipped };
}
