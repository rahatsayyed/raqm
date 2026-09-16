import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
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
import { Colors } from '../../theme';
import { SmsReader } from '../../native/SmsReader';
import { useOnboardingStore, dateRangeToTimestamps } from '../../store/onboardingStore';
import { runDetectionJobs, matchSplitPayments } from '../../services/txIntelligence';
import { logEvent } from '../../services/logger';
import { Icon } from '../../components/Icon';

const RADIUS = 90;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const STEP_LABELS = ['Reading messages', 'Extracting transactions', 'Categorizing'];

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ReAnimated.View isn't wrapped by NativeWind's interop — keep the static layout
// alongside the Reanimated-driven transform/opacity in a single style array.
const pulseOuterBaseStyle = {
  position: 'absolute' as const,
  width: 280, height: 280, borderRadius: 140,
  backgroundColor: Colors.primary,
};
const pulseInnerBaseStyle = {
  position: 'absolute' as const,
  width: 240, height: 240, borderRadius: 120,
  backgroundColor: Colors.primary,
};

export function ScanningProgressScreen({ navigation }: OnboardingScreenProps<'ScanningProgress'>) {
  const { dateRange, customFrom, customTo, setTransactions } = useOnboardingStore();
  const [smsCount, setSmsCount] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [status, setStatus] = useState('Reading messages…');
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
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
        setCurrentStepIndex(0);

        const messages = await SmsReader.readInbox(from, to);
        setSmsCount(messages.length);

        // animate progress ring over the parse duration
        Animated.timing(progress, {
          toValue: 1,
          duration: Math.max(2000, messages.length * 10),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();

        setCurrentStepIndex(1);
        const parsed = [];
        for (const msg of messages) {
          if (!BankParserFactory.isKnownBankSender(msg.sender)) continue; // S5
          const tx = BankParserFactory.parse(msg.body, msg.sender, msg.timestamp);
          if (tx) {
            parsed.push(tx);
            setTxCount(parsed.length);
          }
        }

        await setTransactions(parsed);
        setCurrentStepIndex(2);
        setStatus(`Found ${parsed.length} transactions`);
        await runDetectionJobs();
        await matchSplitPayments();

        setTimeout(() => navigation.replace('AccountSelection'), 1200);
      } catch (e) {
        // Don't silently land on an empty AccountSelection pretending success —
        // surface the failure and give the DB write a second chance before moving on.
        console.warn('Onboarding scan failed:', e);
        logEvent('error.caught', `ScanningProgressScreen onboarding scan: ${e instanceof Error ? e.message : String(e)}`);
        setStatus('Something went wrong while saving. Retrying…');
        try {
          const { from, to } = dateRangeToTimestamps(dateRange, customFrom, customTo);
          const messages = await SmsReader.readInbox(from, to);
          const parsed = [];
          for (const msg of messages) {
            if (!BankParserFactory.isKnownBankSender(msg.sender)) continue;
            const tx = BankParserFactory.parse(msg.body, msg.sender, msg.timestamp);
            if (tx) parsed.push(tx);
          }
          await setTransactions(parsed);
          setStatus(`Found ${parsed.length} transactions`);
          setTimeout(() => navigation.replace('AccountSelection'), 1200);
        } catch (retryError) {
          console.warn('Onboarding scan retry failed:', retryError);
          logEvent('error.caught', `ScanningProgressScreen retry: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
          setStatus('Scan failed. You can re-scan later from More → Re-scan SMS.');
          setTimeout(() => navigation.replace('AccountSelection'), 2500);
        }
      }
    };

    run();
  }, []);

  return (
    <View className="flex-1 bg-surface items-center justify-center px-container-margin py-xxl">
      <ReAnimated.View
        style={[pulseOuterBaseStyle, pulseOuterStyle]}
      />
      <ReAnimated.View
        style={[pulseInnerBaseStyle, pulseInnerStyle]}
      />

      <View className="w-[220px] h-[220px] items-center justify-center">
        <Svg width={220} height={220} viewBox="0 0 220 220">
          <Circle cx={110} cy={110} r={RADIUS} fill="none" stroke={Colors.surfaceVariant} strokeWidth={8} />
          <AnimatedCircle
            cx={110} cy={110} r={RADIUS}
            fill="none"
            stroke={Colors.accentPrimary}
            strokeWidth={8}
            strokeLinecap="round"
            strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
            strokeDashoffset={strokeDashoffset}
            rotation="-90"
            origin="110, 110"
          />
        </Svg>
        <View className="absolute items-center">
          <Text className="font-mono-medium text-metric-hero text-primary">{txCount}</Text>
          <Text className="font-inter text-body-sm text-on-surface-variant mt-[4px]">Transactions found</Text>
        </View>
      </View>

      <View className="items-center mt-xxl gap-sm">
        <View className="flex-row items-center gap-[6px] px-md py-[8px] rounded-full bg-secondary-container">
          <Icon name="reload" size={16} color={Colors.onSecondaryContainer} />
          <Text className="font-mono-medium text-[13px] leading-[20px] text-on-secondary-container">{status}</Text>
        </View>
        <Text className="font-inter-bold text-title-lg text-on-surface text-center mt-sm">Analyzing your messages for bank alerts</Text>
        <Text className="font-inter text-body-sm text-on-surface-variant text-center max-w-[280px]">
          {smsCount > 0
            ? `Scanned ${smsCount} messages — extracting transactions.`
            : 'Identifying and categorizing financial notifications.'}
        </Text>
      </View>

      <View className="items-center mt-xxl gap-sm">
        <Text className="font-inter-semibold text-body-standard text-ink-headline">
          {STEP_LABELS[currentStepIndex]}
        </Text>
      </View>
    </View>
  );
}
