import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useNavigation, type NavigationProp } from '@react-navigation/native';
import type { MainStackParamList } from '../navigation/types';
import { useAppStore } from '../store/appStore';
import { Colors } from '../theme';
import { SearchIcon, NotificationIcon, PersonIcon } from './TabIcon';

interface TopHeaderProps {
  onSearchPress?: () => void;
  onNotificationPress?: () => void;
}

/** Shared top bar for all 4 main tabs: avatar (→ More) + username, search/notification icons. */
export function TopHeader({ onSearchPress, onNotificationPress }: TopHeaderProps) {
  const { userName } = useAppStore();
  const navigation = useNavigation();

  return (
    <View className="flex-row items-center justify-between px-container-margin pt-sm pb-md">
      <TouchableOpacity
        className="flex-row items-center gap-sm flex-1"
        activeOpacity={0.7}
        onPress={() => navigation.getParent<NavigationProp<MainStackParamList>>()?.navigate('More')}
      >
        <View className="size-12 rounded-full bg-primary-container/20 border border-primary/20 items-center justify-center">
          <PersonIcon color={Colors.primary} size={20} />
        </View>
        <Text className="font-inter-light text-body-lg text-on-surface" numberOfLines={1}>
          Hi,
        </Text>
        <Text className="font-inter-medium text-headline-sm text-on-surface" numberOfLines={1}>
           {userName || 'User'}
        </Text>
      </TouchableOpacity>
      <View className="flex-row items-center gap-md">
        {onSearchPress && (
          <TouchableOpacity hitSlop={8} onPress={onSearchPress}>
            <SearchIcon color={Colors.onSurfaceVariant} size={22} />
          </TouchableOpacity>
        )}
        {onNotificationPress && (
          <TouchableOpacity hitSlop={8} onPress={onNotificationPress}>
            <NotificationIcon color={Colors.onSurfaceVariant} size={22} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
