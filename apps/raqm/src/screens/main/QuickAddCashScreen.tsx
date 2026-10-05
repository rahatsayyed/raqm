import React, { useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, View, Text, TextInput, TouchableOpacity, ToastAndroid } from 'react-native';
import { Colors, Spacing } from '../../theme';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { cn } from '../../utils/cn';
import { getCategories, getCategoryRuleForMerchant, getWordMatchCategoryForMerchant } from '../../db/database';
import { parseVoiceTx } from '../../services/voiceParse';
import { requestRecordAudioPermission } from '../../utils/permissions';
import {
  addVoicePartialListener,
  cancelVoiceCapture,
  isVoiceAvailable,
  startVoiceCapture,
} from '../../../modules/sms-reader/src/SmsReaderModule';
import type { VoiceErrorCode } from '../../../modules/sms-reader/src/SmsReader.types';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { confirmNotDuplicate } from '../../utils/confirmDuplicate';

/**
 * The single destination for every "quick add" entry point — the launcher shortcut,
 * the Quick Settings tile, and the Add Transaction / Recent Transactions widgets (see
 * src/navigation/deepLinks.ts). Deliberately a stripped-down AddTransactionScreen: no
 * date picker (always "now"), no type toggle (always EXPENSE), no bank field (always
 * "Cash"), no tags. The saved row is shaped exactly like AddTransactionScreen's manual
 * entry, so countsTowardTotals/budgets/dashboard totals treat it identically — no new
 * NewTxInput fields and no new aggregation logic (see the design spec).
 */
