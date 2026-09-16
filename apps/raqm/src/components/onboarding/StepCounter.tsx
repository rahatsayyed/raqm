import React from 'react';
import { View, Text } from 'react-native';

type StepCounterProps = { step: number; totalSteps: number };

// DESIGN.md v2.0 §3/§1: a plain text counter, not dots or a progress bar —
// "minimal by default" while still giving the visible-progress signal
// research shows correlates with onboarding completion.
export function StepCounter({ step, totalSteps }: StepCounterProps) {
  return (
    <View className="mb-md">
      <Text className="font-inter-semibold text-label-caps text-ink-label">
        STEP {step} OF {totalSteps}
      </Text>
    </View>
  );
}
