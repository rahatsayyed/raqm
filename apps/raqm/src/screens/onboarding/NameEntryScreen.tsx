import React, { useState, useRef } from 'react';
import { View, Text, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useAppStore } from '../../store/appStore';

export function NameEntryScreen({ navigation }: OnboardingScreenProps<'NameEntry'>) {
  const [name, setName] = useState('');
  const inputRef = useRef<TextInput>(null);
  const setOnboardingComplete = useAppStore(s => s.setOnboardingComplete);

  const firstName = name.trim().split(' ')[0];
  const isValid = name.trim().length >= 2;

  const finish = () => setOnboardingComplete(name.trim());

  return (
    <KeyboardAvoidingView className="flex-1 bg-surface" behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View className="flex-1 px-container-margin justify-between pt-20 pb-10">
        <View className="gap-md">
          <Text className="text-5xl">👋</Text>
          <Text className="font-inter-bold text-display-lg text-on-surface">
            {firstName ? `Hey, ${firstName}!` : "What's your name?"}
          </Text>
          <Text className="font-inter text-body-md text-on-surface-variant leading-6 max-w-[280px]">
            We'll use your name to personalize your experience.
          </Text>
        </View>

        <View className="gap-1">
          <TextInput
            ref={inputRef}
            className="text-[28px] font-inter-bold text-on-surface pb-2 min-h-[48px]"
            placeholder="Your full name"
            placeholderTextColor={Colors.outline}
            value={name}
            onChangeText={setName}
            autoFocus
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => isValid && finish()}
          />
          <View className={`h-0.5 rounded-sm ${name.length > 0 ? 'bg-primary' : 'bg-outline-variant'}`} />
        </View>

        <View>
          <PrimaryButton
            label={isValid ? `Continue as ${firstName}` : 'Continue'}
            onPress={finish}
            disabled={!isValid}
          />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
