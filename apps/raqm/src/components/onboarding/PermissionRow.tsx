import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Icon } from '../Icon';
import { OnbColors, type OnbScheme } from '../../theme/onboardingColors';

type PermissionRowProps = {
  icon: React.ComponentProps<typeof Icon>['name'];
  iconColor?: 'accent' | 'notice';
  title: string;
  reason: string;
  optional?: boolean;
  granted: boolean;
  onGrant: () => void;
  index: number; // for stagger delay
  scheme: OnbScheme;
};

// Onboarding-v3 redesign: a 2-column grid of cards (was a single-column
// list row) — matches the mockup's Permissions-Dark/Light layout. Granted
// state is now a circular glyph (empty ring → filled circle + checkmark),
// not a colored text pill (implementation-notes.md §2, purely visual).
export function PermissionRow({
  icon,
  iconColor = 'accent',
  title,
  reason,
  optional,
  granted,
  onGrant,
  index,
  scheme,
}: PermissionRowProps) {
  const c = OnbColors[scheme];
  const strokeColor = iconColor === 'notice' ? c.notice : c.accentPrimary;

  // Bug #3 fix: the whole card is the tap target now, not just the small
  // status glyph — the glyph inside stays a plain View (visual status only).
  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(index * 80)}
      style={{ flex: 1, borderRadius: 4, overflow: 'hidden' }}
    >
      <Pressable
        onPress={onGrant}
        disabled={granted}
        hitSlop={8}
        style={({ pressed }: { pressed: boolean }) => [
          { backgroundColor: c.bgSurface, padding: 16, gap: 10, opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Icon name={icon} size={22} color={strokeColor} />
          {granted ? (
            <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c.accentPrimary, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={13} color={c.onAccent} />
            </View>
          ) : (
            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: c.borderSubtle }} />
          )}
        </View>
        <Text style={{ fontFamily: 'InstrumentSans_600SemiBold', fontSize: 13, color: c.inkHeadline }}>
          {title}
          {optional ? (
            <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 11, color: c.inkBody }}> · Optional</Text>
          ) : null}
        </Text>
        <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 11, lineHeight: 15, color: c.inkBody }}>{reason}</Text>
      </Pressable>
    </Animated.View>
  );
}
