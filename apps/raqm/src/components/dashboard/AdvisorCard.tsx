import React from 'react';
import { View, Text } from 'react-native';

interface AdvisorCardProps {
  label?: string;
  insight: string;
  footnote?: string;
}

/** Bordered card surfacing a single calm, factual insight line (DESIGN.md §11/§12). */
export function AdvisorCard({ label = 'PERSONAL ADVISOR', insight, footnote }: AdvisorCardProps) {
  return (
    <View className="mx-[24px] mb-[32px] bg-bg-surface border border-border-subtle rounded-[12px] p-[24px]">
      <Text className="font-inter-semibold text-section-header text-primary mb-[16px]">{label}</Text>
      <Text className="font-inter-medium text-insight-reading text-on-surface">{insight}</Text>
      {footnote && <Text className="font-inter text-annotation text-ink-label mt-[16px] opacity-80">{footnote}</Text>}
    </View>
  );
}
