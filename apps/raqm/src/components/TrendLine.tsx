import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Line, Circle } from 'react-native-svg';
import { Colors, Typography, Spacing } from '../theme';

export interface TrendDatum {
  label: string;
  value: number;
}

interface Props {
  data: TrendDatum[]; // expected length 6, oldest → newest
  height?: number;
}

export function TrendLine({ data, height = 120 }: Props) {
  const paddingX = 12;
  const paddingY = 12;
  // Width is resolved at layout time via onLayout so the polyline always fills the card.
  const [width, setWidth] = React.useState(0);

  const max = Math.max(...data.map((d) => d.value), 1);
  const min = 0; // expense trend always starts at 0 baseline
  const usableW = Math.max(width - paddingX * 2, 1);
  const usableH = Math.max(height - paddingY * 2, 1);
  const stepX = data.length > 1 ? usableW / (data.length - 1) : 0;

  const points = data.map((d, i) => {
    const x = paddingX + i * stepX;
    const normalized = max === min ? 0 : (d.value - min) / (max - min);
    const y = paddingY + (1 - normalized) * usableH;
    return { x, y, label: d.label, value: d.value };
  });

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Svg width="100%" height={height}>
        <Line x1={paddingX} y1={height - paddingY} x2={width - paddingX} y2={height - paddingY} stroke={Colors.outlineVariant} strokeWidth={1} />
        {width > 0 && (
          <>
            <Polyline points={polylinePoints} fill="none" stroke={Colors.primary} strokeWidth={2} />
            {points.map((p) => (
              <Circle key={p.label} cx={p.x} cy={p.y} r={3} fill={Colors.primary} />
            ))}
          </>
        )}
      </Svg>
      <View style={styles.labelRow}>
        {data.map((d) => (
          <Text key={d.label} style={styles.label} numberOfLines={1}>
            {d.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  label: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, fontSize: 10, flex: 1, textAlign: 'center' },
});
