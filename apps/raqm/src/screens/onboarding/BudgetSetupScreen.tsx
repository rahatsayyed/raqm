import React, { useRef, useState } from 'react';
import { View, Text, TextInput, Platform, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurView, BlurTargetView } from 'expo-blur';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, Easing, useReducedMotion } from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { StepDots } from '../../components/onboarding/StepDots';
import { RqButton } from '../../components/onboarding/RqButton';
import { useOnbColors } from '../../theme/onboardingColors';
import { Spacing } from '../../theme';
import { getCategoryIdByName, upsertBudget } from '../../db/database';
import { suggestBudgetsFromSpend } from '../../services/onboarding/budgetSuggestions';

const EASE_OUT = Easing.out(Easing.quad);
const SCROLL_EDGE_THRESHOLD = 4;
// Taller, stronger falloff than a typical gradient — expo-blur's Android blur
// is unreliable, so this scrim is what actually sells "cards fading out", not
// just a finishing touch on top of a working blur.
const FADE_BAND_ALPHAS = [0.92, 0.8, 0.64, 0.46, 0.28, 0.14, 0.05];
const DEFAULT_HEADER_HEIGHT = 64;

// Local hex→rgba helper — only used here.
function withAlpha(hex: string, alpha: number) {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

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
  const [headerHeight, setHeaderHeight] = useState(DEFAULT_HEADER_HEIGHT);
  const reducedMotion = useReducedMotion();
  const scrolled = useSharedValue(0);
  const blurTargetRef = useRef<View>(null);

  const handleScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = e.nativeEvent.contentOffset.y > SCROLL_EDGE_THRESHOLD ? 1 : 0;
    if (scrolled.get() !== next) {
      scrolled.set(withTiming(next, { duration: reducedMotion ? 0 : 180, easing: EASE_OUT }));
    }
  };
  const separatorStyle = useAnimatedStyle(() => ({ opacity: scrolled.get() }));

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
    <View
      className="flex-1 bg-onb-bg-base dark:bg-onb-bg-base-dark px-[20px]"
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + Spacing.md }}
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

      {/* Content layer stays opaque; only the header below is glass. */}
      <View className="flex-1 rounded-outer border border-onb-border-subtle dark:border-onb-border-subtle-dark overflow-hidden">
        {/* Android needs an explicit blur target — BlurView can't sample content it isn't told about. */}
        <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={Spacing.lg}
            keyboardShouldPersistTaps="handled"
            className="flex-1"
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingTop: headerHeight + Spacing.sm,
              paddingHorizontal: Spacing.md,
              paddingBottom: Spacing.md,
            }}
          >
            <View className="flex-row flex-wrap gap-sm">
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
          </KeyboardAwareScrollView>
        </BlurTargetView>

        {/* Scrim: cards visibly darken out before sliding under the header. */}
        <View pointerEvents="none" style={{ position: 'absolute', top: headerHeight, left: 0, right: 0 }}>
          {FADE_BAND_ALPHAS.map((alpha, i) => (
            <View key={i} style={{ height: 5, backgroundColor: withAlpha(c.bgBase, alpha) }} />
          ))}
        </View>

        {/* The one glass surface on this screen — real blur on Android via blurMethod. */}
        <View
          onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2 }}
        >
          <BlurView
            intensity={30}
            tint={scheme}
            blurMethod={isAndroid ? 'dimezisBlurView' : undefined}
            blurTarget={isAndroid ? blurTargetRef : undefined}
            style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
          />
          {/* Stronger than GlassCard's flat panel tint on purpose — this sits
              over moving content, so it needs to actually dim it, not just
              hint at translucency (Apple's "dimming layer" for busy content). */}
          <View
            style={{ backgroundColor: withAlpha(c.bgBase, 0.82) }}
            className="p-lg flex-row justify-between items-center"
          >
            <View>
              <Text className="font-instrument-semibold text-[13px] text-onb-ink-headline dark:text-onb-ink-headline-dark">Total monthly budget</Text>
              <Text className="font-instrument text-[11px] text-onb-ink-body dark:text-onb-ink-body-dark">Covers every category below</Text>
            </View>
            <Text className="font-mono-semibold text-[22px] text-onb-accent-primary dark:text-onb-accent-primary-dark">
              {total > 0 ? `₹${total.toLocaleString('en-IN')}` : '—'}
            </Text>
          </View>
          {/* Fades in only once scrolled under the glass — iOS nav-bar hairline. */}
          <Animated.View
            style={[{ height: 1 }, separatorStyle]}
            className="bg-onb-border-subtle dark:bg-onb-border-subtle-dark"
          />
        </View>
      </View>

      <View className="mt-md gap-[10px]">
        <Text
          onPress={skip}
          className="font-instrument-medium text-[13px] text-onb-ink-body dark:text-onb-ink-body-dark text-center"
        >
          Skip for now
        </Text>
        <RqButton label="Continue" scheme={scheme} onPress={handleContinue} disabled={busy} />
      </View>
    </View>
  );
}
