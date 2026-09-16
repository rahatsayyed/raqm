import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { OnboardingScreenProps } from '../../navigation/types';
import { PrimaryButton } from '../../components/PrimaryButton';
import { Icon } from '../../components/Icon';
import { StepCounter } from '../../components/onboarding/StepCounter';
import { useOnboardingStore, type DateRange as Range } from '../../store/onboardingStore';
import { SmsReader } from '../../native/SmsReader';
import { Colors, Shadows } from '../../theme';

const PRESETS: { id: Exclude<Range, 'custom'>; label: string; subtitle: string; icon: string; recommended?: boolean }[] = [
  { id: 'all', label: 'All time', subtitle: 'Complete transaction history', icon: 'infinity' },
  { id: '1year', label: 'Last 1 year', subtitle: 'Full annual overview', icon: 'calendar-outline' },
  { id: '6months', label: 'Last 6 months', subtitle: 'Better for seasonal trends', icon: 'calendar-range-outline' },
  { id: '3months', label: 'Last 3 months', subtitle: 'Recommended for speed', icon: 'flash-outline', recommended: true },
];

function fmt(ts: number) {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DateRangeScreen({ navigation }: OnboardingScreenProps<'DateRange'>) {
  const { dateRange, setDateRange, customFrom, customTo, setCustomRange } = useOnboardingStore();
  const [selected, setSelected] = useState<Range>(dateRange);
  const [earliestTs, setEarliestTs] = useState<number | null>(null);

  // custom picker state
  const [pickingField, setPickingField] = useState<'from' | 'to' | null>(null);
  const [fromDate, setFromDate] = useState<Date>(customFrom ? new Date(customFrom) : new Date(Date.now() - 90 * 86_400_000));
  const [toDate, setToDate] = useState<Date>(customTo ? new Date(customTo) : new Date());

  useEffect(() => {
    SmsReader.getEarliestMessageDate().then((ts) => {
      if (ts > 0) setEarliestTs(ts);
    }).catch(() => {});
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

  const canStart = selected !== 'custom' || (fromDate < toDate);

  return (
    <View className="flex-1 bg-bg-base">
      <ScrollView contentContainerClassName="px-container-margin pt-[56px] pb-xl" showsVerticalScrollIndicator={false}>
        <StepCounter step={3} totalSteps={10} />
        <Text className="font-inter-bold text-display-lg text-ink-headline mb-md">How far back{'\n'}should we look?</Text>
        <Text className="font-inter text-body-md text-ink-body mb-lg">
          We'll analyze your SMS messages to categorize your spending history.
        </Text>

        {earliestTs !== null && (
          <View className="bg-bg-surface rounded-lg px-md py-sm mb-lg flex-row items-center gap-sm">
            <Icon name="email-outline" size={16} color={Colors.inkBody} />
            <Text className="font-inter text-body-sm text-ink-body flex-1">
              Earliest SMS on device: <Text className="font-inter-medium">{fmt(earliestTs)}</Text>
            </Text>
          </View>
        )}

        <View className="gap-sm mb-xl">
          {PRESETS.map((range) => {
            const isSelected = selected === range.id;
            const subtitle = range.id === 'all' && earliestTs
              ? `From ${fmt(earliestTs)}`
              : range.subtitle;
            return (
              <TouchableOpacity
                key={range.id}
                className={`flex-row items-center justify-between bg-bg-surface border rounded-xl p-md ${isSelected ? 'border-accent-primary bg-accent-primary' : 'border-border-subtle'}`}
                style={isSelected ? Shadows.card : undefined}
                onPress={() => handleSelect(range.id)}
                activeOpacity={0.8}
              >
                <View className="flex-row items-center gap-md">
                  <View className={`w-[48px] h-[48px] rounded-lg items-center justify-center ${isSelected ? 'bg-accent-primary/[0.08]' : 'bg-bg-surface'}`}>
                    <Icon name={range.icon as any} size={22} color={isSelected ? Colors.accentPrimary : Colors.inkBody} />
                  </View>
                  <View>
                    <Text className="font-inter-bold text-[16px] leading-[26px] text-ink-headline">
                      {range.label}
                    </Text>
                    <Text className={`font-inter text-body-sm text-ink-body ${range.recommended ? 'text-accent-primary font-inter-medium' : ''}`}>
                      {subtitle}
                    </Text>
                  </View>
                </View>
                <View className={`w-[22px] h-[22px] rounded-full border-2 items-center justify-center ${isSelected ? 'border-accent-primary' : 'border-border-subtle'}`}>
                  {isSelected && <View className="w-[10px] h-[10px] rounded-full bg-accent-primary" />}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Custom range card */}
          <TouchableOpacity
            className={`flex-row items-center justify-between bg-bg-surface border rounded-xl p-md ${selected === 'custom' ? 'border-accent-primary bg-accent-primary' : 'border-border-subtle'}`}
            style={selected === 'custom' ? Shadows.card : undefined}
            onPress={() => handleSelect('custom')}
            activeOpacity={0.8}
          >
            <View className="flex-row items-center gap-md">
              <View className={`w-[48px] h-[48px] rounded-lg items-center justify-center ${selected === 'custom' ? 'bg-accent-primary/[0.08]' : 'bg-bg-surface'}`}>
                <Icon name="target" size={22} color={selected === 'custom' ? Colors.accentPrimary : Colors.inkBody} />
              </View>
              <View>
                <Text className="font-inter-bold text-[16px] leading-[26px] text-ink-headline">
                  Custom range
                </Text>
                <Text className="font-inter text-body-sm text-ink-body">Pick your own start and end date</Text>
              </View>
            </View>
            <View className={`w-[22px] h-[22px] rounded-full border-2 items-center justify-center ${selected === 'custom' ? 'border-accent-primary' : 'border-border-subtle'}`}>
              {selected === 'custom' && <View className="w-[10px] h-[10px] rounded-full bg-accent-primary" />}
            </View>
          </TouchableOpacity>

          {selected === 'custom' && (
            <View className="mt-xs bg-bg-surface border border-border-subtle rounded-xl overflow-hidden">
              <TouchableOpacity className="flex-row items-center justify-between px-md py-md" onPress={() => setPickingField('from')}>
                <Text className="font-inter text-body-md text-ink-body">From</Text>
                <Text className="text-body-md text-accent-primary font-inter-medium">{fmt(fromDate.getTime())}</Text>
              </TouchableOpacity>
              <View className="h-[1px] bg-border-subtle mx-md" />
              <TouchableOpacity className="flex-row items-center justify-between px-md py-md" onPress={() => setPickingField('to')}>
                <Text className="font-inter text-body-md text-ink-body">To</Text>
                <Text className="text-body-md text-accent-primary font-inter-medium">{fmt(toDate.getTime())}</Text>
              </TouchableOpacity>
              {fromDate >= toDate && (
                <Text className="font-inter text-body-sm text-error-muted px-md pb-sm">Start date must be before end date</Text>
              )}
            </View>
          )}
        </View>
      </ScrollView>

      {pickingField !== null && (
        <DateTimePicker
          value={pickingField === 'from' ? fromDate : toDate}
          mode="date"
          display="default"
          maximumDate={pickingField === 'from' ? toDate : new Date()}
          minimumDate={pickingField === 'to' ? fromDate : (earliestTs ? new Date(earliestTs) : undefined)}
          onValueChange={(_event, date) => {
            if (pickingField === 'from') setFromDate(date ?? fromDate);
            else setToDate(date ?? toDate);
            setPickingField(null);
          }}
          onDismiss={() => setPickingField(null)}
        />
      )}

      <View className="px-container-margin pb-[32px] pt-md gap-sm">
        <PrimaryButton
          label="Start Scan →"
          onPress={handleStart}
          disabled={!canStart}
        />
        <TouchableOpacity onPress={() => navigation.goBack()} className="h-[48px] items-center justify-center">
          <Text className="font-inter text-body-md text-ink-body">Cancel setup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
