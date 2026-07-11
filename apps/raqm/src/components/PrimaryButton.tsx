import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, ViewStyle } from 'react-native';
import { Colors } from '../theme';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  onPressIn?: () => void;
  onPressOut?: () => void;
}

// Colored shadow (shadowColor tied to the brand primary) can't be expressed via
// NativeWind — kept as a style object alongside the elevation fallback for Android.
const shadowStyle: ViewStyle = {
  shadowColor: Colors.primary,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.25,
  shadowRadius: 16,
  elevation: 8,
};

export function PrimaryButton({ label, onPress, loading, disabled, style, onPressIn, onPressOut }: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled || loading}
      activeOpacity={0.85}
      className={`bg-primary rounded-lg h-14 items-center justify-center px-lg ${(disabled || loading) ? 'opacity-50' : ''}`}
      style={[shadowStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={Colors.onPrimary} />
      ) : (
        <Text className="font-inter-bold text-title-lg text-on-primary">{label}</Text>
      )}
    </TouchableOpacity>
  );
}
