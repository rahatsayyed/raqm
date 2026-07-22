import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { Colors } from '../../theme';
import { formatAmount } from '../../utils/format';

export interface SparklineDatum {
  label: string;
  value: number;
}

interface Props {
  data: SparklineDatum[];
  currency?: string;
  height?: number;
  lineOpacity?: number;
}

const TOOLTIP_WIDTH = 80;
const HIT_SLOP = 20;

/** Sparkline whose tooltip tracks the nearest data point as a finger drags across it. */
export function Sparkline({ data, currency = '₹', height = 56, lineOpacity = 1 }: Props) {
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const paddingX = 4;

  const max = Math.max(...data.map((d) => d.value), 1);
  const usableW = Math.max(width - paddingX * 2, 1);
  const stepX = data.length > 1 ? usableW / (data.length - 1) : 0;

  const points = useMemo(
    () =>
      data.map((d, i) => {
        const x = paddingX + i * stepX;
        const normalized = max === 0 ? 0 : d.value / max;
        const y = (1 - normalized) * height;
        return { x, y, label: d.label, value: d.value };
      }),
    [data, stepX, max, height],
  );

  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  const updateActiveAtX = (x: number) => {
    if (stepX === 0 || points.length === 0) return;
    const i = Math.round((x - paddingX) / stepX);
    setActiveIndex(Math.min(Math.max(i, 0), points.length - 1));
  };

  const clearActive = () => setActiveIndex(null);

  // activeOffsetX/failOffsetY let the gesture yield to the enclosing ScrollView on a
  // vertical drag and only take over once the movement is clearly horizontal.
  const pan = Gesture.Pan()
    .hitSlop({ horizontal: HIT_SLOP, vertical: HIT_SLOP })
    .activeOffsetX([-5, 5])
    .failOffsetY([-10, 10])
    .onBegin((e) => runOnJS(updateActiveAtX)(e.x))
    .onUpdate((e) => runOnJS(updateActiveAtX)(e.x))
    .onFinalize(() => runOnJS(clearActive)());

  const active = activeIndex != null ? points[activeIndex] : null;

  return (
    <GestureDetector gesture={pan}>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {active && (
          <View
            className="absolute -top-[30px] w-[80px] items-center bg-surface-container-lowest border border-outline-variant rounded-md px-[6px] py-[4px] z-10"
            style={{ left: Math.min(Math.max(active.x - TOOLTIP_WIDTH / 2, 0), Math.max(width - TOOLTIP_WIDTH, 0)) }}
          >
            <Text className="font-mono-medium text-[11px] leading-[16px] text-on-surface" numberOfLines={1}>
              {formatAmount(active.value, currency)}
            </Text>
            <Text className="font-inter text-[9px] leading-[12px] text-on-surface-variant" numberOfLines={1}>
              {active.label}
            </Text>
          </View>
        )}
        <Svg width="100%" height={height}>
          {width > 0 && (
            <>
              <Polyline points={polylinePoints} fill="none" stroke={Colors.primary} strokeWidth={1.5} strokeOpacity={lineOpacity} />
              {active && (
                <>
                  <Line x1={active.x} y1={0} x2={active.x} y2={height} stroke={Colors.outlineVariant} strokeWidth={1} />
                  <Circle cx={active.x} cy={active.y} r={3} fill={Colors.primary} />
                </>
              )}
            </>
          )}
        </Svg>
      </View>
    </GestureDetector>
  );
}
