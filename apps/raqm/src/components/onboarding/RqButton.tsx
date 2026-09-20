import React from 'react';
import { Pressable, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { OnbColors, type OnbScheme } from '../../theme/onboardingColors';

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
// 51px tall, clearing the 44px minimum.
export function RqButton({ label, onPress, disabled, scheme, icon }: RqButtonProps) {
  const c = OnbColors[scheme];
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

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
        style={{
          minHeight: 51,
          borderRadius: 3,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
          paddingHorizontal: 24,
          paddingVertical: 16,
          backgroundColor: disabled ? c.borderSubtle : c.accentPrimary,
        }}
      >
        <Text
          style={{
            fontFamily: 'InstrumentSans_600SemiBold',
            fontSize: 16,
            color: disabled ? c.inkLabel : c.onAccent,
          }}
        >
          {label}
        </Text>
        {icon}
      </Pressable>
    </Animated.View>
  );
}
