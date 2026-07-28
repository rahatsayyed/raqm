import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme';
import { formatAmount } from '../../utils/format';
import { iconForCategoryName, FALLBACK_CATEGORY_ICON } from '../../constants/categories';
import { ChevronRightIcon } from '../TabIcon';
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
  /** Chevron on the header — opens the full category-wise spending overview. */
  onPressHeader?: () => void;
  /** Tapping an individual category row — opens that category's detail page. Uncategorized (categoryId null) rows don't fire this. */
  onPressRow?: (categoryId: number, name: string) => void;
}

/** "Shift by category" — spend + period-over-period delta per category, with a 7-day mini trend chart. */
export function CategoryShift({ data, currency = '₹', onPressHeader, onPressRow }: Props) {
  if (data.length === 0) return null;

  const header = (
    <View className="flex-row items-center justify-between border-b border-outline-variant pb-[8px] mb-lg">
      <Text className="font-inter-semibold text-section-header text-on-surface uppercase tracking-widest">
        Shift by category
      </Text>
      {onPressHeader && <ChevronRightIcon color={Colors.onSurfaceVariant} size={18} />}
    </View>
  );

  return (
    <View className="px-container-margin mb-xl">
      {onPressHeader ? (
        <TouchableOpacity activeOpacity={0.7} onPress={onPressHeader}>
          {header}
        </TouchableOpacity>
      ) : (
        header
      )}
      <View className="gap-lg">
        {data.map((row) => {
          const pctColor = row.pctChange > 0 ? Colors.secondary : row.pctChange < 0 ? Colors.primary : Colors.onSurfaceVariant;
          const pctLabel =
            row.pctChange > 0 ? `+${Math.round(row.pctChange)}%` : row.pctChange < 0 ? `${Math.round(row.pctChange)}%` : '±0%';
          const Icon = iconForCategoryName(row.name) ?? FALLBACK_CATEGORY_ICON;
          const clickable = row.categoryId != null && !!onPressRow;
          return (
            <TouchableOpacity
              key={row.categoryId ?? 'uncategorized'}
              activeOpacity={clickable ? 0.6 : 1}
              disabled={!clickable}
              onPress={clickable ? () => onPressRow!(row.categoryId as number, row.name) : undefined}
              className="flex-row items-center justify-between"
            >
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
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
