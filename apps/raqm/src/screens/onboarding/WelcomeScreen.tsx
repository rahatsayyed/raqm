import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';

const { width } = Dimensions.get('window');

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
    <View style={styles.container}>
      <View style={styles.orbTopRight} />
      <View style={styles.orbBottomLeft} />

      <View style={styles.illustrationArea}>
        <View style={styles.outerRing} />
        <View style={styles.innerRing} />
        <Animated.View style={[styles.logoCard, floatStyle]}>
          <Text style={styles.logoText}>رقم</Text>
        </Animated.View>
        <Animated.View style={[styles.floatingBadge, styles.badgeLeft, badgeFloatStyle]}>
          <Text style={styles.badgeIcon}>💬</Text>
        </Animated.View>
        <Animated.View style={[styles.floatingBadge, styles.badgeRight, floatStyle]}>
          <Text style={styles.badgeIcon}>📊</Text>
        </Animated.View>
        <View style={[styles.floatingBadge, styles.badgeTopRight, styles.badgeSmall]}>
          <Text style={styles.badgeIconSm}>👛</Text>
        </View>
      </View>

      <View style={styles.content}>
        <Animated.Text style={[styles.headline, s0]}>
          Your finances,{'\n'}
          <Text style={styles.headlineAccent}>decoded</Text> from your SMS.
        </Animated.Text>
        <Animated.Text style={[styles.subtitle, s1]}>
          Automatically transform your transaction notifications into a beautifully organized
          spending dashboard. No bank logins, no manual entry.
        </Animated.Text>

        <Animated.View style={[{ width: '100%', alignItems: 'center' }, s2]}>
          <Animated.View style={btnStyle}>
            <Pressable
              style={styles.ctaButton}
              onPressIn={() => {
                btnScale.value = withTiming(0.95, { duration: 100 });
              }}
              onPressOut={() => {
                btnScale.value = withTiming(1, { duration: 150 });
              }}
              onPress={() => navigation.navigate('PermissionSMSRead')}
            >
              <Text style={styles.ctaLabel}>Get Started →</Text>
            </Pressable>
          </Animated.View>
        </Animated.View>

        <Animated.View style={[styles.trustRow, s3]}>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>🔒</Text>
            <Text style={styles.trustText}>PRIVACY FIRST</Text>
          </View>
          <View style={styles.trustItem}>
            <Text style={styles.trustIcon}>⚡</Text>
            <Text style={styles.trustText}>INSTANT SETUP</Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.bottomOverlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
    overflow: 'hidden',
  },
  orbTopRight: {
    position: 'absolute', top: -80, right: -80,
    width: 320, height: 320, borderRadius: 160,
    backgroundColor: Colors.primary, opacity: 0.08,
  },
  orbBottomLeft: {
    position: 'absolute', bottom: -80, left: -80,
    width: 280, height: 280, borderRadius: 140,
    backgroundColor: Colors.primaryFixed, opacity: 0.15,
  },
  illustrationArea: {
    flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60,
  },
  outerRing: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    borderWidth: 1, borderColor: Colors.primary, opacity: 0.15,
  },
  innerRing: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    borderWidth: 1, borderColor: Colors.primary, opacity: 0.12,
  },
  logoCard: {
    width: 112, height: 112, borderRadius: 32,
    backgroundColor: Colors.surfaceContainerLowest,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15, shadowRadius: 24, elevation: 12,
    borderWidth: 1, borderColor: 'rgba(0,108,72,0.05)',
  },
  logoText: { fontSize: 40, fontFamily: 'Manrope_700Bold', color: Colors.primary },
  floatingBadge: {
    position: 'absolute',
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: Radius.lg, padding: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  badgeLeft: { left: width * 0.08, top: '30%' },
  badgeRight: { right: width * 0.08, bottom: '25%' },
  badgeTopRight: { right: width * 0.12, top: '15%', opacity: 0.6 },
  badgeSmall: { padding: 8 },
  badgeIcon: { fontSize: 24 },
  badgeIconSm: { fontSize: 18 },
  content: {
    paddingHorizontal: Spacing.containerMargin,
    paddingBottom: 48,
    alignItems: 'center',
  },
  headline: {
    ...Typography.displayLg,
    color: Colors.onSecondaryContainer,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  headlineAccent: { color: Colors.primary },
  subtitle: {
    ...Typography.bodyMd,
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: Spacing.xxl,
    maxWidth: 300,
  },
  ctaButton: {
    width: width - Spacing.containerMargin * 2,
    maxWidth: 360,
    height: 64,
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
    marginBottom: Spacing.xl,
  },
  ctaLabel: {
    ...Typography.titleLg,
    color: Colors.onPrimaryContainer,
    fontSize: 18,
  },
  trustRow: { flexDirection: 'row', gap: Spacing.xl, opacity: 0.6 },
  trustItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  trustIcon: { fontSize: 12 },
  trustText: {
    ...Typography.labelSm, color: Colors.onSurfaceVariant, fontSize: 10,
  },
  bottomOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 80, opacity: 0.04, backgroundColor: Colors.primary,
  },
});
