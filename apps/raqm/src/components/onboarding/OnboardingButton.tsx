import React from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

type OnboardingButtonProps = { label: string; onPress: () => void; disabled?: boolean };

// Pill radius reserved for primary CTAs only (DESIGN.md v2.0 §5). Press
// feedback is a plain scale via withTiming — never withSpring, per the
// motion vocabulary's ease-out-only rule.
export function OnboardingButton({ label, onPress, disabled }: OnboardingButtonProps) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Pressable
        disabled={disabled}
        onPressIn={() => { scale.value = withTiming(0.97, { duration: 100 }); }}
        onPressOut={() => { scale.value = withTiming(1, { duration: 150 }); }}
        onPress={onPress}
        className={`h-14 rounded-full items-center justify-center px-xl ${disabled ? 'bg-border-subtle' : 'bg-accent-primary'}`}
      >
        <Text className={`font-inter-semibold text-body-standard ${disabled ? 'text-ink-label' : 'text-bg-base'}`}>
          {label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
