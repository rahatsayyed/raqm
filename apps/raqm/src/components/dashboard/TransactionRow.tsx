import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface TransactionRowProps {
  merchant: string;
  categoryName: string | null;
  dateLabel: string;
  amountLabel: string;
  isDebit: boolean;
  onPress: () => void;
}

/** Single recent-activity row: icon tile, merchant/category/date, signed amount. */
export const TransactionRow = React.memo(function TransactionRow({
  merchant,
  categoryName,
  dateLabel,
  amountLabel,
  isDebit,
  onPress,
}: TransactionRowProps) {
  return (
    <TouchableOpacity
      className="flex-row items-center gap-[16px] py-[16px] border-b border-border-subtle"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View className="w-[40px] h-[40px] rounded-[12px] bg-bg-surface-raised border border-border-subtle items-center justify-center">
        <Text className="text-[15px] text-ink-label">{isDebit ? '↓' : '↑'}</Text>
      </View>
      <View className="flex-1">
        <Text className="font-inter text-body-standard text-on-surface" numberOfLines={1}>
          {merchant}
        </Text>
        <Text className="font-inter text-annotation text-ink-label mt-[2px]">
          {categoryName ? `${categoryName} • ` : ''}
          {dateLabel}
        </Text>
      </View>
      <Text className={`font-mono text-numeric-sm ${isDebit ? 'text-on-surface' : 'text-primary'}`}>
        {isDebit ? '−' : '+'}
        {amountLabel}
      </Text>
    </TouchableOpacity>
  );
});
