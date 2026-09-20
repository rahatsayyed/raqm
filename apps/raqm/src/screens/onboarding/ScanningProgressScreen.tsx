import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Animated as RNAnimated, Easing, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BankParserFactory } from '@rahatsayyed/bank-sms-parser';
import { OnboardingScreenProps } from '../../navigation/types';
import { SmsReader } from '../../native/SmsReader';
import { useOnboardingStore, dateRangeToTimestamps } from '../../store/onboardingStore';
import { runDetectionJobs, matchSplitPayments } from '../../services/txIntelligence';
import { logEvent } from '../../services/logger';
import { StepDots } from '../../components/onboarding/StepDots';
import { GlassCard } from '../../components/onboarding/GlassCard';
import { useOnbColors } from '../../theme/onboardingColors';

// Onboarding-v3 redesign: matches the mockup's ScanningProgress-Dark/Light.
// Real scan logic (SMS read -> parse -> categorize -> detection jobs)
// is unchanged from the pre-redesign screen — only the presentation
// (glass card, count-up number, thin progress bar instead of a ring) changed.
export function ScanningProgressScreen({ navigation }: OnboardingScreenProps<'ScanningProgress'>) {
  const insets = useSafeAreaInsets();
  const { scheme, colors: c } = useOnbColors();
  const { dateRange, customFrom, customTo, setTransactions } = useOnboardingStore();
  const [smsCount, setSmsCount] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [status, setStatus] = useState('Reading messages');
  const progress = useRef(new RNAnimated.Value(0)).current;
  const [progressPct, setProgressPct] = useState(0);
  // Bug #5 fix: the final transaction count, known once parsing finishes but
  // used to drive the *displayed* count progressively as the bar animates,
  // instead of jumping straight to the total. A ref (not state) since the
  // progress listener reads it on every frame.
  const finalCountRef = useRef(0);

  useEffect(() => {
    const id = progress.addListener(({ value }) => {
      setProgressPct(value);
      setTxCount(Math.round(value * finalCountRef.current));
    });
    return () => progress.removeListener(id);
  }, [progress]);

  useEffect(() => {
    const run = async () => {
      try {
        const { from, to } = dateRangeToTimestamps(dateRange, customFrom, customTo);
        setStatus('Reading messages');

        const messages = await SmsReader.readInbox(from, to);
        setSmsCount(messages.length);

        setStatus('Extracting transactions');
        const parsed = [];
        for (const msg of messages) {
          if (!BankParserFactory.isKnownBankSender(msg.sender)) continue; // S5
          const tx = BankParserFactory.parse(msg.body, msg.sender, msg.timestamp);
          if (tx) parsed.push(tx);
        }
        // Final count known now — the progress listener above uses it to
        // grow the displayed number in sync with the bar, instead of the
        // number jumping to the total immediately while the bar keeps animating.
        finalCountRef.current = parsed.length;

        RNAnimated.timing(progress, {
          toValue: 1,
          duration: Math.max(2000, messages.length * 10),
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }).start();

        await setTransactions(parsed);
        setStatus(`Found ${parsed.length} transactions`);
        await runDetectionJobs();
        await matchSplitPayments();

        setTimeout(() => navigation.replace('ScanComplete'), 1200);
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
          finalCountRef.current = parsed.length;
          setTxCount(parsed.length);
          await setTransactions(parsed);
          setStatus(`Found ${parsed.length} transactions`);
          setTimeout(() => navigation.replace('ScanComplete'), 1200);
        } catch (retryError) {
          console.warn('Onboarding scan retry failed:', retryError);
          logEvent('error.caught', `ScanningProgressScreen retry: ${retryError instanceof Error ? retryError.message : String(retryError)}`);
          setStatus('Scan failed. You can re-scan later from More → Re-scan SMS.');
          setTimeout(() => navigation.replace('ScanComplete'), 2500);
        }
      }
    };

    run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View
      style={{ flex: 1, backgroundColor: c.bgBase, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
      className="px-lg"
    >
      <View style={{ marginBottom: 'auto' }}>
        <StepDots total={8} filled={4} scheme={scheme} />
      </View>

      <View style={{ flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 28 }}>
        <Text
          style={{ fontFamily: 'Newsreader_400Regular_Italic', fontSize: 26, color: c.inkHeadline, textAlign: 'center' }}
        >
          Reading your last 90 days
        </Text>

        <GlassCard scheme={scheme} style={{ width: '100%' }}>
          <View style={{ alignItems: 'center', gap: 18 }}>
            <Text style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 44, color: c.inkHeadline, letterSpacing: -0.9 }}>
              {txCount}
            </Text>
            <Text
              style={{
                fontFamily: 'InstrumentSans_400Regular',
                fontSize: 13,
                color: c.inkBody,
                textTransform: 'uppercase',
                letterSpacing: 1.5,
              }}
            >
              transactions found so far
            </Text>
            <View style={{ width: '100%', height: 6, borderRadius: 1, backgroundColor: c.borderSubtle, overflow: 'hidden' }}>
              <View
                style={{
                  width: `${Math.round(progressPct * 100)}%`,
                  height: '100%',
                  backgroundColor: c.accentPrimary,
                  borderRadius: 1,
                }}
              />
            </View>
          </View>
        </GlassCard>

        <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 13, color: c.inkBody, textAlign: 'center', maxWidth: 260 }}>
          {smsCount > 0 ? `Scanned ${smsCount} messages — everything happens on this device.` : 'Everything happens on this device. Nothing is sent anywhere.'}
        </Text>

        <Pressable onPress={() => navigation.replace('BudgetSetup')}>
          <Text
            style={{
              fontFamily: 'InstrumentSans_500Medium',
              fontSize: 13,
              color: c.inkBody,
              textDecorationLine: 'underline',
            }}
          >
            Continue in background
          </Text>
        </Pressable>
        <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 11, color: c.inkLabel, textAlign: 'center' }}>
          {status}
        </Text>
      </View>
    </View>
  );
}
