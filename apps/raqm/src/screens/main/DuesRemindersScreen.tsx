import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Spacing } from '../../theme';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getReminders, addReminder, deleteReminder, getSplits, getSplitParticipants, type Reminder, type Split, type SplitParticipant } from '../../db/database';
import { detectRecurringDues, mergeDues, splitDues, type DueItem } from '../../services/dues';
import { formatAmount } from '../../utils/format';
import { TrashIcon, PeopleIcon } from '../../components/TabIcon';

const DAY_MS = 24 * 60 * 60 * 1000;
const FUTURE_WINDOW_MS = 90 * DAY_MS;

function dueLabel(ts: number): string {
  const rawDays = Math.round((ts - Date.now()) / DAY_MS);
  if (rawDays < 0) return rawDays === -1 ? 'Overdue 1 day' : `Overdue ${Math.abs(rawDays)} days`;
  if (rawDays === 0) return 'Today';
  if (rawDays === 1) return 'Tomorrow';
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DuesRemindersScreen({ navigation }: MainStackScreenProps<'DuesReminders'>) {
  const txs = useTxStore((s) => s.txs);
  const currency = txs[0]?.currency ?? '₹';
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [splits, setSplits] = useState<Split[]>([]);
  const [participantsBySplit, setParticipantsBySplit] = useState<Map<number, SplitParticipant[]>>(new Map());
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadReminders = useCallback(() => {
    getReminders().then(setReminders);
  }, []);

  const loadSplits = useCallback(async () => {
    const openSplits = await getSplits();
    setSplits(openSplits);
    const entries = await Promise.all(openSplits.map(async (s) => [s.id, await getSplitParticipants(s.id)] as const));
    setParticipantsBySplit(new Map(entries));
  }, []);

  useEffect(() => {
    loadReminders();
    loadSplits();
  }, [loadReminders, loadSplits]);

  useFocusEffect(
    useCallback(() => {
      loadReminders();
      loadSplits();
    }, [loadReminders, loadSplits]),
  );

  const detected = useMemo(() => detectRecurringDues(txs, FUTURE_WINDOW_MS), [txs]);
  const splitItems = useMemo(() => splitDues(splits, participantsBySplit), [splits, participantsBySplit]);
  const dues: DueItem[] = useMemo(() => mergeDues(detected, reminders, splitItems), [detected, reminders, splitItems]);

  const handleAdd = async () => {
    const parsedAmount = Number(amount);
    if (!name.trim() || !Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Missing details', 'Enter a name and a valid amount.');
      return;
    }
    if (saving) return;
    setSaving(true);
    try {
      await addReminder({ name: name.trim(), amount: parsedAmount, dueDate: dueDate.getTime(), currency });
      setName('');
      setAmount('');
      setDueDate(new Date());
      setShowForm(false);
      loadReminders();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert('Remove reminder?', 'This reminder will be deleted.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => { await deleteReminder(id); loadReminders(); } },
    ]);
  };

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerStyle={{ padding: Spacing.lg }}
      enableOnAndroid
      extraScrollHeight={Spacing.lg}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <TouchableOpacity onPress={() => navigation.goBack()} className="mb-md">
        <Text className="font-inter text-body-md text-primary">← Back</Text>
      </TouchableOpacity>

      <Text className="font-inter-bold text-headline-sm text-on-surface mb-lg">Dues & Reminders</Text>

      <View className="gap-sm mb-lg">
        {dues.length === 0 && (
          <Text className="font-inter text-body-md text-on-surface-variant text-center p-lg">
            No dues detected yet — add one manually below.
          </Text>
        )}
        {dues.map((d) => (
          <TouchableOpacity
            key={d.key}
            activeOpacity={d.source === 'split' ? 0.7 : 1}
            disabled={d.source !== 'split'}
            onPress={() => {
              if (d.source === 'split' && d.splitId != null) {
                navigation.navigate('SplitDetail', { splitId: d.splitId });
              }
            }}
            className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md flex-row items-center gap-sm"
          >
            <View className="flex-1 gap-[4px]">
              <View className="flex-row items-center gap-[4px]">
                {d.source === 'split' && <PeopleIcon color={Colors.onSurfaceVariant} size={14} />}
                <Text className="font-inter-medium text-body-sm text-on-surface" numberOfLines={1}>{d.name}</Text>
              </View>
              <Text className="font-mono text-label-sm text-on-surface-variant">{dueLabel(d.dueTs)}</Text>
            </View>
            <Text className="font-mono-medium text-body-sm text-on-surface">{formatAmount(d.amount, d.currency ?? currency)}</Text>
            {d.source === 'manual' && d.reminderId != null && (
              <TouchableOpacity hitSlop={8} onPress={() => handleDelete(d.reminderId!)}>
                <TrashIcon color={Colors.onSurfaceVariant} size={18} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {showForm ? (
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md gap-sm">
          <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-sm">Add reminder</Text>
          <View className="gap-[4px]">
            <Text className="font-mono text-label-sm text-on-surface-variant">Name</Text>
            <TextInput
              className="font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[8px]"
              value={name}
              onChangeText={setName}
              placeholder="e.g. House Rent"
              placeholderTextColor={Colors.onSurfaceVariant}
            />
          </View>
          <View className="gap-[4px]">
            <Text className="font-mono text-label-sm text-on-surface-variant">Amount</Text>
            <TextInput
              className="font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-sm py-[8px]"
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={Colors.onSurfaceVariant}
              keyboardType="numeric"
            />
          </View>
          <View className="gap-[4px]">
            <Text className="font-mono text-label-sm text-on-surface-variant">Due date</Text>
            <TouchableOpacity
              className="bg-surface-variant rounded-md px-sm py-[10px]"
              onPress={() => setShowDatePicker(true)}
            >
              <Text className="font-inter text-body-md text-on-surface">
                {dueDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </Text>
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker
              value={dueDate}
              mode="date"
              display="default"
              onChange={(_e, selected) => {
                setShowDatePicker(false);
                if (selected) setDueDate(selected);
              }}
            />
          )}
          <View className="flex-row gap-sm mt-sm">
            <TouchableOpacity
              className="flex-1 bg-surface-variant rounded-lg py-[10px] items-center"
              onPress={() => setShowForm(false)}
            >
              <Text className="font-inter-medium text-body-md text-on-surface">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 bg-primary rounded-lg py-[10px] items-center"
              disabled={saving}
              onPress={handleAdd}
            >
              <Text className="font-inter-medium text-body-md text-on-primary">{saving ? 'Saving…' : 'Save reminder'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          className="bg-surface-container-lowest border border-outline-variant rounded-lg py-[12px] items-center"
          onPress={() => setShowForm(true)}
        >
          <Text className="font-inter-medium text-body-md text-primary">+ Add reminder</Text>
        </TouchableOpacity>
      )}
    </KeyboardAwareScrollView>
  );
}
