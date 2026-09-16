import React, { useState } from 'react';
import { View, Text, TextInput, Platform } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { Icon } from '../../components/Icon';
import { Colors, Spacing } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { useAppStore } from '../../store/appStore';

export function NameEntryScreen({ navigation }: OnboardingScreenProps<'NameEntry'>) {
  const [name, setName] = useState('');
  const setOnboardingComplete = useAppStore(s => s.setOnboardingComplete);

  const firstName = name.trim().split(' ')[0];
  const isValid = name.trim().length >= 2;

  const finish = () => setOnboardingComplete(name.trim());

  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      extraScrollHeight={Spacing.lg}
      keyboardShouldPersistTaps="handled"
      className="flex-1 bg-bg-base px-container-margin pt-20 pb-10"
      showsVerticalScrollIndicator={false}
    >
      <View className="flex-1 justify-between">
        <View className="gap-md">
          <StepCounter step={Platform.OS === 'android' ? 10 : 8} totalSteps={Platform.OS === 'android' ? 10 : 8} />
          <Icon name="hand-wave-outline" size={48} color={Colors.inkHeadline} />
          <Text className="font-inter-bold text-headline-md text-ink-headline">
            {firstName ? `Hey, ${firstName}!` : "What's your name?"}
          </Text>
          <Text className="font-inter text-body-md text-ink-body leading-6 max-w-[280px]">
            We'll use your name to personalize your experience.
          </Text>
        </View>

        <View className="gap-1">
          <TextInput
            className="text-[28px] font-inter-bold text-ink-headline pb-2 min-h-[48px]"
            placeholder="Your full name"
            placeholderTextColor={Colors.inkLabel}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => isValid && finish()}
          />
          <View className={`h-0.5 rounded-sm ${name.length > 0 ? 'bg-accent-primary' : 'bg-border-subtle'}`} />
        </View>

        <View>
          <PrimaryButton
            label={isValid ? `Continue as ${firstName}` : 'Continue'}
            onPress={finish}
            disabled={!isValid}
          />
        </View>
      </View>
    </KeyboardAwareScrollView>
  );
}
