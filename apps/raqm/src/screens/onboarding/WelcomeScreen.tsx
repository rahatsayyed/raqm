import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { OnboardingScreenProps } from '../../navigation/types';
import { RqButton } from '../../components/onboarding/RqButton';
import { GlassCard } from '../../components/onboarding/GlassCard';
import { StepDots } from '../../components/onboarding/StepDots';
import { useOnbColors } from '../../theme/onboardingColors';
import { Spacing } from '../../theme';

const isAndroid = Platform.OS === 'android';

// Onboarding-v3 redesign, both platforms. Matches the claude-design mockup's
// Welcome-Dark/Light (Android) and Welcome-iOS-Dark/Light.
export function WelcomeScreen({ navigation }: OnboardingScreenProps<'Welcome'>) {
  const insets = useSafeAreaInsets();
  const { scheme, colors: c } = useOnbColors();

  const getStarted = async () => {
    if (isAndroid) {
      navigation.navigate('Permissions');
      return;
    }
    // iOS has no dedicated Permissions screen — notification permission is
    // requested inline here, on "Get started" tap, per the artifact.
    try {
      await Notifications.requestPermissionsAsync();
    } catch {
      // Non-fatal: proceed to the import flow regardless of the outcome.
    }
    navigation.navigate('ImportStatement');
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: c.bgBase, paddingTop: insets.top + 16, paddingBottom: insets.bottom + Spacing.xl }}
      className="px-lg"
    >
      {/* Bug #1 fix: this screen previously had a self-added 288px circular
          radial glow behind the copy — not present anywhere in the current
          artifact (Welcome-Dark/Light, Welcome-iOS-Dark/Light), removed. */}

      <StepDots total={isAndroid ? 8 : 5} filled={1} scheme={scheme} />

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
            : 'Add a statement, set a budget, and Raqm keeps a quiet eye on your spend — no bank login, ever.'}
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.duration(500).delay(300)}>
        <GlassCard scheme={scheme}>
          <View style={{ gap: 16 }}>
            <RqButton label="Get started" scheme={scheme} onPress={getStarted} />
            <Text style={{ fontFamily: 'InstrumentSans_400Regular', color: c.inkBody, fontSize: 12, textAlign: 'center' }}>
              Private by design. No servers involved.
            </Text>
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );
}
