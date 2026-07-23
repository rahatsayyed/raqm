import type { TxRecord, Reminder } from '../db/database';

const DAY_MS = 24 * 60 * 60 * 1000;

// A subscription with no charge in ~3 months has most likely been cancelled — no amount of
// "expected due date" math should resurrect it as upcoming. Overdue items are still surfaced,
// but only within a short grace window past their expected date, not indefinitely.
const STALE_SINCE_LAST_CHARGE_MS = 90 * DAY_MS;
const OVERDUE_GRACE_MS = 10 * DAY_MS;

export interface DueItem {
  key: string;
  name: string;
  amount: number;
  dueTs: number;
  currency?: string | null;
  source: 'detected' | 'manual';
  reminderId?: number;
}

/** Recurring merchants' next expected charge, stale ones excluded, within [now - grace, now + futureWindowMs]. */
export function detectRecurringDues(txs: TxRecord[], futureWindowMs: number): DueItem[] {
  const byMerchant = new Map<string, TxRecord[]>();
  for (const tx of txs) {
    if (!tx.recurring || !tx.merchant || tx.deletedAt) continue;
    const key = tx.merchant.trim().toLowerCase();
    if (!byMerchant.has(key)) byMerchant.set(key, []);
    byMerchant.get(key)!.push(tx);
  }

  const now = Date.now();
  const items: DueItem[] = [];
  for (const [key, group] of byMerchant) {
    const sorted = [...group].sort((a, b) => a.timestamp - b.timestamp);
    const latest = sorted[sorted.length - 1];
    if (now - latest.timestamp > STALE_SINCE_LAST_CHARGE_MS) continue;

    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i].timestamp - sorted[i - 1].timestamp);
    gaps.sort((a, b) => a - b);
    const medianGap = gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)] : 30 * DAY_MS;
    const dueTs = latest.timestamp + medianGap;

    if (dueTs > now - OVERDUE_GRACE_MS && dueTs < now + futureWindowMs) {
      items.push({ key: `detected|${key}`, name: latest.merchant!, amount: latest.amount, dueTs, currency: latest.currency, source: 'detected' });
    }
  }
  return items;
}

/** Merges detected recurring dues with manually-added reminders, soonest first. */
export function mergeDues(detected: DueItem[], reminders: Reminder[]): DueItem[] {
  const manual: DueItem[] = reminders.map((r) => ({
    key: `manual|${r.id}`,
    name: r.name,
    amount: r.amount,
    dueTs: r.dueDate,
    currency: r.currency,
    source: 'manual',
    reminderId: r.id,
  }));
  return [...detected, ...manual].sort((a, b) => a.dueTs - b.dueTs);
}
