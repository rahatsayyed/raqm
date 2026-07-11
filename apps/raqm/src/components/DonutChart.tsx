import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Colors } from '../theme';

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: DonutDatum[];
  size?: number;
  strokeWidth?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(angleRad), y: cy + r * Math.sin(angleRad) };
}

/** Describes an SVG arc path from startAngle to endAngle (degrees, clockwise from 12 o'clock). */
function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const sweep = endAngle - startAngle;
  const largeArcFlag = sweep > 180 ? '1' : '0';
  // sweep-flag 0 with reversed start/end points draws the correct clockwise minor/major arc.
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function DonutChart({ data, size = 160, strokeWidth = 24 }: Props) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = (size - strokeWidth) / 2;
  const total = data.reduce((sum, d) => sum + Math.max(0, d.value), 0);

  const total0 = total === 0;
  let cumulativeAngle = 0;

  const arcs = data
    .filter((d) => d.value > 0)
    .map((d, i) => {
      const rawSweep = total0 ? 0 : (d.value / total) * 360;
      // A single slice covering the whole total would have start === end point; cap just short of 360.
      const sweep = Math.min(rawSweep, 359.99);
      const startAngle = cumulativeAngle;
      const endAngle = startAngle + sweep;
      cumulativeAngle = startAngle + rawSweep;
      // labels can collide (e.g. duplicate 'Unknown') — key by position instead
      return { key: `${i}-${d.label}`, d: describeArc(cx, cy, radius, startAngle, endAngle), color: d.color };
    });

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size}>
        {total0 ? (
          <Path
            d={describeArc(cx, cy, radius, 0, 359.99)}
            stroke={Colors.outlineVariant}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="butt"
          />
        ) : (
          arcs.map((arc) => (
            <Path key={arc.key} d={arc.d} stroke={arc.color} strokeWidth={strokeWidth} fill="none" strokeLinecap="butt" />
          ))
        )}
      </Svg>
      <View style={StyleSheet.absoluteFill as object} pointerEvents="none">
        <View className="flex-1 items-center justify-center">
          <Text className="font-mono-medium text-on-surface text-[14px] leading-[28px]" numberOfLines={1}>
            ₹{Math.round(total).toLocaleString('en-IN')}
          </Text>
        </View>
      </View>
    </View>
  );
}
