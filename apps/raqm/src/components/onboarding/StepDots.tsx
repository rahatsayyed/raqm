import React from 'react';
import { View } from 'react-native';
import { cn } from '../../utils/cn';
import type { OnbScheme } from '../../theme/onboardingColors';

type StepDotsProps = { total: number; filled: number; scheme: OnbScheme };

// The mockup's progress indicator: a row of small rounded-rect segments
// filled left-to-right (DESIGN.md v3.0 §5 radius-dot, 1px). Replaces the
// "STEP N OF M" text counter for every onboarding-v3 screen (Android's 8 +
// iOS's 5, including NameEntry as of the fixes pass). StepCounter.tsx is
// untouched and still used only by the orphaned legacy screens this
// redesign doesn't route through (AccountSelection, SignUp,
// OTPVerification, ManualAccountSetup). Colors now come from tailwind's
// onb-* tokens keyed off `scheme` (explicit ternary, matching RqButton's
// convention), not the OnbColors runtime lookup.
export function StepDots({ total, filled, scheme }: StepDotsProps) {
  const isDark = scheme === 'dark';
  return (
    <View className="flex-row gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          className={cn(
            'w-5 h-1 rounded-dot',
            i < filled
              ? isDark
                ? 'bg-onb-accent-primary-dark'
                : 'bg-onb-accent-primary'
              : isDark
                ? 'bg-onb-dot-inactive-dark'
                : 'bg-onb-dot-inactive',
          )}
        />
      ))}
    </View>
  );
}
