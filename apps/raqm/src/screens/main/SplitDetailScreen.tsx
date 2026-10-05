import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ToastAndroid, Share, Alert } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useFocusEffect } from '@react-navigation/native';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { MainStackScreenProps } from '../../navigation/types';
import {
  getSplit,
  getSplitParticipants,
  setSplitParticipantStatus,
  confirmSplitParticipantPayment,
  unsettleSplitParticipant,
  deleteSplit,
  getSetting,
  linkSplitPayment,
  SPLIT_CASH_TAG,
  updateSplitReminderSettings,
} from '../../db/database';
import type { Split, SplitParticipant } from '../../db/database';
import { buildUpiLink } from '../../utils/upi';
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

async function linkSplitPaymentIfSafe(sourceTxId: number, targetTxId: number): Promise<void> {
  await linkSplitPayment(targetTxId, sourceTxId);
}

function statusLabel(status: SplitParticipant['status']): string {
  if (status === 'settled') return 'Settled';
  if (status === 'attention') return 'Needs review';
  if (status === 'partial') return 'Partially paid';
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
  const [rowActionInFlight, setRowActionInFlight] = useState(false);
  const allTxs = useTxStore((s) => s.txs);
  const addTx = useTxStore((s) => s.add);
  const [reminderSaving, setReminderSaving] = useState(false);
  const [qrTarget, setQrTarget] = useState<{ name: string; remaining: number } | null>(null);

  const incomingCandidates = useMemo(() => {
    // Capped to what's actually still owed — linking a bigger unrelated credit would net
    // its full amount against the expense's category, overstating what this payment covered.
    const remaining = settleSheetParticipant
      ? settleSheetParticipant.shareAmount - settleSheetParticipant.paidAmount
      : null;
    return allTxs
      .filter((t) => isCreditType(t.type) && t.linkPartnerId == null && (remaining == null || t.amount <= remaining))
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 20);
  }, [allTxs, settleSheetParticipant]);

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
    if (rowActionInFlight) return;
    if (p.status === 'settled') {
      const unsettle = async () => {
        setRowActionInFlight(true);
        try {
          await unsettleSplitParticipant(p.id);
          load();
        } finally {
          setRowActionInFlight(false);
        }
      };
      Alert.alert(
        'Unmark as settled?',
        `This reverts ${p.name}'s payment and removes any cash transaction created for it.`,
        [{ text: 'Cancel', style: 'cancel' }, { text: 'Unmark', style: 'destructive', onPress: unsettle }],
      );
      return;
    }
    if (split!.sourceTxId == null || p.isSelf) {
      setRowActionInFlight(true);
      try {
        // Unlinked split, or the "You" row: purely informational, no netting —
        // "You" never owes/pays a settlement, so it must never open the sheet
        // (which would fabricate a credit netting the user's own share out).
        await setSplitParticipantStatus(p.id, 'settled', null);
        load();
      } finally {
        setRowActionInFlight(false);
      }
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

  const removeSplit = () => {
    if (deleteInFlight) return;
    const hasPayments = split?.status === 'settled' || participants.some((p) => p.paidAmount > 0);
    if (!hasPayments) {
      doRemoveSplit();
      return;
    }
    Alert.alert(
      'Delete this split?',
      'Recorded payments will be unlinked and any cash transactions created for them removed.',
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: doRemoveSplit }],
    );
  };

  const doRemoveSplit = async () => {
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
                {item.status === 'partial' && (
                  <Text className="font-mono text-body-sm text-on-surface-variant">
                    {formatAmount(item.paidAmount)} received · {formatAmount(item.shareAmount - item.paidAmount)} pending
                  </Text>
                )}
              </View>
              <Text className="font-mono text-body-md text-on-surface">{formatAmount(item.shareAmount)}</Text>
            </TouchableOpacity>

            {(item.status === 'unpaid' || item.status === 'partial') && !item.isSelf && (
              <View className="flex-row gap-sm mt-sm">
                <TouchableOpacity
                  className="flex-1 py-[8px] items-center bg-surface rounded-lg border border-outline-variant"
                  onPress={() => {
                    const remaining = item.shareAmount - item.paidAmount;
                    if (liveUpiId) {
                      setQrTarget({ name: item.name, remaining });
                      return;
                    }
                    const upiLine = liveUpiId
                      ? ` Pay here: ${buildUpiLink({ upiId: liveUpiId, payeeName: split.title, amount: remaining, note: split.title })}`
                      : '';
                    const descLine = split.description ? ` (${split.description})` : '';
                    const message = `Hi ${item.name}, for ${split.title}${descLine} you owe ${formatAmount(remaining)}.${upiLine}`;
                    // The system share sheet, not a whatsapp:// deep link — lets the user pick
                    // WhatsApp, Telegram, SMS, or anything else installed, and needs no Android
                    // package-visibility <queries> declaration (unlike a scheme-specific link).
                    Share.share({ message }).catch(() => {});
                  }}
                >
                  <Text className="font-inter-medium text-body-sm text-on-surface">Share</Text>
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
                  className={`flex-1 py-[8px] items-center bg-primary rounded-lg ${rowActionInFlight ? 'opacity-40' : ''}`}
                  disabled={rowActionInFlight}
                  onPress={async () => {
                    if (item.matchedTxId == null || rowActionInFlight) return;
                    setRowActionInFlight(true);
                    try {
                      const remaining = item.shareAmount - item.paidAmount;
                      const matchedTx = allTxs.find((t) => t.id === item.matchedTxId);
                      const amount = Math.min(matchedTx?.amount ?? remaining, remaining);
                      await confirmSplitParticipantPayment(item.id, item.matchedTxId, amount);
                      if (split.sourceTxId != null) {
                        await linkSplitPaymentIfSafe(split.sourceTxId, item.matchedTxId);
                      }
                      load();
                    } finally {
                      setRowActionInFlight(false);
                    }
                  }}
                >
                  <Text className="font-inter-medium text-body-sm text-on-primary">Confirm paid</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className={`flex-1 py-[8px] items-center bg-surface rounded-lg border border-outline-variant ${rowActionInFlight ? 'opacity-40' : ''}`}
                  disabled={rowActionInFlight}
                  onPress={async () => {
                    if (rowActionInFlight) return;
                    setRowActionInFlight(true);
                    try {
                      await setSplitParticipantStatus(item.id, item.paidAmount > 0 ? 'partial' : 'unpaid', null);
                      load();
                    } finally {
                      setRowActionInFlight(false);
                    }
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
          {settleSheetParticipant && settleSheetParticipant.paidAmount > 0 && (
            <Text className="font-mono text-label-sm text-on-surface-variant mb-sm">
              {formatAmount(settleSheetParticipant.shareAmount - settleSheetParticipant.paidAmount)} still pending
            </Text>
          )}
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
                const remaining = settleSheetParticipant.shareAmount - settleSheetParticipant.paidAmount;
                const chosenTx = incomingCandidates.find((t) => t.id === selectedTxId);
                const amount = Math.min(chosenTx?.amount ?? remaining, remaining);
                await confirmSplitParticipantPayment(settleSheetParticipant.id, selectedTxId, amount);
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
                const remaining = settleSheetParticipant.shareAmount - settleSheetParticipant.paidAmount;
                const cashTxId = await addTx({
                  amount: remaining,
                  type: TransactionType.CREDIT,
                  merchant: split!.title,
                  bankName: 'Cash',
                  timestamp: Date.now(),
                  categoryId: null,
                  subcategoryId: null,
                  notes: `Split settlement: ${settleSheetParticipant.name} paid cash for ${split!.title}`,
                  tags: [SPLIT_CASH_TAG],
                  isManual: true,
                });
                await confirmSplitParticipantPayment(settleSheetParticipant.id, cashTxId, remaining);
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

      <BottomSheet visible={qrTarget != null && liveUpiId != null} onClose={() => setQrTarget(null)}>
        {qrTarget && liveUpiId && (
          <View className="px-container-margin pb-lg items-center">
            <Text className="font-inter-bold text-title-md text-on-surface mb-xs">
              {qrTarget.name} owes {formatAmount(qrTarget.remaining)}
            </Text>
            <Text className="font-inter text-body-sm text-on-surface-variant mb-md">Scan with any UPI app to pay {liveUpiId}</Text>
            <View className="bg-white p-md rounded-xl">
              <QRCode
                value={buildUpiLink({ upiId: liveUpiId, payeeName: split.title, amount: qrTarget.remaining, note: split.title })}
                size={200}
              />
            </View>
            <TouchableOpacity
              className="mt-md self-stretch py-md items-center bg-primary rounded-xl"
              onPress={() => {
                const link = buildUpiLink({ upiId: liveUpiId, payeeName: split.title, amount: qrTarget.remaining, note: split.title });
                const descLine = split.description ? ` (${split.description})` : '';
                const message = `Hi ${qrTarget.name}, for ${split.title}${descLine} you owe ${formatAmount(qrTarget.remaining)}. Pay here: ${link}`;
                Share.share({ message }).catch(() => {});
              }}
            >
              <Text className="font-inter-medium text-body-md text-on-primary">Share message</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>
    </View>
  );
}
