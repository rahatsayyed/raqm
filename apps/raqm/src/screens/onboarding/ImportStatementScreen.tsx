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
      style={{ flex: 1, backgroundColor: c.bgBase, paddingTop: insets.top + 16, paddingBottom: insets.bottom + Spacing.xl }}
      className="px-lg"
    >
      <View className="mb-lg">
        <StepDots total={5} filled={2} scheme={scheme} />
      </View>

      <Text style={{ fontFamily: 'Newsreader_400Regular_Italic', fontSize: 30, color: c.inkHeadline }} className="mb-xs">
        Add your first statement
      </Text>
      <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 15, lineHeight: 22, color: c.inkBody }} className="mb-lg">
        iPhone can't read bank SMS, so this is how Raqm learns your spend.
      </Text>

      <Animated.View entering={FadeInDown.duration(400)} style={{ flex: 1, justifyContent: 'center' }}>
        <GlassCard scheme={scheme}>
          <View style={{ alignItems: 'center', gap: 12 }}>
            <Icon name="file-pdf-box" size={40} color={c.accentPrimary} />
            <Text style={{ fontFamily: 'InstrumentSans_600SemiBold', fontSize: 14, color: c.inkHeadline, textAlign: 'center' }}>
              A bank or UPI app statement, as a PDF
            </Text>
            <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 12, color: c.inkBody, textAlign: 'center' }}>
              Parsed entirely on this device. Nothing is uploaded.
            </Text>
          </View>
        </GlassCard>
      </Animated.View>

      <View style={{ gap: 14 }}>
        <RqButton
          label="Import a PDF statement"
          scheme={scheme}
          onPress={() => navigation.navigate('GPayPdfImport')}
        />
        <Pressable onPress={() => navigation.navigate('BudgetSetup')}>
          <Text style={{ fontFamily: 'InstrumentSans_600SemiBold', fontSize: 13, color: c.accentPrimary, textAlign: 'center' }}>
            Enter accounts manually instead
          </Text>
        </Pressable>
        <Pressable onPress={() => navigation.navigate('BudgetSetup')}>
          <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 13, color: c.inkBody, textAlign: 'center' }}>
            Skip for now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
