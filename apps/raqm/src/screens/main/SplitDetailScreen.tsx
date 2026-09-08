import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ToastAndroid } from 'react-native';
import { MainStackScreenProps } from '../../navigation/types';
import { getSplit, getSplitParticipants, setSplitParticipantStatus, deleteSplit } from '../../db/database';
import type { Split, SplitParticipant } from '../../db/database';

function statusLabel(status: SplitParticipant['status']): string {
  if (status === 'settled') return 'Settled';
  if (status === 'attention') return 'Needs review';
  return 'Unpaid';
}

export function SplitDetailScreen({ route, navigation }: MainStackScreenProps<'SplitDetail'>) {
  const { splitId } = route.params;
  const [split, setSplit] = useState<Split | null>(null);
  const [participants, setParticipants] = useState<SplitParticipant[]>([]);
  const [deleteInFlight, setDeleteInFlight] = useState(false);

  const load = useCallback(() => {
    getSplit(splitId).then(setSplit);
    getSplitParticipants(splitId).then(setParticipants);
  }, [splitId]);

  useEffect(load, [load]);

  const toggleSettled = async (p: SplitParticipant) => {
    const next = p.status === 'settled' ? 'unpaid' : 'settled';
    await setSplitParticipantStatus(p.id, next, null);
    load();
  };

  const removeSplit = async () => {
    if (deleteInFlight) return;
    setDeleteInFlight(true);
    try {
      await deleteSplit(splitId);
      ToastAndroid.show('Split deleted', ToastAndroid.SHORT);
      navigation.goBack();
    } finally {
      setDeleteInFlight(false);
    }
  };

  if (!split) return null;

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-container-margin pt-sm pb-md">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="font-inter text-body-md text-primary w-[70px]">‹ Back</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-title-lg text-on-surface" numberOfLines={1}>{split.title}</Text>
        <TouchableOpacity onPress={removeSplit} disabled={deleteInFlight}>
          <Text className={`font-inter text-body-sm ${deleteInFlight ? 'text-error-muted' : 'text-error'}`}>Delete</Text>
        </TouchableOpacity>
      </View>

      <Text className="font-mono-medium text-numeric-lg text-on-surface px-container-margin mb-md">
        ₹{split.totalAmount.toFixed(2)}
      </Text>

      <FlatList
        contentContainerClassName="px-container-margin pb-[48px]"
        data={participants}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="flex-row items-center justify-between bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-md mb-sm"
            onPress={() => toggleSettled(item)}
          >
            <View>
              <Text className="font-inter-medium text-body-md text-on-surface">{item.name}</Text>
              <Text className="font-inter text-body-sm text-on-surface-variant">{statusLabel(item.status)}</Text>
            </View>
            <Text className="font-mono text-body-md text-on-surface">₹{item.shareAmount.toFixed(2)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
