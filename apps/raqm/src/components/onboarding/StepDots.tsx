import React from 'react';
import { View } from 'react-native';
import { OnbColors, type OnbScheme } from '../../theme/onboardingColors';

type StepDotsProps = { total: number; filled: number; scheme: OnbScheme };

// The mockup's progress indicator: a row of small rounded-rect segments
// filled left-to-right (DESIGN.md v3.0 §5 radius-dot, 1px). Replaces the
// "STEP N OF M" text counter for the 7 redesigned screens only —
// StepCounter.tsx is untouched and still used by the screens this redesign
// doesn't cover (AccountSelection, SignUp, NameEntry, OTPVerification,
// ManualAccountSetup). Segment counts/positions are the mockup's own
// literal per-screen values, not reconciled against the real 10-screen
// Android flow total — see this task's final report.
export function StepDots({ total, filled, scheme }: StepDotsProps) {
  const c = OnbColors[scheme];
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={{
            width: 20,
            height: 4,
            borderRadius: 1,
            backgroundColor: i < filled ? c.accentPrimary : c.dotInactive,
          }}
        />
      ))}
    </View>
  );
}
