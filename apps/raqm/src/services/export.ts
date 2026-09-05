import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import {
  loadTxRecords,
  getCategories,
  getSubcategories,
  getSetting,
  type TxRecord,
} from '../db/database';
import { countsTowardTotals } from './txIntelligence';
import { getMonthBounds } from '../utils/period';
import { formatAmount } from '../utils/format';

export interface MonthlySummary {
  from: number;
  to: number;
  income: number;
  expense: number;
  savingsRate: number;
  topCategories: { name: string; emoji: string; total: number }[];
}

function isCredit(tx: TxRecord): boolean {
  return tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT;
}

/** E1 — respects the custom month start day (Plan 5 setting `month_start_day`). */
export async function buildMonthlySummary(ref: Date): Promise<MonthlySummary> {
  const startDayRaw = await getSetting('month_start_day');
  const startDay = startDayRaw ? parseInt(startDayRaw, 10) : 1;
  const { from, to } = getMonthBounds(ref, startDay);

  const txs = await loadTxRecords();
  const categories = await getCategories();
  const categoryById = new Map(categories.map(c => [c.id, c]));
  const byId = new Map(txs.map(t => [t.id, t]));

  let income = 0;
  let expense = 0;
  const categoryTotals = new Map<number, number>();

  for (const tx of txs) {
    if (tx.timestamp < from || tx.timestamp > to) continue;
    if (!countsTowardTotals(tx)) continue;

    if (isCredit(tx) && tx.linkType === 'refund') {
      // Refund credits net against the refunded expense's category/total, consistent with
      // DashboardScreen (overall) and budgets.ts (per-category) — not counted as income.
      expense -= tx.amount;
      const partner = tx.linkPartnerId != null ? byId.get(tx.linkPartnerId) : undefined;
      const cat = partner?.categoryId ?? tx.categoryId;
      if (cat != null) {
        categoryTotals.set(cat, (categoryTotals.get(cat) ?? 0) - tx.amount);
      }
      continue;
    }

    if (isCredit(tx)) {
      income += tx.amount;
    } else if (tx.type === TransactionType.EXPENSE) {
      expense += tx.amount;
      if (tx.categoryId != null) {
        categoryTotals.set(tx.categoryId, (categoryTotals.get(tx.categoryId) ?? 0) + tx.amount);
      }
    }
  }

  expense = Math.max(0, expense);

  const topCategories = Array.from(categoryTotals.entries())
    .map(([categoryId, total]) => [categoryId, Math.max(0, total)] as const)
    .filter(([, total]) => total > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([categoryId, total]) => {
      const cat = categoryById.get(categoryId);
      return { name: cat?.name ?? 'Other', emoji: cat?.emoji ?? '📦', total };
    });

  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

  return { from, to, income, expense, savingsRate, topCategories };
}

// A merchant/bank string starting with =, +, -, or @ (easy for a scam SMS to contain) is
// interpreted as a formula by Excel/Sheets when the exported CSV is opened. Prefixing a
// single-quote defuses this without changing the visible value in any spreadsheet app.
function csvEscape(value: string): string {
  const guarded = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (guarded.includes(',') || guarded.includes('"') || guarded.includes('\n')) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}

