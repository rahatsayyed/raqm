import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../theme';

export interface BarDatum {
  label: string;
  value: number;
}

interface SpendBarChartProps {
  data: BarDatum[]; // ordered chronologically, e.g. one entry per day or per week
  color?: string; // defaults to Colors.primary
}

const CHART_HEIGHT = 120;

function Bar({ datum, max, color, showLabel }: { datum: BarDatum; max: number; color: string; showLabel: boolean }) {
  const pct = max > 0 ? Math.max((datum.value / max) * 100, datum.value > 0 ? 4 : 0) : 0;
  return (
    <View className="flex-1 items-center">
      <View style={{ height: CHART_HEIGHT, width: '100%', justifyContent: 'flex-end' }}>
        <View style={{ height: CHART_HEIGHT, width: '60%', alignSelf: 'center', backgroundColor: Colors.outlineVariant, borderRadius: 3, justifyContent: 'flex-end', overflow: 'hidden', position: 'absolute' }} />
        <View style={{ height: `${pct}%`, width: '60%', alignSelf: 'center', backgroundColor: color, borderRadius: 3 }} />
      </View>
      {showLabel ? (
        <Text className="text-[9px] mt-[4px]" style={{ color: Colors.onSurfaceVariant }} numberOfLines={1}>
          {datum.label}
        </Text>
      ) : (
        <View className="mt-[4px] h-[12px]" />
      )}
    </View>
  );
}

// Plain-View bar chart (flexbox height percentages, no SVG) per CLAUDE.md guidance —
// avoids adding a charting dependency for a simple daily/weekly spend histogram.
export function SpendBarChart({ data, color = Colors.primary }: SpendBarChartProps) {
  const max = data.reduce((m, d) => Math.max(m, d.value), 0);

  if (data.length === 0 || max === 0) {
    return (
      <View className="items-center justify-center" style={{ height: CHART_HEIGHT + 20 }}>
        <Text className="font-inter text-body-md text-on-surface-variant">No spend this period.</Text>
      </View>
    );
  }

  // Labeling every bar crowds the axis past ~10 bars, so past that threshold only every
  // Nth bar (plus the last one, so the axis doesn't dangle without an end label) is shown.
  const step = data.length > 10 ? Math.ceil(data.length / 8) : 1;

  return (
    <View className="flex-row items-end" style={{ gap: 2 }}>
      {data.map((datum, i) => (
        <Bar
          key={`${i}-${datum.label}`}
          datum={datum}
          max={max}
          color={color}
          showLabel={i % step === 0 || i === data.length - 1}
        />
      ))}
    </View>
  );
}
