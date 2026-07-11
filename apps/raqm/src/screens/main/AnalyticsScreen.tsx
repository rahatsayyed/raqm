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
