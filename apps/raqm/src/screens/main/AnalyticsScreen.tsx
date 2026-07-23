import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Colors } from '../../theme';
import { useTxStore } from '../../store/txStore';
import { getCategories, getSetting, type Category, type TxRecord } from '../../db/database';
import { countsTowardTotals } from '../../services/txIntelligence';
import { getDayBounds, getMonthBounds, type PeriodBounds } from '../../utils/period';
import { BriefingHero, NarrativeAdvisor, CategoryShift } from '../../components/analytics';
import { SectionHeader, TransactionRow } from '../../components/dashboard';
import { AccountLiquidityCard } from '../../components/AccountLiquidityCard';
import { rescanTransactions } from '../../services/rescan';
import { TrendingUpIcon, TrendingDownIcon } from '../../components/TabIcon';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { MainTabScreenProps, MainStackParamList } from '../../navigation/types';
import { formatAmount } from '../../utils/format';

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
  const [monthStartDay, setMonthStartDay] = useState(1);
  const [categories, setCategories] = useState<Category[]>([]);

  const loadMeta = useCallback(() => {
    getCategories().then(setCategories);
    getSetting('month_start_day').then((v) => setMonthStartDay(v ? Number(v) : 1));
  }, [txs]);

  useEffect(() => {
    loadMeta();
  }, [loadMeta]);

  // Re-read month_start_day when returning from Settings — this screen stays mounted
  // beneath the pushed Settings screen, so [txs] alone won't re-fire.
  useFocusEffect(
    useCallback(() => {
      loadMeta();
    }, [loadMeta]),
  );

  // Clamp so a corrupted/legacy setting can't push the reference date into an adjacent month.
  const clampedMonthStartDay = Math.min(28, Math.max(1, monthStartDay));

  // Current calendar month bounds — the single period reference for everything below.
  const bounds: PeriodBounds = useMemo(() => getMonthBounds(new Date(), clampedMonthStartDay), [clampedMonthStartDay]);

  const periodTxs = useMemo(
    () => txs.filter((tx) => tx.timestamp >= bounds.from && tx.timestamp <= bounds.to && isCounted(tx)),
    [txs, bounds],
  );

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

  // Hero — current calendar month-to-date spend + a daily sparkline.
  const heroTotal = useMemo(
    () =>
      txs
        .filter((tx) => tx.timestamp >= bounds.from && tx.timestamp <= bounds.to && isCounted(tx) && tx.type === TransactionType.EXPENSE)
        .reduce((s, tx) => s + tx.amount, 0),
    [txs, bounds],
  );

  const heroSparkline = useMemo(() => {
    const out: { label: string; value: number }[] = [];
    const start = new Date(bounds.from);
    const end = new Date(Math.min(Date.now(), bounds.to));
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
  }, [txs, bounds]);

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
    const elapsedMs = Math.min(Date.now(), bounds.to) - bounds.from;
    const prevReference = new Date(bounds.from);
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
      (tx) => tx.timestamp >= bounds.from && tx.timestamp <= bounds.to && isCounted(tx) && tx.type === TransactionType.EXPENSE,
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
  }, [txs, bounds, heroTotal, clampedMonthStartDay, categories]);

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
                onRefresh={() => rescanTransactions()}
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
    </ScrollView>
  );
}
