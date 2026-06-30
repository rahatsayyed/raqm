import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function GhostButton({ label, onPress, style }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[styles.button, style]}>
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  label: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    fontFamily: 'WorkSans_500Medium',
  },
});
