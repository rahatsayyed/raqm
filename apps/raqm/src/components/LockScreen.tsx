import React from 'react';
import { View, Text } from 'react-native';
import { RaqmLogo } from './RaqmLogo';
import { PrimaryButton } from './PrimaryButton';
import { Colors } from '../theme';

interface Props {
  /** Re-runs the OS auth prompt. The parent owns the auth call and the locked state. */
  onUnlock: () => void;
  /** True while an OS prompt is already in flight — keeps the button from double-firing. */
  busy?: boolean;
}

/**
 * Full-screen lock. There is deliberately no skip, no timeout auto-dismiss and
 * no navigation chrome — the only way past this screen is the parent's
 * successful `authenticateWithDevice` call. The explicit Unlock button exists
 * because the OS prompt can be dismissed (back button, tap-outside, failed
 * attempt), and without it the user would be stranded on a dead screen.
 */
export function LockScreen({ onUnlock, busy }: Props) {
  return (
    <View className="flex-1 bg-background items-center justify-center px-container-margin">
      <RaqmLogo size={72} variant="mono" color={Colors.primary} />
      <Text className="font-inter-bold text-headline-sm text-on-surface mt-lg">Unlock Raqm</Text>
      <Text className="font-inter text-body-standard text-on-surface-variant text-center mt-sm">
        Your transactions are locked. Use your fingerprint, PIN or pattern to continue.
      </Text>
      <View className="mt-xl w-full">
        <PrimaryButton label="Unlock" onPress={onUnlock} loading={busy} />
      </View>
    </View>
  );
}
