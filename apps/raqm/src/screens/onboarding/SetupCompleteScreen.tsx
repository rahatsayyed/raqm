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
      style={{ flex: 1, backgroundColor: c.bgBase, paddingTop: insets.top + 16, paddingBottom: insets.bottom + Spacing.xl }}
      className="px-lg"
    >
      <View style={{ marginBottom: 'auto' }}>
        <StepDots total={isAndroid ? 8 : 5} filled={isAndroid ? 8 : 5} scheme={scheme} />
      </View>

      <View style={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 24 }}>
        <Animated.View
          entering={FadeIn.duration(400)}
          style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentPrimary, alignItems: 'center', justifyContent: 'center' }}
        >
          <Icon name="check" size={30} color={c.onAccent} />
        </Animated.View>

        <Animated.Text
          entering={FadeInDown.duration(400).delay(100)}
          style={{ fontFamily: 'Newsreader_400Regular_Italic', fontSize: 30, color: c.inkHeadline, textAlign: 'center' }}
        >
          You're set.
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.duration(400).delay(150)}
          style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 15, lineHeight: 22, color: c.inkBody, textAlign: 'center', maxWidth: 260 }}
        >
          Raqm is watching your spend, quietly, from right here on your phone.
        </Animated.Text>

        {accountCount > 0 && (
          <Animated.Text
            entering={FadeInDown.duration(400).delay(180)}
            style={{ fontFamily: 'JetBrainsMono_500Medium', fontSize: 16, color: c.inkBody, textAlign: 'center' }}
          >
            {accountCount} account{accountCount !== 1 ? 's' : ''} · {formatAmount(totalBalance, currency)}
          </Animated.Text>
        )}
      </View>

      <Animated.View entering={FadeInDown.duration(400).delay(200)}>
        <GlassCard scheme={scheme}>
          <View style={{ gap: 14 }}>
            <RqButton label="Go to dashboard" scheme={scheme} onPress={finish} />
            <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 11, color: c.inkBody, textAlign: 'center' }}>
              Nothing was uploaded. Nothing will be.
            </Text>
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );
}
