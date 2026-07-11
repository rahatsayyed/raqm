import React from 'react';
import { TouchableOpacity, Text, ViewStyle } from 'react-native';

interface Props {
  label: string;
  onPress: () => void;
  style?: ViewStyle;
}

export function GhostButton({ label, onPress, style }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="h-12 items-center justify-center px-lg" style={style}>
      <Text className="font-inter-medium text-body-md text-on-surface-variant">{label}</Text>
    </TouchableOpacity>
  );
}
