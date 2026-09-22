import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { RqButton } from '../../components/onboarding/RqButton';
import { GlassCard } from '../../components/onboarding/GlassCard';
import { StepDots } from '../../components/onboarding/StepDots';
import { Icon } from '../../components/Icon';
import { useOnbColors } from '../../theme/onboardingColors';
import { Spacing } from '../../theme';

// iOS-only screen (2/5 of the iOS flow) — replaces Android's whole
// scan flow (Permissions/ScanRange/ScanningProgress/ScanComplete), since
// iOS has no SMS access at all. Matches the artifact's
// ImportStatement-iOS-Dark/Light.
export function ImportStatementScreen({ navigation }: OnboardingScreenProps<'ImportStatement'>) {
  const insets = useSafeAreaInsets();
  const { scheme, colors: c } = useOnbColors();

  return (
    <View
      style={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + Spacing.md }}
      className="flex-1 bg-onb-bg-base dark:bg-onb-bg-base-dark px-lg"
    >
      <View className="mb-lg">
        {/* Bug fix: artifact shows 4 dots (2 filled), not 5. */}
        <StepDots total={4} filled={2} scheme={scheme} />
      </View>

      <Text className="mb-xs text-[30px] font-newsreader-italic text-onb-ink-headline dark:text-onb-ink-headline-dark">
        Add your first statement
      </Text>
      <Text className="mb-lg text-[15px] leading-[22px] font-instrument text-onb-ink-body dark:text-onb-ink-body-dark">
        iPhone can't read bank SMS, so this is how Raqm learns your spend.
      </Text>

      <Animated.View entering={FadeInDown.duration(400)} className="flex-1 justify-center">
        <GlassCard scheme={scheme}>
          {/* Bug fix: artifact centers the card content (justify-content:
              center) with gap:16, and wraps the icon in a 56px tinted
              circular badge — none of that was here. */}
          <View className="items-center justify-center gap-4">
            <View className="w-14 h-14 rounded-full items-center justify-center bg-onb-accent-primary/10 dark:bg-onb-accent-primary-dark/[0.14]">
              <Icon name="file-document-outline" size={26} color={c.accentPrimary} />
            </View>
            <View className="items-center">
              <Text className="text-[13px] font-instrument-semibold text-onb-ink-headline dark:text-onb-ink-headline-dark text-center">
                A bank or UPI app statement, as a PDF
              </Text>
              {/* Bug fix: artifact copy is "Parsed on this device. Never
                  uploaded." with a 220px max-width, not this longer line. */}
              <Text
                className="mt-1.5 max-w-[220px] text-[11px] font-instrument leading-4 text-onb-ink-body dark:text-onb-ink-body-dark text-center"
              >
                Parsed on this device. Never uploaded.
              </Text>
            </View>
          </View>
        </GlassCard>
      </Animated.View>

      {/* Bug fix: artifact stacks the primary button FIRST, then two 11px
          underlined text links ("Enter accounts manually instead" was
          missing entirely) — gap:10/marginTop:16, not gap:14 with no top
          margin and only one link. */}
      <View className="mt-4 gap-2.5">
        <RqButton
          label="Import a PDF statement"
          scheme={scheme}
          onPress={() => navigation.navigate('GPayPdfImport')}
        />
        <Pressable onPress={() => navigation.navigate('ManualAccountSetup')}>
          <Text className="text-[11px] font-instrument underline text-onb-ink-body dark:text-onb-ink-body-dark text-center">
            Enter accounts manually instead
          </Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('BudgetSetup')}>
          <Text className="text-[11px] font-instrument underline text-onb-ink-body dark:text-onb-ink-body-dark text-center">
            Skip for now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
