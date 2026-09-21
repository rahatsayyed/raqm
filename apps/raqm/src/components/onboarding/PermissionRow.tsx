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
      // Bug fix: backgroundColor lived only on the inner Pressable — on
      // Android, overflow:hidden + borderRadius on this outer View without
      // its own background made the card corners composite against
      // whatever sits behind the glass card, so the card read as
      // background-less. Setting it here too makes the card opaque
      // regardless of that clipping layer.
      style={{ flex: 1, borderRadius: 4, padding: 16, overflow: 'hidden', backgroundColor: c.bgSurface }}
    >
      <Pressable
        onPress={onGrant}
        disabled={granted}
        hitSlop={8}
        style={({ pressed }: { pressed: boolean }) => ({
          backgroundColor: c.bgSurface,
          padding: 16,
          gap: 10,
          opacity: pressed ? 0.85 : 1,
        })}
      >
        <View style={{display:'flex', gap: 6}}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          {/* Reduced from 24: the artifact's icons are thin 1.5px-stroke
              line art; MaterialCommunityIcons' outline glyphs render
              bolder at the same box size, so a smaller box reads closer
              to the artifact's actual visual weight. */}
          <Icon name={icon} size={18} color={strokeColor} />
          {granted ? (
            // Bug fix: the artifact's glyph is an 18x18 SVG with viewBox
            // "0 0 24 24" holding a r=9 circle — at that 18/24 scale the
            // circle renders at ~13.5px, not a full 18px. Was drawn at a
            // full 18px, ~30% too big.
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: c.accentPrimary, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="check" size={8} color={c.onAccent} />
            </View>
          ) : (
            // Literal artifact unchecked-ring stroke is rgba(20,20,20,0.2) light /
            // rgba(255,255,255,0.24) dark — a distinct, more visible value from the
            // shared borderSubtle token (0.08/0.12) used elsewhere, so applied literally.
            // Size: same ~13.5px-scaled-to-14 fix as the granted glyph above.
            <View
              style={{
                width: 14,
                height: 14,
                borderRadius: 7,
                borderWidth: 1.5,
                borderColor: scheme === 'dark' ? 'rgba(255,255,255,0.24)' : 'rgba(20,20,20,0.2)',
              }}
            />
          )}
        </View>
        <Text style={{ fontFamily: 'InstrumentSans_600SemiBold', fontSize: 13, color: c.inkHeadline }}>
          {title}
          {optional ? (
            <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 11, color: c.inkBody }}> · Optional</Text>
          ) : null}
        </Text>
        <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 11, lineHeight: 15, color: c.inkBody }}>{reason}</Text>
      </View>
      </Pressable>
    </Animated.View>
  );
}
