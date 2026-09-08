import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ToastAndroid } from 'react-native';
import { Colors, Spacing } from '../../theme';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { MainStackScreenProps } from '../../navigation/types';
import { pickContact } from '../../utils/contacts';
import { computeEqualShares } from '../../utils/splitShares';
import { getSplitCircles, getSplitCircleMembers, addSplit, addSplitParticipant, getSetting } from '../../db/database';
import type { SplitCircle } from '../../db/database';

type Participant = { name: string; phoneNumber: string | null; shareAmount: number };

export function SplitCreateScreen({ route, navigation }: MainStackScreenProps<'SplitCreate'>) {
  const sourceTxId = route.params?.sourceTxId ?? null;
  const titleRef = useRef<TextInput>(null);

  const [title, setTitle] = useState(route.params?.prefillTitle ?? '');
  const [amount, setAmount] = useState(route.params?.prefillAmount ? String(route.params.prefillAmount) : '');
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [customShares, setCustomShares] = useState(false);
  const [circles, setCircles] = useState<SplitCircle[]>([]);
  const [creatorUpiId, setCreatorUpiId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus(), 80);
    getSplitCircles().then(setCircles);
    getSetting('upi_id').then((id) => setCreatorUpiId(id ?? null));
    return () => clearTimeout(t);
  }, []);

  const totalAmount = parseFloat(amount);
  const validTotal = !Number.isNaN(totalAmount) && totalAmount > 0;

  // Re-derive equal shares whenever the total or the participant count changes,
  // unless the user has switched to custom shares (their edits then own the array).
  useEffect(() => {
    if (customShares || !validTotal || participants.length === 0) return;
    const shares = computeEqualShares(totalAmount, participants.length);
    setParticipants((prev) => prev.map((p, i) => ({ ...p, shareAmount: shares[i] })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, participants.length, customShares]);

  const shareSum = participants.reduce((s, p) => s + p.shareAmount, 0);
  const sharesValid = !customShares || (validTotal && shareSum <= totalAmount + 0.001);
  const canSave = validTotal && participants.length > 0 && sharesValid && !saving;

  const addFromCircle = async (circle: SplitCircle) => {
    const members = await getSplitCircleMembers(circle.id);
    setParticipants((prev) => [
      ...prev,
      ...members.map((m) => ({ name: m.name, phoneNumber: m.phoneNumber, shareAmount: 0 })),
    ]);
  };

  const addFromContacts = async () => {
    const picked = await pickContact();
    if (!picked) return;
    setParticipants((prev) => [...prev, { name: picked.name, phoneNumber: picked.phoneNumber, shareAmount: 0 }]);
  };

  const [manualName, setManualName] = useState('');
  const addManual = () => {
    const name = manualName.trim();
    if (!name) return;
    setParticipants((prev) => [...prev, { name, phoneNumber: null, shareAmount: 0 }]);
    setManualName('');
  };

  const removeParticipant = (index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const setShare = (index: number, value: string) => {
    const shareAmount = parseFloat(value) || 0;
    setParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, shareAmount } : p)));
  };

  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Tabs');
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const splitId = await addSplit({
        title: title.trim() || 'Split',
        totalAmount,
        sourceTxId,
        creatorUpiId,
      });
      for (const p of participants) {
        await addSplitParticipant(splitId, {
          name: p.name,
          phoneNumber: p.phoneNumber,
          shareAmount: p.shareAmount,
        });
      }
      ToastAndroid.show('Split created', ToastAndroid.SHORT);
      navigation.replace('SplitDetail', { splitId });
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-container-margin pt-sm pb-md">
        <TouchableOpacity onPress={close}>
          <Text className="font-inter text-body-md text-primary w-[70px]">✕ Close</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-title-lg text-on-surface">New Split</Text>
        <View className="w-[60px]" />
      </View>

      <KeyboardAwareScrollView
        contentContainerClassName="px-container-margin pb-[48px]"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={Spacing.lg}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Title</Text>
        <TextInput
          ref={titleRef}
          className="font-inter text-body-md text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-[12px]"
          placeholder="e.g. Dinner at Truffles"
          placeholderTextColor={Colors.outline}
          value={title}
          onChangeText={setTitle}
        />

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Total amount</Text>
        <TextInput
          className="font-mono-medium text-numeric-lg text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-md"
          placeholder="0"
          placeholderTextColor={Colors.outline}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Participants</Text>
        {circles.map((c) => (
          <TouchableOpacity
            key={c.id}
            className="py-[8px]"
            onPress={() => addFromCircle(c)}
          >
            <Text className="font-inter text-body-sm text-primary">+ Use "{c.name}"</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity className="py-[8px]" onPress={addFromContacts}>
          <Text className="font-inter text-body-sm text-primary">+ Add from contacts</Text>
        </TouchableOpacity>
        <View className="flex-row items-center mt-sm">
          <TextInput
            className="flex-1 font-inter text-body-sm text-on-surface bg-surface-container-lowest rounded-lg border border-outline-variant px-sm py-[8px]"
            placeholder="Or type a name…"
            placeholderTextColor={Colors.outline}
            value={manualName}
            onChangeText={setManualName}
          />
          <TouchableOpacity className="ml-sm px-md py-[8px] bg-primary rounded-lg" onPress={addManual}>
            <Text className="font-inter-medium text-body-sm text-on-primary">Add</Text>
          </TouchableOpacity>
        </View>

        {participants.length > 0 && (
          <View className="mt-md">
            <TouchableOpacity onPress={() => setCustomShares((v) => !v)}>
              <Text className="font-inter text-body-sm text-primary mb-sm">
                {customShares ? 'Switch to equal split' : 'Switch to custom amounts'}
              </Text>
            </TouchableOpacity>
            {participants.map((p, i) => (
              <View key={`${p.name}-${i}`} className="flex-row items-center justify-between py-[6px]">
                <Text className="font-inter text-body-sm text-on-surface flex-1">{p.name}</Text>
                {customShares ? (
                  <TextInput
                    className="w-[90px] font-mono text-body-sm text-on-surface bg-surface rounded-lg border border-outline-variant px-sm py-[6px] text-right"
                    keyboardType="decimal-pad"
                    value={p.shareAmount ? String(p.shareAmount) : ''}
                    onChangeText={(v) => setShare(i, v)}
                  />
                ) : (
                  <Text className="font-mono text-body-sm text-on-surface-variant">₹{p.shareAmount.toFixed(2)}</Text>
                )}
                <TouchableOpacity className="ml-sm" onPress={() => removeParticipant(i)}>
                  <Text className="font-inter text-body-sm text-error">✕</Text>
                </TouchableOpacity>
              </View>
            ))}
            {customShares && !sharesValid && (
              <Text className="font-inter text-body-sm text-error mt-sm">
                Shares can't add up to more than the total.
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          className={`mt-xl py-md items-center bg-primary rounded-xl ${!canSave ? 'opacity-40' : ''}`}
          onPress={handleSave}
          disabled={!canSave}
        >
          <Text className="font-inter-medium text-body-md text-on-primary">Save split</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}
