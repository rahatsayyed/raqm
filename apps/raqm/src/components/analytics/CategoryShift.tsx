import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../../theme';
import { formatAmount } from '../../utils/format';
import { iconForCategoryName, FALLBACK_CATEGORY_ICON } from '../../constants/categories';
import { CategoryTrendBars, type TrendBarDatum } from './CategoryTrendBars';

export interface CategoryShiftDatum {
  categoryId: number | null;
  name: string;
  total: number;
  pctChange: number;
  /** 4 gray bars for last month's weeks, then 1-4 colored bars for this month's weeks so far. */
  trend: TrendBarDatum[];
}

interface Props {
  data: CategoryShiftDatum[];
  currency?: string;
}

/** "Shift by category" — spend + period-over-period delta per category, with a 7-day mini trend chart. */
export function CategoryShift({ data, currency = '₹' }: Props) {
  if (data.length === 0) return null;

  return (
    <View className="px-container-margin mb-xl">
      <Text className="font-inter-semibold text-section-header text-on-surface uppercase tracking-widest border-b border-outline-variant pb-[8px] mb-lg">
        Shift by category
      </Text>
      <View className="gap-lg">
        {data.map((row) => {
          const pctColor = row.pctChange > 0 ? Colors.error : row.pctChange < 0 ? Colors.primary : Colors.onSurfaceVariant;
          const pctLabel =
            row.pctChange > 0 ? `+${Math.round(row.pctChange)}%` : row.pctChange < 0 ? `${Math.round(row.pctChange)}%` : '±0%';
          const Icon = iconForCategoryName(row.name) ?? FALLBACK_CATEGORY_ICON;
          return (
            <View key={row.categoryId ?? 'uncategorized'} className="flex-row items-center justify-between">
              <View className="flex-1 mr-md">
                <View className="flex-row items-center gap-[6px] mb-[4px]">
                  <Icon color={Colors.outline} size={14} />
                  <Text className="font-inter text-body-standard text-on-surface">{row.name}</Text>
                </View>
                <Text className="font-mono text-label-caps text-ink-label">
                  {formatAmount(row.total, currency)} <Text style={{ color: pctColor }}>{pctLabel}</Text>
                </Text>
              </View>
              <CategoryTrendBars data={row.trend} currency={currency} />
            </View>
          );
        })}
      </View>
    </View>
  );
}
