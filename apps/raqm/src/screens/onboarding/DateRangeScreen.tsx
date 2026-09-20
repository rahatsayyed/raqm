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
      style={{ flex: 1, backgroundColor: c.bgBase, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
      className="px-lg"
    >
      <View className="mb-lg">
        <StepDots total={8} filled={3} scheme={scheme} />
      </View>

      <Text style={{ fontFamily: 'Newsreader_400Regular_Italic', fontSize: 30, color: c.inkHeadline }} className="mb-xs">
        How far back should we look?
      </Text>
      <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 15, lineHeight: 22, color: c.inkBody }} className="mb-lg">
        You can change this anytime in Settings.
      </Text>

      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <GlassCard scheme={scheme}>
          <View style={{ gap: 8 }}>
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
                  style={{
                    backgroundColor: isSelected ? c.accentPrimary : c.bgSurface,
                    borderRadius: 4,
                    padding: 16,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <View style={{ flex: 1, paddingRight: 12 }}>
                    <Text
                      style={{
                        fontFamily: 'InstrumentSans_600SemiBold',
                        fontSize: 14,
                        color: isSelected ? c.onAccent : c.inkHeadline,
                      }}
                    >
                      {row.label}
                    </Text>
                    {subtitle ? (
                      <Text
                        style={{
                          fontFamily: 'InstrumentSans_400Regular',
                          fontSize: 12,
                          color: isSelected ? c.onAccent : c.inkBody,
                          marginTop: 2,
                        }}
                      >
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>
                  {row.id === 'custom' ? (
                    <Icon name="chevron-right" size={18} color={isSelected ? c.onAccent : c.inkBody} />
                  ) : isSelected ? (
                    <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: c.onAccent, alignItems: 'center', justifyContent: 'center' }}>
                      <Icon name="check" size={13} color={c.accentPrimary} />
                    </View>
                  ) : (
                    <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: c.borderSubtle }} />
                  )}
                </TouchableOpacity>
              );
            })}

            {selected === 'custom' && (
              <View style={{ backgroundColor: c.bgSurface, borderRadius: 4, overflow: 'hidden' }}>
                <TouchableOpacity
                  onPress={() => setPickingField('from')}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}
                >
                  <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 14, color: c.inkBody }}>From</Text>
                  <Text style={{ fontFamily: 'InstrumentSans_600SemiBold', fontSize: 14, color: c.accentPrimary }}>
                    {fmt(fromDate.getTime())}
                  </Text>
                </TouchableOpacity>
                <View style={{ height: 1, backgroundColor: c.borderSubtle, marginHorizontal: 16 }} />
                <TouchableOpacity
                  onPress={() => setPickingField('to')}
                  style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14 }}
                >
                  <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 14, color: c.inkBody }}>To</Text>
                  <Text style={{ fontFamily: 'InstrumentSans_600SemiBold', fontSize: 14, color: c.accentPrimary }}>
                    {fmt(toDate.getTime())}
                  </Text>
                </TouchableOpacity>
                {fromDate >= toDate && (
                  <Text
                    style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 12, color: c.errorMuted, paddingHorizontal: 16, paddingBottom: 10 }}
                  >
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
