import React from 'react';
import { View, Text, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Notifications from 'expo-notifications';
import { OnboardingScreenProps } from '../../navigation/types';
import { RqButton } from '../../components/onboarding/RqButton';
import { GlassCard } from '../../components/onboarding/GlassCard';
import { StepDots } from '../../components/onboarding/StepDots';
import { Icon } from '../../components/Icon';
import { useOnbColors } from '../../theme/onboardingColors';
import { cn } from '../../utils/cn';

const isAndroid = Platform.OS === 'android';

// Onboarding-v3 redesign, both platforms. Matches the claude-design mockup's
// Welcome-Dark/Light (Android) and Welcome-iOS-Dark/Light.
export function WelcomeScreen({ navigation }: OnboardingScreenProps<'Welcome'>) {
  const insets = useSafeAreaInsets();
  const { scheme, colors: c } = useOnbColors();
  const isDark = scheme === 'dark';

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
      // paddingTop/paddingBottom stay inline: they depend on safe-area
      // insets at runtime, which className can't express.
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
      className={cn('flex-1 px-lg', isDark ? 'bg-onb-bg-base-dark' : 'bg-onb-bg-base')}
    >
      {/* Bug #1 fix: this screen previously had a self-added 288px circular
          radial glow behind the copy — not present anywhere in the current
          artifact (Welcome-Dark/Light, Welcome-iOS-Dark/Light), removed. */}

      <StepDots total={isAndroid ? 8 : 5} filled={1} scheme={scheme} />

      {/* Bug fix (recheck against artifact): gap below the dots is 40px
          (mt-xxl) in both Welcome-Light/Dark, not 32px (mt-xl). */}
      <Text
        className={cn(
          'uppercase mt-xxl mb-auto text-[13px] tracking-[2.1px] font-instrument',
          isDark ? 'text-onb-ink-body-dark' : 'text-onb-ink-body',
        )}
      >
        Raqm
      </Text>

      <View className="flex-grow justify-center gap-5">
        <Animated.Text
          entering={FadeInDown.duration(500).delay(100)}
          className={cn(
            'text-[40px] leading-[46px] font-newsreader-italic',
            isDark ? 'text-onb-ink-headline-dark' : 'text-onb-ink-headline',
          )}
        >
          Your money,{'\n'}read quietly.
        </Animated.Text>

        <Animated.Text
          entering={FadeInDown.duration(500).delay(200)}
          className={cn(
            'text-[16px] leading-[24px] max-w-[300px] font-instrument',
            isDark ? 'text-onb-ink-body-dark' : 'text-onb-ink-body',
          )}
        >
          {isAndroid
            ? 'Raqm reads your bank SMS on this phone. Nothing is uploaded, nothing is shared, no bank login, ever.'
            : 'Add a statement, set a budget, and Raqm keeps a quiet eye on your spend — no bank login, ever.'}
        </Animated.Text>
      </View>

      <Animated.View entering={FadeInDown.duration(500).delay(300)}>
        <GlassCard scheme={scheme}>
          <View className="gap-4">
            {/* Bug fix (recheck against artifact): every Welcome artboard
                (Android + iOS, light + dark) shows an arrow-right icon next
                to "Get started" — was missing entirely. */}
            <RqButton
              label="Get started"
              scheme={scheme}
              onPress={getStarted}
              icon={<Icon name="arrow-right" size={18} color={c.onAccent} />}
            />
            <Text
              className={cn(
                'text-[12px] text-center font-instrument',
                isDark ? 'text-onb-ink-body-dark' : 'text-onb-ink-body',
              )}
            >
              Private by design. No servers involved.
            </Text>
          </View>
        </GlassCard>
      </Animated.View>
    </View>
  );
}
