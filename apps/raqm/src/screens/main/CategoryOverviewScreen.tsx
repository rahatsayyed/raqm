import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getCategories, getSetting, type Category, type TxRecord } from '../../db/database';
import { countsTowardTotals } from '../../services/txIntelligence';
import { getMonthBounds, type PeriodBounds } from '../../utils/period';
import { formatAmount } from '../../utils/format';
import { Colors } from '../../theme';
import { DonutChart, type DonutDatum } from '../../components/DonutChart';
import { iconForCategoryName, FALLBACK_CATEGORY_ICON } from '../../constants/categories';
import { ChevronRightIcon } from '../../components/TabIcon';

function isCounted(tx: TxRecord): boolean {
  return !tx.deletedAt && countsTowardTotals(tx);
}

const SLICE_COLORS = [
  Colors.primary, Colors.secondary, Colors.tertiary, Colors.error,
  Colors.mossStructure, Colors.outline, Colors.onSurfaceVariant, Colors.surfaceContainerHigh,
];

export function CategoryOverviewScreen({ navigation }: MainStackScreenProps<'CategoryOverview'>) {
  const txs = useTxStore((s) => s.txs);
  const [categories, setCategories] = useState<Category[]>([]);
  const [bounds, setBounds] = useState<PeriodBounds | null>(null);

  useEffect(() => {
    getCategories().then(setCategories);
    getSetting('month_start_day').then((day) => setBounds(getMonthBounds(new Date(), day ? Number(day) : 1)));
  }, []);

  const rows = useMemo(() => {
    if (!bounds) return [];
    const totals = new Map<number | null, number>();
    for (const tx of txs) {
      if (!isCounted(tx) || tx.type !== TransactionType.EXPENSE) continue;
      if (tx.timestamp < bounds.from || tx.timestamp > bounds.to) continue;
      totals.set(tx.categoryId, (totals.get(tx.categoryId) ?? 0) + tx.amount);
    }
    const byId = new Map(categories.map((c) => [c.id, c]));
    return Array.from(totals.entries())
      .filter(([, total]) => total > 0)
      .map(([categoryId, total], i) => ({
        categoryId,
        name: categoryId == null ? 'Uncategorized' : byId.get(categoryId)?.name ?? 'Unknown',
        total,
        color: SLICE_COLORS[i % SLICE_COLORS.length],
      }))
      .sort((a, b) => b.total - a.total);
  }, [txs, categories, bounds]);

  const grandTotal = useMemo(() => rows.reduce((s, r) => s + r.total, 0), [rows]);
  const donutData: DonutDatum[] = useMemo(
    () => rows.map((r) => ({ label: r.name, value: r.total, color: r.color })),
    [rows],
  );

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-container-margin pb-[40px]" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => navigation.goBack()} className="mb-md">
        <Text className="font-inter text-body-md text-primary">← Back</Text>
      </TouchableOpacity>

      <Text className="font-inter-bold text-headline-sm text-on-surface mb-md">Spending by category</Text>

      {rows.length === 0 ? (
        <Text className="font-inter text-body-md text-on-surface-variant">No spending recorded this period.</Text>
      ) : (
        <>
          <View className="items-center mb-xl">
            <DonutChart data={donutData} size={200} strokeWidth={28} />
          </View>

          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
            {rows.map((row, i) => {
              const Icon = row.categoryId == null ? FALLBACK_CATEGORY_ICON : iconForCategoryName(row.name) ?? FALLBACK_CATEGORY_ICON;
              const pct = grandTotal > 0 ? Math.round((row.total / grandTotal) * 100) : 0;
              const clickable = row.categoryId != null;
              return (
                <TouchableOpacity
                  key={row.categoryId ?? 'uncategorized'}
                  activeOpacity={clickable ? 0.6 : 1}
                  disabled={!clickable}
                  onPress={
                    clickable
                      ? () => navigation.navigate('SpendDetail', { filterType: 'category', categoryId: row.categoryId as number, categoryName: row.name })
                      : undefined
                  }
                  className={`flex-row items-center gap-sm px-md py-md ${i !== rows.length - 1 ? 'border-b border-outline-variant' : ''}`}
                >
                  <View className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: row.color }} />
                  <Icon color={Colors.outline} size={16} />
                  <View className="flex-1">
                    <Text className="font-inter-medium text-body-standard text-on-surface" numberOfLines={1}>{row.name}</Text>
                  </View>
                  <Text className="font-mono text-numeric-sm text-on-surface-variant mr-xs">{pct}%</Text>
                  <Text className="font-mono-medium text-numeric-sm text-on-surface">{formatAmount(row.total)}</Text>
                  {clickable && <ChevronRightIcon color={Colors.inkLabel} size={16} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}
    </ScrollView>
  );
}
