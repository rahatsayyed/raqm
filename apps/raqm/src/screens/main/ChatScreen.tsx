import React from 'react';
import { View } from 'react-native';
import { TopHeader } from '../../components/TopHeader';
import { ComingSoonNotice } from '../../components/ComingSoonNotice';
import { ChatIcon } from '../../components/TabIcon';

export function ChatScreen() {
  return (
    <View className="flex-1 bg-background">
      <TopHeader />
      <ComingSoonNotice
        Icon={ChatIcon}
        title="Chat, coming soon"
        message="Ask questions about your money and get answers here."
      />
    </View>
  );
}
