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
