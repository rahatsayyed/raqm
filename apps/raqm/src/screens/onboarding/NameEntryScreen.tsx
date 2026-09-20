import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { StepDots } from '../../components/onboarding/StepDots';
import { RqButton } from '../../components/onboarding/RqButton';
import { GlassCard } from '../../components/onboarding/GlassCard';
import { Icon } from '../../components/Icon';
import { useOnbColors } from '../../theme/onboardingColors';
import { Spacing } from '../../theme';

// New 7/8 (Android) or 4/5 (iOS) screen, rebuilt onto the onboarding-v3
// component set (was still on the pre-redesign StepCounter/PrimaryButton/
// Colors pattern). Real validation logic (2-char minimum, firstName parse)
// is unchanged. Now hands off to SetupComplete instead of calling
// setOnboardingComplete() itself — SetupComplete's own CTA does that (bug #8).
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
      style={{ flex: 1, backgroundColor: c.bgBase }}
      contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + Spacing.xl, flexGrow: 1 }}
      className="px-lg"
    >
      <View style={{ flex: 1, justifyContent: 'space-between' }}>
        <View style={{ gap: 16 }}>
          <StepDots total={isAndroid ? 8 : 5} filled={isAndroid ? 7 : 4} scheme={scheme} />
          <Animated.View entering={FadeInDown.duration(400).delay(50)}>
            <Icon name="hand-wave-outline" size={40} color={c.accentPrimary} />
          </Animated.View>
          <Animated.Text
            entering={FadeInDown.duration(400).delay(100)}
            style={{ fontFamily: 'Newsreader_400Regular_Italic', fontSize: 28, color: c.inkHeadline }}
          >
            {firstName ? `Hey, ${firstName}!` : "What's your name?"}
          </Animated.Text>
          <Animated.Text
            entering={FadeInDown.duration(400).delay(150)}
            style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 15, lineHeight: 22, color: c.inkBody, maxWidth: 280 }}
          >
            We'll use your name to personalize your experience.
          </Animated.Text>
        </View>

        <Animated.View entering={FadeInDown.duration(400).delay(200)}>
          <GlassCard scheme={scheme} style={{ marginVertical: Spacing.lg }}>
            <TextInput
              ref={inputRef}
              style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 22, color: c.inkHeadline, padding: 0 }}
              placeholder="Your full name"
              placeholderTextColor={c.inkLabel}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={finish}
            />
          </GlassCard>
        </Animated.View>

        <RqButton label={isValid ? `Continue as ${firstName}` : 'Continue'} scheme={scheme} onPress={finish} disabled={!isValid} />
      </View>
    </KeyboardAwareScrollView>
  );
}
