import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingScreenProps } from '../../navigation/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { StepDots } from '../../components/onboarding/StepDots';
import { RqButton } from '../../components/onboarding/RqButton';
import { GlassCard } from '../../components/onboarding/GlassCard';
import { Icon } from '../../components/Icon';
import { useOnbColors } from '../../theme/onboardingColors';
import { Spacing } from '../../theme';
import { addAccount as addAccountToDb } from '../../db/database';

type DraftAccount = { name: string; startingBalance: string };

// Onboarding-v3 migration: this screen was still on the pre-redesign
// dark-only theme/StepCounter after every other onboarding screen moved to
// useOnbColors/StepDots/RqButton/GlassCard — the one iOS-reachable screen
// (from ImportStatement's "Enter accounts manually instead" link) that
// broke onboarding's light/dark exception and showed a wrong "STEP 3 OF 8"
// counter. Same step slot as ImportStatement (3 of 6): it's the manual
// alternative to PDF import, not a fourth flow stage.
export function ManualAccountSetupScreen({ navigation }: OnboardingScreenProps<'ManualAccountSetup'>) {
  const insets = useSafeAreaInsets();
  const { scheme, colors: c } = useOnbColors();
  const [accounts, setAccounts] = useState<DraftAccount[]>([{ name: '', startingBalance: '' }]);
  const [busy, setBusy] = useState(false);

  const updateAccount = (index: number, patch: Partial<DraftAccount>) => {
    setAccounts((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };

  const addAccount = () => setAccounts((prev) => [...prev, { name: '', startingBalance: '' }]);

  const removeAccount = (index: number) => setAccounts((prev) => prev.filter((_, i) => i !== index));

  const canContinue = accounts.every((a) => a.name.trim().length > 0 && a.startingBalance.trim().length > 0);

  // Accounts are created via the real addAccount() DB API, sequentially
  // (this codebase's documented anti-pattern is Promise.all over
  // sequential DB writes), and the real totals are threaded to
  // SetupCompleteScreen as nav params.
  const handleContinue = async () => {
    if (!canContinue || busy) return;
    setBusy(true);
    try {
      let totalBalance = 0;
      for (const account of accounts) {
        const balance = Number(account.startingBalance) || 0;
        await addAccountToDb({
          bankName: account.name.trim(),
          isCard: false,
          balance,
        });
        totalBalance += balance;
      }
      navigation.navigate('SetupComplete', {
        accountCount: accounts.length,
        totalBalance,
        currency: 'INR',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={Spacing.lg}
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-onb-bg-base dark:bg-onb-bg-base-dark px-[20px]"
      contentContainerStyle={{
        paddingTop: insets.top + 8,
        paddingBottom: insets.bottom + 20,
      }}
    >
      <View className="mb-[28px]">
        <StepDots total={6} filled={3} scheme={scheme} />
      </View>

      <Text className="mb-xs font-newsreader-italic text-[30px] text-onb-ink-headline dark:text-onb-ink-headline-dark">
        Add your accounts
      </Text>
      <Text className="mb-lg font-instrument text-[15px] leading-[22px] text-onb-ink-body dark:text-onb-ink-body-dark">
        Add each account you want to track, with its current balance.
      </Text>

      <Pressable onPress={() => navigation.navigate('GPayPdfImport')} className="mb-lg flex-row items-center">
        <Icon name="file-pdf-box" size={18} color={c.accentPrimary} />
        <Text className="ml-xs font-instrument-medium text-[13px] text-onb-accent-primary dark:text-onb-accent-primary-dark">
          Import a PDF statement instead (recommended)
        </Text>
      </Pressable>

      <GlassCard scheme={scheme}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-[14px]">
            {accounts.map((account, index) => (
              <View key={index} className="gap-1.5">
                <View className="flex-row items-center justify-between">
                  <Text className="font-instrument text-[11px] uppercase tracking-[1px] text-onb-ink-label dark:text-onb-ink-label-dark">
                    Account {index + 1}
                  </Text>
                  {accounts.length > 1 && (
                    <Pressable onPress={() => removeAccount(index)} hitSlop={8}>
                      <Icon name="close" size={16} color={c.inkLabel} />
                    </Pressable>
                  )}
                </View>
                <TextInput
                  value={account.name}
                  onChangeText={(text) => updateAccount(index, { name: text })}
                  placeholder="e.g. HDFC Savings"
                  placeholderTextColor={c.inkLabel}
                  className="font-instrument-semibold text-[16px] text-onb-ink-headline dark:text-onb-ink-headline-dark border-0 p-0 pb-1.5"
                />
                <View className="flex-row items-center">
                  <Text className="font-mono text-[16px] text-onb-ink-headline dark:text-onb-ink-headline-dark">₹</Text>
                  <TextInput
                    value={account.startingBalance}
                    onChangeText={(text) => updateAccount(index, { startingBalance: text.replace(/[^0-9.]/g, '') })}
                    placeholder="0.00"
                    placeholderTextColor={c.inkLabel}
                    keyboardType="decimal-pad"
                    className="flex-1 font-mono text-[16px] text-onb-ink-headline dark:text-onb-ink-headline-dark p-0"
                  />
                </View>
                <View className="h-px bg-onb-border-subtle dark:bg-onb-border-subtle-dark mt-1.5" />
              </View>
            ))}

            <Pressable onPress={addAccount} className="flex-row items-center">
              <Icon name="plus-circle-outline" size={18} color={c.accentPrimary} />
              <Text className="ml-xs font-instrument-medium text-[13px] text-onb-accent-primary dark:text-onb-accent-primary-dark">
                Add another account
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </GlassCard>

      <View className="mt-lg">
        <RqButton label="Continue" scheme={scheme} onPress={handleContinue} disabled={!canContinue || busy} />
      </View>
    </KeyboardAwareScrollView>
  );
}
