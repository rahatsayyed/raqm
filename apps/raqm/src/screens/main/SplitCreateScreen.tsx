import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ToastAndroid } from 'react-native';
import { Colors, Spacing } from '../../theme';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { MainStackScreenProps } from '../../navigation/types';
import { pickContact } from '../../utils/contacts';
import { computeEqualShares } from '../../utils/splitShares';
import { getSplitCircles, getSplitCircleMembers, addSplitWithParticipants, getSetting } from '../../db/database';
import type { SplitCircle } from '../../db/database';
import { formatAmount } from '../../utils/format';

type Participant = {
  name: string;
  phoneNumber: string | null;
  shareAmount: number;
  shareText: string;
  // Which circle this row came from, if any — lets selecting a different circle
  // replace only that circle's contribution instead of piling on top of it.
  fromCircleId: number | null;
};

// Same person, regardless of source (circle / contacts / manual): match by phone
// number when both have one, else fall back to a case-insensitive name match.
function isSameParticipant(a: { name: string; phoneNumber: string | null }, b: { name: string; phoneNumber: string | null }): boolean {
  if (a.phoneNumber && b.phoneNumber) return a.phoneNumber === b.phoneNumber;
  return a.name.trim().toLowerCase() === b.name.trim().toLowerCase();
}

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
    setParticipants((prev) => prev.map((p, i) => ({ ...p, shareAmount: shares[i], shareText: String(shares[i]) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, participants.length, customShares]);

  const shareSum = participants.reduce((s, p) => s + p.shareAmount, 0);
  const sharesValid = !customShares || (validTotal && shareSum <= totalAmount + 0.001);
  const canSave = validTotal && participants.length > 0 && sharesValid && !saving;

  const addFromCircle = async (circle: SplitCircle) => {
    const members = await getSplitCircleMembers(circle.id);
    setParticipants((prev) => {
      // Only one circle can be "active" at a time — selecting a new one drops
      // whichever circle's members were added before (manual/contact entries stay).
      const withoutOldCircle = prev.filter((p) => p.fromCircleId === null);
      const deduped = members.filter((m) => !withoutOldCircle.some((p) => isSameParticipant(p, m)));
      return [
        ...withoutOldCircle,
        ...deduped.map((m) => ({ name: m.name, phoneNumber: m.phoneNumber, shareAmount: 0, shareText: '', fromCircleId: circle.id })),
      ];
    });
  };

  const addFromContacts = async () => {
    const picked = await pickContact();
    if (!picked) return;
    setParticipants((prev) => {
      if (prev.some((p) => isSameParticipant(p, picked))) {
        ToastAndroid.show(`${picked.name} is already in this split`, ToastAndroid.SHORT);
        return prev;
      }
      return [...prev, { name: picked.name, phoneNumber: picked.phoneNumber, shareAmount: 0, shareText: '', fromCircleId: null }];
    });
  };

  const [manualName, setManualName] = useState('');
  const addManual = () => {
    const name = manualName.trim();
    if (!name) return;
    setParticipants((prev) => {
      if (prev.some((p) => isSameParticipant(p, { name, phoneNumber: null }))) {
        ToastAndroid.show(`${name} is already in this split`, ToastAndroid.SHORT);
        return prev;
      }
      return [...prev, { name, phoneNumber: null, shareAmount: 0, shareText: '', fromCircleId: null }];
    });
    setManualName('');
  };

  const removeParticipant = (index: number) => {
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  // Holds the raw text the user typed (not re-derived from the parsed number) so a
  // trailing decimal point ("12.") isn't clobbered back to "12" on every keystroke.
  const setShare = (index: number, text: string) => {
    const shareAmount = parseFloat(text) || 0;
    setParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, shareAmount, shareText: text } : p)));
  };

  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Tabs');
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const splitId = await addSplitWithParticipants(
        { title: title.trim() || 'Split', totalAmount, sourceTxId, creatorUpiId },
        participants.map((p) => ({ name: p.name, phoneNumber: p.phoneNumber, shareAmount: p.shareAmount })),
      );
      ToastAndroid.show('Split created', ToastAndroid.SHORT);
      navigation.replace('SplitDetail', { splitId });
    } catch {
      ToastAndroid.show("Couldn't create split", ToastAndroid.SHORT);
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
                    value={p.shareText}
                    onChangeText={(v) => setShare(i, v)}
                  />
                ) : (
                  <Text className="font-mono text-body-sm text-on-surface-variant">{formatAmount(p.shareAmount)}</Text>
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
