import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ToastAndroid } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { MainStackScreenProps } from '../../navigation/types';
import {
  getSplit,
  getSplitParticipants,
  setSplitParticipantStatus,
  deleteSplit,
  getSetting,
  linkTxs,
  unlinkTxs,
  getTxById,
  updateSplitReminderSettings,
} from '../../db/database';
import type { Split, SplitParticipant } from '../../db/database';
import { buildUpiLink } from '../../utils/upi';
import { openExternalLink } from '../../utils/shareLinks';
import { sendReminderNow } from '../../services/splitReminders';
import { formatAmount } from '../../utils/format';
import { useTxStore } from '../../store/txStore';
import { isCreditType } from '../../services/txIntelligenceCore';
import { BottomSheet } from './TransactionDetailScreen';
import { logEvent } from '../../services/logger';

const CADENCE_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'Every 2 days', days: 2 },
  { label: 'Every 3 days', days: 3 },
  { label: 'Weekly', days: 7 },
];

/**
 * `linkTxs` supports only ONE partner per transaction (single link_type/link_partner_id
 * columns) — so on a split with 2+ non-self participants, settling a second participant's
 * payment would silently clobber the first participant's already-established link. This is
 * the documented safety valve (not a fix for the underlying single-partner limitation): skip
 * linking, but let the caller still record the participant's own status.
 */
async function linkSplitPaymentIfSafe(sourceTxId: number, targetTxId: number): Promise<void> {
  const source = await getTxById(sourceTxId);
  if (source?.linkPartnerId != null && source.linkPartnerId !== targetTxId) {
    ToastAndroid.show(
      "Marked as paid. Only one payment per split can be netted against the original expense right now.",
      ToastAndroid.LONG,
    );
    return;
  }
  await linkTxs(sourceTxId, targetTxId, 'split_payment');
}

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
  const [reminderSaving, setReminderSaving] = useState(false);

  const incomingCandidates = useMemo(
    () =>
      allTxs
        .filter((t) => isCreditType(t.type) && t.linkPartnerId == null)
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 20),
    [allTxs],
  );

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
      // Unmarking reverses the netting: if this participant's payment was linked
      // to the original expense, unlink it too — otherwise the expense keeps
      // being silently netted against a credit the user just said "isn't settled".
      const matchedTxId = p.matchedTxId;
      await setSplitParticipantStatus(p.id, 'unpaid', null);
      if (matchedTxId != null) {
        await unlinkTxs(matchedTxId);
      }
      load();
      return;
    }
    if (split!.sourceTxId == null || p.isSelf) {
      // Unlinked split, or the "You" row: purely informational, no netting —
      // "You" never owes/pays a settlement, so it must never open the sheet
      // (which would fabricate a credit netting the user's own share out).
      await setSplitParticipantStatus(p.id, 'settled', null);
      load();
      return;
    }
    setSelectedTxId(null);
    setSettleSheetParticipant(p);
  };

  const setReminderEnabled = async (enabled: boolean) => {
    if (!split || reminderSaving) return;
    setReminderSaving(true);
    try {
      const days = enabled ? (split.remindIntervalDays ?? 2) : split.remindIntervalDays;
      await updateSplitReminderSettings(split.id, enabled, days);
      setSplit({ ...split, autoRemindEnabled: enabled, remindIntervalDays: days });
    } catch (e) {
      logEvent('splitDetail.reminderSettingsFailed', e instanceof Error ? e.message : String(e));
      ToastAndroid.show("Couldn't update reminder settings", ToastAndroid.SHORT);
    } finally {
      setReminderSaving(false);
    }
  };

  const setReminderCadence = async (days: number) => {
    if (!split || reminderSaving) return;
    setReminderSaving(true);
    try {
      await updateSplitReminderSettings(split.id, true, days);
      setSplit({ ...split, autoRemindEnabled: true, remindIntervalDays: days });
    } catch (e) {
      logEvent('splitDetail.reminderSettingsFailed', e instanceof Error ? e.message : String(e));
      ToastAndroid.show("Couldn't update reminder settings", ToastAndroid.SHORT);
    } finally {
      setReminderSaving(false);
    }
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

      <View className="flex-row items-center justify-between px-container-margin mb-sm">
        <Text className="font-inter text-body-sm text-on-surface">Auto-remind participants</Text>
        <TouchableOpacity
          className={`px-md py-[6px] rounded-lg ${split.autoRemindEnabled ? 'bg-primary' : 'bg-surface-container-lowest border border-outline-variant'} ${reminderSaving ? 'opacity-40' : ''}`}
          disabled={reminderSaving}
          onPress={() => setReminderEnabled(!split.autoRemindEnabled)}
        >
          <Text className={`font-inter-medium text-body-sm ${split.autoRemindEnabled ? 'text-on-primary' : 'text-on-surface'}`}>
            {split.autoRemindEnabled ? 'On' : 'Off'}
          </Text>
        </TouchableOpacity>
      </View>

      {split.autoRemindEnabled && (
        <View className="flex-row flex-wrap gap-sm px-container-margin mb-md">
          {CADENCE_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.label}
              className={`px-md py-[6px] rounded-lg ${split.remindIntervalDays === opt.days ? 'bg-primary' : 'bg-surface-container-lowest border border-outline-variant'} ${reminderSaving ? 'opacity-40' : ''}`}
              disabled={reminderSaving}
              onPress={() => opt.days != null && setReminderCadence(opt.days)}
            >
              <Text className={`font-inter-medium text-body-sm ${split.remindIntervalDays === opt.days ? 'text-on-primary' : 'text-on-surface'}`}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <FlatList
        contentContainerClassName="px-container-margin pb-[48px]"
        data={participants}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => (
          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-md mb-sm">
            <TouchableOpacity
              className="flex-row items-center justify-between"
              onPress={() => !item.isSelf && toggleSettled(item)}
              disabled={item.isSelf}
            >
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
                      await linkSplitPaymentIfSafe(split.sourceTxId, item.matchedTxId);
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
                  await linkSplitPaymentIfSafe(split!.sourceTxId, selectedTxId);
                }
                setSettleSheetParticipant(null);
                load();
              } catch (e) {
                logEvent('splitDetail.settleFailed', e instanceof Error ? e.message : String(e));
                ToastAndroid.show("Couldn't settle", ToastAndroid.SHORT);
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
                  await linkSplitPaymentIfSafe(split!.sourceTxId, cashTxId);
                }
                setSettleSheetParticipant(null);
                load();
              } catch (e) {
                logEvent('splitDetail.settleFailed', e instanceof Error ? e.message : String(e));
                ToastAndroid.show("Couldn't settle", ToastAndroid.SHORT);
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
