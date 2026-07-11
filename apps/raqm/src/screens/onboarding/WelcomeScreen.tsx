import React, { useEffect } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors, Spacing } from '../../theme';

const { width } = Dimensions.get('window');

// Colored/soft shadows aren't expressible as NativeWind classes — kept as style objects.
const logoShadow = {
  shadowColor: Colors.primary,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.15,
  shadowRadius: 24,
  elevation: 12,
};
const badgeShadow = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 6,
};
const ctaShadow = {
  shadowColor: Colors.primary,
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.3,
  shadowRadius: 20,
  elevation: 10,
};
// Positions computed from runtime screen width — not expressible as static classes.
const badgeLeftPos = { left: width * 0.08, top: '30%' as const };
const badgeRightPos = { right: width * 0.08, bottom: '25%' as const };
const ctaButtonWidth = { width: width - Spacing.containerMargin * 2 };

function useRevealUp(delayMs: number) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    const cfg = { duration: 800, easing: Easing.out(Easing.cubic) };
    opacity.value = withDelay(delayMs, withTiming(1, cfg));
    translateY.value = withDelay(delayMs, withTiming(0, cfg));
  }, []);

  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}

export function WelcomeScreen({ navigation }: OnboardingScreenProps<'Welcome'>) {
  // float on logo card — 4s ease-in-out infinite, -10px
  const floatY = useSharedValue(0);
  useEffect(() => {
    floatY.value = withRepeat(
      withTiming(-10, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
  }, []);
  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: floatY.value }],
  }));

  // badge float with slight offset to feel independent
  const badgeFloatY = useSharedValue(0);
  useEffect(() => {
    badgeFloatY.value = withDelay(
      600,
      withRepeat(
        withTiming(-8, { duration: 2400, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      ),
    );
  }, []);
  const badgeFloatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: badgeFloatY.value }],
  }));

  // staggered revealUp: headline, subtitle, cta, trust
  const s0 = useRevealUp(100);
  const s1 = useRevealUp(200);
  const s2 = useRevealUp(300);
  const s3 = useRevealUp(400);

  // button press scale
  const btnScale = useSharedValue(1);
  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  return (
    <View className="flex-1 bg-surface overflow-hidden">
      <View className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-primary opacity-[0.08]" />
      <View className="absolute -bottom-20 -left-20 w-[280px] h-[280px] rounded-full bg-primary-fixed opacity-[0.15]" />

      <View className="flex-1 items-center justify-center pt-15">
        <View className="absolute w-[260px] h-[260px] rounded-full border border-primary opacity-[0.15]" />
        <View className="absolute w-[200px] h-[200px] rounded-full border border-primary opacity-[0.12]" />
        <Animated.View
          className="w-28 h-28 rounded-3xl bg-surface-container-lowest items-center justify-center border border-[rgba(0,108,72,0.05)]"
          style={[logoShadow, floatStyle]}
        >
          <Text className="text-[40px] font-inter-bold text-primary">رقم</Text>
        </Animated.View>
        <Animated.View
          className="absolute bg-bg-surface-raised rounded-lg p-3 border border-border-subtle"
          style={[badgeShadow, badgeLeftPos, badgeFloatStyle]}
        >
          <Text className="text-2xl">💬</Text>
        </Animated.View>
        <Animated.View
          className="absolute bg-bg-surface-raised rounded-lg p-3 border border-border-subtle"
          style={[badgeShadow, badgeRightPos, floatStyle]}
        >
          <Text className="text-2xl">📊</Text>
        </Animated.View>
        <View
          className="absolute bg-bg-surface-raised rounded-lg p-2 border border-border-subtle right-[12%] top-[15%] opacity-60"
          style={badgeShadow}
        >
          <Text className="text-lg">👛</Text>
        </View>
      </View>

      <View className="px-container-margin pb-12 items-center">
        <Animated.Text className="font-inter-bold text-display-lg text-on-secondary-container text-center mb-md" style={s0}>
          Your finances,{'\n'}
          <Text className="text-primary">decoded</Text> from your SMS.
        </Animated.Text>
        <Animated.Text className="font-inter text-body-md text-on-surface-variant text-center opacity-80 mb-xxl max-w-[300px]" style={s1}>
          Automatically transform your transaction notifications into a beautifully organized
          spending dashboard. No bank logins, no manual entry.
        </Animated.Text>

        <Animated.View className="w-full items-center" style={s2}>
          <Animated.View style={btnStyle}>
            <Pressable
              className="max-w-[360px] h-16 rounded-xl bg-primary-container items-center justify-center mb-xl"
              style={[ctaButtonWidth, ctaShadow]}
              onPressIn={() => {
                btnScale.value = withTiming(0.95, { duration: 100 });
              }}
              onPressOut={() => {
                btnScale.value = withTiming(1, { duration: 150 });
              }}
              onPress={() => navigation.navigate('PermissionSMSRead')}
            >
              <Text className="font-inter-bold text-title-lg text-on-primary-container">Get Started →</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.View className="flex-row gap-xl opacity-60" style={s3}>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs">🔒</Text>
            <Text className="font-mono text-[10px] leading-4 tracking-[0.6px] text-on-surface-variant">PRIVACY FIRST</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Text className="text-xs">⚡</Text>
            <Text className="font-mono text-[10px] leading-4 tracking-[0.6px] text-on-surface-variant">INSTANT SETUP</Text>
          </View>
        </Animated.View>
      </View>

      <View className="absolute bottom-0 left-0 right-0 h-20 opacity-[0.04] bg-primary" />
    </View>
  );
}
