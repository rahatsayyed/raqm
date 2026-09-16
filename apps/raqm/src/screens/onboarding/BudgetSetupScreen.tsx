import React, { useState } from 'react';
import { View, Text, TextInput, Platform } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { OnboardingButton } from '../../components/onboarding/OnboardingButton';
import { Colors, Spacing } from '../../theme';
import { getCategoryIdByName, upsertBudget } from '../../db/database';

const DEFAULT_CATEGORIES = ['Dining', 'Groceries', 'Transport', 'Shopping', 'Bills'];

export function BudgetSetupScreen({ navigation }: OnboardingScreenProps<'BudgetSetup'>) {
  const isAndroid = Platform.OS === 'android';
  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(DEFAULT_CATEGORIES.map((c) => [c, ''])),
  );

  const setAmount = (category: string, value: string) => {
    setAmounts((prev) => ({ ...prev, [category]: value.replace(/[^0-9]/g, '') }));
  };

  const handleContinue = async () => {
    for (const [category, value] of Object.entries(amounts)) {
      if (value.trim().length > 0 && Number(value) > 0) {
        // ponytail: category names here are hardcoded defaults, not
        // user-picked ones, so a missing categoryId (name not in the
        // categories table) just skips saving that row rather than throwing.
        const categoryId = await getCategoryIdByName(category);
        if (categoryId !== null) {
          await upsertBudget(categoryId, Number(value), 'monthly', false);
        }
      }
    }
    navigation.navigate('SignUp');
  };

  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={Spacing.lg}
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-bg-base px-container-margin pt-xxl"
    >
      <StepCounter step={isAndroid ? 7 : 4} totalSteps={isAndroid ? 9 : 6} />
      <Text className="font-inter-semibold text-body-standard text-ink-headline mb-md">
        Set a starting budget
      </Text>
      <Text className="font-inter text-supporting-text text-ink-body mb-lg">
        {isAndroid
          ? 'Based on what we found, here are suggested budgets. Adjust anything you like.'
          : 'Set a target for each category. You can change this anytime.'}
      </Text>

      {DEFAULT_CATEGORIES.map((category) => (
        <View key={category} className="flex-row items-center justify-between border-b border-border-subtle py-md">
          <Text className="font-inter text-body-standard text-ink-headline">{category}</Text>
          <TextInput
            value={amounts[category]}
            onChangeText={(text) => setAmount(category, text)}
            placeholder="0"
            placeholderTextColor={Colors.inkLabel}
            keyboardType="number-pad"
            className="font-mono-medium text-numeric-md text-ink-headline text-right w-24"
          />
        </View>
      ))}

      <View className="mt-xxl">
        <OnboardingButton label="Continue" onPress={handleContinue} />
      </View>
    </KeyboardAwareScrollView>
  );
}
