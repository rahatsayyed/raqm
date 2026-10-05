import React, { memo, useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, Linking } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MainStackScreenProps } from '../../navigation/types';
import { getFailedSms, dismissFailedSms, dismissAllFailedSms, type FailedSms } from '../../db/database';
import { Colors } from '../../theme';
import { BackIcon } from '../../components/TabIcon';
import { FEEDBACK_EMAIL } from '../../constants/support';

function formatDateTime(ts: number): string {
  const d = new Date(ts);
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${time}`;
}

function keyExtractor(m: FailedSms): string {
  return String(m.id);
}

function reportFailedSms(m: FailedSms) {
  const subject = `Raqm: Unparsed bank SMS (${m.sender})`;
  const body = `Sender: ${m.sender}\nReceived: ${new Date(m.timestamp).toString()}\n\nMessage:\n${m.body}`;
  Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
}

interface RowProps {
  id: number;
  sender: string;
  body: string;
  timestamp: number;
  onDismiss: (id: number) => void;
}

const FailedSmsRow = memo(function FailedSmsRow({ id, sender, body, timestamp, onDismiss }: RowProps) {
  return (
    <View className="bg-surface-container-lowest border border-border-subtle rounded-lg p-md mb-sm">
      <Text className="font-inter text-annotation text-on-surface-variant mb-xs">
        {formatDateTime(timestamp)} · {sender}
      </Text>
      <Text className="font-inter text-body-standard text-on-surface">{body}</Text>
      <View className="flex-row gap-md mt-md">
        <TouchableOpacity onPress={() => reportFailedSms({ id, sender, body, timestamp })} hitSlop={8}>
          <Text className="font-inter-semibold text-annotation text-primary">REPORT</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => onDismiss(id)} hitSlop={8}>
          <Text className="font-inter-semibold text-annotation text-on-surface-variant">DISMISS</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

export function NeedsAttentionScreen({ navigation }: MainStackScreenProps<'NeedsAttention'>) {
  const [items, setItems] = useState<FailedSms[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getFailedSms().then((rows) => {
        setItems(rows);
        setLoaded(true);
      });
    }, []),
  );

  const handleDismiss = useCallback(async (id: number) => {
    setItems((prev) => prev.filter((m) => m.id !== id));
    await dismissFailedSms(id);
  }, []);

  const handleDismissAll = useCallback(() => {
    if (busy) return;
    Alert.alert('Dismiss all?', 'These messages will be removed from Needs attention.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Dismiss all',
        onPress: async () => {
          if (busy) return;
          setBusy(true);
          try {
            await dismissAllFailedSms();
            setItems([]);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }, [busy]);

  const renderItem = useCallback(
    ({ item }: { item: FailedSms }) => (
      <FailedSmsRow id={item.id} sender={item.sender} body={item.body} timestamp={item.timestamp} onDismiss={handleDismiss} />
    ),
    [handleDismiss],
  );

  return (
    <View className="flex-1 bg-background p-container-margin">
      <View className="flex-row items-center justify-between mt-sm mb-md">
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <BackIcon color={Colors.onSurface} size={22} />
        </TouchableOpacity>
        <Text className="font-inter-bold text-headline-sm text-on-surface flex-1 text-center" numberOfLines={1}>Needs attention</Text>
        <TouchableOpacity onPress={handleDismissAll} hitSlop={8} disabled={items.length === 0}>
          <Text className={items.length === 0 ? 'font-inter-semibold text-annotation text-on-surface-variant opacity-40' : 'font-inter-semibold text-annotation text-primary'}>CLEAR</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerClassName="pb-[32px]"
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loaded ? (
            <View className="pt-[60px] items-center">
              <Text className="font-inter text-body-md text-on-surface-variant text-center">Nothing needs your attention.</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}
