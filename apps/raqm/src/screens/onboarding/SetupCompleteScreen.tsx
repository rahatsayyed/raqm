import React from 'react';
import { View, Text } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { OnboardingButton } from '../../components/onboarding/OnboardingButton';
import { Icon } from '../../components/Icon';
import { Colors } from '../../theme';
import { formatAmount } from '../../utils/format';

// C3 fix: render the real totals ManualAccountSetupScreen now passes through
// nav params (account count + total starting balance), matching how
// ScanCompleteScreen renders its hero metric (metricHero / JetBrains Mono)
// for the Android path.
export function SetupCompleteScreen({ navigation, route }: OnboardingScreenProps<'SetupComplete'>) {
  const { accountCount, totalBalance, currency } = route.params ?? { accountCount: 0, totalBalance: 0, currency: 'INR' };

  return (
    <View className="flex-1 bg-bg-base px-container-margin justify-center items-center">
      <Animated.View entering={FadeIn.duration(400)}>
        <Icon name="check-circle-outline" size={40} color={Colors.accentPrimary} />
      </Animated.View>
      <Animated.Text
        entering={FadeInDown.duration(400).delay(100)}
        className="font-mono-medium text-metric-hero text-ink-headline text-center mt-lg"
      >
        {formatAmount(totalBalance, currency)}
      </Animated.Text>
      <Animated.Text
        entering={FadeInDown.duration(400).delay(120)}
        className="font-inter-semibold text-body-standard text-ink-headline text-center mt-xs mb-xs"
      >
        {accountCount} account{accountCount !== 1 ? 's' : ''} set up
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
