import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import {
  getBudgets, loadTxRecords, getSetting, setSetting, getMerchantPrivacyRules,
  isMerchantExcludedFromBudget, type Budget, type TxRecord, type MerchantPrivacyRule,
} from '../db/database';
import { countsTowardTotals } from './txIntelligence';
import { getCycleBounds, type PeriodBounds } from '../utils/period';
import { getCycleConfig, currentCycleBounds } from './cycle';
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

async function sumSpend(
  txs: TxRecord[],
  categoryId: number,
  bounds: PeriodBounds,
  byId: Map<number, TxRecord>,
  privacyRules: MerchantPrivacyRule[],
): Promise<number> {
  // Refund credits net against the refunded expense's category (resolved via the link
  // partner, since the credit itself usually carries no categoryId) — otherwise a
  // refunded purchase counts against its budget forever. Clamped at 0 so pct can't go negative.
  // `byId` is built once by the caller (getBudgetStatuses) and shared across every budget/period
  // call, instead of rebuilt here on every one of those calls — checkBudgetAlerts runs this on
  // every single transaction insert, so a per-call full-table Map rebuild adds up fast.
  let total = 0;
  for (const tx of txs) {
    if (tx.timestamp < bounds.from || tx.timestamp > bounds.to) continue;
    if (!countsTowardTotals(tx)) continue;
    if (isMerchantExcludedFromBudget(tx.merchant, privacyRules)) continue;
    if (isCredit(tx) && (tx.linkType === 'refund' || tx.linkType === 'split_payment')) {
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

// Previous cycle's bounds for rollover — re-derives getCycleBounds one millisecond before
// the current cycle started, so it works the same way for calendar-month and fixed N-day.
function previousCycleBounds(bounds: PeriodBounds, cfg: Awaited<ReturnType<typeof getCycleConfig>>): PeriodBounds {
  return getCycleBounds(new Date(bounds.from - 1), cfg);
}

// `txs`, when passed, is used as-is instead of re-scanning the transactions table — the hot
// insert path (txStore's addParsedWithLocation/add/update) already has a just-refreshed array
// in memory, and re-querying it here was a second full-table scan on every single insert,
// competing with the notification-posting path's own DB read on expo-sqlite's one serialized
// connection and delaying when the notification actually posts (see TxNotifier.kt) by however
// long that scan took. Standalone callers (screens) that
// have no fresh array on hand keep loading it themselves by simply not passing one.
export async function getBudgetStatuses(now: Date = new Date(), txs?: TxRecord[]): Promise<BudgetStatus[]> {
  const [budgets, resolvedTxs, privacyRules, cycleConfig] = await Promise.all([
    getBudgets(),
    txs ?? loadTxRecords(),
    getMerchantPrivacyRules(),
    getCycleConfig(),
  ]);
  const byId = new Map(resolvedTxs.map((t) => [t.id, t]));
  const bounds = getCycleBounds(now, cycleConfig);
  const statuses: BudgetStatus[] = [];

  for (const budget of budgets) {
    const spent = await sumSpend(resolvedTxs, budget.categoryId, bounds, byId, privacyRules);

    let limit = budget.amount;
    if (budget.rollover) {
      const lastBounds = previousCycleBounds(bounds, cycleConfig);
      const lastSpent = await sumSpend(resolvedTxs, budget.categoryId, lastBounds, byId, privacyRules);
      const carry = Math.max(0, budget.amount - lastSpent);
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

export async function checkBudgetAlerts(txs?: TxRecord[]): Promise<void> {
  logEvent('budget_alert.start');
  try {
    const alertsEnabled = await getSetting('budget_alerts');
    if (alertsEnabled === '0') {
      logEvent('budget_alert.done');
      return;
    }

    const now = new Date();
    const statuses = await getBudgetStatuses(now, txs);
    const bounds = await currentCycleBounds(now);

    for (const status of statuses) {
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
