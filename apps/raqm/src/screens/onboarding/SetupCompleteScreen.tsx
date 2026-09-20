import React from 'react';
import { View, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { RqButton } from '../../components/onboarding/RqButton';
import { GlassCard } from '../../components/onboarding/GlassCard';
import { StepDots } from '../../components/onboarding/StepDots';
import { Icon } from '../../components/Icon';
import { useOnbColors } from '../../theme/onboardingColors';
import { formatAmount } from '../../utils/format';

// C3 fix (kept from pre-redesign screen): renders the real account
// totals ManualAccountSetupScreen passes through nav params. Onboarding-v3
// redesign matches the mockup's SetupComplete-Dark/Light — a check-circle
// mark + "You're set." headline, replacing the pre-redesign screen's
// account-count-first layout.
export function SetupCompleteScreen({ navigation, route }: OnboardingScreenProps<'SetupComplete'>) {
  const insets = useSafeAreaInsets();
  const { scheme, colors: c } = useOnbColors();
  const { accountCount, totalBalance, currency } = route.params ?? { accountCount: 0, totalBalance: 0, currency: 'INR' };

  return (
    <View style={{ flex: 1, backgroundColor: c.bgBase, paddingTop: insets.top + 16 }} className="px-lg pb-xl">
      <View style={{ marginBottom: 'auto' }}>
        <StepDots total={7} filled={7} scheme={scheme} />
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
            <RqButton label="Go to dashboard" scheme={scheme} onPress={() => navigation.navigate('BudgetSetup')} />
            <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 11, color: c.inkBody, textAlign: 'center' }}>
              Nothing was uploaded. Nothing will be.
            </Text>
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );
}
