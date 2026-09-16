import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { OnboardingButton } from '../../components/onboarding/OnboardingButton';

export function WelcomeScreen({ navigation }: OnboardingScreenProps<'Welcome'>) {
  return (
    <View className="flex-1 bg-bg-base px-container-margin justify-center">
      <Animated.View
        entering={FadeIn.duration(600)}
        className="absolute self-center w-72 h-72 rounded-full bg-accent-primary opacity-[0.06]"
      />

      <Animated.Text
        entering={FadeInDown.duration(500).delay(100)}
        className="font-inter-light text-statement-lg text-ink-headline text-center mb-md"
      >
        Your finances,{'\n'}
        <Text className="text-accent-primary">decoded</Text> from your SMS.
      </Animated.Text>

      <Animated.Text
        entering={FadeInDown.duration(500).delay(200)}
        className="font-inter text-body-standard text-ink-body text-center mb-xxl"
      >
        Raqm reads your bank messages and turns them into a clear picture of
        where your money goes. Nothing leaves your phone.
      </Animated.Text>

      <Animated.View entering={FadeInDown.duration(500).delay(300)}>
        <OnboardingButton label="Get started" onPress={() => navigation.navigate('Permissions')} />
      </Animated.View>
    </View>
  );
}
