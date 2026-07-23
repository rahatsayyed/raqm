import React from 'react';
import { View } from 'react-native';
import { TopHeader } from '../../components/TopHeader';
import { ComingSoonNotice } from '../../components/ComingSoonNotice';
import { SplitIcon } from '../../components/TabIcon';

export function SplitScreen() {
  return (
    <View className="flex-1 bg-background">
      <TopHeader />
      <ComingSoonNotice
        Icon={SplitIcon}
        title="Splitting, coming soon"
        message="Split bills and shared expenses with others will live here."
      />
    </View>
  );
}
