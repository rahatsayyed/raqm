import React from 'react';
import { View, Text } from 'react-native';
import { HeroGlow } from '../HeroGlow';

interface HeroStat {
  label: string;
  value: string;
  direction: 'up' | 'down';
}

interface HeroMetricProps {
  label: string;
  value: string;
  valueColorClassName?: string;
  sublabel?: string;
  stats?: HeroStat[];
}

/** Big headline metric over a soft radial glow, with an optional row of mini stats below. */
export function HeroMetric({ label, value, valueColorClassName = 'text-ink-headline', sublabel, stats }: HeroMetricProps) {
  return (
    <View className="items-center py-[40px] mb-[24px]">
      <HeroGlow />
      <View className="items-center">
        <Text className="font-inter-semibold text-label-caps text-ink-label mb-[4px]">{label}</Text>
        <Text className={`font-mono-medium text-metric-hero ${valueColorClassName}`}>{value}</Text>
        {sublabel && <Text className="font-inter text-body-standard text-ink-body mt-[2px]">{sublabel}</Text>}
      </View>
      {stats && stats.length > 0 && (
        <View className="flex-row items-center gap-[32px] mt-[24px]">
          {stats.map((s, i) => (
            <React.Fragment key={s.label}>
              {i > 0 && <View className="w-[1px] h-[32px] bg-border-subtle" />}
              <View className="items-center">
                <Text className="font-inter-semibold text-annotation text-ink-label mb-[4px]">{s.label}</Text>
                <View className="flex-row items-center gap-[4px]">
                  <Text className={`text-body-standard ${s.direction === 'up' ? 'text-error-muted' : 'text-primary'}`}>
                    {s.direction === 'up' ? '↗' : '↘'}
                  </Text>
                  <Text className="font-mono-medium text-body-standard text-on-surface">{s.value}</Text>
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
}
