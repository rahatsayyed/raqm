import React, { useEffect, useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Canvas, Rect } from '@shopify/react-native-skia';
import { Colors } from '../../theme';
import { formatAmount } from '../../utils/format';

export interface TrendBarDatum {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: TrendBarDatum[];
  currency?: string;
  height?: number;
  barWidth?: number;
  gap?: number;
}

const TOOLTIP_WIDTH = 112;
const HIT_SLOP = 12;

/** Small Skia bar chart (fixed thin bars, each carrying its own color) whose tooltip tracks the nearest bar on drag. */
export function CategoryTrendBars({ data, currency = '₹', height = 32, barWidth = 3, gap = 2 }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const totalWidth = data.length > 0 ? data.length * barWidth + (data.length - 1) * gap : 0;
  const max = Math.max(...data.map((d) => d.value), 1);

  const bars = useMemo(
    () =>
      data.map((d, i) => {
        const barHeight = Math.max((d.value / max) * height, 2);
        return { x: i * (barWidth + gap), y: height - barHeight, w: barWidth, h: barHeight, label: d.label, value: d.value, color: d.color };
      }),
    [data, barWidth, gap, max, height],
  );

  const updateActiveAtX = (x: number) => {
    if (bars.length === 0) return;
    const i = Math.min(Math.max(Math.floor(x / (barWidth + gap)), 0), bars.length - 1);
    setActiveIndex(i);
  };

  const clearActive = () => setActiveIndex(null);

  const pan = Gesture.Pan()
    .hitSlop({ horizontal: HIT_SLOP, vertical: HIT_SLOP })
    .activeOffsetX([-5, 5])
    .failOffsetY([-10, 10])
    .onBegin((e) => runOnJS(updateActiveAtX)(e.x))
    .onUpdate((e) => runOnJS(updateActiveAtX)(e.x))
    .onFinalize(() => runOnJS(clearActive)());

  const active = activeIndex != null ? bars[activeIndex] : null;

  // The bar chart itself (a handful of 3px bars) is much narrower than the tooltip and sits
  // flush against the row's right edge, which is near the screen edge — so only capping the
  // tooltip's *right* edge at the container's right edge (not also floor-clamping at 0) lets
  // it slide left over the row's spacious label column instead of running off the right side
  // of the screen.
  const tooltipLeft = useSharedValue(0);
  useEffect(() => {
    if (!active) return;
    tooltipLeft.value = withTiming(Math.min(active.x + active.w / 2 - TOOLTIP_WIDTH / 2, totalWidth - TOOLTIP_WIDTH), { duration: 120 });
  }, [active?.x, active?.w, totalWidth, tooltipLeft]);

  const tooltipStyle = useAnimatedStyle(() => ({ left: tooltipLeft.value }));

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width: totalWidth, height }}>
        {active && (
          <Animated.View
            className="absolute -top-[66px] w-[112px] items-center bg-surface-container-lowest border border-outline-variant rounded-lg px-[10px] py-[6px] z-10"
            style={tooltipStyle}
          >
            <Text className="font-mono-medium text-[14px] leading-[18px] text-on-surface" numberOfLines={1}>
              {formatAmount(active.value, currency)}
            </Text>
            <Text className="font-inter text-[11px] leading-[14px] text-on-surface-variant" numberOfLines={1}>
              {active.label}
            </Text>
          </Animated.View>
        )}
        <Canvas style={{ width: totalWidth, height }}>
          {bars.map((b, i) => (
            <Rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} color={i === activeIndex ? Colors.onSurface : b.color} />
          ))}
        </Canvas>
      </View>
    </GestureDetector>
  );
}
