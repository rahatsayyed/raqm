import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { Colors } from '../../theme';

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
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
        <Defs>
          <RadialGradient id="heroGlow" cx="50%" cy="50%" r="60%">
            <Stop offset="0%" stopColor={Colors.primary} stopOpacity={0.08} />
            <Stop offset="100%" stopColor={Colors.primary} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroGlow)" />
      </Svg>
      <Text className="font-inter-semibold text-label-caps text-ink-label mb-[8px]">{label}</Text>
      <Text className={`font-mono-medium text-metric-hero ${valueColorClassName}`}>{value}</Text>
      {sublabel && <Text className="font-inter text-body-standard text-ink-body mt-[8px]">{sublabel}</Text>}
      {stats && stats.length > 0 && (
        <View className="flex-row items-center gap-[24px] mt-[16px]">
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
