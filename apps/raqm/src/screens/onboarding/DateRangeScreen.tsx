import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import { OnboardingScreenProps } from '../../navigation/types';
import { Icon } from '../../components/Icon';
import { StepDots } from '../../components/onboarding/StepDots';
import { RqButton } from '../../components/onboarding/RqButton';
import { GlassCard } from '../../components/onboarding/GlassCard';
import { useOnbColors } from '../../theme/onboardingColors';
import { cn } from '../../utils/cn';
import { useOnboardingStore, type DateRange as Range } from '../../store/onboardingStore';
import { SmsReader } from '../../native/SmsReader';

const PRESETS: { id: Exclude<Range, 'custom'>; label: string; icon: string }[] = [
  { id: 'all', label: 'All time', icon: 'infinity' },
  { id: '1year', label: 'Last 12 months', icon: 'calendar-outline' },
  { id: '6months', label: 'Last 6 months', icon: 'calendar-range-outline' },
  { id: '3months', label: 'Last 3 months', icon: 'flash-outline' },
];

function fmt(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Onboarding-v3 redesign: matches the mockup's ScanRange-Dark/Light — same
// "How far back should we look?" screen the real app calls DateRangeScreen.
export function DateRangeScreen({ navigation }: OnboardingScreenProps<'DateRange'>) {
  const insets = useSafeAreaInsets();
  const { scheme, colors: c } = useOnbColors();
  const { dateRange, setDateRange, customFrom, customTo, setCustomRange } = useOnboardingStore();
  const [selected, setSelected] = useState<Range>(dateRange);
  const [earliestTs, setEarliestTs] = useState<number | null>(null);

  const [pickingField, setPickingField] = useState<'from' | 'to' | null>(null);
  const [fromDate, setFromDate] = useState<Date>(customFrom ? new Date(customFrom) : new Date(Date.now() - 90 * 86_400_000));
  const [toDate, setToDate] = useState<Date>(customTo ? new Date(customTo) : new Date());

  useEffect(() => {
    SmsReader.getEarliestMessageDate()
      .then((ts) => {
        if (ts > 0) setEarliestTs(ts);
      })
      .catch(() => {});
  }, []);

  const handleSelect = (range: Range) => {
    setSelected(range);
    setDateRange(range);
  };

  const handleStart = () => {
    if (selected === 'custom') {
      setCustomRange(fromDate.getTime(), toDate.getTime());
    }
    navigation.replace('ScanningProgress');
  };

  const canStart = selected !== 'custom' || fromDate < toDate;

  const rows: { id: Range; label: string; icon: string }[] = [
    ...PRESETS,
    { id: 'custom', label: 'Custom range', icon: 'target' },
  ];

  return (
    <View
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
      className="flex-1 bg-onb-bg-base dark:bg-onb-bg-base-dark px-lg"
    >
      <View className="mb-lg">
        {/* Bug fix: design has 7 dots, not 8. */}
        <StepDots total={7} filled={3} scheme={scheme} />
      </View>

      <Text className="font-newsreader-italic text-[30px] text-onb-ink-headline dark:text-onb-ink-headline-dark mb-xs">
        How far back should we look?
      </Text>
      <Text className="font-instrument text-[15px] leading-[22px] text-onb-ink-body dark:text-onb-ink-body-dark mb-lg">
        You can change this anytime in Settings.
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <GlassCard scheme={scheme}>
          <View className="gap-2">
            {rows.map((row) => {
              const isSelected = selected === row.id;
              const subtitle =
                row.id === 'all' && earliestTs
                  ? `From ${fmt(earliestTs)}`
                  : row.id === 'custom'
                    ? 'Pick your own start and end date'
                    : undefined;
              return (
                <TouchableOpacity
                  key={row.id}
                  onPress={() => handleSelect(row.id)}
                  activeOpacity={0.8}
                  className={cn(
                    'rounded-inner p-md flex-row items-center justify-between',
                    isSelected ? 'bg-onb-accent-primary dark:bg-onb-accent-primary-dark' : 'bg-onb-bg-surface dark:bg-onb-bg-surface-dark',
                  )}
                >
                  <View className="flex-1 pr-3">
                    <Text
                      className={cn(
                        'font-instrument-semibold text-[14px]',
                        isSelected ? 'text-onb-on-accent dark:text-onb-on-accent-dark' : 'text-onb-ink-headline dark:text-onb-ink-headline-dark',
                      )}
                    >
                      {row.label}
                    </Text>
                    {subtitle && isSelected ? (
                      <Text
                        className={cn(
                          'font-instrument text-[12px] mt-0.5',
                          isSelected ? 'text-onb-on-accent dark:text-onb-on-accent-dark' : 'text-onb-ink-body dark:text-onb-ink-body-dark',
                        )}
                      >
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {row.id === 'custom' ? (
                    // Bug fix: design's chevron is 16x16, was 18.
                    <Icon name="chevron-right" size={16} color={isSelected ? c.onAccent : c.inkBody} />
                  ) : isSelected ? (
                    // Bug fix: design's status glyph is an 18x18 SVG with viewBox
                    // "0 0 24 24" holding a r=9 circle — at 18/24 scale that
                    // renders ~13.5px, not a full 18px (same fix already applied
                    // to PermissionRow.tsx this session).
                    <View className="w-[14px] h-[14px] rounded-[7px] bg-onb-on-accent dark:bg-onb-on-accent-dark items-center justify-center">
                      <Icon name="check" size={10} color={c.accentPrimary} />
                    </View>
                  ) : (
                    <View className="w-[14px] h-[14px] rounded-[7px] border-[1.5px] border-onb-border-subtle dark:border-onb-border-subtle-dark" />
                  )}
                </TouchableOpacity>
              );
            })}

            {selected === 'custom' && (
              <View className="bg-onb-bg-surface dark:bg-onb-bg-surface-dark rounded-inner overflow-hidden">
                <TouchableOpacity
                  onPress={() => setPickingField('from')}
                  className="flex-row justify-between px-md py-[14px]"
                >
                  <Text className="font-instrument text-[14px] text-onb-ink-body dark:text-onb-ink-body-dark">From</Text>
                  <Text className="font-instrument-semibold text-[14px] text-onb-accent-primary dark:text-onb-accent-primary-dark">
                    {fmt(fromDate.getTime())}
                  </Text>
                </TouchableOpacity>
                <View className="h-px bg-onb-border-subtle dark:bg-onb-border-subtle-dark mx-md" />
                <TouchableOpacity
                  onPress={() => setPickingField('to')}
                  className="flex-row justify-between px-md py-[14px]"
                >
                  <Text className="font-instrument text-[14px] text-onb-ink-body dark:text-onb-ink-body-dark">To</Text>
                  <Text className="font-instrument-semibold text-[14px] text-onb-accent-primary dark:text-onb-accent-primary-dark">
                    {fmt(toDate.getTime())}
                  </Text>
                </TouchableOpacity>
                {fromDate >= toDate && (
                  <Text className="font-instrument text-[12px] text-onb-error-muted dark:text-onb-error-muted-dark px-md pb-[10px]">
                    Start date must be before end date
                  </Text>
                )}
              </View>
            )}
          </View>
        </GlassCard>
      </ScrollView>

      {pickingField !== null && (
        <DateTimePicker
          value={pickingField === 'from' ? fromDate : toDate}
          mode="date"
          display="default"
          maximumDate={pickingField === 'from' ? toDate : new Date()}
          minimumDate={pickingField === 'to' ? fromDate : earliestTs ? new Date(earliestTs) : undefined}
          onValueChange={(_event, date) => {
            if (pickingField === 'from') setFromDate(date ?? fromDate);
            else setToDate(date ?? toDate);
            setPickingField(null);
          }}
          onDismiss={() => setPickingField(null)}
        />
      )}

      <View className="pt-lg">
        <RqButton label="Continue" scheme={scheme} onPress={handleStart} disabled={!canStart} />
      </View>
    </View>
  );
}
