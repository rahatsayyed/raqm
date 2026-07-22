import React from 'react';
import { Text } from 'react-native';

interface NarrativeAdvisorProps {
  pctChange: number;
  direction: 'lower' | 'higher';
  driverLabel: string | null;
}

/** One-line narrative summary beneath the Briefing hero — e.g. "Spending is 14% lower than last month, driven by reduced dining out." */
export function NarrativeAdvisor({ pctChange, direction, driverLabel }: NarrativeAdvisorProps) {
  const pct = Math.round(Math.abs(pctChange));
  return (
    <Text className="font-inter text-insight-reading text-on-surface text-center leading-relaxed px-xl mb-xl">
      Spending is <Text className="font-inter-medium text-primary">{pct}% {direction}</Text> than last month
      {driverLabel ? `, driven by ${driverLabel}.` : '.'}
    </Text>
  );
}
