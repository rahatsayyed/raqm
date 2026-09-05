import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert, Linking } from 'react-native';
import { MainStackScreenProps } from '../../navigation/types';
import { loadSmsConversations, type InboxMessage } from '../../services/smsInbox';
import { Colors } from '../../theme';
import { BackIcon, SearchIcon } from '../../components/TabIcon';
import { FEEDBACK_EMAIL } from '../../constants/support';

function formatDateTime(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
}

function keyExtractor(m: InboxMessage): string {
  return `${m.sender}|${m.timestamp}`;
}

export function SmsThreadScreen({ navigation, route }: MainStackScreenProps<'SmsThread'>) {
  const { key } = route.params;
  const [messages, setMessages] = useState<InboxMessage[] | null>(null);
  const [displayName, setDisplayName] = useState(key);
  const [query, setQuery] = useState('');

  useEffect(() => {
    loadSmsConversations().then((conversations) => {
      const match = conversations.find((c) => c.key === key);
      setMessages(match?.messages ?? []);
      setDisplayName(match?.displayName ?? key);
    });
  }, [key]);

  // FlatList `inverted` renders index 0 at the bottom and opens scrolled there —
  // reverse to newest-first so the visible reading order stays oldest-to-newest.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = messages ?? [];
    const matching = q ? source.filter((m) => m.body.toLowerCase().includes(q)) : source;
    return [...matching].reverse();
  }, [messages, query]);

  const handleReport = (message: InboxMessage) => {
    const isNotification = message.origin === 'notification';
    Alert.alert(
      isNotification ? 'Report this notification?' : 'Report this SMS?',
      isNotification
        ? 'This opens an email to report the notification text so parser support can be added for this app.'
        : 'This opens an email to report the message text so parser support can be added for this format.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Report',
          onPress: () => {
            const subject = isNotification
              ? `Raqm: Unsupported app notification (${message.sender})`
              : `Raqm: Unsupported SMS format (${message.sender})`;
            const label = isNotification ? 'App package' : 'Sender';
            const body = `${label}: ${message.sender}\nReceived: ${new Date(message.timestamp).toString()}\n\n${isNotification ? 'Notification' : 'Message'}:\n${message.body}`;
            Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: InboxMessage }) => (
    <TouchableOpacity
      activeOpacity={item.supported ? 1 : 0.6}
      disabled={item.supported}
      onPress={() => handleReport(item)}
      className="bg-surface-container-lowest border border-border-subtle rounded-lg p-md mb-sm"
    >
      <View className="flex-row items-center justify-between mb-xs">
        <Text className="font-inter text-annotation text-on-surface-variant">
          {formatDateTime(item.timestamp)} · {item.sender}
        </Text>
        <Text className={`font-inter-medium text-annotation ${item.supported ? 'text-on-surface-variant' : 'text-error-muted'}`}>
          {item.supported ? 'Supported' : 'Request to support'}
        </Text>
      </View>
      <Text className="font-inter text-body-standard text-on-surface">{item.body}</Text>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1 bg-background p-container-margin">
      <View className="flex-row items-center justify-between mt-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <BackIcon color={Colors.onSurface} size={22} />
        </TouchableOpacity>
        <Text className="font-inter-bold text-headline-sm text-on-surface flex-1 text-center mx-sm" numberOfLines={1}>{displayName}</Text>
        <View className="w-[22px]" />
      </View>

      <View className="relative mt-md mb-sm">
        <View className="absolute left-sm top-0 bottom-0 justify-center z-[1]">
          <SearchIcon color={Colors.inkLabel} size={18} />
        </View>
        <TextInput
          className="bg-surface-container-lowest border border-border-subtle rounded-lg py-[10px] pl-[40px] pr-md font-inter text-body-standard text-on-surface"
          placeholder="Search this conversation…"
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
        inverted
        contentContainerClassName="pt-[32px]"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          messages != null ? (
            <View className="pt-[60px] items-center">
              <Text className="font-inter text-body-md text-on-surface-variant text-center">
                {query.trim() ? `Nothing matches "${query.trim()}".` : 'No messages.'}
              </Text>
            </View>
          ) : null
        }
        renderItem={renderItem}
      />
    </View>
  );
}
