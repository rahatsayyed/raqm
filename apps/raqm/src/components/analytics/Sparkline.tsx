import React, { useMemo, useState } from 'react';
import { View, Text } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { Canvas, Path, Skia, Group, Circle as SkiaCircle, Line as SkiaLine } from '@shopify/react-native-skia';
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

interface SparkPoint {
  x: number;
  y: number;
  label: string;
  value: number;
}

/** Builds a smoothed cubic-bezier path through the points via Catmull-Rom-to-bezier interpolation. */
function buildSmoothPath(points: SparkPoint[]) {
  const path = Skia.Path.Make();
  if (points.length === 0) return path;

  path.moveTo(points[0].x, points[0].y);
  if (points.length === 1) return path;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    path.cubicTo(c1x, c1y, c2x, c2y, p2.x, p2.y);
  }

  return path;
}

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

  const linePath = useMemo(() => buildSmoothPath(points), [points]);

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
        {width > 0 && (
          <Canvas style={{ width, height }}>
            <Group opacity={lineOpacity}>
              <Path path={linePath} style="stroke" strokeWidth={1.5} color={Colors.primary} />
            </Group>
            {active && (
              <>
                <SkiaLine p1={{ x: active.x, y: 0 }} p2={{ x: active.x, y: height }} color={Colors.outlineVariant} strokeWidth={1} />
                <SkiaCircle cx={active.x} cy={active.y} r={3} color={Colors.primary} />
              </>
            )}
          </Canvas>
        )}
      </View>
    </GestureDetector>
  );
}
