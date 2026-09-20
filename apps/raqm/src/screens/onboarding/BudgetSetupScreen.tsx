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
      style={{ flex: 1, backgroundColor: c.bgBase }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + Spacing.xl, flexGrow: 1 }}
      className="px-lg"
    >
      <View className="mb-md">
        <StepDots total={isAndroid ? 8 : 5} filled={isAndroid ? 6 : 3} scheme={scheme} />
      </View>

      <Text style={{ fontFamily: 'Newsreader_400Regular_Italic', fontSize: 26, color: c.inkHeadline, lineHeight: 30 }} className="mb-xs">
        {isAndroid ? 'Budget around what\nyou actually spend' : 'Set a target for\neach category'}
      </Text>
      <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 13, color: c.inkBody }} className="mb-md">
        {isAndroid ? 'Based on last month. Adjust anything.' : 'You can change this anytime.'}
      </Text>

      <GlassCard scheme={scheme} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          <View style={{ width: '100%', backgroundColor: c.bgSurface, borderRadius: 4, padding: Spacing.md, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ fontFamily: 'InstrumentSans_600SemiBold', fontSize: 13, color: c.inkHeadline }}>Total monthly budget</Text>
              <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 11, color: c.inkBody }}>Covers every category below</Text>
            </View>
            <Text style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 22, color: c.accentPrimary }}>
              {total > 0 ? `₹${total.toLocaleString('en-IN')}` : '—'}
            </Text>
          </View>

          {DEFAULT_CATEGORIES.map((category) => (
            <View key={category} style={{ width: '48%', backgroundColor: c.bgSurface, borderRadius: 4, padding: Spacing.md }}>
              <Text style={{ fontFamily: 'InstrumentSans_600SemiBold', fontSize: 12, color: c.inkHeadline, marginBottom: Spacing.xs + 2 }}>
                {category}
              </Text>
              <TextInput
                value={amounts[category]}
                onChangeText={(text) => setAmount(category, text)}
                placeholder="0"
                placeholderTextColor={c.inkLabel}
                keyboardType="number-pad"
                style={{ fontFamily: 'JetBrainsMono_400Regular', fontSize: 16, color: c.inkHeadline, padding: 0 }}
              />
            </View>
          ))}
        </View>
      </GlassCard>

      <View className="mt-md" style={{ gap: 10 }}>
        <Text
          onPress={skip}
          style={{ fontFamily: 'InstrumentSans_500Medium', fontSize: 13, color: c.inkBody, textAlign: 'center' }}
        >
          Skip for now
        </Text>
        <RqButton label="Continue" scheme={scheme} onPress={handleContinue} disabled={busy} />
      </View>
    </KeyboardAwareScrollView>
  );
}
