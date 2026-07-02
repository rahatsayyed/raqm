# Raqm Plan 5: Analytics & Budgets — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Goal

Turn the Analytics tab from a static monthly bar chart + top-merchants list into a full period-aware
analytics surface (daily/weekly/monthly/custom, category breakdown, donut chart, 6-month trend line),
add a real budgets subsystem (per-category limits, rollover, ≥80%/>100% push alerts), replace the
`SettingsScreen` and `CategoryDetailScreen` stubs with working screens, and make the Dashboard hero
card respect the custom month-start-day period instead of summing all-time transactions.

## Architecture

- `src/utils/period.ts` — pure functions, no RN/DB imports, computing `{ from, to }` millisecond
  bounds for day/week/month periods. Every other piece of this plan (budgets engine, Analytics,
  CategoryDetail, Dashboard) calls into this module — it must be correct and is verified by a
  standalone Node script before anything else is built on top of it.
- `src/db/database.ts` gains a `budgets` CRUD surface (table already exists from Plan 2's v2
  migration — no new migration needed).
- `src/services/budgets.ts` is the budget engine: turns `Budget` rows + `loadTxRecords()` into
  `BudgetStatus[]` (spent/limit/pct) and fires `postBudgetAlert` via `src/notifications/notifications.ts`
  (Plan 4) with a dedup scheme stored in `app_settings` so alerts fire once per period per threshold.
- `src/store/txStore.ts` (Plan 2) gets three call-sites patched to fire-and-forget
  `checkBudgetAlerts()` after any mutation that can change spend totals.
- Two new presentational components, `src/components/DonutChart.tsx` and `src/components/TrendLine.tsx`,
  both pure `react-native-svg` — no chart library dependency.
- `AnalyticsScreen`, `SettingsScreen`, `CategoryDetailScreen` are rewritten in place. `DashboardScreen`
  gets its stats `useMemo` replaced with an async month-bounded load.

## Tech Stack

- Expo SDK 56, RN 0.85, TypeScript, Android-only.
- `expo-sqlite` (already installed) — async API only, no `withTransactionAsync`.
- `react-native-svg` `15.15.4` — **already installed**, confirmed in `apps/raqm/package.json`. No
  install step needed for charts.
- `@react-native-community/datetimepicker` `9.1.0` — already installed (used by `DateRangeScreen`);
  reused for the Custom period picker.
- `tsx` (new devDependency) — used only to run the standalone `check-period.ts` sanity script; not
  shipped in the app bundle.

## Global Constraints

1. **Dark tokens only.** Every color used by `DonutChart`, `TrendLine`, progress bars, and any new
   UI must come from `src/theme/colors.ts` (`Colors.*`). The donut/trend palette is fixed to
   `[Colors.primary, Colors.mossStructure, Colors.secondary, Colors.tertiary, Colors.errorMuted, Colors.outline]`
   cycling in that order. Never hardcode a hex value or a light-theme color anywhere in this plan's code.
2. **`expo-sqlite` async only.** All new DB code uses `runAsync`/`getAllAsync`/`getFirstAsync`; multi-statement
   writes use explicit `BEGIN`/`COMMIT`/`ROLLBACK` (never `withTransactionAsync`), matching `src/db/database.ts`.
3. **`tsc` clean per task.** Every task ends with `cd apps/raqm && npx tsc --noEmit` and must show zero errors
   before moving to the next task.
4. **No `git commit`** unless the session controller explicitly states the user approved commits. Otherwise
   leave changes in the working tree and say so.
5. **Contract signatures verbatim.** Every exported type/function name, parameter order, and return type in
   `docs/superpowers/plans/2026-07-02-raqm-shared-interfaces.md` §5 (this plan's own contract) and the
   consumed §2/§3/§4 signatures must match exactly — do not rename `getMonthBounds`, `BudgetStatus`, etc.
6. **Consumes Plans 2–4 only.** This plan may import `TxRecord`, `useTxStore`, `getCategories`,
   `getSubcategories`, `getSetting`/`setSetting` (Plan 2); `countsTowardTotals` from
   `src/services/txIntelligence.ts` (Plan 3); `postBudgetAlert` and `scheduleSummaries` from
   `src/notifications/notifications.ts` (Plan 4). It must never import anything from Plan 6/7 (grocery,
   accounts, export) — those don't exist yet in dependency order.
7. **Assumption made explicit:** by the time this plan runs, Plan 2 has already switched
   `DashboardScreen`/`TransactionsScreen`/`AnalyticsScreen` off `useOnboardingStore` and onto
   `useTxStore`/`TxRecord`. Code samples below are written against that end-state. If a file in the
   working tree still reads `useOnboardingStore`/`ParsedTransaction` when this plan starts, stop and
   flag it — Plan 2 was not actually completed, and this plan's edits should not proceed on top of
   the wrong base.

---

## Task 1 — Period utilities + sanity-check script

**Files:**
- `apps/raqm/src/utils/period.ts` (new)
- `apps/raqm/scripts/check-period.ts` (new, temporary — deleted at the end of the task)
- `apps/raqm/package.json` (add `tsx` devDependency)

**Interfaces (contract §5, verbatim):**
```ts
export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';
export function getDayBounds(ref: Date): { from: number; to: number };
export function getWeekBounds(ref: Date): { from: number; to: number };        // Monday 00:00 → Sunday 23:59:59.999
export function getMonthBounds(ref: Date, startDay: number): { from: number; to: number }; // custom start day 1–28
```

### Steps

- [ ] **1.1 — Add `tsx` devDependency (skip if already present).**
  ```bash
  cd apps/raqm
  grep -q '"tsx"' package.json || npm install --save-dev tsx
  ```

- [ ] **1.2 — Create `apps/raqm/src/utils/period.ts`.**

  Local-time semantics throughout (device timezone, matching how `Date` is used everywhere else in
  the app — e.g. `DateRangeScreen`, `ScanningProgressScreen`). `getMonthBounds` algorithm: if the
  reference date's day-of-month is `>= startDay`, the period runs from `startDay` of the reference's
  month to `startDay - 1` of the *next* month (23:59:59.999). If the reference date's day-of-month is
  `< startDay`, the period started on `startDay` of the *previous* month and runs to `startDay - 1` of
  the reference's month. `startDay` is clamped to `[1, 28]` (contract range) so day-of-month math never
  runs into a short-month problem. `new Date(y, m, 0)` naturally rolls back to the last day of month
  `m - 1`, which is exactly what's needed when `startDay - 1 === 0` (i.e. `startDay === 1`, calendar
  month case).

  ```ts
  export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';

  export interface PeriodBounds {
    from: number;
    to: number;
  }

  /** Local calendar day containing `ref`: 00:00:00.000 → 23:59:59.999. */
  export function getDayBounds(ref: Date): PeriodBounds {
    const y = ref.getFullYear();
    const m = ref.getMonth();
    const d = ref.getDate();
    return {
      from: new Date(y, m, d, 0, 0, 0, 0).getTime(),
      to: new Date(y, m, d, 23, 59, 59, 999).getTime(),
    };
  }

  /** Monday 00:00:00.000 → Sunday 23:59:59.999 of the week containing `ref`. */
  export function getWeekBounds(ref: Date): PeriodBounds {
    const day = ref.getDay(); // 0 = Sunday .. 6 = Saturday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate() + diffToMonday, 0, 0, 0, 0);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6, 23, 59, 59, 999);
    return { from: monday.getTime(), to: sunday.getTime() };
  }

  /**
   * Custom month-start-day period containing `ref`. `startDay` is clamped to [1, 28].
   * If ref's day-of-month >= startDay: period is [startDay of ref's month, startDay-1 of next month].
   * If ref's day-of-month <  startDay: period is [startDay of prev month, startDay-1 of ref's month].
   * startDay === 1 degenerates to the ordinary calendar month.
   */
  export function getMonthBounds(ref: Date, startDay: number): PeriodBounds {
    const clampedStart = Math.min(Math.max(Math.trunc(startDay), 1), 28);
    const y = ref.getFullYear();
    const m = ref.getMonth();
    const d = ref.getDate();

    let startY = y;
    let startM = m;
    if (d < clampedStart) {
      startM -= 1;
      if (startM < 0) {
        startM = 11;
        startY -= 1;
      }
    }

    let endY = startY;
    let endM = startM + 1;
    if (endM > 11) {
      endM = 0;
      endY += 1;
    }

    const from = new Date(startY, startM, clampedStart, 0, 0, 0, 0).getTime();
    // Date(y, m, 0) rolls back to the last day of month (m-1) — gives startDay-1 of endM correctly,
    // including the calendar-month case where clampedStart-1 === 0.
    const to = new Date(endY, endM, clampedStart - 1, 23, 59, 59, 999).getTime();
    return { from, to };
  }
  ```

