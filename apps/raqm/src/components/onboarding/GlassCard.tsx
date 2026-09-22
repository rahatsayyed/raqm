import React from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { cssInterop } from 'nativewind';
import { cn } from '../../utils/cn';
import type { OnbScheme } from '../../theme/onboardingColors';

// BlurView isn't styled by NativeWind's babel transform automatically (it's
// the only place in the app that uses it) — cssInterop registers className
// so it behaves like a first-class NativeWind component here too.
cssInterop(BlurView, { className: 'style' });

type GlassCardProps = {
  scheme: OnbScheme;
  children: React.ReactNode;
  // className is for static overrides (flex-1, w-full, mb-...) — callers
  // should prefer it over `style` now that it's supported. `style` stays
  // for truly dynamic/runtime values only.
  className?: string;
  style?: StyleProp<ViewStyle>;
};

// DESIGN.md v3.0 §6: one glass surface per screen — blur + translucency,
// never a drop shadow. RN has no CSS backdrop-filter, so the mockup's
// `backdrop-filter: blur(24px) saturate(1.3)` + `background: rgba(...)` +
// `inset 0 1px 0 rgba(...)` becomes three stacked layers here: expo-blur's
// BlurView for the actual blur, a translucent tint View, and a 1px
// top-highlight View.
export function GlassCard({ scheme, children, className, style }: GlassCardProps) {
  return (
    <View
      className={cn(
        'rounded-outer border border-onb-border-subtle dark:border-onb-border-subtle-dark overflow-hidden',
        className,
      )}
      style={style}
    >
      <BlurView intensity={40} tint={scheme} className="absolute inset-0" />
      <View className="absolute inset-0 bg-onb-glass-bg dark:bg-onb-glass-bg-dark" />
      <View className="absolute top-0 left-0 right-0 h-px bg-onb-glass-highlight dark:bg-onb-glass-highlight-dark" />
      <View className="p-md">{children}</View>
    </View>
  );
}
