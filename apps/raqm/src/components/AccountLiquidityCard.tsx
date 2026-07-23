import React, { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Colors } from '../theme';
import { ArrowUpRightIcon, RefreshIcon } from './TabIcon';
import { formatAmount } from '../utils/format';

interface Props {
  bankName: string;
  last4: string | null;
  balance: number;
  currency?: string;
  updatedAt: number;
  onPress?: () => void;
  onRefresh?: () => Promise<unknown> | void;
}

function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return 'Updated just now';
  if (mins < 60) return `Updated ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Updated ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Updated ${days}d ago`;
}

/** Per-account balance card for the Briefing "Total Liquidity" strip — split bank-identity/balance panels. */
export function AccountLiquidityCard({ bankName, last4, balance, currency = '₹', updatedAt, onPress, onRefresh }: Props) {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (refreshing || !onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      className="w-[280px] min-h-[140px] flex-row rounded-md border border-outline-variant relative overflow-hidden"
    >
      <View className="w-[35%] bg-surface-container-low p-lg justify-between border-r border-outline-variant">
        <View className="w-[40px] h-[40px] rounded-lg bg-surface-bright items-center justify-center">
          <Text className="font-inter-bold text-body-sm text-primary">{bankName.charAt(0).toUpperCase()}</Text>
        </View>
        <View>
          <Text className="font-inter-semibold text-annotation text-on-surface" numberOfLines={1}>
            {bankName}
          </Text>
          {last4 && <Text className="font-mono text-[9px] text-on-surface-variant mt-[2px]">{`••${last4}`}</Text>}
        </View>
      </View>
      <View className="w-[65%] bg-surface-container-lowest p-lg justify-between">
        <View>
          <Text className="font-inter-semibold text-[9px] leading-[14px] tracking-[0.05em] text-on-surface-variant mb-[4px] uppercase">
            Available Balance
          </Text>
          <Text className="font-mono-medium text-[22px] leading-[26px] text-on-surface" numberOfLines={1}>
            {formatAmount(balance, currency)}
          </Text>
        </View>
        <View className="flex-row items-center justify-between">
          <Text className="font-inter text-[10px] text-on-surface-variant" numberOfLines={1}>
            {timeAgo(updatedAt)}
          </Text>
          {onRefresh && (
            <TouchableOpacity hitSlop={8} disabled={refreshing} onPress={handleRefresh}>
              <RefreshIcon color={refreshing ? Colors.outline : Colors.onSurfaceVariant} size={16} />
            </TouchableOpacity>
          )}
        </View>
      </View>
      <View className="absolute top-lg right-lg">
        <ArrowUpRightIcon color={Colors.onSurfaceVariant} size={18} />
      </View>
    </TouchableOpacity>
  );
}