- [ ] **1.3 — Create `apps/raqm/scripts/check-period.ts`** (temporary sanity check, deleted in step 1.5).

  ```ts
  import { getDayBounds, getWeekBounds, getMonthBounds } from '../src/utils/period';

  function fmt(ts: number): string {
    return new Date(ts).toString();
  }

  function assertEqual(label: string, actual: number, expected: number) {
    if (actual !== expected) {
      console.error(`FAIL ${label}: expected ${fmt(expected)} (${expected}), got ${fmt(actual)} (${actual})`);
      process.exitCode = 1;
    } else {
      console.log(`OK   ${label}: ${fmt(actual)}`);
    }
  }

  // getMonthBounds(2026-07-02, 15) → Jun 15 00:00:00.000 .. Jul 14 23:59:59.999
  {
    const ref = new Date(2026, 6, 2); // July 2, 2026 (month is 0-indexed)
    const { from, to } = getMonthBounds(ref, 15);
    assertEqual('2026-07-02/startDay15 from', from, new Date(2026, 5, 15, 0, 0, 0, 0).getTime());
    assertEqual('2026-07-02/startDay15 to', to, new Date(2026, 6, 14, 23, 59, 59, 999).getTime());
  }

  // getMonthBounds(2026-07-20, 15) → Jul 15 00:00:00.000 .. Aug 14 23:59:59.999
  {
    const ref = new Date(2026, 6, 20);
    const { from, to } = getMonthBounds(ref, 15);
    assertEqual('2026-07-20/startDay15 from', from, new Date(2026, 6, 15, 0, 0, 0, 0).getTime());
    assertEqual('2026-07-20/startDay15 to', to, new Date(2026, 7, 14, 23, 59, 59, 999).getTime());
  }

  // getMonthBounds(..., 1) → ordinary calendar month
  {
    const ref = new Date(2026, 6, 2);
    const { from, to } = getMonthBounds(ref, 1);
    assertEqual('startDay1 from', from, new Date(2026, 6, 1, 0, 0, 0, 0).getTime());
    assertEqual('startDay1 to', to, new Date(2026, 6, 31, 23, 59, 59, 999).getTime());
  }

  // getMonthBounds edge: ref date === startDay exactly (boundary belongs to the period starting today)
  {
    const ref = new Date(2026, 6, 15);
    const { from, to } = getMonthBounds(ref, 15);
    assertEqual('boundary-day from', from, new Date(2026, 6, 15, 0, 0, 0, 0).getTime());
    assertEqual('boundary-day to', to, new Date(2026, 7, 14, 23, 59, 59, 999).getTime());
  }

  // getWeekBounds: Monday start regardless of which weekday ref falls on.
  // 2026-07-02 is a Thursday → week is Mon 2026-06-29 .. Sun 2026-07-05
  {
    const ref = new Date(2026, 6, 2);
    const { from, to } = getWeekBounds(ref);
    assertEqual('week from (Mon)', from, new Date(2026, 5, 29, 0, 0, 0, 0).getTime());
    assertEqual('week to (Sun)', to, new Date(2026, 6, 5, 23, 59, 59, 999).getTime());
    console.log('week from weekday:', new Date(from).getDay(), '(expect 1)');
    console.log('week to weekday:', new Date(to).getDay(), '(expect 0)');
  }

  // getDayBounds sanity
  {
    const ref = new Date(2026, 6, 2, 14, 30);
    const { from, to } = getDayBounds(ref);
    assertEqual('day from', from, new Date(2026, 6, 2, 0, 0, 0, 0).getTime());
    assertEqual('day to', to, new Date(2026, 6, 2, 23, 59, 59, 999).getTime());
  }

  if (process.exitCode === 1) {
    console.error('\nperiod.ts sanity check FAILED');
  } else {
    console.log('\nperiod.ts sanity check PASSED');
  }
  ```

- [ ] **1.4 — Run the check.**
  ```bash
  cd apps/raqm
  npx tsx scripts/check-period.ts
  ```
  Expected: every line prefixed `OK`, ending in `period.ts sanity check PASSED`, exit code 0. If any
  line prints `FAIL`, fix `getMonthBounds`/`getWeekBounds` before continuing — do not proceed to Task 2
  with a failing period module, everything downstream depends on it.

- [ ] **1.5 — Delete the temporary script** (keep `period.ts`).
  ```bash
  rm apps/raqm/scripts/check-period.ts
  ```

- [ ] **1.6 — Typecheck.**
  ```bash
  cd apps/raqm && npx tsc --noEmit
  ```

- [ ] **1.7 — Commit** (skip if the user has not approved commits): `feat(raqm): add period bounds utility (V1/V2/B2)`.

---

## Task 2 — Budgets DB, engine, and store wiring

**Files:**
- `apps/raqm/src/db/database.ts` (add `Budget` CRUD)
- `apps/raqm/src/services/budgets.ts` (new)
- `apps/raqm/src/store/txStore.ts` (patch `add`/`addParsed`/`update` to trigger `checkBudgetAlerts`)

**Interfaces (contract §5, verbatim):**
```ts
export interface Budget { id: number; categoryId: number; amount: number; periodType: 'monthly' | 'weekly'; rollover: boolean; }
export async function getBudgets(): Promise<Budget[]>;
export async function upsertBudget(categoryId: number, amount: number, periodType: 'monthly' | 'weekly', rollover: boolean): Promise<void>;
export async function deleteBudget(id: number): Promise<void>;

export interface BudgetStatus { budget: Budget; spent: number; limit: number; pct: number; }
export async function getBudgetStatuses(now?: Date): Promise<BudgetStatus[]>;
export async function checkBudgetAlerts(): Promise<void>;
```

