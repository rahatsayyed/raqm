import React from 'react';
import { View, StyleSheet } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { OnbColors, type OnbScheme } from '../../theme/onboardingColors';

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
  const c = OnbColors[scheme];
  return (
    <View style={[styles.wrap, { borderColor: c.borderSubtle }, style]}>
      <BlurView intensity={40} tint={scheme} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: c.glassBg }]} />
      <View style={[styles.highlight, { backgroundColor: c.glassHighlight }]} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 6,
    borderWidth: 1,
    overflow: 'hidden',
  },
  highlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  content: {
    padding: 20,
  },
});
