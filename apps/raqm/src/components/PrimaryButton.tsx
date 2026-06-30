import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { Colors, Typography, Radius, Spacing } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

export function PrimaryButton({ label, onPress, loading, disabled, style, onPressIn, onPressOut }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled || loading}
      activeOpacity={0.85}
      style={[styles.button, (disabled || loading) && styles.disabled, style]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.onPrimary} />
      ) : (
        <Text style={styles.label}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    ...Typography.titleLg,
    color: Colors.onPrimary,
  },
});