The `budgets` table already exists (Plan 2's v2 migration: `id, category_id, amount, period_type,
rollover, created_at`) — this task adds no migration, only query functions.

### Steps

- [ ] **2.1 — Add budget CRUD to `apps/raqm/src/db/database.ts`.** Append after the settings helpers
  at the bottom of the file:

  ```ts
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
  ```

  Note: `upsertBudget` enforces one budget per category (matches the Settings UI — a category has at
  most one active budget). If a category's budget is removed from the Settings UI, the caller uses
  `deleteBudget`, not `upsertBudget` with amount 0.

- [ ] **2.2 — Create `apps/raqm/src/services/budgets.ts`.**

  Spend for a budget's period = sum of `TxRecord.amount` for expense-type transactions in that
  category and period, filtered through `countsTowardTotals` (Plan 3) so settled links/self-transfers
  never count against a budget. Rollover (B6) is **weekly-budgets-only**: this week's effective limit
  = `budget.amount + carry`, where `carry = max(0, budget.amount − lastWeekSpent)`. This is a one-level
  lookback (not a compounding chain across many weeks) — deliberate simplification to keep the query
  bounded; document this if it's ever revisited.

  ```ts
  import { TransactionType } from '@rahatsayyed/bank-sms-parser';
  import { getBudgets, loadTxRecords, getSetting, setSetting, type Budget, type TxRecord } from '../db/database';
  import { countsTowardTotals } from './txIntelligence';
  import { getMonthBounds, getWeekBounds, type PeriodBounds } from '../utils/period';
  import { postBudgetAlert } from '../notifications/notifications';

  export interface BudgetStatus {
    budget: Budget;
    spent: number;
    limit: number;
    pct: number;
  }

  function isExpense(tx: TxRecord): boolean {
    return tx.type === TransactionType.EXPENSE;
  }

  async function sumSpend(txs: TxRecord[], categoryId: number, bounds: PeriodBounds): Promise<number> {
    let total = 0;
    for (const tx of txs) {
      if (tx.categoryId !== categoryId) continue;
      if (!isExpense(tx)) continue;
      if (tx.timestamp < bounds.from || tx.timestamp > bounds.to) continue;
      if (!countsTowardTotals(tx)) continue;
      total += tx.amount;
    }
    return total;
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
    const alertsEnabled = await getSetting('budget_alerts');
    if (alertsEnabled === '0') return;

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
            `You've spent ₹${Math.round(status.spent).toLocaleString('en-IN')} of your ₹${Math.round(status.limit).toLocaleString('en-IN')} budget.`,
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
  }
  ```

- [ ] **2.3 — Wire `checkBudgetAlerts()` into `src/store/txStore.ts`.** Open the file; at the end of
  each of `add`, `addParsed`, and `update` — after the DB write and state refresh have completed, right
  before the function returns — add a fire-and-forget call. Import at the top:

  ```ts
  import { checkBudgetAlerts } from '../services/budgets';
  ```

  Then in each of the three methods, add this as the last statement in the async body (do **not**
  `await` it — it must not block the UI action that triggered it):

  ```ts
  checkBudgetAlerts().catch(() => {});
  ```

  Example for `add` (adapt to Plan 2's actual method body — the DB call and state-refresh lines will
  already be there; only the final `checkBudgetAlerts()` line is new):
  ```ts
  add: async (input) => {
    const id = await insertTx(input);
    await get().refresh();
    checkBudgetAlerts().catch(() => {});
    return id;
  },
  ```
  Apply the same trailing line to `addParsed` and `update`. Do **not** add it to `remove`, `restore`,
  or `load`/`refresh` — only mutations that can push a category over a budget threshold.

- [ ] **2.4 — Typecheck.**
  ```bash
  cd apps/raqm && npx tsc --noEmit
  ```

- [ ] **2.5 — Device checklist** (spec IDs B1, B2, B4, B5, B6 — full end-to-end verification happens
  after Task 6 wires the Settings budgets editor; for now confirm no crash):
  - [ ] App launches, no crash from the new `budgets.ts` import chain.
  - [ ] Adding/editing a manual transaction does not visibly stall the UI (alert check runs in background).

- [ ] **2.6 — Commit** (skip if the user has not approved commits): `feat(raqm): add budgets db, engine, and alert wiring (B1, B2, B4, B5, B6)`.

---

## Task 3 — Chart components: DonutChart and TrendLine

**Files:**
- `apps/raqm/src/components/DonutChart.tsx` (new)
- `apps/raqm/src/components/TrendLine.tsx` (new)

**Interfaces:**
```ts
// DonutChart.tsx
export interface DonutDatum { label: string; value: number; color: string; }
export function DonutChart(props: { data: DonutDatum[]; size?: number; strokeWidth?: number }): JSX.Element;

// TrendLine.tsx
export interface TrendDatum { label: string; value: number; }
export function TrendLine(props: { data: TrendDatum[]; height?: number }): JSX.Element;
```

### Steps

- [ ] **3.1 — Create `apps/raqm/src/components/DonutChart.tsx`.**

  Uses `Path` arcs (not stroke-dasharray) per the design brief. The classic "reversed start/end,
  sweep-flag 0" SVG arc trick is used so the `largeArcFlag` only needs a single `> 180°` comparison —
  this is the well-known correct approach for slices that can exceed a semicircle. A full-circle
  single-slice case is special-cased (real SVG arcs cannot draw a 360° sweep because the arc's start
  and end point would coincide) by capping the sweep at `359.99°`.

  ```tsx
  import React from 'react';
  import { View, Text, StyleSheet } from 'react-native';
  import Svg, { Path } from 'react-native-svg';
  import { Colors, Typography } from '../theme';

  export interface DonutDatum {
    label: string;
    value: number;
    color: string;
  }

  interface Props {
    data: DonutDatum[];
    size?: number;
    strokeWidth?: number;
  }

  function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
    const angleRad = ((angleDeg - 90) * Math.PI) / 180;
    return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
  }

  /** Describes an SVG arc path from startAngle to endAngle (degrees, clockwise from 12 o'clock). */
  function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const sweep = endAngle - startAngle;
    const largeArcFlag = sweep > 180 ? '1' : '0';
    // sweep-flag 0 with reversed start/end points draws the correct clockwise minor/major arc.
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
  }

  export function DonutChart({ data, size = 160, strokeWidth = 24 }: Props) {
    const cx = size / 2;
    const cy = size / 2;
    const radius = (size - strokeWidth) / 2;
    const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);

    const total0 = total === 0;
    let cumulativeAngle = 0;

    const arcs = data
      .filter((d) => d.value > 0)
      .map((d) => {
        const rawSweep = total0 ? 0 : (d.value / total) * 360;
        // A single slice covering the whole total would have start === end point; cap just short of 360.
        const sweep = Math.min(rawSweep, 359.99);
        const startAngle = cumulativeAngle;
        const endAngle = startAngle + sweep;
        cumulativeAngle = startAngle + rawSweep;
        return { key: d.label, d: describeArc(cx, cy, radius, startAngle, endAngle), color: d.color };
      });

    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={size} height={size}>
          {total0 ? (
            <Path
              d={describeArc(cx, cy, radius, 0, 359.99)}
              stroke={Colors.outlineVariant}
              strokeWidth={strokeWidth}
              fill="none"
              strokeLinecap="butt"
            />
          ) : (
            arcs.map((arc) => (
              <Path key={arc.key} d={arc.d} stroke={arc.color} strokeWidth={strokeWidth} fill="none" strokeLinecap="butt" />
            ))
          )}
        </Svg>
        <View style={StyleSheet.absoluteFillObject as object} pointerEvents="none">
          <View style={styles.centerLabelWrap}>
            <Text style={styles.centerLabel} numberOfLines={1}>
              ₹{Math.round(total).toLocaleString('en-IN')}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const styles = StyleSheet.create({
    centerLabelWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    centerLabel: { ...Typography.numericMd, color: Colors.onSurface, fontSize: 14 },
  });
  ```

- [ ] **3.2 — Create `apps/raqm/src/components/TrendLine.tsx`.**

  SVG polyline of the last 6 data points (caller passes the already-bucketed 6 months of expense
  totals), with month labels underneath. Colors from `Colors.primary` (line) / `Colors.outlineVariant`
  (baseline) only.

  ```tsx
  import React from 'react';
  import { View, Text, StyleSheet } from 'react-native';
  import Svg, { Polyline, Line, Circle } from 'react-native-svg';
  import { Colors, Typography, Spacing } from '../theme';

  export interface TrendDatum {
    label: string;
    value: number;
  }

  interface Props {
    data: TrendDatum[]; // expected length 6, oldest → newest
    height?: number;
  }

  export function TrendLine({ data, height = 120 }: Props) {
    const paddingX = 12;
    const paddingY = 12;
    // Width is resolved at layout time via onLayout so the polyline always fills the card.
    const [width, setWidth] = React.useState(0);

    const max = Math.max(...data.map((d) => d.value), 1);
    const min = 0; // expense trend always starts at 0 baseline
    const usableW = Math.max(width - paddingX * 2, 1);
    const usableH = Math.max(height - paddingY * 2, 1);
    const stepX = data.length > 1 ? usableW / (data.length - 1) : 0;

    const points = data.map((d, i) => {
      const x = paddingX + i * stepX;
      const normalized = max === min ? 0 : (d.value - min) / (max - min);
      const y = paddingY + (1 - normalized) * usableH;
      return { x, y, label: d.label, value: d.value };
    });

    const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

    return (
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <Svg width="100%" height={height}>
          <Line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke={Colors.outlineVariant} strokeWidth={1} />
          {width > 0 && (
            <>
              <Polyline points={polylinePoints} fill="none" stroke={Colors.primary} strokeWidth={2} />
              {points.map((p) => (
                <Circle key={p.label} cx={p.x} cy={p.y} r={3} fill={Colors.primary} />
              ))}
            </>
          )}
        </Svg>
        <View style={styles.labelRow}>
          {data.map((d) => (
            <Text key={d.label} style={styles.label} numberOfLines={1}>
              {d.label}
            </Text>
          ))}
        </View>
      </View>
    );
  }

  const styles = StyleSheet.create({
    labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
    label: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, fontSize: 10, flex: 1, textAlign: 'center' },
  });
  ```

- [ ] **3.3 — Typecheck.**
  ```bash
  cd apps/raqm && npx tsc --noEmit
  ```

- [ ] **3.4 — Commit** (skip if the user has not approved commits): `feat(raqm): add DonutChart and TrendLine svg components (V8, V9)`.

---

## Task 4 — AnalyticsScreen upgrade

**Files:**
- `apps/raqm/src/screens/main/AnalyticsScreen.tsx` (rewrite)

**Interfaces:** none new — consumes `useTxStore` (Plan 2), `getCategories` (Plan 2),
`countsTowardTotals` (Plan 3), `getBudgetStatuses` (Task 2), `getDayBounds`/`getWeekBounds`/`getMonthBounds`
(Task 1), `DonutChart`/`TrendLine` (Task 3), `getSetting` (Plan 2, for `month_start_day`).

### Steps

- [ ] **4.1 — Rewrite `apps/raqm/src/screens/main/AnalyticsScreen.tsx`.**

  Covers V1 (period chips + custom range), V4 (category breakdown with tap-through and budget bars,
  B3), V7 (daily/weekly/monthly bar chart variants), V5 (top merchants, carried over, period-filtered),
  V8 (donut), V9 (trend line, always last-6-calendar-months regardless of the active period — MoM
  comparison is inherently monthly). All totals go through `countsTowardTotals`.

  ```tsx
  import React, { useEffect, useMemo, useState } from 'react';
  import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
  import DateTimePicker from '@react-native-community/datetimepicker';
  import { Colors, Typography, Spacing, Radius } from '../../theme';
  import { useTxStore } from '../../store/txStore';
  import { getCategories, getSetting, type Category, type TxRecord } from '../../db/database';
  import { countsTowardTotals } from '../../services/txIntelligence';
  import { getBudgetStatuses, type BudgetStatus } from '../../services/budgets';
  import { getDayBounds, getWeekBounds, getMonthBounds, type PeriodType, type PeriodBounds } from '../../utils/period';
  import { DonutChart } from '../../components/DonutChart';
  import { TrendLine } from '../../components/TrendLine';
  import { TransactionType } from '@rahatsayyed/bank-sms-parser';
  import { MainStackScreenProps } from '../../navigation/types';

  const CHART_COLORS = [Colors.primary, Colors.mossStructure, Colors.secondary, Colors.tertiary, Colors.errorMuted, Colors.outline];

  function formatAmount(n: number, currency = '₹'): string {
    return `${currency}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  function monthLabel(d: Date): string {
    return d.toLocaleDateString('en-IN', { month: 'short' });
  }

  export function AnalyticsScreen({ navigation }: MainStackScreenProps<'Tabs'> extends never ? any : { navigation: any }) {
    const { txs } = useTxStore();
    const [periodType, setPeriodType] = useState<PeriodType>('monthly');
    const [monthStartDay, setMonthStartDay] = useState(1);
    const [customFrom, setCustomFrom] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const [customTo, setCustomTo] = useState<Date>(new Date());
    const [showFromPicker, setShowFromPicker] = useState(false);
    const [showToPicker, setShowToPicker] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);
    const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);

    useEffect(() => {
      getCategories().then(setCategories);
      getSetting('month_start_day').then((v) => setMonthStartDay(v ? Number(v) : 1));
      getBudgetStatuses().then(setBudgetStatuses);
    }, [txs]);

    const bounds: PeriodBounds = useMemo(() => {
      const now = new Date();
      if (periodType === 'daily') return getDayBounds(now);
      if (periodType === 'weekly') return getWeekBounds(now);
      if (periodType === 'monthly') return getMonthBounds(now, monthStartDay);
      return { from: customFrom.getTime(), to: customTo.getTime() };
    }, [periodType, monthStartDay, customFrom, customTo]);

    const periodTxs = useMemo(
      () => txs.filter((tx) => tx.timestamp >= bounds.from && tx.timestamp <= bounds.to && countsTowardTotals(tx)),
      [txs, bounds],
    );

    const currency = '₹';

    // V7 — bar chart, bucketed by day (last 14 days) / week (last 8 weeks) / calendar month (last 6)
    const barBuckets = useMemo(() => {
      const now = new Date();
      const buckets: { key: string; label: string; expenses: number }[] = [];

      if (periodType === 'daily') {
        for (let i = 13; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
          const b = getDayBounds(d);
          const expenses = txs
            .filter((tx) => tx.timestamp >= b.from && tx.timestamp <= b.to && countsTowardTotals(tx) && tx.type === TransactionType.EXPENSE)
            .reduce((s, tx) => s + tx.amount, 0);
          buckets.push({ key: String(b.from), label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), expenses });
        }
      } else if (periodType === 'weekly') {
        for (let i = 7; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
          const b = getWeekBounds(d);
          const expenses = txs
            .filter((tx) => tx.timestamp >= b.from && tx.timestamp <= b.to && countsTowardTotals(tx) && tx.type === TransactionType.EXPENSE)
            .reduce((s, tx) => s + tx.amount, 0);
          buckets.push({ key: String(b.from), label: `Wk ${new Date(b.from).getDate()}`, expenses });
        }
      } else {
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const b = getMonthBounds(new Date(d.getFullYear(), d.getMonth(), monthStartDay), monthStartDay);
          const expenses = txs
            .filter((tx) => tx.timestamp >= b.from && tx.timestamp <= b.to && countsTowardTotals(tx) && tx.type === TransactionType.EXPENSE)
            .reduce((s, tx) => s + tx.amount, 0);
          buckets.push({ key: String(b.from), label: monthLabel(d), expenses });
        }
      }
      return buckets;
    }, [txs, periodType, monthStartDay]);

    const maxExpense = Math.max(...barBuckets.map((b) => b.expenses), 1);

    // V5 — top merchants, period-filtered
    const topMerchants = useMemo(() => {
      const map = new Map<string, number>();
      for (const tx of periodTxs) {
        if (tx.type !== TransactionType.EXPENSE) continue;
        const name = tx.merchant || tx.bankName;
        map.set(name, (map.get(name) ?? 0) + tx.amount);
      }
      return Array.from(map.entries()).sort(([, a], [, b]) => b - a).slice(0, 8);
    }, [periodTxs]);

    // V4 — category breakdown, sorted desc, with B3 budget bars
    const categoryBreakdown = useMemo(() => {
      const map = new Map<number, number>();
      for (const tx of periodTxs) {
        if (tx.type !== TransactionType.EXPENSE || tx.categoryId == null) continue;
        map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
      }
      const rows = Array.from(map.entries())
        .map(([categoryId, total]) => {
          const cat = categories.find((c) => c.id === categoryId);
          const budget = budgetStatuses.find((bs) => bs.budget.categoryId === categoryId);
          return { categoryId, name: cat?.name ?? 'Unknown', emoji: cat?.emoji ?? '📦', total, budget };
        })
        .sort((a, b) => b.total - a.total);
      const max = Math.max(...rows.map((r) => r.total), 1);
      return rows.map((r) => ({ ...r, pct: r.total / max }));
    }, [periodTxs, categories, budgetStatuses]);

    // V8 — donut data from category breakdown
    const donutData = useMemo(
      () => categoryBreakdown.map((r, i) => ({ label: r.name, value: r.total, color: CHART_COLORS[i % CHART_COLORS.length] })),
      [categoryBreakdown],
    );

    // V9 — trend line: last 6 calendar months of expenses, independent of active period
    const trendData = useMemo(() => {
      const now = new Date();
      const out: { label: string; value: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const from = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
        const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
        const value = txs
          .filter((tx) => tx.timestamp >= from && tx.timestamp <= to && countsTowardTotals(tx) && tx.type === TransactionType.EXPENSE)
          .reduce((s, tx) => s + tx.amount, 0);
        out.push({ label: monthLabel(d), value });
      }
      return out;
    }, [txs]);

    function onCategoryPress(categoryId: number, categoryName: string) {
      navigation.navigate('CategoryDetail', { categoryId, categoryName, period: `${bounds.from}-${bounds.to}` });
    }

    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Analytics</Text>

        {/* V1 — period picker */}
        <View style={styles.chipsRow}>
          {(['daily', 'weekly', 'monthly', 'custom'] as PeriodType[]).map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.chip, periodType === p && styles.chipActive]}
              onPress={() => setPeriodType(p)}
            >
              <Text style={[styles.chipText, periodType === p && styles.chipTextActive]}>
                {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : p === 'monthly' ? 'Monthly' : 'Custom'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {periodType === 'custom' && (
          <View style={styles.customRow}>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowFromPicker(true)}>
              <Text style={styles.dateBtnText}>{customFrom.toLocaleDateString('en-IN')}</Text>
            </TouchableOpacity>
            <Text style={styles.customSep}>to</Text>
            <TouchableOpacity style={styles.dateBtn} onPress={() => setShowToPicker(true)}>
              <Text style={styles.dateBtnText}>{customTo.toLocaleDateString('en-IN')}</Text>
            </TouchableOpacity>
          </View>
        )}
        {showFromPicker && (
          <DateTimePicker
            value={customFrom}
            mode="date"
            display={Platform.OS === 'android' ? 'default' : 'spinner'}
            onChange={(_, date) => {
              setShowFromPicker(false);
              if (date) setCustomFrom(date);
            }}
          />
        )}
        {showToPicker && (
          <DateTimePicker
            value={customTo}
            mode="date"
            display={Platform.OS === 'android' ? 'default' : 'spinner'}
            onChange={(_, date) => {
              setShowToPicker(false);
              if (date) setCustomTo(date);
            }}
          />
        )}

        {/* V7 — spending bar chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending</Text>
          <View style={styles.chartCard}>
            <View style={styles.bars}>
              {barBuckets.map((b) => {
                const pct = b.expenses / maxExpense;
                return (
                  <View key={b.key} style={styles.barCol}>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { flex: pct }]} />
                      <View style={{ flex: 1 - pct }} />
                    </View>
                    <Text style={styles.barLabel}>{b.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        {/* V8 — donut chart */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Category split</Text>
          <View style={[styles.chartCard, styles.donutCard]}>
            <DonutChart data={donutData} />
            <View style={styles.legend}>
              {donutData.slice(0, 6).map((d) => (
                <View key={d.label} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                  <Text style={styles.legendLabel} numberOfLines={1}>{d.label}</Text>
                </View>
              ))}
              {donutData.length === 0 && <Text style={styles.emptyText}>No expenses this period</Text>}
            </View>
          </View>
        </View>

        {/* V4 + B3 — category breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By category</Text>
          <View style={styles.merchantList}>
            {categoryBreakdown.map((row) => (
              <TouchableOpacity key={row.categoryId} onPress={() => onCategoryPress(row.categoryId, row.name)} style={styles.categoryRow}>
                <View style={styles.merchantTopRow}>
                  <Text style={styles.merchantName}>{row.emoji} {row.name}</Text>
                  <Text style={styles.merchantAmount}>{formatAmount(row.total, currency)}</Text>
                </View>
                <View style={styles.merchantBar}>
                  <View style={[styles.merchantBarFill, { width: `${Math.round(row.pct * 100)}%` }]} />
                </View>
                {row.budget && (
                  <View style={styles.budgetBarTrack}>
                    <View
                      style={[
                        styles.budgetBarFill,
                        {
                          width: `${Math.min(100, Math.round(row.budget.pct))}%`,
                          backgroundColor:
                            row.budget.pct > 100 ? Colors.errorMuted : row.budget.pct >= 80 ? Colors.secondary : Colors.primary,
                        },
                      ]}
                    />
                    <Text style={styles.budgetBarLabel}>
                      {formatAmount(row.budget.spent)} / {formatAmount(row.budget.limit)} budget
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            {categoryBreakdown.length === 0 && <Text style={styles.emptyText}>No expense data yet</Text>}
          </View>
        </View>

        {/* V9 — trend line */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6-month trend</Text>
          <View style={styles.chartCard}>
            <TrendLine data={trendData} />
          </View>
        </View>

        {/* Top merchants */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Top merchants</Text>
          <View style={styles.merchantList}>
            {topMerchants.map(([name, amount], i) => {
              const pct = amount / (topMerchants[0]?.[1] ?? 1);
              return (
                <View key={name} style={styles.merchantRow}>
                  <View style={styles.merchantRank}>
                    <Text style={styles.merchantRankText}>{i + 1}</Text>
                  </View>
                  <View style={styles.merchantInfo}>
                    <View style={styles.merchantTopRow}>
                      <Text style={styles.merchantName} numberOfLines={1}>{name}</Text>
                      <Text style={styles.merchantAmount}>{formatAmount(amount, currency)}</Text>
                    </View>
                    <View style={styles.merchantBar}>
                      <View style={[styles.merchantBarFill, { width: `${Math.round(pct * 100)}%` }]} />
                    </View>
                  </View>
                </View>
              );
            })}
            {topMerchants.length === 0 && <Text style={styles.emptyText}>No expense data yet</Text>}
          </View>
        </View>
      </ScrollView>
    );
  }

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    content: { paddingBottom: 32 },
    pageTitle: { ...Typography.headlineSm, color: Colors.onSurface, paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.md },

    chipsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.containerMargin, marginBottom: Spacing.md },
    chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest },
    chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    chipText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
    chipTextActive: { color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },

    customRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingHorizontal: Spacing.containerMargin, marginBottom: Spacing.md },
    dateBtn: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest },
    dateBtnText: { ...Typography.bodySm, color: Colors.onSurface },
    customSep: { ...Typography.labelSm, color: Colors.onSurfaceVariant },

    section: { paddingHorizontal: Spacing.containerMargin, marginBottom: Spacing.xl },
    sectionTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.md, fontSize: 16 },

    chartCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant, padding: Spacing.md, paddingTop: Spacing.lg },
    donutCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 140 },
    barCol: { flex: 1, alignItems: 'center', gap: 6 },
    barTrack: { flex: 1, width: '100%', flexDirection: 'column-reverse' },
    barFill: { backgroundColor: Colors.primary, borderRadius: 4, minHeight: 4 },
    barLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, fontSize: 9, textAlign: 'center' },

    legend: { flex: 1, gap: 6 },
    legendRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 8, height: 8, borderRadius: 4 },
    legendLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, flexShrink: 1 },

    merchantList: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant, padding: Spacing.md, gap: Spacing.md },
    categoryRow: { gap: 6 },
    merchantRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    merchantRank: { width: 28, height: 28, borderRadius: 8, backgroundColor: Colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' },
    merchantRankText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontSize: 11, letterSpacing: 0 },
    merchantInfo: { flex: 1, gap: 6 },
    merchantTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
    merchantName: { ...Typography.bodySm, color: Colors.onSurface, flex: 1, fontFamily: 'WorkSans_500Medium' },
    merchantAmount: { ...Typography.numericSm, color: Colors.errorMuted, fontSize: 13, marginLeft: 8 },
    merchantBar: { height: 4, backgroundColor: Colors.surfaceVariant, borderRadius: 2, overflow: 'hidden' },
    merchantBarFill: { height: '100%', backgroundColor: `${Colors.errorMuted}80`, borderRadius: 2 },

    budgetBarTrack: { height: 4, backgroundColor: Colors.surfaceVariant, borderRadius: 2, overflow: 'hidden', position: 'relative' },
    budgetBarFill: { height: '100%', borderRadius: 2 },
    budgetBarLabel: { ...Typography.annotation, color: Colors.onSurfaceVariant, marginTop: 2 },

    emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', padding: Spacing.md },
  });
  ```

  Note: the `MainStackScreenProps<'Tabs'> extends never ? any : { navigation: any }` prop typing
  guard is intentionally defensive because `AnalyticsScreen` is registered as a *tab* screen
  (`MainTabScreenProps<'Analytics'>`), but `navigation.navigate('CategoryDetail', …)` requires the
  parent stack navigator's type. Use the actual type Plan 2 gave the screen — if `AnalyticsScreen`
  already receives `MainTabScreenProps<'Analytics'>['navigation']`, the correct move is to call
  `navigation.getParent<MainStackScreenProps<'Tabs'>['navigation']>()?.navigate('CategoryDetail', …)`
  instead of `navigation.navigate` directly (tab navigators can't navigate to stack-level screens).
  Replace the prop line and the `onCategoryPress` body with:
  ```ts
  import { MainTabScreenProps, MainStackParamList } from '../../navigation/types';
  import type { NavigationProp } from '@react-navigation/native';
  // ...
  export function AnalyticsScreen({ navigation }: MainTabScreenProps<'Analytics'>) {
    // ...
    function onCategoryPress(categoryId: number, categoryName: string) {
      navigation.getParent<NavigationProp<MainStackParamList>>()?.navigate('CategoryDetail', {
        categoryId,
        categoryName,
        period: `${bounds.from}-${bounds.to}`,
      });
    }
  ```
  and delete the placeholder prop type line from the snippet above.

- [ ] **4.2 — Typecheck.**
  ```bash
  cd apps/raqm && npx tsc --noEmit
  ```

- [ ] **4.3 — Device checklist:**
  - [ ] V1: tapping Daily/Weekly/Monthly/Custom chips changes all sections below.
  - [ ] V1: Custom opens two date pickers and filters correctly.
  - [ ] V4: category rows sorted by spend descending; tapping a row opens `CategoryDetail`.
  - [ ] V5: top merchants list matches the active period only.
  - [ ] V7: bar chart shows 14 daily bars / 8 weekly bars / 6 monthly bars depending on period.
  - [ ] V8: donut chart slices are proportional and use the fixed color cycle; center shows the total.
  - [ ] V9: trend line always shows 6 months, independent of the period chip selected.
  - [ ] B3: categories with a budget show a colored progress bar under the spend bar (green/orange/red per threshold).

- [ ] **4.4 — Commit** (skip if the user has not approved commits): `feat(raqm): analytics period picker, category breakdown, donut + trend charts (V1, V4, V5, V7, V8, V9, B3)`.

---

## Task 5 — CategoryDetailScreen

**Files:**
- `apps/raqm/src/screens/main/CategoryDetailScreen.tsx` (rewrite)

### Steps

- [ ] **5.1 — Rewrite `apps/raqm/src/screens/main/CategoryDetailScreen.tsx`.**

  Parses `route.params.period` (`"${from}-${to}"`, both always positive integers so a plain `split('-')`
  is unambiguous), lists transactions in that category+period (reusing the row layout style from
  `TransactionsScreen`/`DashboardScreen`), shows a total header, a sub-category breakdown grouped via
  `getSubcategories(categoryId)`, and a budget-vs-actual bar (B3) if a budget exists for the category.

  ```tsx
  import React, { useEffect, useMemo, useState } from 'react';
  import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
  import { Colors, Typography, Spacing, Radius } from '../../theme';
  import { MainStackScreenProps } from '../../navigation/types';
  import { useTxStore } from '../../store/txStore';
  import { getSubcategories, type Subcategory, type TxRecord } from '../../db/database';
  import { countsTowardTotals } from '../../services/txIntelligence';
  import { getBudgetStatuses, type BudgetStatus } from '../../services/budgets';
  import { TransactionType } from '@rahatsayyed/bank-sms-parser';

  function formatAmount(n: number, currency = '₹'): string {
    return `${currency}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function parsePeriod(period: string | undefined): { from: number; to: number } {
    if (!period) return { from: 0, to: Date.now() };
    const [fromStr, toStr] = period.split('-');
    return { from: Number(fromStr), to: Number(toStr) };
  }

  export function CategoryDetailScreen({ route, navigation }: MainStackScreenProps<'CategoryDetail'>) {
    const { categoryId, categoryName, period } = route.params;
    const { txs } = useTxStore();
    const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
    const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
    const bounds = useMemo(() => parsePeriod(period), [period]);

    useEffect(() => {
      getSubcategories(categoryId).then(setSubcategories);
      getBudgetStatuses().then(setBudgetStatuses);
    }, [categoryId]);

    const categoryTxs = useMemo(
      () =>
        txs
          .filter(
            (tx) =>
              tx.categoryId === categoryId &&
              tx.timestamp >= bounds.from &&
              tx.timestamp <= bounds.to &&
              countsTowardTotals(tx),
          )
          .sort((a, b) => b.timestamp - a.timestamp),
      [txs, categoryId, bounds],
    );

    const total = useMemo(
      () => categoryTxs.filter((tx) => tx.type === TransactionType.EXPENSE).reduce((s, tx) => s + tx.amount, 0),
      [categoryTxs],
    );

    const subBreakdown = useMemo(() => {
      const map = new Map<number | null, number>();
      for (const tx of categoryTxs) {
        if (tx.type !== TransactionType.EXPENSE) continue;
        map.set(tx.subcategoryId, (map.get(tx.subcategoryId) ?? 0) + tx.amount);
      }
      return Array.from(map.entries())
        .map(([subId, amount]) => ({
          name: subId == null ? 'Uncategorized' : subcategories.find((s) => s.id === subId)?.name ?? 'Other',
          amount,
        }))
        .sort((a, b) => b.amount - a.amount);
    }, [categoryTxs, subcategories]);

    const budget = budgetStatuses.find((bs) => bs.budget.categoryId === categoryId);

    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>{categoryName}</Text>
        <Text style={styles.totalAmount}>{formatAmount(total)}</Text>
        <Text style={styles.totalMeta}>{categoryTxs.length} transaction{categoryTxs.length !== 1 ? 's' : ''} this period</Text>

        {budget && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Budget</Text>
            <View style={styles.card}>
              <View style={styles.budgetTrack}>
                <View
                  style={[
                    styles.budgetFill,
                    {
                      width: `${Math.min(100, Math.round(budget.pct))}%`,
                      backgroundColor: budget.pct > 100 ? Colors.errorMuted : budget.pct >= 80 ? Colors.secondary : Colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={styles.budgetLabel}>
                {formatAmount(budget.spent)} of {formatAmount(budget.limit)} ({Math.round(budget.pct)}%)
              </Text>
            </View>
          </View>
        )}

        {subBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>By sub-category</Text>
            <View style={styles.card}>
              {subBreakdown.map((row) => (
                <View key={row.name} style={styles.subRow}>
                  <Text style={styles.subName}>{row.name}</Text>
                  <Text style={styles.subAmount}>{formatAmount(row.amount)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transactions</Text>
          <View style={styles.card}>
            {categoryTxs.length === 0 ? (
              <Text style={styles.emptyText}>No transactions in this period</Text>
            ) : (
              categoryTxs.map((tx, i) => <TxRow key={tx.id} tx={tx} isLast={i === categoryTxs.length - 1} navigation={navigation} />)
            )}
          </View>
        </View>
      </ScrollView>
    );
  }

  function TxRow({ tx, isLast, navigation }: { tx: TxRecord; isLast: boolean; navigation: MainStackScreenProps<'CategoryDetail'>['navigation'] }) {
    const debit = tx.type === TransactionType.EXPENSE;
    const color = debit ? Colors.errorMuted : Colors.primary;
    return (
      <TouchableOpacity
        style={[styles.txRow, !isLast && styles.txRowBorder]}
        onPress={() => navigation.navigate('TransactionDetail', { transactionId: tx.id })}
      >
        <View style={styles.txInfo}>
          <Text style={styles.txMerchant} numberOfLines={1}>{tx.merchant || tx.bankName}</Text>
          <Text style={styles.txMeta}>{formatDate(tx.timestamp)}</Text>
        </View>
        <Text style={[styles.txAmount, { color }]}>{debit ? '-' : '+'}{formatAmount(tx.amount)}</Text>
      </TouchableOpacity>
    );
  }

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Spacing.containerMargin, paddingBottom: 40 },
    back: { marginBottom: Spacing.md },
    backText: { ...Typography.bodyMd, color: Colors.primary },
    title: { ...Typography.headlineSm, color: Colors.onSurface },
    totalAmount: { ...Typography.numericLg, color: Colors.onSurface, marginTop: Spacing.sm },
    totalMeta: { ...Typography.supportingText, color: Colors.onSurfaceVariant, marginTop: 4 },

    section: { marginTop: Spacing.xl },
    sectionTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.md, fontSize: 16 },
    card: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant, padding: Spacing.md },

    budgetTrack: { height: 6, backgroundColor: Colors.surfaceVariant, borderRadius: 3, overflow: 'hidden' },
    budgetFill: { height: '100%', borderRadius: 3 },
    budgetLabel: { ...Typography.supportingText, color: Colors.onSurfaceVariant, marginTop: Spacing.sm },

    subRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
    subName: { ...Typography.bodySm, color: Colors.onSurface },
    subAmount: { ...Typography.numericSm, color: Colors.onSurfaceVariant },

    txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
    txRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
    txInfo: { flex: 1 },
    txMerchant: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
    txMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
    txAmount: { ...Typography.numericSm, fontSize: 15 },

    emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', padding: Spacing.md },
  });
  ```

- [ ] **5.2 — Typecheck.**
  ```bash
  cd apps/raqm && npx tsc --noEmit
  ```

- [ ] **5.3 — Device checklist:**
  - [ ] V4: tapping a category row in Analytics opens this screen with matching total.
  - [ ] Sub-category breakdown lists correct names via `getSubcategories`.
  - [ ] B3: budget bar appears only when a budget exists for the category, correct color threshold.
  - [ ] Tapping a transaction row opens `TransactionDetail`.

- [ ] **5.4 — Commit** (skip if the user has not approved commits): `feat(raqm): implement CategoryDetailScreen (V4, B3)`.

---

## Task 6 — SettingsScreen

**Files:**
- `apps/raqm/src/screens/main/SettingsScreen.tsx` (rewrite)

### Steps

- [ ] **6.1 — Rewrite `apps/raqm/src/screens/main/SettingsScreen.tsx`.**

  Four sections: PERIOD (month start day, V2), NOTIFICATIONS (three switches + `budget_alerts` master
  switch, T22), BUDGETS (per-category amount/period/rollover editor, B1/B2/B6), APPEARANCE (AP1 —
  **disabled placeholder row**, not a working toggle, per spec §3.2 vs §4.11 conflict resolved in favor
  of §3.2: "theme toggle placeholder").

  ```tsx
  import React, { useEffect, useState, useCallback } from 'react';
  import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, TextInput, Modal, FlatList } from 'react-native';
  import { Colors, Typography, Spacing, Radius } from '../../theme';
  import { MainStackScreenProps } from '../../navigation/types';
  import { getSetting, setSetting, getCategories, getBudgets, upsertBudget, deleteBudget, type Category, type Budget } from '../../db/database';
  import { scheduleSummaries } from '../../notifications/notifications';

  const MONTH_START_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

  export function SettingsScreen({ navigation }: MainStackScreenProps<'Settings'>) {
    const [monthStartDay, setMonthStartDay] = useState(1);
    const [showDayPicker, setShowDayPicker] = useState(false);
    const [notifDaily, setNotifDaily] = useState(true);
    const [notifWeekly, setNotifWeekly] = useState(true);
    const [notifMonthly, setNotifMonthly] = useState(true);
    const [budgetAlerts, setBudgetAlerts] = useState(true);
    const [categories, setCategories] = useState<Category[]>([]);
    const [budgets, setBudgets] = useState<Budget[]>([]);
    const [drafts, setDrafts] = useState<Record<number, { amount: string; periodType: 'monthly' | 'weekly'; rollover: boolean }>>({});

    const reload = useCallback(async () => {
      const [day, daily, weekly, monthly, alerts, cats, buds] = await Promise.all([
        getSetting('month_start_day'),
        getSetting('notif_daily'),
        getSetting('notif_weekly'),
        getSetting('notif_monthly'),
        getSetting('budget_alerts'),
        getCategories(),
        getBudgets(),
      ]);
      setMonthStartDay(day ? Number(day) : 1);
      setNotifDaily(daily !== '0');
      setNotifWeekly(weekly !== '0');
      setNotifMonthly(monthly !== '0');
      setBudgetAlerts(alerts !== '0');
      setCategories(cats);
      setBudgets(buds);
      const nextDrafts: typeof drafts = {};
      for (const cat of cats) {
        const existing = buds.find((b) => b.categoryId === cat.id);
        nextDrafts[cat.id] = {
          amount: existing ? String(existing.amount) : '',
          periodType: existing?.periodType ?? 'monthly',
          rollover: existing?.rollover ?? false,
        };
      }
      setDrafts(nextDrafts);
    }, []);

    useEffect(() => {
      reload();
    }, [reload]);

    async function onSelectMonthStartDay(day: number) {
      setMonthStartDay(day);
      setShowDayPicker(false);
      await setSetting('month_start_day', String(day));
    }

    async function onToggleNotif(key: 'notif_daily' | 'notif_weekly' | 'notif_monthly', value: boolean, setter: (v: boolean) => void) {
      setter(value);
      await setSetting(key, value ? '1' : '0');
      await scheduleSummaries();
    }

    async function onToggleBudgetAlerts(value: boolean) {
      setBudgetAlerts(value);
      await setSetting('budget_alerts', value ? '1' : '0');
    }

    function updateDraft(categoryId: number, patch: Partial<{ amount: string; periodType: 'monthly' | 'weekly'; rollover: boolean }>) {
      setDrafts((prev) => ({ ...prev, [categoryId]: { ...prev[categoryId], ...patch } }));
    }

    async function saveBudget(categoryId: number) {
      const draft = drafts[categoryId];
      const amount = Number(draft.amount);
      if (!draft.amount || Number.isNaN(amount) || amount <= 0) {
        const existing = budgets.find((b) => b.categoryId === categoryId);
        if (existing) {
          await deleteBudget(existing.id);
          await reload();
        }
        return;
      }
      await upsertBudget(categoryId, amount, draft.periodType, draft.rollover);
      await reload();
    }

    return (
      <View style={styles.root}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>

          {/* PERIOD */}
          <Text style={styles.sectionHeader}>PERIOD</Text>
          <View style={styles.card}>
            <TouchableOpacity style={styles.row} onPress={() => setShowDayPicker(true)}>
              <Text style={styles.rowLabel}>Month start day</Text>
              <Text style={styles.rowValue}>{monthStartDay}</Text>
            </TouchableOpacity>
          </View>

          {/* NOTIFICATIONS */}
          <Text style={styles.sectionHeader}>NOTIFICATIONS</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Daily summary</Text>
              <Switch
                value={notifDaily}
                onValueChange={(v) => onToggleNotif('notif_daily', v, setNotifDaily)}
                trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
              />
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Weekly summary</Text>
              <Switch
                value={notifWeekly}
                onValueChange={(v) => onToggleNotif('notif_weekly', v, setNotifWeekly)}
                trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
              />
            </View>
            <View style={styles.rowDivider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Monthly summary</Text>
              <Switch
                value={notifMonthly}
                onValueChange={(v) => onToggleNotif('notif_monthly', v, setNotifMonthly)}
                trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
              />
            </View>
          </View>

          {/* BUDGETS */}
          <Text style={styles.sectionHeader}>BUDGETS</Text>
          <View style={styles.card}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Budget alerts</Text>
              <Switch
                value={budgetAlerts}
                onValueChange={onToggleBudgetAlerts}
                trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
              />
            </View>
            <View style={styles.rowDivider} />
            {categories.map((cat) => {
              const draft = drafts[cat.id] ?? { amount: '', periodType: 'monthly' as const, rollover: false };
              return (
                <View key={cat.id} style={styles.budgetRow}>
                  <Text style={styles.budgetCatName}>{cat.emoji} {cat.name}</Text>
                  <View style={styles.budgetInputRow}>
                    <TextInput
                      style={styles.budgetInput}
                      placeholder="Amount"
                      placeholderTextColor={Colors.onSurfaceVariant}
                      keyboardType="numeric"
                      value={draft.amount}
                      onChangeText={(t) => updateDraft(cat.id, { amount: t })}
                      onBlur={() => saveBudget(cat.id)}
                    />
                    <View style={styles.segmented}>
                      {(['monthly', 'weekly'] as const).map((p) => (
                        <TouchableOpacity
                          key={p}
                          style={[styles.segmentBtn, draft.periodType === p && styles.segmentBtnActive]}
                          onPress={() => {
                            updateDraft(cat.id, { periodType: p });
                            saveBudget(cat.id);
                          }}
                        >
                          <Text style={[styles.segmentText, draft.periodType === p && styles.segmentTextActive]}>
                            {p === 'monthly' ? 'Mo' : 'Wk'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  {draft.periodType === 'weekly' && (
                    <View style={styles.rolloverRow}>
                      <Text style={styles.rolloverLabel}>Rollover unused amount</Text>
                      <Switch
                        value={draft.rollover}
                        onValueChange={(v) => {
                          updateDraft(cat.id, { rollover: v });
                          saveBudget(cat.id);
                        }}
                        trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* APPEARANCE */}
          <Text style={styles.sectionHeader}>APPEARANCE</Text>
          <View style={styles.card}>
            <View style={[styles.row, styles.rowDisabled]}>
              <Text style={[styles.rowLabel, styles.rowLabelDisabled]}>Light theme — coming soon</Text>
              <Switch value={false} disabled trackColor={{ true: Colors.primary, false: Colors.surfaceVariant }} />
            </View>
          </View>
        </ScrollView>

        <Modal visible={showDayPicker} transparent animationType="fade" onRequestClose={() => setShowDayPicker(false)}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowDayPicker(false)}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Month start day</Text>
              <FlatList
                data={MONTH_START_DAYS}
                keyExtractor={(d) => String(d)}
                numColumns={7}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.dayCell, item === monthStartDay && styles.dayCellActive]}
                    onPress={() => onSelectMonthStartDay(item)}
                  >
                    <Text style={[styles.dayCellText, item === monthStartDay && styles.dayCellTextActive]}>{item}</Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Spacing.containerMargin, paddingBottom: 40 },
    back: { marginBottom: Spacing.md },
    backText: { ...Typography.bodyMd, color: Colors.primary },
    title: { ...Typography.headlineSm, color: Colors.onSurface, marginBottom: Spacing.lg },

    sectionHeader: { ...Typography.sectionHeader, color: Colors.onSurfaceVariant, marginTop: Spacing.lg, marginBottom: Spacing.sm },
    card: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant, padding: Spacing.md },

    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
    rowDisabled: { opacity: 0.5 },
    rowLabel: { ...Typography.bodyStandard, color: Colors.onSurface },
    rowLabelDisabled: { color: Colors.onSurfaceVariant },
    rowValue: { ...Typography.numericSm, color: Colors.primary },
    rowDivider: { height: 1, backgroundColor: Colors.outlineVariant },

    budgetRow: { paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant, gap: Spacing.xs },
    budgetCatName: { ...Typography.bodyStandard, color: Colors.onSurface },
    budgetInputRow: { flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' },
    budgetInput: { flex: 1, borderWidth: 1, borderColor: Colors.outlineVariant, borderRadius: Radius.md, paddingHorizontal: Spacing.sm, paddingVertical: 8, color: Colors.onSurface, ...Typography.bodySm },
    segmented: { flexDirection: 'row', borderRadius: Radius.md, overflow: 'hidden', borderWidth: 1, borderColor: Colors.outlineVariant },
    segmentBtn: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: Colors.surfaceContainerLowest },
    segmentBtnActive: { backgroundColor: Colors.primary },
    segmentText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
    segmentTextActive: { color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
    rolloverRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 },
    rolloverLabel: { ...Typography.supportingText, color: Colors.onSurfaceVariant },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Spacing.lg },
    modalCard: { backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant, padding: Spacing.lg },
    modalTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.md, fontSize: 16 },
    dayCell: { flex: 1, aspectRatio: 1, margin: 2, borderRadius: Radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceContainer },
    dayCellActive: { backgroundColor: Colors.primary },
    dayCellText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
    dayCellTextActive: { color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
  });
  ```

- [ ] **6.2 — Typecheck.**
  ```bash
  cd apps/raqm && npx tsc --noEmit
  ```

- [ ] **6.3 — Device checklist:**
  - [ ] V2: changing month start day persists (`getSetting('month_start_day')` survives app restart) and shifts Analytics/Dashboard monthly bounds (verify against Task 4/7).
  - [ ] T22: toggling any notification switch calls `scheduleSummaries()` (verify via Plan 4's notification schedule — no crash, toggle state persists across restart).
  - [ ] B1: entering an amount for a category and blurring the input creates/updates a budget row; clearing the amount deletes it.
  - [ ] B2: monthly budgets computed against `getMonthBounds` with the current start day (cross-check with Analytics category row bar).
  - [ ] B6: setting a weekly budget to rollover and spending less than the limit one week shows a higher effective limit the next week (verify via `getBudgetStatuses` in Analytics/CategoryDetail).
  - [ ] AP1: the appearance row is visibly disabled (dimmed, switch non-interactive) and reads "Light theme — coming soon" — it must **not** toggle anything.

- [ ] **6.4 — Commit** (skip if the user has not approved commits): `feat(raqm): implement SettingsScreen (V2, T22, B1, B2, B6, AP1)`.

---

## Task 7 — Dashboard month-bounded hero stats

**Files:**
- `apps/raqm/src/screens/main/DashboardScreen.tsx` (edit)

### Steps

- [ ] **7.1 — Replace the all-time `stats` `useMemo` with a month-bounded async load.**

  Today the hero card sums every transaction ever seen. V2 requires it to reflect the current custom
  month period. Add state + an effect that recomputes on `txs` changes and reads `month_start_day` from
  settings:

  ```tsx
  import { getMonthBounds } from '../../utils/period';
  import { getSetting } from '../../db/database';
  import { countsTowardTotals } from '../../services/txIntelligence';
  // (keep existing imports; useTxStore should already be imported per Plan 2)

  // Replace the old `const stats = useMemo(...)` block with:
  const [stats, setStats] = useState({ income: 0, expenses: 0, net: 0 });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const startDayStr = await getSetting('month_start_day');
      const startDay = startDayStr ? Number(startDayStr) : 1;
      const { from, to } = getMonthBounds(new Date(), startDay);
      let income = 0;
      let expenses = 0;
      for (const tx of txs) {
        if (tx.timestamp < from || tx.timestamp > to) continue;
        if (!countsTowardTotals(tx)) continue;
        if (tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT) {
          income += tx.amount;
        } else if (isDebit(tx.type)) {
          expenses += tx.amount;
        }
      }
      if (!cancelled) setStats({ income, expenses, net: income - expenses });
    })();
    return () => {
      cancelled = true;
    };
  }, [txs]);
  ```

  This replaces the old `stats` computation only — leave `accounts` and `recent` (still all-time /
  most-recent-15, per spec — only the hero card's totals are month-bounded, V2 doesn't ask for the
  recent-transactions list or account chips to be period-filtered).

  Add `useState` to the React import line if not already present:
  ```tsx
  import React, { useEffect, useRef, useMemo, useState } from 'react';
  ```

- [ ] **7.2 — Update the hero card's meta line** (`"{transactions.length} transactions across ..."`)
  if it still references the removed `transactions` variable — it should reference `txs` (Plan 2's
  store), unchanged in count semantics (still all-time transaction count, only the amounts are
  month-bounded):
  ```tsx
  <Text style={styles.heroMeta}>{txs.length} transactions across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</Text>
  ```

- [ ] **7.3 — Typecheck.**
  ```bash
  cd apps/raqm && npx tsc --noEmit
  ```

- [ ] **7.4 — Device checklist:**
  - [ ] V2/V3: hero card income/expense/net reflect only the current custom-month-start period, not all-time totals.
  - [ ] Changing month start day in Settings (Task 6) and returning to Dashboard updates the hero numbers.
  - [ ] Settled links / self-transfers (Plan 3) are excluded from the hero totals (`countsTowardTotals`).

- [ ] **7.5 — Commit** (skip if the user has not approved commits): `feat(raqm): bound Dashboard hero stats to the custom month period (V2, V3)`.

---

## Verification Checklist

Spec items verbatim (`docs/superpowers/specs/2026-07-02-raqm-v0-design.md` §7), scoped to this plan:

### Spending Views
- [ ] V1: Period picker (Daily/Weekly/Monthly/Custom) filters Analytics correctly
- [ ] V2: Changing month start day in Settings shifts monthly period correctly
- [ ] V3: Dashboard hero shows correct net cash flow
- [ ] V4: Category breakdown shows spend per category for period
- [ ] V5: Top merchants list correct
- [ ] V7: Bar chart renders monthly and daily/weekly variants
- [ ] V8: Donut chart shows category split proportionally
- [ ] V9: Trend line shows correct month-over-month change

### Budgets
- [ ] B1: Budget can be set per category in Settings
- [ ] B2: Monthly budget period follows custom month start day
- [ ] B3: Progress bar shows budget utilization in Analytics category row
- [ ] B4: Push notification fires when 80% of budget spent
- [ ] B5: Push notification fires when budget exceeded
- [ ] B6: Unused weekly budget carries to next week when rollover enabled

### Appearance
- [ ] AP1: Settings shows a disabled "Light theme — coming soon" placeholder row (per spec §3.2 — this
      is NOT a working dark/light toggle; the §4.11 checklist wording ("switches theme without restart")
      is superseded by §3.2's "theme toggle placeholder" description for v0)
