import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getSubcategories, getSetting, type Subcategory, type TxRecord } from '../../db/database';
import { countsTowardTotals } from '../../services/txIntelligence';
import { getBudgetStatuses, type BudgetStatus } from '../../services/budgets';
import { getMonthBounds, type PeriodBounds } from '../../utils/period';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { formatAmount } from '../../utils/format';
import { accountLabel } from '../../utils/accountLabel';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function parsePeriod(period: string | undefined): PeriodBounds | null {
  if (!period) return null;
  const [fromStr, toStr] = period.split('-');
  const from = Number(fromStr);
  const to = Number(toStr);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return { from, to };
}

export function CategoryDetailScreen({ route, navigation }: MainStackScreenProps<'CategoryDetail'>) {
  const { categoryId, categoryName, period } = route.params;
  const { txs } = useTxStore();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const parsedBounds = useMemo(() => parsePeriod(period), [period]);
  const [fallbackBounds, setFallbackBounds] = useState<PeriodBounds | null>(null);

  useEffect(() => {
    getSubcategories(categoryId).then(setSubcategories);
    getBudgetStatuses().then(setBudgetStatuses);
  }, [categoryId]);

  // No period param passed in (e.g. deep link) — fall back to the current custom month.
  useEffect(() => {
    if (parsedBounds) return;
    let cancelled = false;
    getSetting('month_start_day').then((startDayStr) => {
      if (cancelled) return;
      const startDay = startDayStr ? Number(startDayStr) : 1;
      setFallbackBounds(getMonthBounds(new Date(), startDay));
    });
    return () => {
      cancelled = true;
    };
  }, [parsedBounds]);

  const bounds = parsedBounds ?? fallbackBounds;

  const categoryTxs = useMemo(
    () =>
      bounds
        ? txs
            .filter(
              (tx) =>
                tx.categoryId === categoryId &&
                tx.timestamp >= bounds.from &&
                tx.timestamp <= bounds.to &&
                countsTowardTotals(tx),
            )
            .sort((a, b) => b.timestamp - a.timestamp)
        : [],
    [txs, categoryId, bounds],
  );

  // Refund credits linked to this category's expenses net against the total —
  // resolved via the link partner since the credit usually carries no categoryId.
  const refundNet = useMemo(() => {
    if (!bounds) return 0;
    const byId = new Map(txs.map((t) => [t.id, t]));
    let net = 0;
    for (const tx of txs) {
      if (tx.timestamp < bounds.from || tx.timestamp > bounds.to) continue;
      if (!countsTowardTotals(tx)) continue;
      const credit = tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT;
      if (!credit || (tx.linkType !== 'refund' && tx.linkType !== 'split_payment')) continue;
      const partner = tx.linkPartnerId != null ? byId.get(tx.linkPartnerId) : undefined;
      if ((partner?.categoryId ?? tx.categoryId) === categoryId) net += tx.amount;
    }
    return net;
  }, [txs, categoryId, bounds]);

  const total = useMemo(
    () =>
      Math.max(
        0,
        categoryTxs.filter((tx) => tx.type === TransactionType.EXPENSE).reduce((s, tx) => s + tx.amount, 0) - refundNet,
      ),
    [categoryTxs, refundNet],
  );

  const subBreakdown = useMemo(() => {
    const map = new Map<number | null, number>();
    for (const tx of categoryTxs) {
      if (tx.type !== TransactionType.EXPENSE) continue;
      map.set(tx.subcategoryId, (map.get(tx.subcategoryId) ?? 0) + tx.amount);
    }
    return Array.from(map.entries())
      .map(([subId, amount]) => ({
        name: subId == null ? 'Other' : subcategories.find((s) => s.id === subId)?.name ?? 'Other',
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categoryTxs, subcategories]);

  const budget = budgetStatuses.find((bs) => bs.budget.categoryId === categoryId);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-container-margin pb-[40px]" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => navigation.goBack()} className="mb-md">
        <Text className="font-inter text-body-md text-primary">← Back</Text>
      </TouchableOpacity>

      <Text className="font-inter-bold text-headline-sm text-on-surface">{categoryName}</Text>
      <Text className="font-mono-medium text-numeric-lg text-on-surface mt-sm">{formatAmount(total)}</Text>
      <Text className="font-inter text-supporting-text text-on-surface-variant mt-[4px]">
        {categoryTxs.length} transaction{categoryTxs.length !== 1 ? 's' : ''} this period
      </Text>

      {budget && (
        <View className="mt-xl">
          <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">Budget</Text>
          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
            <View className="h-[6px] bg-surface-variant rounded-[3px] overflow-hidden">
              <View
                className="h-full rounded-[3px]"
                style={{
                  width: `${Math.min(100, Math.round(budget.pct))}%`,
                  backgroundColor: budget.pct > 100 ? Colors.errorMuted : budget.pct >= 80 ? Colors.secondary : Colors.primary,
                }}
              />
            </View>
            <Text className="font-inter text-supporting-text text-on-surface-variant mt-sm">
              {formatAmount(budget.spent)} of {formatAmount(budget.limit)} ({Math.round(budget.pct)}%)
            </Text>
          </View>
        </View>
      )}

      {subBreakdown.length > 0 && (
        <View className="mt-xl">
          <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">By sub-category</Text>
          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
            {subBreakdown.map((row, i) => (
              <View key={`${i}-${row.name}`} className="flex-row justify-between py-[8px]">
                <Text className="font-inter text-body-sm text-on-surface">{row.name}</Text>
                <Text className="font-mono text-numeric-sm text-on-surface-variant">{formatAmount(row.amount)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View className="mt-xl">
        <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">Transactions</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
          {categoryTxs.length === 0 ? (
            <Text className="font-inter text-body-md text-on-surface-variant text-center p-md">No transactions in this period</Text>
          ) : (
            categoryTxs.map((tx, i) => (
              <TxRow key={tx.id} tx={tx} isLast={i === categoryTxs.length - 1} navigation={navigation} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function TxRow({
  tx,
  isLast,
  navigation,
}: {
  tx: TxRecord;
  isLast: boolean;
  navigation: MainStackScreenProps<'CategoryDetail'>['navigation'];
}) {
  const debit = tx.type === TransactionType.EXPENSE;
  const color = debit ? Colors.errorMuted : Colors.primary;
  const accountLabels = useTxStore((s) => s.accountLabels);
  return (
    <TouchableOpacity
      className={`flex-row justify-between items-center py-[12px] ${!isLast ? 'border-b border-outline-variant' : ''}`}
      onPress={() => navigation.navigate('TransactionDetail', { transactionId: tx.id })}
    >
      <View className="flex-1">
        <Text className="font-inter-medium text-body-sm text-on-surface" numberOfLines={1}>
          {tx.merchant || accountLabel(tx.bankName, tx.accountLast4, accountLabels)}
        </Text>
        <Text className="font-mono text-label-sm tracking-[0px] text-on-surface-variant mt-[2px]">{formatDate(tx.timestamp)}</Text>
      </View>
      <Text className="font-mono text-[15px] leading-[20px]" style={{ color }}>
        {debit ? '-' : '+'}
        {formatAmount(tx.amount)}
      </Text>
    </TouchableOpacity>
  );
}
