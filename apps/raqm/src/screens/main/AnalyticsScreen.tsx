import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Colors } from '../../theme';
import { useTxStore } from '../../store/txStore';
import { getCategories, getSetting, type Category, type TxRecord } from '../../db/database';
import { countsTowardTotals } from '../../services/txIntelligence';
import { getBudgetStatuses, type BudgetStatus } from '../../services/budgets';
import { getDayBounds, getWeekBounds, getMonthBounds, type PeriodType, type PeriodBounds } from '../../utils/period';
import { DonutChart } from '../../components/DonutChart';
import { TrendLine } from '../../components/TrendLine';
import { BriefingHero, NarrativeAdvisor, CategoryShift } from '../../components/analytics';
import { SectionHeader, TransactionRow } from '../../components/dashboard';
import { AccountLiquidityCard } from '../../components/AccountLiquidityCard';
import { TrendingUpIcon, TrendingDownIcon } from '../../components/TabIcon';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { MainTabScreenProps, MainStackParamList } from '../../navigation/types';
import { formatAmount } from '../../utils/format';

const CHART_COLORS = [Colors.primary, Colors.mossStructure, Colors.secondary, Colors.tertiary, Colors.errorMuted, Colors.outline];

function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', { month: 'short' });
}

/** Whether a transaction should be included in analytics at all (soft-deleted rows are always excluded). */
function isCounted(tx: TxRecord): boolean {
  return !tx.deletedAt && countsTowardTotals(tx);
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function AnalyticsScreen({ navigation }: MainTabScreenProps<'Analytics'>) {
  const { txs } = useTxStore();
  const currency = txs[0]?.currency ?? '₹';
  const [periodType, setPeriodType] = useState<PeriodType>('monthly');
  const [monthStartDay, setMonthStartDay] = useState(1);
  const [customFrom, setCustomFrom] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [customTo, setCustomTo] = useState<Date>(new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);

  const loadMeta = useCallback(() => {
    getCategories().then(setCategories);
    getSetting('month_start_day').then((v) => setMonthStartDay(v ? Number(v) : 1));
    getBudgetStatuses().then(setBudgetStatuses);
  }, [txs]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  // Re-read month_start_day (and budgets) when returning from Settings — this screen
  // stays mounted beneath the pushed Settings screen, so [txs] alone won't re-fire.
  useFocusEffect(
    useCallback(() => {
      loadMeta();
    }, [loadMeta]),
  );

  // Clamp so a corrupted/legacy setting can't push the reference date into an adjacent month.
  const clampedMonthStartDay = Math.min(28, Math.max(1, monthStartDay));

  const bounds: PeriodBounds = useMemo(() => {
    const now = new Date();
    if (periodType === 'daily') return getDayBounds(now);
    if (periodType === 'weekly') return getWeekBounds(now);
    if (periodType === 'monthly') return getMonthBounds(now, clampedMonthStartDay);
    // Guard against an inverted range (from > to) by swapping rather than rendering empty.
    const from = customFrom.getTime();
    const to = customTo.getTime();
    const [lo, hi] = from <= to ? [from, to] : [to, from];
    return { from: lo, to: hi };
  }, [periodType, clampedMonthStartDay, customFrom, customTo]);

  const periodTxs = useMemo(
    () => txs.filter((tx) => tx.timestamp >= bounds.from && tx.timestamp <= bounds.to && isCounted(tx)),
    [txs, bounds],
  );

  // V7 — bar chart, bucketed by day (last 14 days) / week (last 8 weeks) / calendar month (last 6)
  const barBuckets = useMemo(() => {
    const now = new Date();
    const buckets: { key: string; label: string; expenses: number }[] = [];

    if (periodType === 'daily') {
      for (let i = 13; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const b = getDayBounds(d);
        const expenses = txs
          .filter((tx) => tx.timestamp >= b.from && tx.timestamp <= b.to && isCounted(tx) && tx.type === TransactionType.EXPENSE)
          .reduce((s, tx) => s + tx.amount, 0);
        buckets.push({ key: String(b.from), label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), expenses });
      }
    } else if (periodType === 'weekly') {
      for (let i = 7; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i * 7);
        const b = getWeekBounds(d);
        const expenses = txs
          .filter((tx) => tx.timestamp >= b.from && tx.timestamp <= b.to && isCounted(tx) && tx.type === TransactionType.EXPENSE)
          .reduce((s, tx) => s + tx.amount, 0);
        buckets.push({ key: String(b.from), label: `Wk ${new Date(b.from).getDate()}`, expenses });
      }
    } else {
      // `custom` intentionally falls back to these monthly buckets (last 6 calendar months) —
      // there's no natural bucket size for an arbitrary custom range.
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const b = getMonthBounds(new Date(d.getFullYear(), d.getMonth(), clampedMonthStartDay), clampedMonthStartDay);
        const expenses = txs
          .filter((tx) => tx.timestamp >= b.from && tx.timestamp <= b.to && isCounted(tx) && tx.type === TransactionType.EXPENSE)
          .reduce((s, tx) => s + tx.amount, 0);
        buckets.push({ key: String(b.from), label: monthLabel(d), expenses });
      }
    }
    return buckets;
  }, [txs, periodType, clampedMonthStartDay]);

  const maxExpense = Math.max(...barBuckets.map((b) => b.expenses), 1);

  // V5 — top merchants, period-filtered (refunds net against the merchant's expense total)
  const topMerchants = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of periodTxs) {
      const isCredit = tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT;
      const name = tx.merchant || tx.bankName;
      if (isCredit && tx.linkType === 'refund') {
        map.set(name, (map.get(name) ?? 0) - tx.amount);
      } else if (tx.type === TransactionType.EXPENSE) {
        map.set(name, (map.get(name) ?? 0) + tx.amount);
      }
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => b - a).slice(0, 8);
  }, [periodTxs]);

  // Merchant snapshot — top merchant by spend + most frequent merchant by order count, both
  // period-filtered, each compared against the immediately preceding period of equal length.
  const merchantSnapshot = useMemo(() => {
    const spendByMerchant = (list: TxRecord[]) => {
      const map = new Map<string, number>();
      for (const tx of list) {
        const isCredit = tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT;
        const name = tx.merchant || tx.bankName;
        if (isCredit && tx.linkType === 'refund') {
          map.set(name, (map.get(name) ?? 0) - tx.amount);
        } else if (tx.type === TransactionType.EXPENSE) {
          map.set(name, (map.get(name) ?? 0) + tx.amount);
        }
      }
      return map;
    };
    const countByMerchant = (list: TxRecord[]) => {
      const map = new Map<string, number>();
      for (const tx of list) {
        if (tx.type !== TransactionType.EXPENSE) continue;
        const name = tx.merchant || tx.bankName;
        map.set(name, (map.get(name) ?? 0) + 1);
      }
      return map;
    };

    const currSpend = spendByMerchant(periodTxs);
    const currCount = countByMerchant(periodTxs);

    const prevDurationMs = bounds.to - bounds.from;
    const prevBounds = { from: bounds.from - prevDurationMs, to: bounds.from };
    const prevTxs = txs.filter((tx) => tx.timestamp >= prevBounds.from && tx.timestamp < prevBounds.to && isCounted(tx));
    const prevSpend = spendByMerchant(prevTxs);
    const prevCount = countByMerchant(prevTxs);

    const topMerchantEntry = Array.from(currSpend.entries()).sort(([, a], [, b]) => b - a)[0];
    const mostFrequentEntry = Array.from(currCount.entries()).sort(([, a], [, b]) => b - a)[0];

    return {
      topMerchant: topMerchantEntry
        ? { name: topMerchantEntry[0], spendDelta: topMerchantEntry[1] - (prevSpend.get(topMerchantEntry[0]) ?? 0) }
        : null,
      mostFrequent: mostFrequentEntry
        ? {
            name: mostFrequentEntry[0],
            count: mostFrequentEntry[1],
            countDelta: mostFrequentEntry[1] - (prevCount.get(mostFrequentEntry[0]) ?? 0),
          }
        : null,
    };
  }, [periodTxs, txs, bounds]);

  // Liquidity snapshot — latest known balance per non-card account, summed for the total.
  const liquiditySnapshot = useMemo(() => {
    const map = new Map<string, { bankName: string; last4: string | null; balance: number; currency: string; timestamp: number }>();
    for (const tx of txs) {
      if (tx.isFromCard || tx.balance == null) continue;
      const key = `${tx.bankName}|${tx.accountLast4 ?? ''}`;
      const existing = map.get(key);
      if (!existing || tx.timestamp > existing.timestamp) {
        map.set(key, { bankName: tx.bankName, last4: tx.accountLast4, balance: tx.balance, currency: tx.currency, timestamp: tx.timestamp });
      }
    }
    const accounts = Array.from(map.values()).sort((a, b) => b.timestamp - a.timestamp);
    const total = accounts.reduce((sum, a) => sum + a.balance, 0);
    return { accounts, total };
  }, [txs]);

  // V4 — category breakdown, sorted desc, with B3 budget bars
  const categoryBreakdown = useMemo(() => {
    // Refund credits usually carry no categoryId of their own — resolve the refunded
    // expense's category through the link partner so the refund nets against the
    // category (and its budget bar), not the Uncategorized bucket.
    const byId = new Map(txs.map((t) => [t.id, t]));
    const map = new Map<number, number>();
    let uncategorizedTotal = 0;
    for (const tx of periodTxs) {
      const isCredit = tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT;
      if (isCredit && tx.linkType === 'refund') {
        const partner = tx.linkPartnerId != null ? byId.get(tx.linkPartnerId) : undefined;
        const cat = partner?.categoryId ?? tx.categoryId ?? null;
        if (cat == null) uncategorizedTotal -= tx.amount;
        else map.set(cat, (map.get(cat) ?? 0) - tx.amount);
        continue;
      }
      if (tx.type !== TransactionType.EXPENSE) continue;
      if (tx.categoryId == null) {
        uncategorizedTotal += tx.amount;
        continue;
      }
      map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
    }
    const rows: { categoryId: number | null; name: string; emoji: string; total: number; budget: BudgetStatus | undefined }[] =
      Array.from(map.entries())
        .filter(([, total]) => total > 0)
        .map(([categoryId, total]) => {
          const cat = categories.find((c) => c.id === categoryId);
          const budget = budgetStatuses.find((bs) => bs.budget.categoryId === categoryId);
          return { categoryId, name: cat?.name ?? 'Unknown', emoji: cat?.emoji ?? '📦', total, budget };
        });
    if (uncategorizedTotal > 0) {
      rows.push({ categoryId: null, name: 'Uncategorized', emoji: '❔', total: uncategorizedTotal, budget: undefined });
    }
    rows.sort((a, b) => b.total - a.total);
    const max = Math.max(...rows.map((r) => r.total), 1);
    return rows.map((r) => ({ ...r, pct: r.total / max }));
  }, [txs, periodTxs, categories, budgetStatuses]);

  // V8 — donut data from category breakdown
  const donutData = useMemo(
    () => categoryBreakdown.map((r, i) => ({ label: r.name, value: r.total, color: CHART_COLORS[i % CHART_COLORS.length] })),
    [categoryBreakdown],
  );

  // Shift by category — top 6 categories by this-month-to-date spend, vs. the same categories'
  // full prior month, independent of the period picker above (like V9's trend line). The mini
  // chart shows last month split into 4 weekly bars (gray) followed by this month's weeks so
  // far (colored by the overall trend direction), each fixed-length except a trailing bucket
  // that absorbs whatever days are left in a 29-31 day month.
  const categoryShift = useMemo(() => {
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
    const now = new Date();
    const currMonth = getMonthBounds(now, clampedMonthStartDay);
    const prevMonth = getMonthBounds(new Date(currMonth.from - 1), clampedMonthStartDay);

    const prevWeekBounds = Array.from({ length: 4 }, (_, i) => ({
      from: prevMonth.from + i * WEEK_MS,
      to: i === 3 ? prevMonth.to : prevMonth.from + (i + 1) * WEEK_MS,
    }));
    const elapsedMs = Math.min(now.getTime(), currMonth.to) - currMonth.from;
    const weekCount = Math.min(4, Math.max(1, Math.ceil(elapsedMs / WEEK_MS)));
    const currWeekBounds = Array.from({ length: weekCount }, (_, i) => ({
      from: currMonth.from + i * WEEK_MS,
      to: i === weekCount - 1 ? Math.min(now.getTime(), currMonth.to) : currMonth.from + (i + 1) * WEEK_MS,
    }));

    const currMonthTotals = new Map<number, number>();
    const prevMonthTotals = new Map<number, number>();
    const bucketTotals = new Map<string, number>();

    for (const tx of txs) {
      if (!isCounted(tx) || tx.type !== TransactionType.EXPENSE) continue;
      const key = tx.categoryId ?? -1;
      if (tx.timestamp >= currMonth.from && tx.timestamp < currMonth.to) {
        currMonthTotals.set(key, (currMonthTotals.get(key) ?? 0) + tx.amount);
      }
      if (tx.timestamp >= prevMonth.from && tx.timestamp < prevMonth.to) {
        prevMonthTotals.set(key, (prevMonthTotals.get(key) ?? 0) + tx.amount);
      }
      const prevIdx = prevWeekBounds.findIndex((b) => tx.timestamp >= b.from && tx.timestamp < b.to);
      if (prevIdx !== -1) {
        const k = `${key}|prev|${prevIdx}`;
        bucketTotals.set(k, (bucketTotals.get(k) ?? 0) + tx.amount);
      }
      const currIdx = currWeekBounds.findIndex((b) => tx.timestamp >= b.from && tx.timestamp <= b.to);
      if (currIdx !== -1) {
        const k = `${key}|curr|${currIdx}`;
        bucketTotals.set(k, (bucketTotals.get(k) ?? 0) + tx.amount);
      }
    }

    const categoryMeta = new Map(categories.map((c) => [c.id, c]));
    const ranked = Array.from(currMonthTotals.entries())
      .filter(([, total]) => total > 0)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6);

    return ranked.map(([catKey, total]) => {
      const name = catKey === -1 ? 'Uncategorized' : (categoryMeta.get(catKey)?.name ?? 'Unknown');
      const prevTotal = prevMonthTotals.get(catKey) ?? 0;
      const pctChange = prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : total > 0 ? 100 : 0;
      const trendColor = pctChange > 0 ? Colors.secondary : pctChange < 0 ? Colors.primary : Colors.surfaceContainerHigh;

      const trend = [
        ...prevWeekBounds.map((b, i) => ({
          label: `Last Wk ${i + 1}`,
          value: bucketTotals.get(`${catKey}|prev|${i}`) ?? 0,
          color: Colors.surfaceContainerHigh,
        })),
        ...currWeekBounds.map((b, i) => ({
          label: `This Wk ${i + 1}`,
          value: bucketTotals.get(`${catKey}|curr|${i}`) ?? 0,
          color: trendColor,
        })),
      ];

      return { categoryId: catKey === -1 ? null : catKey, name, total, pctChange, trend };
    });
  }, [txs, categories, clampedMonthStartDay]);

  // V9 — trend line: last 6 calendar months of expenses, independent of active period
  const trendData = useMemo(() => {
    const now = new Date();
    const out: { label: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const from = new Date(d.getFullYear(), d.getMonth(), 1).getTime();
      const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
      const value = txs
        .filter((tx) => tx.timestamp >= from && tx.timestamp <= to && isCounted(tx) && tx.type === TransactionType.EXPENSE)
        .reduce((s, tx) => s + tx.amount, 0);
      out.push({ label: monthLabel(d), value });
    }
    return out;
  }, [txs]);

  // Hero — current calendar month-to-date spend + a daily sparkline, independent of the period picker.
  const heroBounds = useMemo(() => getMonthBounds(new Date(), clampedMonthStartDay), [clampedMonthStartDay]);

  const heroTotal = useMemo(
    () =>
      txs
        .filter((tx) => tx.timestamp >= heroBounds.from && tx.timestamp <= heroBounds.to && isCounted(tx) && tx.type === TransactionType.EXPENSE)
        .reduce((s, tx) => s + tx.amount, 0),
    [txs, heroBounds],
  );

  const heroSparkline = useMemo(() => {
    const out: { label: string; value: number }[] = [];
    const start = new Date(heroBounds.from);
    const end = new Date(Math.min(Date.now(), heroBounds.to));
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    while (cursor.getTime() <= end.getTime()) {
      const b = getDayBounds(cursor);
      const value = txs
        .filter((tx) => tx.timestamp >= b.from && tx.timestamp <= b.to && isCounted(tx) && tx.type === TransactionType.EXPENSE)
        .reduce((s, tx) => s + tx.amount, 0);
      out.push({ label: cursor.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), value });
      cursor.setDate(cursor.getDate() + 1);
    }
    // Early in the month there are too few real days to read as a line (a single dot on day 1) —
    // pad the front with zero-value points so the sparkline always has at least 5 to draw through.
    const MIN_POINTS = 5;
    const padCount = Math.max(0, MIN_POINTS - out.length);
    const padding: { label: string; value: number }[] = Array.from({ length: padCount }, () => ({ label: '', value: 0 }));
    return [...padding, ...out];
  }, [txs, heroBounds]);

  const heroLabel = `${new Date().toLocaleDateString('en-IN', { month: 'long' }).toUpperCase()} SPENDING`;

  // Recent Activity — same pattern as DashboardScreen: most recent transactions, unfiltered by period.
  const recent = useMemo(() => [...txs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 4), [txs]);

  const categoryName = useCallback(
    (id: number | null) => (id == null ? null : categories.find((c) => c.id === id)?.name ?? null),
    [categories],
  );

  // Narrative Advisor — month-to-date spend vs. the same date range one calendar month
  // earlier (not a fixed 30 days), plus whichever category swung the most in that direction.
  const narrativeComparison = useMemo(() => {
    const elapsedMs = Math.min(Date.now(), heroBounds.to) - heroBounds.from;
    const prevReference = new Date(heroBounds.from);
    prevReference.setMonth(prevReference.getMonth() - 1);
    const prevBounds = getMonthBounds(prevReference, clampedMonthStartDay);
    const prevTo = Math.min(prevBounds.to, prevBounds.from + elapsedMs);

    const prevTxs = txs.filter(
      (tx) => tx.timestamp >= prevBounds.from && tx.timestamp <= prevTo && isCounted(tx) && tx.type === TransactionType.EXPENSE,
    );
    const prevTotal = prevTxs.reduce((s, tx) => s + tx.amount, 0);
    if (prevTotal === 0) return null;

    const pctChange = ((heroTotal - prevTotal) / prevTotal) * 100;
    const direction: 'lower' | 'higher' = heroTotal < prevTotal ? 'lower' : 'higher';

    const currTxs = txs.filter(
      (tx) => tx.timestamp >= heroBounds.from && tx.timestamp <= heroBounds.to && isCounted(tx) && tx.type === TransactionType.EXPENSE,
    );

    const sumByCategory = (list: TxRecord[]) => {
      const map = new Map<number, number>();
      for (const tx of list) {
        if (tx.categoryId == null) continue;
        map.set(tx.categoryId, (map.get(tx.categoryId) ?? 0) + tx.amount);
      }
      return map;
    };
    const currByCat = sumByCategory(currTxs);
    const prevByCat = sumByCategory(prevTxs);
    const categoryIds = new Set([...currByCat.keys(), ...prevByCat.keys()]);

    let bestCategoryId: number | null = null;
    let bestSwing = 0;
    for (const id of categoryIds) {
      const diff = (currByCat.get(id) ?? 0) - (prevByCat.get(id) ?? 0);
      const swingMatchesDirection = direction === 'lower' ? diff < 0 : diff > 0;
      if (swingMatchesDirection && Math.abs(diff) > Math.abs(bestSwing)) {
        bestSwing = diff;
        bestCategoryId = id;
      }
    }

    let driverLabel: string | null = null;
    if (bestCategoryId != null) {
      const cat = categories.find((c) => c.id === bestCategoryId);
      if (cat) {
        driverLabel = `${direction === 'lower' ? 'reduced' : 'increased'} ${cat.name.toLowerCase()}`;
      }
    }

    return { pctChange, direction, driverLabel };
  }, [txs, heroBounds, heroTotal, clampedMonthStartDay, categories]);

  // Subscriptions (recurring merchants), carried over from prior version — not period-filtered.
  const subscriptions = useMemo(() => {
    const groups = new Map<string, TxRecord[]>();
    for (const tx of txs) {
      if (!tx.recurring || !tx.merchant || tx.deletedAt) continue;
      const key = tx.merchant.trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    }
    return Array.from(groups.entries()).map(([key, group]) => {
      const sorted = [...group].sort((a, b) => a.timestamp - b.timestamp);
      const last = sorted[sorted.length - 1];
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        gaps.push((sorted[i].timestamp - sorted[i - 1].timestamp) / (24 * 60 * 60 * 1000));
      }
      gaps.sort((a, b) => a - b);
      const medianGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 30;
      const nextExpected = last.timestamp + medianGap * 24 * 60 * 60 * 1000;
      return {
        merchant: last.merchant || key,
        amount: last.amount,
        nextExpected,
      };
    });
  }, [txs]);

  function onCategoryPress(categoryId: number, categoryName: string) {
    navigation.getParent<NavigationProp<MainStackParamList>>()?.navigate('CategoryDetail', {
      categoryId,
      categoryName,
      period: `${bounds.from}-${bounds.to}`,
    });
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-[32px]" showsVerticalScrollIndicator={false}>
      <Text className="font-inter-bold text-headline-sm text-on-surface px-container-margin pt-sm pb-md">Analytics</Text>

      <BriefingHero label={heroLabel} value={formatAmount(heroTotal, currency)} data={heroSparkline} currency={currency} />

      {narrativeComparison && (
        <NarrativeAdvisor
          pctChange={narrativeComparison.pctChange}
          direction={narrativeComparison.direction}
          driverLabel={narrativeComparison.driverLabel}
        />
      )}

      {/* Recent activity — same component/data pattern as DashboardScreen's Home tab. */}
      <View className="mx-[24px] mb-[32px]">
        <SectionHeader
          title="RECENT ACTIVITY"
          actionLabel="VIEW ALL"
          onAction={() => navigation.navigate('Transactions', undefined)}
        />
        {recent.length === 0 ? (
          <Text className="font-inter text-supporting-text text-ink-body">We're still learning your financial patterns.</Text>
        ) : (
          recent.map((tx) => (
            <TransactionRow
              key={tx.id}
              merchant={tx.merchant || tx.bankName}
              categoryName={categoryName(tx.categoryId)}
              dateLabel={shortDate(tx.timestamp)}
              amountLabel={formatAmount(tx.amount, tx.currency)}
              isDebit={isDebit(tx.type)}
              onPress={() =>
                navigation.getParent<NavigationProp<MainStackParamList>>()?.navigate('TransactionDetail', { transactionId: tx.id })
              }
            />
          ))
        )}
      </View>

      {/* Shift by category — top categories' spend vs. the prior equal period, with a 7-day trend */}
      <CategoryShift data={categoryShift} currency={currency} />

      {/* Merchant snapshot — top merchant by spend, most frequent by order count */}
      <View className="px-container-margin mb-xl flex-row gap-md">
        <View className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-md p-lg">
          <Text className="font-inter-semibold text-[9px] leading-[14px] tracking-[0.05em] text-on-surface-variant mb-[8px]">
            TOP MERCHANT
          </Text>
          <Text className="font-inter-semibold text-body-sm text-on-surface mb-[12px]" numberOfLines={1}>
            {merchantSnapshot.topMerchant?.name ?? '—'}
          </Text>
          {merchantSnapshot.topMerchant && (
            <View className="flex-row items-center gap-[4px]">
              {merchantSnapshot.topMerchant.spendDelta <= 0 ? (
                <TrendingDownIcon color={Colors.primary} size={14} />
              ) : (
                <TrendingUpIcon color={Colors.secondary} size={14} />
              )}
              <Text className={`font-inter text-annotation ${merchantSnapshot.topMerchant.spendDelta <= 0 ? 'text-primary' : 'text-secondary'}`}>
                {formatAmount(Math.abs(merchantSnapshot.topMerchant.spendDelta), currency)} {merchantSnapshot.topMerchant.spendDelta <= 0 ? 'less' : 'more'}
              </Text>
            </View>
          )}
        </View>
        <View className="flex-1 bg-surface-container-lowest border border-outline-variant rounded-md p-lg">
          <Text className="font-inter-semibold text-[9px] leading-[14px] tracking-[0.05em] text-on-surface-variant mb-[8px]">
            MOST FREQUENT
          </Text>
          <Text className="font-inter-semibold text-body-sm text-on-surface mb-[12px]" numberOfLines={1}>
            {merchantSnapshot.mostFrequent?.name ?? '—'}
          </Text>
          {merchantSnapshot.mostFrequent && (
            <View className="flex-row items-center gap-[4px]">
              {merchantSnapshot.mostFrequent.countDelta > 0 ? (
                <TrendingUpIcon color={Colors.secondary} size={14} />
              ) : (
                <TrendingDownIcon color={Colors.primary} size={14} />
              )}
              <Text className={`font-inter text-annotation ${merchantSnapshot.mostFrequent.countDelta > 0 ? 'text-secondary' : 'text-primary'}`}>
                {merchantSnapshot.mostFrequent.count} visit{merchantSnapshot.mostFrequent.count === 1 ? '' : 's'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Account Analysis / Liquidity — total across non-card accounts, latest known balance each */}
      {liquiditySnapshot.accounts.length > 0 && (
        <View className="mb-xl">
          <View className="mx-container-margin mb-lg pb-md border-b border-outline-variant">
            <Text className="font-inter-semibold text-section-header text-on-surface-variant mb-[4px] uppercase tracking-wider">
              TOTAL LIQUIDITY
            </Text>
            <Text className="font-mono-medium text-statement-lg text-on-surface">
              {formatAmount(liquiditySnapshot.total, currency)}
            </Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-md px-container-margin pb-[8px]">
            {liquiditySnapshot.accounts.map((acc) => (
              <AccountLiquidityCard
                key={`${acc.bankName}|${acc.last4 ?? ''}`}
                bankName={acc.bankName}
                last4={acc.last4}
                balance={acc.balance}
                currency={acc.currency}
                updatedAt={acc.timestamp}
                onPress={() =>
                  navigation
                    .getParent<NavigationProp<MainStackParamList>>()
                    ?.navigate('AccountDetail', { bankName: acc.bankName, last4: acc.last4 ?? undefined })
                }
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* V1 — period picker */}
      <View className="flex-row gap-sm px-container-margin mb-md">
        {(['daily', 'weekly', 'monthly', 'custom'] as PeriodType[]).map((p) => (
          <TouchableOpacity
            key={p}
            className={`py-[8px] px-[14px] rounded-full border ${
              periodType === p ? 'bg-primary border-primary' : 'bg-surface-container-lowest border-outline-variant'
            }`}
            onPress={() => setPeriodType(p)}
          >
            <Text
              className={`text-[12px] leading-[16px] tracking-[0px] ${
                periodType === p ? 'font-inter-medium text-on-primary' : 'font-mono text-on-surface-variant'
              }`}
            >
              {p === 'daily' ? 'Daily' : p === 'weekly' ? 'Weekly' : p === 'monthly' ? 'Monthly' : 'Custom'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {periodType === 'custom' && (
        <View className="flex-row items-center gap-sm px-container-margin mb-md">
          <TouchableOpacity className="flex-1 py-[10px] px-[12px] rounded-md border border-outline-variant bg-surface-container-lowest" onPress={() => setShowFromPicker(true)}>
            <Text className="font-inter text-body-sm text-on-surface">{customFrom.toLocaleDateString('en-IN')}</Text>
          </TouchableOpacity>
          <Text className="font-mono text-label-sm text-on-surface-variant">to</Text>
          <TouchableOpacity className="flex-1 py-[10px] px-[12px] rounded-md border border-outline-variant bg-surface-container-lowest" onPress={() => setShowToPicker(true)}>
            <Text className="font-inter text-body-sm text-on-surface">{customTo.toLocaleDateString('en-IN')}</Text>
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
      <View className="px-container-margin mb-xl">
        <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">Spending</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md pt-lg">
          <View className="flex-row items-end gap-[6px] h-[140px]">
            {barBuckets.map((b) => {
              const pct = b.expenses / maxExpense;
              return (
                <View key={b.key} className="flex-1 items-center gap-[6px]">
                  <View className="flex-1 w-full flex-col-reverse">
                    <View className="bg-primary rounded-[4px] min-h-[4px]" style={{ flex: pct }} />
                    <View style={{ flex: 1 - pct }} />
                  </View>
                  <Text className="font-mono text-[9px] leading-[16px] tracking-[0px] text-center text-on-surface-variant">{b.label}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* V8 — donut chart */}
      <View className="px-container-margin mb-xl">
        <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">Category split</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md pt-lg flex-row items-center gap-lg">
          <DonutChart data={donutData} />
          <View className="flex-1 gap-[6px]">
            {donutData.slice(0, 6).map((d, i) => (
              // labels can collide (e.g. two 'Unknown' before categories load) — key by position
              <View key={`${i}-${d.label}`} className="flex-row items-center gap-[6px]">
                <View className="w-[8px] h-[8px] rounded-[4px]" style={{ backgroundColor: d.color }} />
                <Text className="font-mono text-label-sm tracking-[0px] text-on-surface-variant flex-shrink" numberOfLines={1}>{d.label}</Text>
              </View>
            ))}
            {donutData.length === 0 && <Text className="font-inter text-body-md text-on-surface-variant text-center p-md">No expenses this period</Text>}
          </View>
        </View>
      </View>

      {/* V4 + B3 — category breakdown */}
      <View className="px-container-margin mb-xl">
        <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">By category</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md gap-md">
          {categoryBreakdown.map((row) => {
            const rowContent = (
              <>
                <View className="flex-row justify-between items-baseline">
                  <Text className="font-inter-medium text-body-sm text-on-surface flex-1">{row.emoji} {row.name}</Text>
                  <Text className="font-mono text-[13px] leading-[20px] text-error-muted ml-[8px]">{formatAmount(row.total, currency)}</Text>
                </View>
                <View className="h-[4px] bg-surface-variant rounded-[2px] overflow-hidden">
                  <View className="h-full rounded-[2px]" style={{ width: `${Math.round(row.pct * 100)}%`, backgroundColor: `${Colors.errorMuted}80` }} />
                </View>
                {row.budget && (
                  <View className="h-[4px] bg-surface-variant rounded-[2px] overflow-hidden relative">
                    <View
                      className="h-full rounded-[2px]"
                      style={{
                        width: `${Math.min(100, Math.round(row.budget.pct))}%`,
                        backgroundColor:
                          row.budget.pct > 100 ? Colors.errorMuted : row.budget.pct >= 80 ? Colors.secondary : Colors.primary,
                      }}
                    />
                    <Text className="font-inter text-annotation text-on-surface-variant mt-[2px]">
                      {formatAmount(row.budget.spent)} / {formatAmount(row.budget.limit)} budget
                    </Text>
                  </View>
                )}
              </>
            );
            // The Uncategorized pseudo-row has no categoryId to navigate with — render it inert.
            if (row.categoryId == null) {
              return (
                <View key="uncategorized" className="gap-[6px]">
                  {rowContent}
                </View>
              );
            }
            return (
              <TouchableOpacity key={row.categoryId} onPress={() => onCategoryPress(row.categoryId as number, row.name)} className="gap-[6px]">
                {rowContent}
              </TouchableOpacity>
            );
          })}
          {categoryBreakdown.length === 0 && <Text className="font-inter text-body-md text-on-surface-variant text-center p-md">No expense data yet</Text>}
        </View>
      </View>

      {/* V9 — trend line */}
      <View className="px-container-margin mb-xl">
        <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">6-month trend</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md pt-lg">
          <TrendLine data={trendData} />
        </View>
      </View>

      {/* V5 — top merchants */}
      <View className="px-container-margin mb-xl">
        <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">Top merchants</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md gap-md">
          {topMerchants.map(([name, amount], i) => {
            const pct = amount / (topMerchants[0]?.[1] ?? 1);
            return (
              <View key={name} className="flex-row items-center gap-sm">
                <View className="w-[28px] h-[28px] rounded-[8px] bg-surface-variant items-center justify-center">
                  <Text className="font-mono text-[11px] leading-[16px] tracking-[0px] text-on-surface-variant">{i + 1}</Text>
                </View>
                <View className="flex-1 gap-[6px]">
                  <View className="flex-row justify-between items-baseline">
                    <Text className="font-inter-medium text-body-sm text-on-surface flex-1" numberOfLines={1}>{name}</Text>
                    <Text className="font-mono text-[13px] leading-[20px] text-error-muted ml-[8px]">{formatAmount(amount, currency)}</Text>
                  </View>
                  <View className="h-[4px] bg-surface-variant rounded-[2px] overflow-hidden">
                    <View className="h-full rounded-[2px]" style={{ width: `${Math.round(pct * 100)}%`, backgroundColor: `${Colors.errorMuted}80` }} />
                  </View>
                </View>
              </View>
            );
          })}
          {topMerchants.length === 0 && <Text className="font-inter text-body-md text-on-surface-variant text-center p-md">No expense data yet</Text>}
        </View>
      </View>

      {/* Subscriptions */}
      <View className="px-container-margin mb-xl">
        <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">Subscriptions</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md gap-md">
          {subscriptions.length === 0 ? (
            <Text className="font-inter text-body-md text-on-surface-variant text-center p-md">No recurring subscriptions detected yet</Text>
          ) : (
            subscriptions.map((sub) => (
              <View key={sub.merchant} className="flex-row items-center gap-sm">
                <View className="flex-1 gap-[6px]">
                  <View className="flex-row justify-between items-baseline">
                    <Text className="font-inter-medium text-body-sm text-on-surface flex-1" numberOfLines={1}>{sub.merchant}</Text>
                    <Text className="font-mono text-[13px] leading-[20px] text-error-muted ml-[8px]">{formatAmount(sub.amount, currency)}</Text>
                  </View>
                  <Text className="font-inter text-body-md text-on-surface-variant text-center p-md">
                    Next expected {new Date(sub.nextExpected).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
