import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { getBudgets, loadTxRecords, getSetting, setSetting, type Budget, type TxRecord } from '../db/database';
import { countsTowardTotals } from './txIntelligence';
import { getMonthBounds, getWeekBounds, type PeriodBounds } from '../utils/period';
import { postBudgetAlert } from '../notifications/notifications';
import { formatAmount } from '../utils/format';
import { logEvent } from './logger';

export interface BudgetStatus {
  budget: Budget;
  spent: number;
  limit: number;
  pct: number;
}

function isExpense(tx: TxRecord): boolean {
  return tx.type === TransactionType.EXPENSE;
}

function isCredit(tx: TxRecord): boolean {
  return tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT;
}

async function sumSpend(txs: TxRecord[], categoryId: number, bounds: PeriodBounds): Promise<number> {
  // Refund credits net against the refunded expense's category (resolved via the link
  // partner, since the credit itself usually carries no categoryId) — otherwise a
  // refunded purchase counts against its budget forever. Clamped at 0 so pct can't go negative.
  const byId = new Map(txs.map((t) => [t.id, t]));
  let total = 0;
  for (const tx of txs) {
    if (tx.timestamp < bounds.from || tx.timestamp > bounds.to) continue;
    if (!countsTowardTotals(tx)) continue;
    if (isCredit(tx) && tx.linkType === 'refund') {
      const partner = tx.linkPartnerId != null ? byId.get(tx.linkPartnerId) : undefined;
      const cat = partner?.categoryId ?? tx.categoryId;
      if (cat === categoryId) total -= tx.amount;
      continue;
    }
    if (!isExpense(tx)) continue;
    if (tx.categoryId !== categoryId) continue;
    total += tx.amount;
  }
  return Math.max(0, total);
}

async function currentBounds(budget: Budget, now: Date): Promise<PeriodBounds> {
  if (budget.periodType === 'weekly') return getWeekBounds(now);
  const startDayStr = await getSetting('month_start_day');
  const startDay = startDayStr ? Number(startDayStr) : 1;
  return getMonthBounds(now, startDay);
}

function previousWeekRef(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
}

export async function getBudgetStatuses(now: Date = new Date()): Promise<BudgetStatus[]> {
  const [budgets, txs] = await Promise.all([getBudgets(), loadTxRecords()]);
  const statuses: BudgetStatus[] = [];

  for (const budget of budgets) {
    const bounds = await currentBounds(budget, now);
    const spent = await sumSpend(txs, budget.categoryId, bounds);

    let limit = budget.amount;
    if (budget.periodType === 'weekly' && budget.rollover) {
      const lastWeekBounds = getWeekBounds(previousWeekRef(now));
      const lastWeekSpent = await sumSpend(txs, budget.categoryId, lastWeekBounds);
      const carry = Math.max(0, budget.amount - lastWeekSpent);
      limit = budget.amount + carry;
    }

    const pct = limit > 0 ? (spent / limit) * 100 : 0;
    statuses.push({ budget, spent, limit, pct });
  }

  return statuses;
}

async function alreadySent(dedupKey: string): Promise<boolean> {
  return (await getSetting(dedupKey)) === '1';
}

export async function checkBudgetAlerts(): Promise<void> {
  logEvent('budget_alert.start');
  try {
    const alertsEnabled = await getSetting('budget_alerts');
    if (alertsEnabled === '0') {
      logEvent('budget_alert.done');
      return;
    }

    const now = new Date();
    const statuses = await getBudgetStatuses(now);

    for (const status of statuses) {
      const bounds = await currentBounds(status.budget, now);
      const baseKey = `budget_alert_sent_${status.budget.id}_${bounds.from}`;

      if (status.pct > 100) {
        const key = `${baseKey}_100`;
        if (!(await alreadySent(key))) {
          await postBudgetAlert(
            'Budget exceeded',
            `You've spent ${formatAmount(status.spent)} of your ${formatAmount(status.limit)} budget.`,
          );
          await setSetting(key, '1');
        }
      } else if (status.pct >= 80) {
        const key = `${baseKey}_80`;
        if (!(await alreadySent(key))) {
          await postBudgetAlert(
            'Approaching budget limit',
            `You've used ${Math.round(status.pct)}% of this period's budget.`,
          );
          await setSetting(key, '1');
        }
      }
    }
    logEvent('budget_alert.done');
  } catch (e) {
    logEvent('budget_alert.failed', e instanceof Error ? e.message : String(e));
    throw e;
  }
}
