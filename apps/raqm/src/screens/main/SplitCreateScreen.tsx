import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ToastAndroid } from 'react-native';
import { Colors, Spacing } from '../../theme';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { MainStackScreenProps } from '../../navigation/types';
import { pickContact } from '../../utils/contacts';
import { computeEqualSharesInclusive, computePercentageShares, computeShareWeightAmounts, redistributeUnpinned } from '../../utils/splitShares';
import { getSplitCircles, getSplitCircleMembers } from '../../db/database';
import type { SplitCircle, SplitCircleMember } from '../../db/database';
import { formatAmount } from '../../utils/format';

type Participant = {
  name: string;
  phoneNumber: string | null;
  shareAmount: number;
  shareText: string;
  // Which circle this row came from, if any — lets selecting a different circle
  // replace only that circle's contribution instead of piling on top of it.
  fromCircleId: number | null;
  isSelf: boolean;
};

type SplitMode = 'equal' | 'exact' | 'percentage' | 'shares';

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
  const [description, setDescription] = useState('');
  const [participants, setParticipants] = useState<Participant[]>([
    { name: 'You', phoneNumber: null, shareAmount: 0, shareText: '', fromCircleId: null, isSelf: true },
  ]);
  const [mode, setMode] = useState<SplitMode>('equal');
  const [pinned, setPinned] = useState<Map<number, number>>(new Map());
  const [circles, setCircles] = useState<SplitCircle[]>([]);

  useEffect(() => {
    const t = setTimeout(() => titleRef.current?.focus(), 80);
    getSplitCircles().then(setCircles);
    return () => clearTimeout(t);
  }, []);

  // Return trip from SplitCirclesScreen's "Use this circle" action (only
  // reachable via the "+ Create new circle" button below). Consumed once,
  // then cleared via setParams so re-focusing this screen doesn't re-fire it.
  useEffect(() => {
    const pickedCircleId = route.params?.pickedCircleId;
    if (pickedCircleId == null) return;
    getSplitCircleMembers(pickedCircleId).then((members) => applyCircleMembers(pickedCircleId, members));
    navigation.setParams({ pickedCircleId: undefined });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.params?.pickedCircleId]);

  const totalAmount = parseFloat(amount);
  const validTotal = !Number.isNaN(totalAmount) && totalAmount > 0;

  // Shares mode has no `pinned` map to react to — typing a weight only
  // touches shareText, so the effect needs its own signal to know a weight
  // changed. Joining every row's shareText gives it one.
  const sharesKey = mode === 'shares' ? participants.map((p) => p.shareText).join(',') : '';

  // Re-derive shares whenever the total, participant count, mode, pins, or
  // (Shares mode only) a typed weight changes.
  useEffect(() => {
    if (!validTotal || participants.length === 0) return;
    if (mode === 'equal') {
      const shares = computeEqualSharesInclusive(totalAmount, participants.length);
      setParticipants((prev) => prev.map((p, i) => ({ ...p, shareAmount: shares[i], shareText: String(shares[i]) })));
    } else if (mode === 'shares') {
      // Shares mode never pins — every row's weight lives in shareText (typed
      // as a plain number, default weight 1 for a not-yet-typed row), and
      // amounts are always fully re-derived from the ratio of all weights.
      const weights = participants.map((p) => parseFloat(p.shareText) || 1);
      const amounts = computeShareWeightAmounts(totalAmount, weights);
      setParticipants((prev) => prev.map((p, i) => ({ ...p, shareAmount: amounts[i] })));
    } else if (mode === 'exact') {
      const amounts = redistributeUnpinned(totalAmount, pinned, participants.length);
      setParticipants((prev) => prev.map((p, i) => ({ ...p, shareAmount: amounts[i] })));
    } else if (mode === 'percentage') {
      const pctAmounts = redistributeUnpinned(100, pinned, participants.length);
      const amounts = computePercentageShares(totalAmount, pctAmounts);
      setParticipants((prev) => prev.map((p, i) => ({ ...p, shareAmount: amounts[i] })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalAmount, participants.length, mode, pinned, sharesKey]);

  const pinnedOverAllocated =
    (mode === 'exact' || mode === 'percentage') &&
    Array.from(pinned.values()).reduce((s, v) => s + v, 0) > (mode === 'percentage' ? 100 : totalAmount) + 0.001;
  const sharesValid = mode === 'equal' || mode === 'shares' || !pinnedOverAllocated;
  const canSave = validTotal && participants.length > 1 && sharesValid;

  // Shared by "+ Use <circle>" and the SplitCircles return trip. Dropping the
  // old circle's rows and appending new ones reshuffles indices, which would
  // misattribute or ghost-count any pinned amount — clear pins entirely
  // rather than try to remap them. Only one circle can be "active" at a
  // time — selecting a new one drops whichever circle's members were added
  // before (manual/contact entries and the "You" row, both fromCircleId:
  // null, stay).
  const applyCircleMembers = (circleId: number, members: SplitCircleMember[]) => {
    setPinned(new Map());
    setParticipants((prev) => {
      const withoutOldCircle = prev.filter((p) => p.fromCircleId === null);
      const deduped = members.filter((m) => !withoutOldCircle.some((p) => isSameParticipant(p, m)));
      return [
        ...withoutOldCircle,
        ...deduped.map((m) => ({ name: m.name, phoneNumber: m.phoneNumber, shareAmount: 0, shareText: '', fromCircleId: circleId, isSelf: false })),
      ];
    });
  };

  const addFromCircle = async (circle: SplitCircle) => {
    const members = await getSplitCircleMembers(circle.id);
    applyCircleMembers(circle.id, members);
  };

  const addFromContacts = async () => {
    const picked = await pickContact();
    if (!picked) return;
    setParticipants((prev) => {
      if (prev.some((p) => isSameParticipant(p, picked))) {
        ToastAndroid.show(`${picked.name} is already in this split`, ToastAndroid.SHORT);
        return prev;
      }
      return [...prev, { name: picked.name, phoneNumber: picked.phoneNumber, shareAmount: 0, shareText: '', fromCircleId: null, isSelf: false }];
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
      return [...prev, { name, phoneNumber: null, shareAmount: 0, shareText: '', fromCircleId: null, isSelf: false }];
    });
    setManualName('');
  };

  const removeParticipant = (index: number) => {
    // Removing shifts every later index down, which would silently
    // misattribute or ghost-count any pinned amount (Exact/Percentage) — clear
    // pins entirely rather than try to remap them.
    setPinned(new Map());
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  // All rows start blank in Exact/Percentage mode — typing into a row pins it
  // at that value and redistributes the remainder across every other
  // still-unpinned row. Percentage values are capped at 2 decimal places.
  const setShare = (index: number, text: string) => {
    if (mode === 'shares') {
      setParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, shareText: text } : p)));
      return;
    }
    const raw = parseFloat(text) || 0;
    const value = mode === 'percentage' ? Math.round(raw * 100) / 100 : raw;
    setPinned((prev) => {
      const next = new Map(prev);
      next.set(index, value);
      return next;
    });
    setParticipants((prev) => prev.map((p, i) => (i === index ? { ...p, shareText: text } : p)));
  };

  const close = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Tabs');
  };

  const goToReview = () => {
    if (!canSave) return;
    navigation.navigate('SplitReview', {
      title: title.trim() || 'Split',
      totalAmount,
      sourceTxId,
      description: description.trim() || null,
      participants: participants.map((p) => ({
        name: p.name,
        phoneNumber: p.phoneNumber,
        shareAmount: p.shareAmount,
        isSelf: p.isSelf,
      })),
    });
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

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Description (optional)</Text>
        <TextInput
          className="font-inter text-body-md text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-[12px]"
          placeholder="What's this for?"
          placeholderTextColor={Colors.outline}
          value={description}
          onChangeText={setDescription}
          multiline
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
        <TouchableOpacity
          className="py-[8px]"
          onPress={() => navigation.navigate('SplitCircles', { returnTo: 'SplitCreate' })}
        >
          <Text className="font-inter text-body-sm text-primary">+ Create new circle</Text>
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
            <View className="flex-row bg-surface-container-lowest rounded-xl border border-outline-variant mt-md p-[4px]">
              {(['equal', 'exact', 'percentage', 'shares'] as SplitMode[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  className={`flex-1 py-[8px] items-center rounded-lg ${mode === m ? 'bg-primary' : ''}`}
                  onPress={() => {
                    setMode(m);
                    setPinned(new Map());
                  }}
                >
                  <Text className={`font-inter-medium text-body-sm ${mode === m ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                    {m === 'equal' ? 'Equal' : m === 'exact' ? 'Exact' : m === 'percentage' ? 'Percentage' : 'Shares'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {participants.map((p, i) => (
              <View key={p.isSelf ? 'self' : `${p.name}-${i}`} className="flex-row items-center justify-between py-[6px]">
                <Text className="font-inter text-body-sm text-on-surface flex-1">{p.isSelf ? 'You' : p.name}</Text>
                {mode === 'equal' ? (
                  <Text className="font-mono text-body-sm text-on-surface-variant">{formatAmount(p.shareAmount)}</Text>
                ) : mode === 'shares' ? (
                  <TextInput
                    className="w-[70px] font-mono text-body-sm text-on-surface bg-surface rounded-lg border border-outline-variant px-sm py-[6px] text-right"
                    keyboardType="decimal-pad"
                    placeholder="1"
                    placeholderTextColor={Colors.outline}
                    value={p.shareText}
                    onChangeText={(v) => setShare(i, v)}
                  />
                ) : (
                  <TextInput
                    className="w-[90px] font-mono text-body-sm text-on-surface bg-surface rounded-lg border border-outline-variant px-sm py-[6px] text-right"
                    keyboardType="decimal-pad"
                    placeholder={mode === 'percentage' ? '0%' : '0'}
                    placeholderTextColor={Colors.outline}
                    value={p.shareText}
                    onChangeText={(v) => setShare(i, v)}
                  />
                )}
                {mode !== 'shares' && <Text className="font-mono text-body-sm text-on-surface-variant ml-sm">{formatAmount(p.shareAmount)}</Text>}
                {!p.isSelf && (
                  <TouchableOpacity className="ml-sm" onPress={() => removeParticipant(i)}>
                    <Text className="font-inter text-body-sm text-error">✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {!sharesValid && (
              <Text className="font-inter text-body-sm text-error mt-sm">
                {mode === 'percentage' ? "Percentages can't add up to more than 100%." : "Shares can't add up to more than the total."}
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity
          className={`mt-xl py-md items-center bg-primary rounded-xl ${!canSave ? 'opacity-40' : ''}`}
          onPress={goToReview}
          disabled={!canSave}
        >
          <Text className="font-inter-medium text-body-md text-on-primary">Save split</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}
