import React from 'react';
import { View, Text } from 'react-native';
import { HeroGlow } from '../HeroGlow';
import { Sparkline, type SparklineDatum } from './Sparkline';

interface Props {
  label: string;
  /** A string is wrapped in the metric-hero Text; a node is rendered as-is. */
  value: React.ReactNode;
  data: SparklineDatum[];
  currency?: string;
}

/** Big spend headline for the Briefing tab, over a soft radial glow, with an interactive sparkline beneath it. */
export function BriefingHero({ label, value, data, currency }: Props) {
  return (
    <View className="items-center py-[32px] px-container-margin mb-md">
      <HeroGlow />
      <Text className="font-inter-semibold text-label-caps text-ink-label mb-[8px]">{label}</Text>
      {typeof value === 'string' ? (
        <Text className="font-mono-medium text-metric-hero text-ink-headline tracking-tight">{value}</Text>
      ) : (
        value
      )}
      <View className="w-[128px] h-[48px] mt-lg">
        <Sparkline data={data} currency={currency} height={48} lineOpacity={0.8}/>
      </View>
    </View>
  );
}
