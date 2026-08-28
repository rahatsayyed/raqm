import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChevronLeftIcon, ChevronRightIcon } from './TabIcon';
import { Colors } from '../theme';
import type { PeriodBounds } from '../utils/period';

interface MonthSwitcherProps {
  bounds: PeriodBounds; // the currently displayed period
  onChange: (direction: 'prev' | 'next') => void;
  disableNext?: boolean; // true when bounds.to is already >= now (can't go into the future)
}

// Compact "‹  Month Year  ›" row for stepping the SpendDetail screen's period without
// opening the full filter sheet. Presentational only — the parent owns bounds math.
export function MonthSwitcher({ bounds, onChange, disableNext = false }: MonthSwitcherProps) {
  const label = new Date(bounds.from).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <View className="flex-row items-center justify-between bg-surface-container-lowest rounded-xl border border-outline-variant px-sm py-sm">
      <TouchableOpacity onPress={() => onChange('prev')} hitSlop={8} className="p-xs">
        <ChevronLeftIcon color={Colors.onSurfaceVariant} size={20} />
      </TouchableOpacity>
      <Text className="font-inter-medium text-body-standard text-on-surface">{label}</Text>
      <TouchableOpacity
        onPress={() => onChange('next')}
        disabled={disableNext}
        hitSlop={8}
        className={`p-xs ${disableNext ? 'opacity-30' : ''}`}
      >
        <ChevronRightIcon color={Colors.onSurfaceVariant} size={20} />
      </TouchableOpacity>
    </View>
  );
}
