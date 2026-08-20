import React from 'react';
import { View, Text } from 'react-native';
import { HeroGlow } from '../HeroGlow';

interface HeroStat {
  label: string;
  value: React.ReactNode;
  direction: 'up' | 'down';
}

interface HeroMetricProps {
  label: string;
  /** A string is wrapped in the metric-hero Text; a node is rendered as-is
   *  (MaskedValue brings its own Text with the same classes). */
  value: React.ReactNode;
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
        {typeof value === 'string' ? (
          <Text className={`font-mono-medium text-metric-hero ${valueColorClassName}`}>{value}</Text>
        ) : (
          value
        )}
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
                  {typeof s.value === 'string' ? (
                    <Text className="font-mono-medium text-body-standard text-on-surface">{s.value}</Text>
                  ) : (
                    s.value
                  )}
                </View>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}
    </View>
  );
}
