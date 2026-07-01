import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import ReAnimated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing as REasing,
} from 'react-native-reanimated';
import { BankParserFactory } from '@rahatsayyed/bank-sms-parser';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { SmsReader } from '../../native/SmsReader';
import { useOnboardingStore, dateRangeToTimestamps } from '../../store/onboardingStore';

const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

export function ScanningProgressScreen({ navigation }: OnboardingScreenProps<'ScanningProgress'>) {
  const { dateRange, customFrom, customTo, setTransactions } = useOnboardingStore();
  const [smsCount, setSmsCount] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [status, setStatus] = useState('Reading messages…');
  const progress = useRef(new Animated.Value(0)).current;

  // pulse rings
  const pulseScale = useSharedValue(0.95);
  const pulseOpacity = useSharedValue(0.8);
  useEffect(() => {
    const cfg = { duration: 1500, easing: REasing.bezier(0.4, 0, 0.6, 1) };
    pulseScale.value = withDelay(500, withRepeat(withSequence(withTiming(1.05, cfg), withTiming(0.95, cfg)), -1));
    pulseOpacity.value = withDelay(500, withRepeat(withSequence(withTiming(0.4, cfg), withTiming(0.8, cfg)), -1));
  }, []);
  const pulseOuterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
    opacity: pulseOpacity.value * 0.08,
  }));
  const pulseInnerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value * 0.96 }],
    opacity: pulseOpacity.value * 0.1,
  }));

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  useEffect(() => {
    const run = async () => {
      try {
        const { from, to } = dateRangeToTimestamps(dateRange, customFrom, customTo);
        setStatus('Reading messages…');

        const messages = await SmsReader.readInbox(from, to);
        setSmsCount(messages.length);
        setStatus(`Analyzing ${messages.length} messages…`);

        // animate progress ring over the parse duration
        Animated.timing(progress, {
          toValue: 1,
          duration: Math.max(2000, messages.length * 10),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();

        const parsed = [];
        for (const msg of messages) {
          const tx = BankParserFactory.parse(msg.body, msg.sender, msg.timestamp);
          if (tx) {
            parsed.push(tx);
            setTxCount(parsed.length);
          }
        }

        setTransactions(parsed);
        setStatus(`Found ${parsed.length} transactions`);

        setTimeout(() => navigation.replace('AccountSelection'), 1200);
      } catch (e) {
        setStatus('Could not read SMS. Check permissions.');
        setTimeout(() => navigation.replace('AccountSelection'), 2000);
      }
    };

    run();
  }, []);

  return (
    <View style={styles.container}>
      <ReAnimated.View style={[styles.pulseOuter, pulseOuterStyle]} />
      <ReAnimated.View style={[styles.pulseInner, pulseInnerStyle]} />

      <View style={styles.circleContainer}>
        <Svg width={220} height={220} viewBox="0 0 220 220">
          <Defs>
            <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={Colors.primary} />
              <Stop offset="100%" stopColor={Colors.secondary} />
            </LinearGradient>
          </Defs>
          <Circle cx={110} cy={110} r={RADIUS} fill="none" stroke={Colors.surfaceVariant} strokeWidth={8} />
          <AnimatedCircle
            cx={110} cy={110} r={RADIUS}
            fill="none"
            stroke="url(#grad)"
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            rotation="-90"
            origin="110, 110"
          />
        </Svg>
        <View style={styles.centerContent}>
          <Text style={styles.countText}>{txCount}</Text>
          <Text style={styles.countLabel}>Transactions found</Text>
        </View>
      </View>

      <View style={styles.statusArea}>
        <View style={styles.statusPill}>
          <Text style={styles.statusIcon}>⟳</Text>
          <Text style={styles.statusText}>{status}</Text>
        </View>
        <Text style={styles.statusHeadline}>Analyzing your messages for bank alerts</Text>
        <Text style={styles.statusSubtitle}>
          {smsCount > 0
            ? `Scanned ${smsCount} messages — extracting transactions.`
            : 'Securely identifying and categorizing financial notifications.'}
        </Text>
      </View>

      <View style={styles.bentoGrid}>
        <View style={styles.bentoCard}>
          <Text style={styles.bentoIcon}>🔐</Text>
          <Text style={styles.bentoTitle}>Secure Sync</Text>
          <Text style={styles.bentoSubtitle}>End-to-end encrypted local processing.</Text>
        </View>
        <View style={styles.bentoCard}>
          <Text style={styles.bentoIcon}>✨</Text>
          <Text style={styles.bentoTitle}>AI Sorting</Text>
          <Text style={styles.bentoSubtitle}>Auto-detecting merchants and categories.</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.containerMargin, paddingVertical: Spacing.xxl,
  },
  pulseOuter: {
    position: 'absolute', width: 280, height: 280, borderRadius: 140,
    backgroundColor: Colors.primary,
  },
  pulseInner: {
    position: 'absolute', width: 240, height: 240, borderRadius: 120,
    backgroundColor: Colors.primary,
  },
  circleContainer: {
    width: 220, height: 220, alignItems: 'center', justifyContent: 'center',
  },
  centerContent: { position: 'absolute', alignItems: 'center' },
  countText: {
    ...Typography.displayLg, color: Colors.primary,
    fontSize: 44, fontFamily: 'Manrope_700Bold',
  },
  countLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginTop: 4 },
  statusArea: { alignItems: 'center', marginTop: Spacing.xxl, gap: Spacing.sm },
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
    borderRadius: Radius.full, backgroundColor: Colors.secondaryContainer,
  },
  statusIcon: { fontSize: 14 },
  statusText: {
    ...Typography.labelLg, color: Colors.onSecondaryContainer, fontSize: 13, letterSpacing: 0,
  },
  statusHeadline: {
    ...Typography.titleLg, color: Colors.onSurface, textAlign: 'center', marginTop: Spacing.sm,
  },
  statusSubtitle: {
    ...Typography.bodySm, color: Colors.onSurfaceVariant, textAlign: 'center', maxWidth: 280,
  },
  bentoGrid: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xxl, width: '100%' },
  bentoCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: Radius.xl, padding: Spacing.md, gap: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  bentoIcon: { fontSize: 22 },
  bentoTitle: { ...Typography.labelLg, color: Colors.onSurface, fontSize: 13, letterSpacing: 0 },
  bentoSubtitle: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontSize: 10, letterSpacing: 0 },
});
