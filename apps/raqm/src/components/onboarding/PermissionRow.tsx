import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Icon } from '../Icon';
import { Colors } from '../../theme';

type PermissionRowProps = {
  icon: React.ComponentProps<typeof Icon>['name'];
  title: string;
  reason: string;
  granted: boolean;
  onGrant: () => void;
  index: number; // for stagger delay
};

// One row per permission — title + reason on the left, a Grant button on
// the right, per the user's explicit design direction (spec §4.2). Replaces
// the old sequential full-screen permission wall entirely.
export function PermissionRow({ icon, title, reason, granted, onGrant, index }: PermissionRowProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(index * 80)}
      className="flex-row items-center justify-between border-b border-border-subtle py-md"
    >
      <View className="flex-row items-center flex-1 pr-md">
        <Icon name={icon} size={22} color={Colors.inkBody} />
        <View className="ml-md flex-1">
          <Text className="font-inter-semibold text-body-standard text-ink-headline">{title}</Text>
          <Text className="font-inter text-supporting-text text-ink-body mt-xs">{reason}</Text>
        </View>
      </View>
      {granted ? (
        <Text className="font-inter-semibold text-supporting-text text-accent-primary">Granted</Text>
      ) : (
        <Pressable onPress={onGrant} className="rounded-sm border border-accent-primary px-md py-sm">
          <Text className="font-inter-semibold text-supporting-text text-accent-primary">Grant</Text>
        </Pressable>
      )}
    </Animated.View>
  );
}
