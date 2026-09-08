import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ToastAndroid } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MainStackScreenProps } from '../../navigation/types';
import { getSplit, getSplitParticipants, setSplitParticipantStatus, deleteSplit, getSetting } from '../../db/database';
import type { Split, SplitParticipant } from '../../db/database';
import { buildUpiLink } from '../../utils/upi';
import { openExternalLink } from '../../utils/shareLinks';
import { sendReminderNow } from '../../services/splitReminders';
import { formatAmount } from '../../utils/format';

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
  // Read live rather than trusting split.creatorUpiId, which is frozen at creation
  // time — a split created before the user set their UPI ID would otherwise never
  // pick it up, even after it's added in Settings.
  const [liveUpiId, setLiveUpiId] = useState<string | null>(null);

  const load = useCallback(() => {
    getSplit(splitId).then(setSplit);
    getSplitParticipants(splitId).then(setParticipants);
  }, [splitId]);

  useEffect(load, [load]);

  useFocusEffect(
    useCallback(() => {
      getSetting('upi_id').then((id) => setLiveUpiId(id ?? null));
    }, []),
  );

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
        {formatAmount(split.totalAmount)}
      </Text>

      <FlatList
        contentContainerClassName="px-container-margin pb-[48px]"
        data={participants}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-md mb-sm">
            <TouchableOpacity className="flex-row items-center justify-between" onPress={() => toggleSettled(item)}>
              <View>
                <Text className="font-inter-medium text-body-md text-on-surface">{item.isSelf ? 'You' : item.name}</Text>
                <Text className="font-inter text-body-sm text-on-surface-variant">{statusLabel(item.status)}</Text>
              </View>
              <Text className="font-mono text-body-md text-on-surface">{formatAmount(item.shareAmount)}</Text>
            </TouchableOpacity>

            {item.status === 'unpaid' && !item.isSelf && (
              <View className="flex-row gap-sm mt-sm">
                <TouchableOpacity
                  className="flex-1 py-[8px] items-center bg-surface rounded-lg border border-outline-variant"
                  onPress={() => {
                    const upiLine = liveUpiId
                      ? ` Pay here: ${buildUpiLink({ upiId: liveUpiId, payeeName: split.title, amount: item.shareAmount, note: split.title })}`
                      : '';
                    const descLine = split.description ? ` (${split.description})` : '';
                    const message = `Hi ${item.name}, for ${split.title}${descLine} you owe ${formatAmount(item.shareAmount)}.${upiLine}`;
                    openExternalLink(`whatsapp://send?text=${encodeURIComponent(message)}`, message);
                  }}
                >
                  <Text className="font-inter-medium text-body-sm text-on-surface">Share on WhatsApp</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-[8px] items-center bg-surface rounded-lg border border-outline-variant"
                  onPress={async () => {
                    const sent = await sendReminderNow(item, { title: split.title, description: split.description });
                    ToastAndroid.show(sent ? 'Reminder sent' : "Couldn't send reminder", ToastAndroid.SHORT);
                  }}
                >
                  <Text className="font-inter-medium text-body-sm text-on-surface">Remind now</Text>
                </TouchableOpacity>
              </View>
            )}

            {item.status === 'attention' && !item.isSelf && (
              <View className="flex-row gap-sm mt-sm">
                <TouchableOpacity
                  className="flex-1 py-[8px] items-center bg-primary rounded-lg"
                  onPress={async () => {
                    await setSplitParticipantStatus(item.id, 'settled', item.matchedTxId);
                    load();
                  }}
                >
                  <Text className="font-inter-medium text-body-sm text-on-primary">Confirm paid</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-[8px] items-center bg-surface rounded-lg border border-outline-variant"
                  onPress={async () => {
                    await setSplitParticipantStatus(item.id, 'unpaid', null);
                    load();
                  }}
                >
                  <Text className="font-inter-medium text-body-sm text-on-surface">Not this one</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      />
    </View>
  );
}
