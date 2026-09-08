import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ToastAndroid } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { MainStackScreenProps } from '../../navigation/types';
import { getSplit, getSplitParticipants, setSplitParticipantStatus, deleteSplit, getSetting, linkTxs } from '../../db/database';
import type { Split, SplitParticipant } from '../../db/database';
import { buildUpiLink } from '../../utils/upi';
import { openExternalLink } from '../../utils/shareLinks';
import { sendReminderNow } from '../../services/splitReminders';
import { formatAmount } from '../../utils/format';
import { useTxStore } from '../../store/txStore';
import { isCreditType } from '../../services/txIntelligenceCore';
import { BottomSheet } from './TransactionDetailScreen';

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
  const [settleSheetParticipant, setSettleSheetParticipant] = useState<SplitParticipant | null>(null);
  const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
  const [settling, setSettling] = useState(false);
  const allTxs = useTxStore((s) => s.txs);
  const addTx = useTxStore((s) => s.add);

  const incomingCandidates = allTxs
    .filter((t) => isCreditType(t.type))
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 20);

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
    if (p.status === 'settled') {
      // Unmarking stays instant in both linked and unlinked splits — netting
      // reversal (unlinking the transaction pair) is out of scope for this
      // plan; the transaction-level link, if any, simply stays as-is.
      await setSplitParticipantStatus(p.id, 'unpaid', null);
      load();
      return;
    }
    if (split!.sourceTxId == null) {
      // Unlinked split: purely informational, no netting, unchanged from v1.
      await setSplitParticipantStatus(p.id, 'settled', null);
      load();
      return;
    }
    setSelectedTxId(null);
    setSettleSheetParticipant(p);
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
                    if (split.sourceTxId != null && item.matchedTxId != null) {
                      await linkTxs(split.sourceTxId, item.matchedTxId, 'split_payment');
                    }
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

      <BottomSheet visible={settleSheetParticipant != null} onClose={() => setSettleSheetParticipant(null)}>
        <View className="px-container-margin pb-lg">
          <Text className="font-inter-bold text-title-md text-on-surface mb-md">Mark as settled</Text>
          <Text className="font-mono text-label-sm text-on-surface-variant mb-sm">Pick the incoming payment</Text>
          {incomingCandidates.map((t) => (
            <TouchableOpacity
              key={t.id}
              className={`flex-row items-center justify-between py-[10px] px-sm rounded-lg ${selectedTxId === t.id ? 'bg-primary/10' : ''}`}
              onPress={() => setSelectedTxId(t.id)}
            >
              <View>
                <Text className="font-inter text-body-sm text-on-surface">{t.merchant ?? t.bankName}</Text>
                <Text className="font-inter text-body-sm text-on-surface-variant">{new Date(t.timestamp).toLocaleDateString()}</Text>
              </View>
              <Text className="font-mono text-body-sm text-on-surface">{formatAmount(t.amount)}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            className={`mt-md py-md items-center bg-primary rounded-xl ${selectedTxId == null || settling ? 'opacity-40' : ''}`}
            disabled={selectedTxId == null || settling}
            onPress={async () => {
              if (!settleSheetParticipant || selectedTxId == null || settling) return;
              setSettling(true);
              try {
                await setSplitParticipantStatus(settleSheetParticipant.id, 'settled', selectedTxId);
                if (split!.sourceTxId != null) {
                  await linkTxs(split!.sourceTxId, selectedTxId, 'split_payment');
                }
                setSettleSheetParticipant(null);
                load();
              } finally {
                setSettling(false);
              }
            }}
          >
            <Text className="font-inter-medium text-body-md text-on-primary">Use this transaction</Text>
          </TouchableOpacity>

          <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Or</Text>
          <TouchableOpacity
            className={`py-md items-center bg-surface rounded-xl border border-outline-variant ${settling ? 'opacity-40' : ''}`}
            disabled={settling}
            onPress={async () => {
              if (!settleSheetParticipant || settling) return;
              setSettling(true);
              try {
                const cashTxId = await addTx({
                  amount: settleSheetParticipant.shareAmount,
                  type: TransactionType.CREDIT,
                  merchant: split!.title,
                  bankName: 'Cash',
                  timestamp: Date.now(),
                  categoryId: null,
                  subcategoryId: null,
                  notes: null,
                  tags: [],
                  isManual: true,
                });
                await setSplitParticipantStatus(settleSheetParticipant.id, 'settled', cashTxId);
                if (split!.sourceTxId != null) {
                  await linkTxs(split!.sourceTxId, cashTxId, 'split_payment');
                }
                setSettleSheetParticipant(null);
                load();
              } finally {
                setSettling(false);
              }
            }}
          >
            <Text className="font-inter-medium text-body-md text-on-surface">Received as cash</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
    </View>
  );
}
