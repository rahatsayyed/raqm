import React, { useState } from 'react';
import { View, Text, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingScreenProps } from '../../navigation/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { StepDots } from '../../components/onboarding/StepDots';
import { RqButton } from '../../components/onboarding/RqButton';
import { GlassCard } from '../../components/onboarding/GlassCard';
import { useOnbColors } from '../../theme/onboardingColors';
import { Spacing } from '../../theme';
import { getCategoryIdByName, upsertBudget } from '../../db/database';
import { suggestBudgetsFromSpend } from '../../services/onboarding/budgetSuggestions';

// Full app-wide 12-category list (matches the canonical names in database.ts's
// DEFAULT_CATEGORIES after the v19 migration) — was a hardcoded 5-category
// subset, which meant most spend never got a budget target at all.
const DEFAULT_CATEGORIES = [
  'Bills', 'EMI', 'Entertainment', 'Food and Drink', 'Travel', 'Groceries',
  'Health', 'Investment', 'Other', 'Shopping', 'Transportation', 'Transfer',
];

// Onboarding-v3 redesign: matches the mockup's BudgetSetup-Dark/Light — a
// 2-column grid of category cards plus a full-width total card, instead of
// the pre-redesign screen's single-column list. Real suggested-budget math
// and DB writes (upsertBudget) are unchanged.
export function BudgetSetupScreen({ navigation, route }: OnboardingScreenProps<'BudgetSetup'>) {
  const isAndroid = Platform.OS === 'android';
  const insets = useSafeAreaInsets();
  const { scheme, colors: c } = useOnbColors();

  const suggested = isAndroid ? suggestBudgetsFromSpend(route.params?.categorySpend ?? {}) : {};
  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(DEFAULT_CATEGORIES.map((cat) => [cat, suggested[cat] ? String(suggested[cat]) : ''])),
  );
  const [busy, setBusy] = useState(false);

  const setAmount = (category: string, value: string) => {
    setAmounts((prev) => ({ ...prev, [category]: value.replace(/[^0-9]/g, '') }));
  };

  const total = Object.values(amounts).reduce((sum, v) => sum + (Number(v) || 0), 0);

  // I6 fix (kept): guard against double-tap double-writing budgets / double-navigating.
  const handleContinue = async () => {
    if (busy) return;
    setBusy(true);
    try {
      for (const [category, value] of Object.entries(amounts)) {
        if (value.trim().length > 0 && Number(value) > 0) {
          // ponytail: category names here are hardcoded defaults, not
          // user-picked ones, so a missing categoryId just skips saving
          // that row rather than throwing.
          const categoryId = await getCategoryIdByName(category);
          if (categoryId !== null) {
            await upsertBudget(categoryId, Number(value), false);
          }
        }
      }
      navigation.navigate('NameEntry');
    } finally {
      setBusy(false);
    }
  };

  const skip = () => navigation.navigate('NameEntry');

  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={Spacing.lg}
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-onb-bg-base dark:bg-onb-bg-base-dark"
      // paddingTop/paddingBottom depend on runtime insets so they stay as
      // style; paddingHorizontal (literal artifact 20px, no exact Spacing
      // token) and flexGrow are static, moved to contentContainerClassName.
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + Spacing.xl }}
      contentContainerClassName="px-[20px] flex-grow"
    >
      {/* Literal artifact margin-bottom below the step dots is 20px — no exact Spacing
          token (sm=8, md=16); applied literally instead of rounding to mb-md (16). */}
      <View className="mb-[20px]">
        <StepDots total={isAndroid ? 8 : 5} filled={isAndroid ? 6 : 3} scheme={scheme} />
      </View>

      <Text className="font-newsreader-italic text-[26px] leading-[30px] text-onb-ink-headline dark:text-onb-ink-headline-dark mb-xs">
        {isAndroid ? 'Budget around what\nyou actually spend' : 'Set a target for\neach category'}
      </Text>
      {/* Literal artifact margin-bottom on the subtitle is 14px — no exact Spacing token
          (sm=8, md=16); applied literally instead of rounding. */}
      <Text className="font-instrument text-[13px] text-onb-ink-body dark:text-onb-ink-body-dark mb-[14px]">
        {isAndroid ? 'Based on last month. Adjust anything.' : 'You can change this anytime.'}
      </Text>

      <GlassCard scheme={scheme} style={{ flex: 1 }}>
        <View className="flex-row flex-wrap gap-sm">
          <View className="w-full bg-onb-bg-surface dark:bg-onb-bg-surface-dark rounded-inner p-md flex-row justify-between items-center">
            <View>
              <Text className="font-instrument-semibold text-[13px] text-onb-ink-headline dark:text-onb-ink-headline-dark">Total monthly budget</Text>
              <Text className="font-instrument text-[11px] text-onb-ink-body dark:text-onb-ink-body-dark">Covers every category below</Text>
            </View>
            <Text className="font-mono-semibold text-[22px] text-onb-accent-primary dark:text-onb-accent-primary-dark">
              {total > 0 ? `₹${total.toLocaleString('en-IN')}` : '—'}
            </Text>
          </View>

          {DEFAULT_CATEGORIES.map((category) => (
            <View key={category} className="w-[48%] bg-onb-bg-surface dark:bg-onb-bg-surface-dark rounded-inner p-md">
              {/* Literal artifact margin-bottom is 6px (Spacing.xs + 2, no exact token). */}
              <Text className="font-instrument-semibold text-[12px] text-onb-ink-headline dark:text-onb-ink-headline-dark mb-[6px]">
                {category}
              </Text>
              <TextInput
                value={amounts[category]}
                onChangeText={(text) => setAmount(category, text)}
                placeholder="0"
                placeholderTextColor={c.inkLabel}
                keyboardType="number-pad"
                className="font-mono text-[16px] text-onb-ink-headline dark:text-onb-ink-headline-dark p-0"
              />
            </View>
          ))}
        </View>
      </GlassCard>

      <View className="mt-md gap-[10px]">
        <Text
          onPress={skip}
          className="font-instrument-medium text-[13px] text-onb-ink-body dark:text-onb-ink-body-dark text-center"
        >
          Skip for now
        </Text>
        <RqButton label="Continue" scheme={scheme} onPress={handleContinue} disabled={busy} />
      </View>
    </KeyboardAwareScrollView>
  );
}
