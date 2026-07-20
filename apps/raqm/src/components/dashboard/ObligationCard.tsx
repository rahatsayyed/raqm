import React from 'react';
import { View, Text } from 'react-native';

interface ObligationCardProps {
  dueLabel: string;
  soon?: boolean;
  name: string;
  amountLabel: string;
}

/** Single upcoming-obligation card for the horizontal-scroll strip. */
export const ObligationCard = React.memo(function ObligationCard({ dueLabel, soon, name, amountLabel }: ObligationCardProps) {
  return (
    <View className="min-w-[180px] bg-bg-surface-raised border border-border-subtle rounded-[12px] p-[16px]">
      <Text className={`font-inter-semibold text-label-caps mb-[16px] ${soon ? 'text-secondary' : 'text-ink-label'}`}>{dueLabel}</Text>
      <Text className="font-inter text-body-standard text-on-surface mb-[4px]" numberOfLines={1}>
        {name}
      </Text>
      <Text className="font-mono-medium text-numeric-md text-on-surface">{amountLabel}</Text>
    </View>
  );
});
