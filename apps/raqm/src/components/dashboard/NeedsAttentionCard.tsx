import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface NeedsAttentionCardProps {
  message: string;
  moreCount?: number;
  ctaLabel?: string;
  onPressCta?: () => void;
}

/** Secondary-accented alert card with a single CTA — used for anomaly/uncategorized-transaction prompts. */
export function NeedsAttentionCard({ message, moreCount, ctaLabel = 'REVIEW TRANSACTION', onPressCta }: NeedsAttentionCardProps) {
  return (
    <View className="mx-[24px] mb-[32px] bg-bg-surface border border-secondary rounded-[12px] p-[24px]">
      <View className="flex-row items-center justify-between mb-[16px]">
        <View className="flex-row items-center gap-[8px]">
          <Text className="text-secondary text-body-standard">⚠</Text>
          <Text className="font-inter-semibold text-section-header text-secondary">NEEDS YOUR ATTENTION</Text>
        </View>
        {moreCount != null && moreCount > 0 && <Text className="font-inter text-annotation text-ink-label">{moreCount} more</Text>}
      </View>
      <Text className="font-inter-medium text-insight-reading text-on-surface mb-[24px]">{message}</Text>
      <TouchableOpacity className="bg-secondary rounded-[8px] py-[12px] items-center" activeOpacity={0.8} onPress={onPressCta}>
        <Text className="font-inter-semibold text-annotation text-on-secondary tracking-[1px]">{ctaLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
