import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../../theme';
import { ChevronRightIcon } from '../TabIcon';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  /** Makes the whole header tappable and shows a trailing chevron — signals "opens details", as opposed to actionLabel's explicit text action. */
  onPress?: () => void;
}

/** Uppercase section label with either a right-aligned text action (e.g. "VIEW ALL") or a whole-header tap (chevron). */
export const SectionHeader = React.memo(function SectionHeader({ title, actionLabel, onAction, onPress }: SectionHeaderProps) {
  const row = (
    <View className="flex-row justify-between items-center mb-[16px]">
      <Text className="font-inter-semibold text-section-header text-on-surface">{title}</Text>
      {actionLabel && onAction && (
        <TouchableOpacity onPress={onAction} hitSlop={8}>
          <Text className="font-inter-semibold text-label-caps text-primary">{actionLabel}</Text>
        </TouchableOpacity>
      )}
      {onPress && <ChevronRightIcon color={Colors.onSurfaceVariant} size={18} />}
    </View>
  );

  if (!onPress) return row;

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
      {row}
    </TouchableOpacity>
  );
});
