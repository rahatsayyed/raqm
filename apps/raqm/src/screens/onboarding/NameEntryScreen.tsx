import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { StepDots } from '../../components/onboarding/StepDots';
import { RqButton } from '../../components/onboarding/RqButton';
import { Icon } from '../../components/Icon';
import { useOnbColors } from '../../theme/onboardingColors';
import { Spacing } from '../../theme';

// New 7/8 (Android) or 4/5 (iOS) screen. Rebuilt literally against
// NameEntry-Light/Dark.dc.html from the claude-design artifact — the prior
// pass ("even the icon on the name entry screen is wrong (entire screen is
// wrong) the input field is wrong the input position is wrong") had ported
// a pre-redesign GlassCard-wrapped-input pattern from another onboarding
// screen instead of matching this screen's own mockup, which is a plain
// underlined field with no card, a person icon (not a hand-wave), and the
// icon in inkHeadline (not accent) color. Real validation logic (2-char
// minimum, firstName parse) is unchanged. Hands off to SetupComplete
// instead of calling setOnboardingComplete() itself (bug #8).
export function NameEntryScreen({ navigation }: OnboardingScreenProps<'NameEntry'>) {
  const isAndroid = Platform.OS === 'android';
  const insets = useSafeAreaInsets();
  const { scheme, colors: c } = useOnbColors();
  const [name, setName] = useState('');
  const inputRef = useRef<TextInput>(null);

  // CLAUDE.md: plain autoFocus fires before KeyboardAwareScrollView has
  // measured this field — use a ref + delayed focus instead.
  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(id);
  }, []);

  const firstName = name.trim().split(' ')[0];
  const isValid = name.trim().length >= 2;

  const finish = () => {
    if (!isValid) return;
    navigation.navigate('SetupComplete', { userName: name.trim() });
  };

  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={Spacing.lg}
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-onb-bg-base dark:bg-onb-bg-base-dark"
      // Literal artifact padding: "56px 20px 40px". 20px has no exact Spacing
      // token (sm=8, md=16, lg=24) — applied literally rather than px-lg (24).
      // Kept as style: insets.top/bottom are runtime values, not static classes.
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 40,
        paddingHorizontal: 20,
        flexGrow: 1,
      }}
    >
      <View className="flex-1">
        {/* Literal artifact: 8 dots, margin-bottom 28px, directly followed by
            the icon/title/subtitle/input in document flow (NOT centered or
            split via justify-content: space-between) — a flex-grow spacer
            after the input pushes the CTA to the bottom instead. */}
        <View className="mb-[28px]">
          <StepDots total={isAndroid ? 8 : 5} filled={isAndroid ? 7 : 4} scheme={scheme} />
        </View>

        <Animated.View entering={FadeInDown.duration(400).delay(50)} className="mb-[14px]">
          {/* Artifact icon is a plain person outline (circle head + shoulder
              arc), stroke = inkHeadline, 24x24, stroke-width 1.5 — not a
              hand-wave icon in accent color like the prior pass used. */}
          <Icon name="account-outline" size={24} color={c.inkHeadline} />
        </Animated.View>
        <Animated.Text
          entering={FadeInDown.duration(400).delay(100)}
          className="font-newsreader-italic text-[30px] text-onb-ink-headline dark:text-onb-ink-headline-dark mb-2"
        >
          {firstName ? `Hey, ${firstName}!` : "What's your name?"}
        </Animated.Text>
        <Animated.Text
          entering={FadeInDown.duration(400).delay(150)}
          className="font-instrument text-[15px] leading-[22px] text-onb-ink-body dark:text-onb-ink-body-dark max-w-[280px] mb-lg"
        >
          We'll use your name to personalize your experience.
        </Animated.Text>

        {/* Literal artifact input: no card/glass background — a bare field,
            'Instrument Sans' 28/600, border: none, padding-bottom 8px, with
            a separate 2px accent underline bar (gap 6px) below it. */}
        <Animated.View entering={FadeInDown.duration(400).delay(200)} className="gap-1.5">
          <Text
            // Visually hidden label — matches the artifact's sr-only <label>.
            className="absolute w-px h-px overflow-hidden opacity-0"
          >
            Your full name
          </Text>
          <TextInput
            ref={inputRef}
            className="font-instrument-semibold text-[28px] text-onb-ink-headline dark:text-onb-ink-headline-dark border-0 p-0 pb-2"
            placeholder="Your full name"
            placeholderTextColor={c.inkLabel}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={finish}
          />
          <View className="h-[2px] rounded-[1px] bg-onb-accent-primary dark:bg-onb-accent-primary-dark" />
        </Animated.View>

        <View className="flex-grow" />

        <RqButton label={isValid ? `Continue as ${firstName}` : 'Continue'} scheme={scheme} onPress={finish} disabled={!isValid} />
      </View>
    </KeyboardAwareScrollView>
  );
}
