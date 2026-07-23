import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { MainStackScreenProps } from '../../navigation/types';
import { loadSmsConversations, type SmsConversation } from '../../services/smsInbox';
import { Colors } from '../../theme';
import { BackIcon, SearchIcon, InfoIcon } from '../../components/TabIcon';

const AVATAR_COLORS = [Colors.primary, Colors.secondary, Colors.tertiary, Colors.errorMuted, Colors.mossStructure];

function avatarColor(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function formatConversationTime(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function keyExtractor(c: SmsConversation): string {
  return c.key;
}

function renderSeparator() {
  return <View className="h-[1px] bg-outline-variant" />;
}

export function SmsInboxScreen({ navigation }: MainStackScreenProps<'SmsInbox'>) {
  const [conversations, setConversations] = useState<SmsConversation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadSmsConversations().then((c) => {
      setConversations(c);
      setLoaded(true);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) => c.displayName.toLowerCase().includes(q) || c.lastBody.toLowerCase().includes(q),
    );
  }, [conversations, query]);

  const handleInfo = useCallback(() => {
    Alert.alert(
      'Report undetected SMS',
      'Groups your SMS inbox (last 90 days) by sender. Messages Raqm\'s parser doesn\'t recognize are tagged "Request to support" — open one and report it to have that format added.',
    );
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: SmsConversation }) => (
      <TouchableOpacity
        className="flex-row items-center gap-sm py-md"
        activeOpacity={0.6}
        onPress={() => navigation.navigate('SmsThread', { key: item.key })}
      >
        <View className="w-9 h-9 rounded-full items-center justify-center" style={{ backgroundColor: avatarColor(item.key) }}>
          <Text className="font-inter-bold text-body-sm text-on-primary">{item.displayName.charAt(0).toUpperCase()}</Text>
        </View>
        <View className="flex-1">
          <View className="flex-row items-center justify-between">
            <Text className="font-inter-medium text-body-standard text-on-surface" numberOfLines={1}>{item.displayName}</Text>
            <Text className="font-inter text-annotation text-on-surface-variant ml-sm">{formatConversationTime(item.lastTimestamp)}</Text>
          </View>
          <Text className="font-inter text-annotation text-on-surface-variant mt-[2px]" numberOfLines={1}>{item.lastBody}</Text>
        </View>
      </TouchableOpacity>
    ),
    [navigation],
  );

  return (
    <View className="flex-1 bg-background p-container-margin">
      <View className="flex-row items-center justify-between mt-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <BackIcon color={Colors.onSurface} size={22} />
        </TouchableOpacity>
        <Text className="font-inter-bold text-headline-sm text-on-surface flex-1 text-center" numberOfLines={1}>Report undetected SMS</Text>
        <TouchableOpacity onPress={handleInfo} hitSlop={8}>
          <InfoIcon color={Colors.onSurfaceVariant} size={20} />
        </TouchableOpacity>
      </View>

      <View className="relative mt-md mb-sm">
        <View className="absolute left-sm top-0 bottom-0 justify-center z-[1]">
          <SearchIcon color={Colors.inkLabel} size={18} />
        </View>
        <TextInput
          className="bg-surface-container-lowest border border-border-subtle rounded-lg py-[10px] pl-[40px] pr-md font-inter text-body-standard text-on-surface"
          placeholder="Search sender or message…"
          placeholderTextColor={Colors.inkLabel}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        contentContainerClassName="pb-[32px]"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={
          loaded ? (
            <View className="pt-[60px] items-center">
              <Text className="font-inter text-body-md text-on-surface-variant text-center">
                {query.trim() ? `Nothing matches "${query.trim()}".` : 'No SMS found in the last 90 days.'}
              </Text>
            </View>
          ) : null
        }
        renderItem={renderItem}
      />
    </View>
  );
}
