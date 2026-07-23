import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Colors } from "../../theme";
import {
  iconForCategoryName,
  FALLBACK_CATEGORY_ICON,
} from "../../constants/categories";

interface TransactionRowProps {
  merchant: string;
  categoryName: string | null;
  dateLabel: string;
  timeLabel: string;
  amountLabel: string;
  isDebit: boolean;
  onPress: () => void;
}

/** Single recent-activity row: category icon tile, merchant/category/date, colored amount. */
export const TransactionRow = React.memo(function TransactionRow({
  merchant,
  categoryName,
  dateLabel,
  timeLabel,
  amountLabel,
  isDebit,
  onPress,
}: TransactionRowProps) {
  const Icon = iconForCategoryName(categoryName) ?? FALLBACK_CATEGORY_ICON;

  return (
    <TouchableOpacity
      className="flex-row items-center gap-[16px] py-[16px] border-b border-border-subtle"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <View
        className={`w-[40px] h-[40px] rounded-sm items-center justify-center ${isDebit ? "bg-surface-variant/50" : "bg-primary/10"}`}
      >
        <Icon
          color={isDebit ? Colors.onSurfaceVariant : Colors.primary}
          size={20}
        />
      </View>
      <View className="flex-1">
        <Text
          className="font-inter text-body-standard text-on-surface"
          numberOfLines={1}
        >
          {merchant}
        </Text>
        <Text className="font-inter text-annotation text-ink-label mt-[2px]">
          {categoryName ? `${categoryName}` : "uncategorized"}
        </Text>
      </View>
      <View className="items-end">
        <Text
          className={`font-mono text-numeric-sm ${isDebit ? "text-on-surface" : "text-primary"}`}
        >
          {amountLabel}
        </Text>
        <Text className="font-inter text-annotation text-ink-label mt-[2px]">{timeLabel}</Text>
      </View>
    </TouchableOpacity>
  );
});
