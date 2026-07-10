import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
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
            {donutData.slice(0, 6).map((d, i) => (
              // labels can collide (e.g. two 'Unknown' before categories load) — key by position
              <View key={`${i}-${d.label}`} style={styles.legendRow}>
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
          {categoryBreakdown.map((row) => {
            const rowContent = (
              <>
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
              </>
            );
            // The Uncategorized pseudo-row has no categoryId to navigate with — render it inert.
            if (row.categoryId == null) {
              return (
                <View key="uncategorized" style={styles.categoryRow}>
                  {rowContent}
                </View>
              );
            }
            return (
              <TouchableOpacity key={row.categoryId} onPress={() => onCategoryPress(row.categoryId as number, row.name)} style={styles.categoryRow}>
                {rowContent}
              </TouchableOpacity>
            );
          })}
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

      {/* V5 — top merchants */}
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

      {/* Subscriptions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscriptions</Text>
        <View style={styles.merchantList}>
          {subscriptions.length === 0 ? (
            <Text style={styles.emptyText}>No recurring subscriptions detected yet</Text>
          ) : (
            subscriptions.map((sub) => (
              <View key={sub.merchant} style={styles.merchantRow}>
                <View style={styles.merchantInfo}>
                  <View style={styles.merchantTopRow}>
                    <Text style={styles.merchantName} numberOfLines={1}>{sub.merchant}</Text>
                    <Text style={styles.merchantAmount}>{formatAmount(sub.amount, currency)}</Text>
                  </View>
                  <Text style={styles.emptyText}>
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

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },
  pageTitle: { ...Typography.headlineSm, color: Colors.onSurface, paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.sm, paddingBottom: Spacing.md },

  chipsRow: { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.containerMargin, marginBottom: Spacing.md },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: Radius.full, borderWidth: 1, borderColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest },
  chipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  chipTextActive: { color: Colors.onPrimary, fontFamily: 'Inter_500Medium' },

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
  merchantName: { ...Typography.bodySm, color: Colors.onSurface, flex: 1, fontFamily: 'Inter_500Medium' },
  merchantAmount: { ...Typography.numericSm, color: Colors.errorMuted, fontSize: 13, marginLeft: 8 },
  merchantBar: { height: 4, backgroundColor: Colors.surfaceVariant, borderRadius: 2, overflow: 'hidden' },
  merchantBarFill: { height: '100%', backgroundColor: `${Colors.errorMuted}80`, borderRadius: 2 },

  budgetBarTrack: { height: 4, backgroundColor: Colors.surfaceVariant, borderRadius: 2, overflow: 'hidden', position: 'relative' },
  budgetBarFill: { height: '100%', borderRadius: 2 },
  budgetBarLabel: { ...Typography.annotation, color: Colors.onSurfaceVariant, marginTop: 2 },

  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', padding: Spacing.md },
});
