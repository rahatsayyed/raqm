import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import type { OnbScheme } from '../../theme/onboardingColors';

type GlassCardProps = {
  scheme: OnbScheme;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
};

// DESIGN.md v3.0 §6: one glass surface per screen — blur + translucency,
// never a drop shadow. RN has no CSS backdrop-filter, so the mockup's
// `backdrop-filter: blur(24px) saturate(1.3)` + `background: rgba(...)` +
// `inset 0 1px 0 rgba(...)` becomes three stacked layers here: expo-blur's
// BlurView for the actual blur, a translucent tint View, and a 1px
// top-highlight View.
export function GlassCard({ scheme, children, style }: GlassCardProps) {
  return (
    <View
      className="rounded-outer border border-onb-border-subtle dark:border-onb-border-subtle-dark overflow-hidden"
      style={style}
    >
      {/* BlurView has no cssInterop registered (unlike
          KeyboardAwareScrollView) — style/StyleSheet stays here per
          CLAUDE.md's carve-out for things NativeWind can't express. */}
      <BlurView intensity={40} tint={scheme} style={StyleSheet.absoluteFill} />
      <View className="absolute inset-0 bg-onb-glass-bg dark:bg-onb-glass-bg-dark" />
      <View className="absolute top-0 left-0 right-0 h-px bg-onb-glass-highlight dark:bg-onb-glass-highlight-dark" />
      <View className="p-md">{children}</View>
    </View>
  );
}
