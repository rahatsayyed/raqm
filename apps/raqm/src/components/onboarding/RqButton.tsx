import React from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { cn } from '../../utils/cn';
import type { OnbScheme } from '../../theme/onboardingColors';

type RqButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  scheme: OnbScheme;
  icon?: React.ReactNode;
};

// v3.0 primary CTA: radius-cta (3px) — no longer a pill, deliberately
// smaller-radius than the cards around it (DESIGN.md v3.0 §5). Press
// feedback is a plain scale via withTiming, never withSpring — the motion
// vocabulary is ease-out-only (DESIGN.md §7). Height math from DESIGN.md
// §14's tap-target note: padding:16px 24px around 16px/600 label text ≈
// 51px tall, clearing the 44px minimum. Colors/typography now come from
// tailwind's onb-* tokens via `scheme`, not the OnbColors runtime lookup —
// kept as explicit `scheme === 'dark'` ternaries (not the `dark:` variant)
// so this stays byte-identical to what the caller's `scheme` prop says,
// with no dependency on NativeWind's own OS dark-mode detection agreeing.
export function RqButton({ label, onPress, disabled, scheme, icon }: RqButtonProps) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const isDark = scheme === 'dark';

  return (
    <Animated.View style={style}>
      <Pressable
        disabled={disabled}
        onPressIn={() => {
          scale.value = withTiming(0.97, { duration: 100 });
        }}
        onPressOut={() => {
          scale.value = withTiming(1, { duration: 150 });
        }}
        onPress={onPress}
        className={cn(
          'min-h-[51px] rounded-cta flex-row items-center justify-center gap-2 px-lg py-md',
          disabled
            ? isDark
              ? 'bg-onb-border-subtle-dark'
              : 'bg-onb-border-subtle'
            : isDark
              ? 'bg-onb-accent-primary-dark'
              : 'bg-onb-accent-primary',
        )}
      >
        <Text
          className={cn(
            'text-[16px]',
            // Literal artifact weight: 500 (medium) on the light artboards,
            // 600 (semibold) on the dark ones.
            isDark ? 'font-instrument-semibold' : 'font-instrument-medium',
            disabled
              ? isDark
                ? 'text-onb-ink-label-dark'
                : 'text-onb-ink-label'
              : isDark
                ? 'text-onb-on-accent-dark'
                : 'text-onb-on-accent',
          )}
        >
          {label}
        </Text>
        {icon}
      </Pressable>
    </Animated.View>
  );
}
