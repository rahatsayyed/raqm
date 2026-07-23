import React from 'react';
import { View, Text } from 'react-native';
import { Colors } from '../theme';

interface ComingSoonNoticeProps {
  Icon: React.ComponentType<{ color: string; size?: number }>;
  title: string;
  message: string;
}

/** Centered placeholder for a tab whose feature isn't built yet. */
export function ComingSoonNotice({ Icon, title, message }: ComingSoonNoticeProps) {
  return (
    <View className="flex-1 items-center justify-center px-container-margin gap-md">
      <View className="w-16 h-16 rounded-full bg-surface-container items-center justify-center">
        <Icon color={Colors.onSurfaceVariant} size={28} />
      </View>
      <Text className="font-inter-semibold text-headline-sm text-on-surface text-center">{title}</Text>
      <Text className="font-inter text-body-standard text-on-surface-variant text-center">{message}</Text>
    </View>
  );
}