/** E2 — all non-deleted transactions, columns per contract, written to cache then shared. */
export async function exportCsv(): Promise<void> {
  const txs = await loadTxRecords();
  const categories = await getCategories();
  const categoryById = new Map(categories.map(c => [c.id, c.name]));

  const categoryIds = Array.from(
    new Set(txs.map(t => t.categoryId).filter((id): id is number => id != null)),
  );
  const subcategoryById = new Map<number, string>();
  for (const categoryId of categoryIds) {
    const subs = await getSubcategories(categoryId);
    for (const sub of subs) subcategoryById.set(sub.id, sub.name);
  }

  const header = [
    'id', 'date', 'amount', 'type', 'merchant', 'bank', 'accountLast4',
    'category', 'subcategory', 'notes', 'tags', 'isManual', 'location',
  ].join(',');

  const rows = txs.map(tx => [
    String(tx.id),
    new Date(tx.timestamp).toISOString(),
    String(tx.amount),
    tx.type,
    tx.merchant ?? '',
    tx.bankName,
    tx.accountLast4 ?? '',
    tx.categoryId != null ? (categoryById.get(tx.categoryId) ?? '') : '',
    tx.subcategoryId != null ? (subcategoryById.get(tx.subcategoryId) ?? '') : '',
    tx.notes ?? '',
    tx.tags.join('|'),
    tx.isManual ? 'true' : 'false',
    tx.lat != null && tx.lng != null ? `${tx.lat},${tx.lng}` : '',
  ].map(v => csvEscape(String(v))).join(','));

  const csv = [header, ...rows].join('\n');

  const file = new File(Paths.cache, `raqm-transactions-${Date.now()}.csv`);
  file.write(csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export transactions' });
  }
}

/** E3 — HTML statement for the given month → PDF via expo-print → share sheet. */
/** Merchant/bank strings come from parsed SMS text — escape before injecting into PDF HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function exportPdf(ref: Date): Promise<void> {
  const summary = await buildMonthlySummary(ref);
  const txs = await loadTxRecords();
  const monthTxs = txs
    .filter(t => t.timestamp >= summary.from && t.timestamp <= summary.to)
    .sort((a, b) => a.timestamp - b.timestamp);

  const monthLabel = ref.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  const currency = monthTxs[0]?.currency;

  const categoryRowsHtml = summary.topCategories
    .map(c => `<tr><td>${escapeHtml(`${c.emoji} ${c.name}`)}</td><td style="text-align:right">${formatAmount(c.total, currency)}</td></tr>`)
    .join('');

  const txRowsHtml = monthTxs
    .map(tx => `
      <tr>
        <td>${new Date(tx.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
        <td>${escapeHtml(tx.merchant ?? tx.bankName)}</td>
        <td>${escapeHtml(tx.type)}</td>
        <td style="text-align:right">${formatAmount(tx.amount, tx.currency)}</td>
      </tr>
    `)
    .join('');

  // NOTE: this HTML intentionally uses a light, print-style palette (dark text on white) — the
  // in-app dark theme tokens do not apply to the exported PDF; see Global Constraints.
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 24px; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          h3 { font-size: 13px; text-transform: uppercase; color: #666; margin: 24px 0 8px; }
          .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
          .summary { display: flex; gap: 24px; margin-bottom: 8px; }
          .summary div { flex: 1; }
          .summary .label { font-size: 11px; color: #888; text-transform: uppercase; }
          .summary .value { font-size: 18px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; font-size: 12px; text-align: left; }
          th { color: #888; font-weight: 600; text-transform: uppercase; font-size: 10px; }
        </style>
      </head>
      <body>
        <h1>Raqm Monthly Statement</h1>
        <div class="meta">${monthLabel}</div>
        <div class="summary">
          <div><div class="label">Income</div><div class="value">${formatAmount(summary.income, currency)}</div></div>
          <div><div class="label">Expense</div><div class="value">${formatAmount(summary.expense, currency)}</div></div>
          <div><div class="label">Savings rate</div><div class="value">${summary.savingsRate.toFixed(1)}%</div></div>
        </div>
        <h3>Top categories</h3>
        <table><tbody>${categoryRowsHtml || '<tr><td>No categorized spend this month</td></tr>'}</tbody></table>
        <h3>Transactions</h3>
        <table>
          <thead><tr><th>Date</th><th>Merchant</th><th>Type</th><th>Amount</th></tr></thead>
          <tbody>${txRowsHtml || '<tr><td colspan="4">No transactions this month</td></tr>'}</tbody>
        </table>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export statement' });
  }
}
