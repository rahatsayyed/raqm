import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import ReAnimated, { FadeIn } from 'react-native-reanimated';
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

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

// ReAnimated.View isn't wrapped by NativeWind's interop — keep the static layout
// alongside the Reanimated-driven opacity in a single style array. I3 fix:
// these were an infinite withRepeat pulse (banned decorative motion per
// DESIGN.md §7/§15) — now a one-time fade-in entrance instead.
const pulseOuterBaseStyle = {
  position: 'absolute' as const,
  width: 280, height: 280, borderRadius: 140,
  backgroundColor: Colors.accentPrimary,
  opacity: 0.06,
};
const pulseInnerBaseStyle = {
  position: 'absolute' as const,
  width: 240, height: 240, borderRadius: 120,
  backgroundColor: Colors.accentPrimary,
  opacity: 0.08,
};

export function ScanningProgressScreen({ navigation }: OnboardingScreenProps<'ScanningProgress'>) {
  const { dateRange, customFrom, customTo, setTransactions } = useOnboardingStore();
  const [smsCount, setSmsCount] = useState(0);
  const [txCount, setTxCount] = useState(0);
  // I3 fix: single narration source (was previously duplicated between this
  // chip and a separate STEP_LABELS-driven heading with different wording).
  const [status, setStatus] = useState('Reading messages');
  const progress = useRef(new Animated.Value(0)).current;

  const strokeDashoffset = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  });

  useEffect(() => {
    const run = async () => {
      try {
        const { from, to } = dateRangeToTimestamps(dateRange, customFrom, customTo);
        setStatus('Reading messages');

        const messages = await SmsReader.readInbox(from, to);
        setSmsCount(messages.length);

        // animate progress ring over the parse duration
        Animated.timing(progress, {
          toValue: 1,
          duration: Math.max(2000, messages.length * 10),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();

        setStatus('Extracting transactions');
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
    <View className="flex-1 bg-bg-base items-center justify-center px-container-margin py-xxl">
      <ReAnimated.View entering={FadeIn.duration(400)} style={pulseOuterBaseStyle} />
      <ReAnimated.View entering={FadeIn.duration(400).delay(80)} style={pulseInnerBaseStyle} />

      <View className="w-[220px] h-[220px] items-center justify-center">
        <Svg width={220} height={220} viewBox="0 0 220 220">
          <Circle cx={110} cy={110} r={RADIUS} fill="none" stroke={Colors.borderSubtle} strokeWidth={8} />
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
          <Text className="font-mono-medium text-metric-hero text-accent-primary">{txCount}</Text>
          <Text className="font-inter text-body-sm text-ink-body mt-[4px]">Transactions found</Text>
        </View>
      </View>

      <View className="items-center mt-xxl gap-sm">
        {/* I3 fix: was bg-secondary-container/text-on-secondary-container — a
            retired amber/secondary-tier pill violating the "one accent only"
            rule. Neutral surface treatment instead. */}
        <View className="flex-row items-center gap-[6px] px-md py-[8px] rounded-full bg-bg-surface border border-border-subtle">
          <Icon name="reload" size={16} color={Colors.inkBody} />
          <Text className="font-mono-medium text-[13px] leading-[20px] text-ink-body">{status}</Text>
        </View>
        <Text className="font-inter-bold text-title-lg text-ink-headline text-center mt-sm">Analyzing your messages for bank alerts</Text>
        <Text className="font-inter text-body-sm text-ink-body text-center max-w-[280px]">
          {smsCount > 0
            ? `Scanned ${smsCount} messages — extracting transactions.`
            : 'Identifying and categorizing financial notifications.'}
        </Text>
      </View>
    </View>
  );
}
