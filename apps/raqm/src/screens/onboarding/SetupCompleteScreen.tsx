import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { RqButton } from '../../components/onboarding/RqButton';
import { GlassCard } from '../../components/onboarding/GlassCard';
import { StepDots } from '../../components/onboarding/StepDots';
import { Icon } from '../../components/Icon';
import { useOnbColors } from '../../theme/onboardingColors';
import { formatAmount } from '../../utils/format';
import { Spacing } from '../../theme';
import { useAppStore } from '../../store/appStore';

// C3 fix (kept from pre-redesign screen): renders the real account
// totals ManualAccountSetupScreen passes through nav params. Onboarding-v3
// redesign matches the mockup's SetupComplete-Dark/Light — a check-circle
// mark + "You're set." headline, replacing the pre-redesign screen's
// account-count-first layout.
export function SetupCompleteScreen({ route }: OnboardingScreenProps<'SetupComplete'>) {
  const isAndroid = Platform.OS === 'android';
  const insets = useSafeAreaInsets();
  const { scheme, colors: c } = useOnbColors();
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);
  const { accountCount = 0, totalBalance = 0, currency = 'INR', userName = '' } = route.params ?? {};

  // Bug #8 fix: this is now the only place onboarding actually finishes —
  // NameEntryScreen used to call setOnboardingComplete() itself, which
  // flipped RootNavigator to the main app before this screen ever mounted.
  const finish = () => setOnboardingComplete(userName);

  return (
    <View
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + Spacing.md }}
      className="flex-1 bg-onb-bg-base dark:bg-onb-bg-base-dark px-lg"
    >
      <View className="mb-auto">
        <StepDots total={isAndroid ? 8 : 5} filled={isAndroid ? 8 : 5} scheme={scheme} />
      </View>

      <View className="flex-grow items-center justify-center gap-lg">
        <Animated.View
          entering={FadeIn.duration(400)}
          className="w-16 h-16 rounded-full items-center justify-center bg-onb-accent-primary dark:bg-onb-accent-primary-dark"
        >
          <Icon name="check" size={30} color={c.onAccent} />
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.duration(400).delay(100)}
          className="font-newsreader-italic text-[30px] text-onb-ink-headline dark:text-onb-ink-headline-dark text-center"
        >
          You're set.
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.duration(400).delay(150)}
          className="font-instrument text-[15px] leading-[22px] text-onb-ink-body dark:text-onb-ink-body-dark text-center max-w-[260px]"
        >
          Raqm is watching your spend, quietly, from right here on your phone.
        </Animated.Text>

        {accountCount > 0 && (
          <Animated.Text
            entering={FadeInDown.duration(400).delay(180)}
            className="font-mono-medium text-[16px] text-onb-ink-body dark:text-onb-ink-body-dark text-center"
          >
            {accountCount} account{accountCount !== 1 ? 's' : ''} · {formatAmount(totalBalance, currency)}
          </Animated.Text>
        )}
      </View>

      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <GlassCard scheme={scheme}>
          <View className="gap-[14px]">
            <RqButton label="Go to dashboard" scheme={scheme} onPress={finish} />
            <Text className="font-instrument text-[11px] text-onb-ink-body dark:text-onb-ink-body-dark text-center">
              Nothing was uploaded. Nothing will be.
            </Text>
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );
}
