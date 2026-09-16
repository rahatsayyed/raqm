import React, { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { OnboardingButton } from '../../components/onboarding/OnboardingButton';
import { Icon } from '../../components/Icon';
import { Colors, Spacing } from '../../theme';

type DraftAccount = { name: string; startingBalance: string };

export function ManualAccountSetupScreen({ navigation }: OnboardingScreenProps<'ManualAccountSetup'>) {
  const [accounts, setAccounts] = useState<DraftAccount[]>([{ name: '', startingBalance: '' }]);

  const updateAccount = (index: number, patch: Partial<DraftAccount>) => {
    setAccounts((prev) => prev.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  };

  const addAccount = () => setAccounts((prev) => [...prev, { name: '', startingBalance: '' }]);

  const canContinue = accounts.every((a) => a.name.trim().length > 0 && a.startingBalance.trim().length > 0);

  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={Spacing.lg}
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-bg-base px-container-margin pt-xxl"
    >
      <StepCounter step={2} totalSteps={6} />
      <Text className="font-inter-semibold text-body-standard text-ink-headline mb-md">
        Add your accounts
      </Text>
      <Text className="font-inter text-supporting-text text-ink-body mb-lg">
        Add each account you want to track, with its current balance.
      </Text>

      <Pressable onPress={() => navigation.navigate('GPayPdfImport')} className="flex-row items-center mb-lg">
        <Icon name="file-pdf-box" size={18} color={Colors.accentPrimary} />
        <Text className="font-inter-semibold text-supporting-text text-accent-primary ml-xs">
          Import a PDF statement instead (recommended)
        </Text>
      </Pressable>

      {accounts.map((account, index) => (
        <View key={index} className="mb-lg border-b border-border-subtle pb-lg">
          <Text className="font-inter text-annotation text-ink-label mb-xs">Account name</Text>
          <TextInput
            value={account.name}
            onChangeText={(text) => updateAccount(index, { name: text })}
            placeholder="e.g. HDFC Savings"
            placeholderTextColor={Colors.inkLabel}
            className="font-inter text-body-standard text-ink-headline mb-md"
          />
          <Text className="font-inter text-annotation text-ink-label mb-xs">Starting balance</Text>
          <TextInput
            value={account.startingBalance}
            onChangeText={(text) => updateAccount(index, { startingBalance: text.replace(/[^0-9.]/g, '') })}
            placeholder="0.00"
            placeholderTextColor={Colors.inkLabel}
            keyboardType="decimal-pad"
            className="font-mono-medium text-numeric-md text-ink-headline"
          />
        </View>
      ))}

      <Pressable onPress={addAccount} className="flex-row items-center mb-xl">
        <Icon name="plus-circle-outline" size={18} color={Colors.accentPrimary} />
        <Text className="font-inter-semibold text-supporting-text text-accent-primary ml-xs">
          Add another account
        </Text>
      </Pressable>

      <OnboardingButton
        label="Continue"
        disabled={!canContinue}
        onPress={() => navigation.navigate('SetupComplete')}
      />
    </KeyboardAwareScrollView>
  );
}
