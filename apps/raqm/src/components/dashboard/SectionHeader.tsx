import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Uppercase section label with an optional right-aligned text action (e.g. "VIEW ALL"). */
export const SectionHeader = React.memo(function SectionHeader({ title, actionLabel, onAction }: SectionHeaderProps) {
  return (
    <View className="flex-row justify-between items-center mb-[16px]">
      <Text className="font-inter-semibold text-section-header text-on-surface">{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text className="font-inter-semibold text-label-caps text-primary">{actionLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});
