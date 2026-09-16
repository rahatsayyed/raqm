import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { OnboardingButton } from '../../components/onboarding/OnboardingButton';
import { Icon } from '../../components/Icon';
import { Colors } from '../../theme';

export function SetupCompleteScreen({ navigation }: OnboardingScreenProps<'SetupComplete'>) {
  return (
    <View className="flex-1 bg-bg-base px-container-margin justify-center items-center">
      <Animated.View entering={FadeIn.duration(400)}>
        <Icon name="check-circle-outline" size={40} color={Colors.accentPrimary} />
      </Animated.View>
      <Animated.Text
        entering={FadeInDown.duration(400).delay(100)}
        className="font-inter-semibold text-body-standard text-ink-headline text-center mt-lg mb-xs"
      >
        Your accounts are set up
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.duration(400).delay(150)}
        className="font-inter text-supporting-text text-ink-body text-center mb-xxl"
      >
        You can add or edit accounts anytime from Settings.
      </Animated.Text>
      <Animated.View entering={FadeInDown.duration(400).delay(200)} className="w-full">
        <OnboardingButton label="Continue" onPress={() => navigation.navigate('BudgetSetup')} />
      </Animated.View>
    </View>
  );
}
