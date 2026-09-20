import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { RqButton } from '../../components/onboarding/RqButton';
import { GlassCard } from '../../components/onboarding/GlassCard';
import { StepDots } from '../../components/onboarding/StepDots';
import { useOnbColors } from '../../theme/onboardingColors';

// I9 fix (kept from the pre-redesign screen): shared with iOS, where SMS
// reading is impossible and the next screens are manual/PDF entry.
const isAndroid = Platform.OS === 'android';

// Onboarding-v3 redesign (Android scope only — see this task's report for
// the iOS note). Matches the claude-design mockup's Welcome-Dark/Light.
export function WelcomeScreen({ navigation }: OnboardingScreenProps<'Welcome'>) {
  const insets = useSafeAreaInsets();
  const { scheme, colors: c } = useOnbColors();

  return (
    <View style={{ flex: 1, backgroundColor: c.bgBase, paddingTop: insets.top + 16 }} className="px-lg pb-xl">
      {/* Sanctioned single gradient exception is Home's hero number, not here —
          this radial glow is the mockup's own decorative circle, kept subtle
          (opacity 0.06, matching the pre-redesign screen's own glow). */}
      <Animated.View
        entering={FadeIn.duration(600)}
        style={{
          position: 'absolute',
          alignSelf: 'center',
          top: '35%',
          width: 288,
          height: 288,
          borderRadius: 144,
          backgroundColor: c.accentPrimary,
          opacity: 0.06,
        }}
      />

      <StepDots total={6} filled={1} scheme={scheme} />

      <Text
        style={{ fontFamily: 'InstrumentSans_400Regular', color: c.inkBody, fontSize: 13, letterSpacing: 2.1 }}
        className="uppercase mt-xl mb-auto"
      >
        Raqm
      </Text>

      <View style={{ flexGrow: 1, justifyContent: 'center', gap: 20 }}>
        <Animated.Text
          entering={FadeInDown.duration(500).delay(100)}
          style={{ fontFamily: 'Newsreader_400Regular_Italic', color: c.inkHeadline, fontSize: 40, lineHeight: 46 }}
        >
          Your money,{'\n'}read quietly.
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.duration(500).delay(200)}
          style={{ fontFamily: 'InstrumentSans_400Regular', color: c.inkBody, fontSize: 16, lineHeight: 24, maxWidth: 300 }}
        >
          {isAndroid
            ? 'Raqm reads your bank SMS on this phone. Nothing is uploaded, nothing is shared, no bank login, ever.'
            : 'Add your accounts and Raqm turns them into a clear picture of where your money goes. Nothing leaves your phone.'}
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.duration(500).delay(300)}>
        <GlassCard scheme={scheme}>
          <View style={{ gap: 16 }}>
            <RqButton label="Get started" scheme={scheme} onPress={() => navigation.navigate('Permissions')} />
            <Text style={{ fontFamily: 'InstrumentSans_400Regular', color: c.inkBody, fontSize: 12, textAlign: 'center' }}>
              Private by design. No servers involved.
            </Text>
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );
}
