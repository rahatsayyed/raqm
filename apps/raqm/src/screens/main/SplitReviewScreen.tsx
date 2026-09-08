import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ToastAndroid } from 'react-native';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { MainStackScreenProps } from '../../navigation/types';
import { addSplitWithParticipants, getSetting } from '../../db/database';
import { formatAmount } from '../../utils/format';

// "Every app open" (days: null, no throttle) was removed — it could fire a real
// SMS on every single app launch with no kill switch. "Every 2 days" is now the
// fastest cadence.
const CADENCE_OPTIONS: { label: string; days: number | null }[] = [
  { label: 'Every 2 days', days: 2 },
  { label: 'Every 3 days', days: 3 },
  { label: 'Weekly', days: 7 },
];

export function SplitReviewScreen({ route, navigation }: MainStackScreenProps<'SplitReview'>) {
  const { title, totalAmount, sourceTxId, description, participants } = route.params;
  const [autoRemind, setAutoRemind] = useState(false);
  const [cadenceDays, setCadenceDays] = useState<number | null>(2);
  const [creatorUpiId, setCreatorUpiId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSetting('upi_id').then((id) => setCreatorUpiId(id ?? null));
  }, []);

  const confirmCreate = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const splitId = await addSplitWithParticipants(
        {
          title,
          totalAmount,
          sourceTxId,
          creatorUpiId,
          description,
          autoRemindEnabled: autoRemind,
          remindIntervalDays: autoRemind ? cadenceDays : null,
        },
        participants,
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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="font-inter text-body-md text-primary w-[70px]">‹ Back</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-title-lg text-on-surface">Review Split</Text>
        <View className="w-[60px]" />
      </View>

      <KeyboardAwareScrollView
        contentContainerClassName="px-container-margin pb-[48px]"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
      >
        <Text className="font-inter-bold text-title-md text-on-surface">{title}</Text>
        {description && <Text className="font-inter text-body-sm text-on-surface-variant mt-sm">{description}</Text>}
        <Text className="font-mono-medium text-numeric-lg text-on-surface mt-sm">{formatAmount(totalAmount)}</Text>

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Participants</Text>
        {participants.map((p, i) => (
          <View key={i} className="flex-row items-center justify-between py-[6px]">
            <Text className="font-inter text-body-sm text-on-surface">{p.isSelf ? 'You' : p.name}</Text>
            <Text className="font-mono text-body-sm text-on-surface-variant">{formatAmount(p.shareAmount)}</Text>
          </View>
        ))}

        <View className="flex-row items-center justify-between mt-lg">
          <Text className="font-inter text-body-md text-on-surface">Auto-remind participants</Text>
          <TouchableOpacity
            className={`px-md py-[6px] rounded-lg ${autoRemind ? 'bg-primary' : 'bg-surface-container-lowest border border-outline-variant'}`}
            onPress={() => setAutoRemind((v) => !v)}
          >
            <Text className={`font-inter-medium text-body-sm ${autoRemind ? 'text-on-primary' : 'text-on-surface'}`}>
              {autoRemind ? 'On' : 'Off'}
            </Text>
          </TouchableOpacity>
        </View>

        {autoRemind && (
          <View className="mt-md">
            <Text className="font-mono text-label-sm text-on-surface-variant mb-sm">Remind every</Text>
            <View className="flex-row flex-wrap gap-sm">
              {CADENCE_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.label}
                  className={`px-md py-[8px] rounded-lg ${cadenceDays === opt.days ? 'bg-primary' : 'bg-surface-container-lowest border border-outline-variant'}`}
                  onPress={() => setCadenceDays(opt.days)}
                >
                  <Text className={`font-inter-medium text-body-sm ${cadenceDays === opt.days ? 'text-on-primary' : 'text-on-surface'}`}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <TouchableOpacity
          className={`mt-xl py-md items-center bg-primary rounded-xl ${saving ? 'opacity-40' : ''}`}
          onPress={confirmCreate}
          disabled={saving}
        >
          <Text className="font-inter-medium text-body-md text-on-primary">Confirm & Create</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}
