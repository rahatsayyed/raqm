import React, { useEffect, useState } from 'react';
import { View, Text, Pressable } from 'react-native';
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
import { cn } from '../../utils/cn';

// Onboarding-v3 redesign: matches the mockup's ScanningProgress-Dark/Light.
// Real scan logic (SMS read -> parse -> categorize -> detection jobs)
// is unchanged from the pre-redesign screen — only the presentation
// (glass card, count-up number, thin progress bar instead of a ring) changed.
export function ScanningProgressScreen({ navigation }: OnboardingScreenProps<'ScanningProgress'>) {
  const insets = useSafeAreaInsets();
  const { scheme } = useOnbColors();
  const isDark = scheme === 'dark';
  const { dateRange, customFrom, customTo, setTransactions } = useOnboardingStore();
  const [smsCount, setSmsCount] = useState(0);
  const [txCount, setTxCount] = useState(0);
  const [status, setStatus] = useState('Reading messages');
  // Real progress (0..1), driven by insertParsedTxs's onProgress callback — not a
  // guessed elapsed-time animation. The bar and counter only reach 100%/final count
  // when the actual DB writes + categorization are done (bug: they used to finish
  // early on a fixed-duration animation while sequential categorization kept running
  // underneath, so the screen stalled after the bar looked "done").
  const [progressPct, setProgressPct] = useState(0);

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

        setStatus('Categorizing transactions');
        await setTransactions(parsed, (fraction) => {
          setProgressPct(fraction);
          setTxCount(Math.round(fraction * parsed.length));
        });
        setProgressPct(1);
        setTxCount(parsed.length);
        setStatus(`Found ${parsed.length} transactions`);
        await runDetectionJobs();
        await matchSplitPayments();

        // Real work is done — the bar/counter are already genuinely at 100%/final
        // count above. This is just a short beat so the 100% state is perceivable
        // before the transition, not a stand-in for unfinished work.
        setTimeout(() => navigation.replace('ScanComplete'), 300);
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
          await setTransactions(parsed, (fraction) => {
            setProgressPct(fraction);
            setTxCount(Math.round(fraction * parsed.length));
          });
          setProgressPct(1);
          setTxCount(parsed.length);
          setStatus(`Found ${parsed.length} transactions`);
          setTimeout(() => navigation.replace('ScanComplete'), 300);
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
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
      className={cn('flex-1 px-[20px]', isDark ? 'bg-onb-bg-base-dark' : 'bg-onb-bg-base')}
    >
      <View className="mb-auto">
        <StepDots total={8} filled={4} scheme={scheme} />
      </View>

      <View className="flex-grow items-center justify-center gap-[28px]">
        <Text
          className={cn(
            'font-newsreader-italic text-[26px] text-center',
            isDark ? 'text-onb-ink-headline-dark' : 'text-onb-ink-headline',
          )}
        >
          Reading your last 90 days
        </Text>

        <GlassCard scheme={scheme} style={{ width: '100%' }}>
          <View className="items-center gap-[18px]">
            <Text
              className={cn(
                'font-mono-medium text-[44px] tracking-[-0.9px]',
                isDark ? 'text-onb-ink-headline-dark' : 'text-onb-ink-headline',
              )}
            >
              {txCount}
            </Text>
            <Text
              className={cn(
                'font-instrument text-[13px] uppercase tracking-[1.5px]',
                isDark ? 'text-onb-ink-body-dark' : 'text-onb-ink-body',
              )}
            >
              transactions found so far
            </Text>
            {/* Bug fix while migrating: track background was c.borderSubtle
                (0.08 light / 0.12 dark) — the artifact's progress track is
                rgba(20,20,20,0.08) light / rgba(255,255,255,0.1) dark, a
                distinct one-off value from the shared border token. */}
            <View
              className={cn(
                'w-full h-[6px] rounded-dot overflow-hidden',
                isDark ? 'bg-[rgba(255,255,255,0.1)]' : 'bg-[rgba(20,20,20,0.08)]',
              )}
            >
              <View
                style={{ width: `${Math.round(progressPct * 100)}%` }}
                className={cn('h-full rounded-dot', isDark ? 'bg-onb-accent-primary-dark' : 'bg-onb-accent-primary')}
              />
            </View>
          </View>
        </GlassCard>

        <Text
          className={cn(
            'font-instrument text-[13px] text-center max-w-[260px]',
            isDark ? 'text-onb-ink-body-dark' : 'text-onb-ink-body',
          )}
        >
          {smsCount > 0 ? `Scanned ${smsCount} messages — everything happens on this device.` : 'Everything happens on this device. Nothing is sent anywhere.'}
        </Text>

        <Pressable onPress={() => navigation.replace('BudgetSetup')}>
          <Text
            className={cn(
              'font-instrument-medium text-[13px] underline',
              isDark ? 'text-onb-ink-body-dark' : 'text-onb-ink-body',
            )}
          >
            Continue in background
          </Text>
        </Pressable>
        <Text
          className={cn('font-instrument text-[11px] text-center', isDark ? 'text-onb-ink-label-dark' : 'text-onb-ink-label')}
        >
          {status}
        </Text>
      </View>
    </View>
  );
}
