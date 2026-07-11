import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';

interface TrustItem {
  icon: string;
  title: string;
  subtitle: string;
}

interface Props {
  iconEmoji: string;
  headline: string;
  headlineAccent?: string;
  description: string;
  trustItems: TrustItem[];
  ctaLabel: string;
  onCTA: () => void;
  skipLabel?: string;
  onSkip?: () => void;
}

// Colored/soft shadows aren't expressible as NativeWind classes — kept as style objects.
const iconShadow = {
  shadowColor: Colors.primary,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.2,
  shadowRadius: 20,
  elevation: 10,
};
const badgeShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 6,
};
const footerShadow = {
  shadowColor: Colors.onTertiaryContainer,
  shadowOffset: { width: 0, height: -4 },
  shadowOpacity: 0.06,
  shadowRadius: 20,
  elevation: 8,
};
const ctaButtonStyle = { borderRadius: 16, height: 64 };

export function PermissionScreen({
  iconEmoji,
  headline,
  headlineAccent,
  description,
  trustItems,
  ctaLabel,
  onCTA,
  skipLabel,
  onSkip,
}: Props) {
  const headlineParts = headlineAccent ? headline.split(headlineAccent) : [headline];

  // float on icon — 6s ease-in-out infinite, -15px
  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withTiming(-15, { duration: 3000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);
  const iconFloatStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: '12deg' }, { translateY: floatY.value }],
  }));

  // bounce on badge — 3s, up/down -8px
  const bounceY = useSharedValue(0);
  useEffect(() => {
    bounceY.value = withDelay(
      800,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 500, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 500, easing: Easing.in(Easing.quad) }),
          withTiming(0, { duration: 1000 }), // pause between bounces
        ),
        -1,
      ),
    );
  }, []);
  const badgeBounceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: bounceY.value }],
  }));

  // button press scale
  const btnScale = useSharedValue(1);
  const btnAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  return (
    <View className="flex-1 bg-surface-container-low">
      <View className="absolute -top-15 -right-15 w-60 h-60 rounded-full bg-primary-container opacity-[0.15]" />
      <View className="absolute -bottom-15 -left-15 w-60 h-60 rounded-full bg-secondary-container opacity-[0.15]" />

      <View className="flex-1 items-center justify-center pt-12 relative">
        <View className="absolute w-[140px] h-[140px] rounded-full bg-primary opacity-[0.08]" />
        <Animated.View
          className="w-32 h-32 rounded-3xl bg-primary items-center justify-center"
          style={[iconShadow, iconFloatStyle]}
        >
          <View className="w-28 h-28 rounded-[28px] border-2 border-border-subtle items-center justify-center">
            <Text className="text-[52px]">{iconEmoji}</Text>
          </View>
        </Animated.View>
        <Animated.View
          className="absolute bg-bg-surface-raised rounded-xl p-3 top-[20%] right-[12%]"
          style={[badgeShadow, badgeBounceStyle]}
        >
          <Text className="text-2xl">✅</Text>
        </Animated.View>
        <View className="absolute bg-bg-surface-raised rounded-xl p-3 bottom-[15%] left-[8%]" style={badgeShadow}>
          <Text className="text-2xl">🏦</Text>
        </View>
      </View>

      <View className="px-container-margin pb-xl">
        <Text className="font-inter-bold text-display-lg text-on-surface mb-md">
          {headlineAccent ? (
            <>
              {headlineParts[0]}
              <Text className="text-primary italic">{headlineAccent}</Text>
              {headlineParts[1]}
            </>
          ) : (
            headline
          )}
        </Text>
        <Text className="font-inter text-body-lg text-on-surface-variant mb-xl">{description}</Text>

        <View className="gap-sm">
          {trustItems.map((item, i) => (
            <View
              key={i}
              className="flex-row items-center gap-md bg-bg-surface-raised rounded-xl p-md border border-border-subtle"
            >
              <View className="w-10 h-10 rounded-lg items-center justify-center bg-[#75daa81a]">
                <Text className="text-xl">{item.icon}</Text>
              </View>
              <View className="flex-1">
                <Text className="font-inter-medium text-[14px] leading-5 tracking-[0.7px] text-on-surface">{item.title}</Text>
                <Text className="font-mono text-[12px] leading-4 text-on-surface-variant">{item.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>

      <View
        className="p-container-margin pb-8 bg-surface-container rounded-t-xl gap-md"
        style={footerShadow}
      >
        <Animated.View style={btnAnimStyle}>
          <PrimaryButton
            label={ctaLabel}
            onPress={onCTA}
            style={ctaButtonStyle}
            onPressIn={() => { btnScale.value = withTiming(0.95, { duration: 100 }); }}
            onPressOut={() => { btnScale.value = withTiming(1, { duration: 150 }); }}
          />
        </Animated.View>
        {skipLabel && onSkip && (
          <TouchableOpacity onPress={onSkip} className="h-11 items-center justify-center">
            <Text className="font-inter text-body-md text-on-surface-variant">{skipLabel}</Text>
          </TouchableOpacity>
        )}
        <View className="items-center">
          <Text className="font-mono text-[11px] leading-4 text-on-surface-variant opacity-60">
            🔒 Your data is never shared with third parties
          </Text>
        </View>
      </View>
    </View>
  );
}
