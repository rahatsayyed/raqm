import React from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Icon } from '../Icon';
import { OnbColors, type OnbScheme } from '../../theme/onboardingColors';
import { cn } from '../../utils/cn';

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
  // Icon component takes a `color` prop, not a className — NativeWind can't
  // express that, so this resolved-color lookup stays (CLAUDE.md's
  // "style still applies for things NativeWind can't express" case).
  const strokeColor = iconColor === 'notice' ? c.notice : c.accentPrimary;

  // Bug #3 fix: the whole card is the tap target now, not just the small
  // status glyph — the glyph inside stays a plain View (visual status only).
  return (
    // Bug fix: padding lived on BOTH this View and the Pressable below (32px
    // total inset instead of the artifact's 16px) — removed here, kept once
    // on the Pressable.
    <Animated.View
      entering={FadeInDown.duration(300).delay(index * 80)}
      className="flex-1 rounded-inner overflow-hidden bg-onb-bg-surface dark:bg-onb-bg-surface-dark"
    >
      <Pressable
        onPress={onGrant}
        disabled={granted}
        hitSlop={8}
        className={cn('p-md', 'active:opacity-85')}
      >
        <View className="flex gap-[10px]">
          <View className="flex-row items-start justify-between">
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
              <View
                className={cn(
                  'h-[14px] w-[14px] items-center justify-center rounded-[7px]',
                  'bg-onb-accent-primary dark:bg-onb-accent-primary-dark',
                )}
              >
                <Icon name="check" size={8} color={c.onAccent} />
              </View>
            ) : (
              // Literal artifact unchecked-ring stroke is rgba(20,20,20,0.2)
              // light / rgba(255,255,255,0.24) dark — a distinct, more
              // visible value from the shared border-subtle token
              // (0.08/0.12) used elsewhere, so applied literally.
              <View className="h-[14px] w-[14px] rounded-[7px] border-[1.5px] border-[rgba(20,20,20,0.2)] dark:border-[rgba(255,255,255,0.24)]" />
            )}
          </View>
          <Text className="font-instrument-semibold text-[13px] text-onb-ink-headline dark:text-onb-ink-headline-dark">
            {title}
            {optional ? (
              <Text className="font-instrument text-[11px] text-onb-ink-body dark:text-onb-ink-body-dark"> · Optional</Text>
            ) : null}
          </Text>
          <Text className="font-instrument text-[11px] leading-[15px] text-onb-ink-body dark:text-onb-ink-body-dark">
            {reason}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}