export function QuickAddCashScreen({ route, navigation }: MainStackScreenProps<'QuickAddCash'>) {
  const addTx = useTxStore((s) => s.add);
  const amountRef = useRef<TextInput>(null);

  const [amount, setAmount] = useState('');
  const [merchant, setMerchant] = useState('');
  const [notes, setNotes] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>(undefined);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const voiceBusy = useRef(false);
  const [voiceSupported] = useState(() => isVoiceAvailable());
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState('');

  const parsedAmount = parseFloat(amount);
  const canSave = !Number.isNaN(parsedAmount) && parsedAmount > 0;

  // autoFocus fires before KeyboardAwareScrollView has measured the field (see CLAUDE.md's
  // note on the add-tag input in TransactionDetailScreen) — use a delayed ref focus instead.
  useEffect(() => {
    const t = setTimeout(() => amountRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const pickedCategoryId = route.params?.pickedCategoryId;
    const pickedSubcategoryId = route.params?.pickedSubcategoryId;
    if (pickedCategoryId == null) return;

    applyCategory(pickedCategoryId, pickedSubcategoryId ?? null);
    navigation.setParams({ pickedCategoryId: undefined, pickedSubcategoryId: undefined });
  }, [route.params?.pickedCategoryId, route.params?.pickedSubcategoryId]);

  const applyCategory = async (id: number, sub: number | null) => {
    setCategoryId(id);
    setSubcategoryId(sub ?? undefined);
    const categories = await getCategories();
    const cat = categories.find((c) => c.id === id);
    setCategoryLabel(cat ? `${cat.emoji} ${cat.name}` : null);
  };

  const applyTranscript = async (transcript: string) => {
    const parsed = parseVoiceTx(transcript);
    if (parsed.amount == null) {
      setNotes((n) => n || transcript);
      ToastAndroid.show("Didn't catch an amount", ToastAndroid.SHORT);
      return;
    }
    setAmount(String(parsed.amount));
    if (parsed.merchant) setMerchant(parsed.merchant);
    const hit =
      (parsed.merchant ? await getCategoryRuleForMerchant(parsed.merchant) : null) ??
      (await getWordMatchCategoryForMerchant(parsed.categoryText));
    if (hit) await applyCategory(hit.categoryId, hit.subcategoryId);
  };

  const handleVoiceError = (e: unknown) => {
    const code = ((e as { code?: string })?.code ?? 'ERROR') as VoiceErrorCode;
    if (code === 'CANCELLED') return;
    if (code === 'NO_MATCH') ToastAndroid.show("Didn't catch that, try again", ToastAndroid.SHORT);
    else if (code === 'OFFLINE_PACK_MISSING')
      Alert.alert('Offline speech pack needed', 'Download your language for offline speech in Android settings, then try again.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open settings', onPress: () => Linking.sendIntent('android.settings.VOICE_INPUT_SETTINGS') },
      ]);
    else ToastAndroid.show('Voice input failed', ToastAndroid.SHORT);
  };

  const startVoice = async () => {
    if (voiceBusy.current) return;
    voiceBusy.current = true;
    setListening(true);
    setPartial('');
    const sub = addVoicePartialListener((e) => setPartial(e.text));
    try {
      if (!(await requestRecordAudioPermission())) {
        ToastAndroid.show('Microphone permission needed', ToastAndroid.SHORT);
        return;
      }
      await applyTranscript(await startVoiceCapture());
    } catch (e) {
      handleVoiceError(e);
    } finally {
      sub.remove();
      voiceBusy.current = false;
      setListening(false);
      setPartial('');
    }
  };

  useEffect(() => {
    if (!route.params?.startVoice || !voiceSupported) return;
    const t = setTimeout(() => {
      startVoice();
      navigation.setParams({ startVoice: undefined });
    }, 400);
    return () => clearTimeout(t);
  }, [route.params?.startVoice]);

  useEffect(() => () => {
    cancelVoiceCapture().catch(() => {});
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s !== 'active') cancelVoiceCapture().catch(() => {});
    });
    return () => sub.remove();
  }, []);

  const close = () => {
    // Cold start via shortcut/tile/widget leaves nothing to pop back to — land on the tabs
    // (Dashboard is the first tab) rather than dead-ending on an empty stack.
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('Tabs');
  };

  const handleSave = async () => {
    // In-flight guard: double-tap double-submits have shipped twice (see CLAUDE.md).
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const now = Date.now();
      if (!(await confirmNotDuplicate(parsedAmount, TransactionType.EXPENSE, now))) {
        close();
        return;
      }
      await addTx({
        amount: parsedAmount,
        type: TransactionType.EXPENSE,
        merchant: merchant.trim() || null,
        bankName: 'Cash',
        timestamp: now,
        categoryId,
        subcategoryId: subcategoryId ?? null,
        notes: notes.trim() || null,
        tags: [],
        isManual: true,
      });
      ToastAndroid.show('Cash spend saved', ToastAndroid.SHORT);
      close();
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
        <Text className="font-inter-bold text-title-lg text-on-surface">Add Cash Spend</Text>
        <View className="w-[60px]" />
      </View>

      <KeyboardAwareScrollView
        contentContainerClassName="px-container-margin pb-[48px]"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={Spacing.lg}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row items-center justify-between mt-lg mb-sm">
          <Text className="font-mono text-label-sm text-on-surface-variant">Amount</Text>
          {voiceSupported ? (
            <TouchableOpacity
              onPress={startVoice}
              disabled={listening}
              accessibilityLabel="Speak a transaction"
              className={cn(
                'flex-row items-center rounded-full border border-outline-variant px-md py-[6px]',
                listening && 'opacity-60',
              )}
            >
              <Text className="font-inter-medium text-body-md text-primary">{listening ? 'Listening…' : '🎤 Speak'}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {listening && partial ? (
          <Text className="font-inter text-body-md text-on-surface-variant mb-sm">{partial}</Text>
        ) : null}
        <TextInput
          ref={amountRef}
          className="font-mono-medium text-numeric-lg text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-md"
          placeholder="0"
          placeholderTextColor={Colors.outline}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Merchant</Text>
        <TextInput
          className="font-inter text-body-md text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-[12px]"
          placeholder="e.g. Chai stall"
          placeholderTextColor={Colors.outline}
          value={merchant}
          onChangeText={setMerchant}
        />

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Category</Text>
        <TouchableOpacity
          className="flex-row items-center justify-between bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-[12px]"
          onPress={() => navigation.navigate('CategoryPicker', { returnTo: 'QuickAddCash', direction: 'expense' })}
        >
          <Text className="font-inter text-body-md text-on-surface">{categoryLabel ?? 'Choose a category'}</Text>
          <Text className="font-inter text-body-md text-on-surface-variant">›</Text>
        </TouchableOpacity>

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Note</Text>
        <TextInput
          className="font-inter text-body-md text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-[12px] min-h-[72px]"
          style={{ textAlignVertical: 'top' }}
          placeholder="Optional note…"
          placeholderTextColor={Colors.outline}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <TouchableOpacity
          className={`mt-xl py-md items-center bg-primary rounded-xl ${!canSave || saving ? 'opacity-40' : ''}`}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text className="font-inter-medium text-body-md text-on-primary">Save cash spend</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}
