import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

interface AccountChipProps {
  bankName: string;
  last4: string | null;
  onPress: () => void;
}

/** Quiet account strip entry — bank name plus last-4 or "Account" fallback. */
export const AccountChip = React.memo(function AccountChip({ bankName, last4, onPress }: AccountChipProps) {
  return (
    <TouchableOpacity
      className="bg-bg-surface border border-border-subtle rounded-[12px] py-[8px] px-[16px] min-w-[130px]"
      activeOpacity={0.7}
      onPress={onPress}
    >
      <Text className="font-inter text-supporting-text text-on-surface" numberOfLines={1}>
        {bankName}
      </Text>
      <Text className="font-inter text-annotation text-ink-label mt-[2px]">{last4 ? `•••• ${last4}` : 'Account'}</Text>
    </TouchableOpacity>
  );
});
