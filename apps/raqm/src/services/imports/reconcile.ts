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
