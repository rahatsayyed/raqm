import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useOnboardingStore, type DateRange as Range } from '../../store/onboardingStore';
import { SmsReader } from '../../native/SmsReader';

const PRESETS: { id: Exclude<Range, 'custom'>; label: string; subtitle: string; icon: string; recommended?: boolean }[] = [
  { id: 'all', label: 'All time', subtitle: 'Complete transaction history', icon: '∞' },
  { id: '1year', label: 'Last 1 year', subtitle: 'Full annual overview', icon: '📅' },
  { id: '6months', label: 'Last 6 months', subtitle: 'Better for seasonal trends', icon: '🗓️' },
  { id: '3months', label: 'Last 3 months', subtitle: 'Recommended for speed', icon: '⚡', recommended: true },
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
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>How far back{'\n'}should we look?</Text>
        <Text style={styles.subtitle}>
          We'll analyze your SMS messages to categorize your spending history.
        </Text>

        {earliestTs !== null && (
          <View style={styles.earliestBadge}>
            <Text style={styles.earliestText}>
              📩 Earliest SMS on device: <Text style={styles.earliestDate}>{fmt(earliestTs)}</Text>
            </Text>
          </View>
        )}

        <View style={styles.rangeList}>
          {PRESETS.map((range) => {
            const isSelected = selected === range.id;
            const subtitle = range.id === 'all' && earliestTs
              ? `From ${fmt(earliestTs)}`
              : range.subtitle;
            return (
              <TouchableOpacity
                key={range.id}
                style={[styles.rangeCard, isSelected && styles.rangeCardSelected]}
                onPress={() => handleSelect(range.id)}
                activeOpacity={0.8}
              >
                <View style={styles.rangeLeft}>
                  <View style={[styles.rangeIconBox, isSelected && styles.rangeIconBoxSelected]}>
                    <Text style={styles.rangeIcon}>{range.icon}</Text>
                  </View>
                  <View>
                    <Text style={[styles.rangeLabel, isSelected && styles.rangeLabelSelected]}>
                      {range.label}
                    </Text>
                    <Text style={[styles.rangeSubtitle, range.recommended && styles.rangeSubtitleRecommended]}>
                      {subtitle}
                    </Text>
                  </View>
                </View>
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Custom range card */}
          <TouchableOpacity
            style={[styles.rangeCard, selected === 'custom' && styles.rangeCardSelected]}
            onPress={() => handleSelect('custom')}
            activeOpacity={0.8}
          >
            <View style={styles.rangeLeft}>
              <View style={[styles.rangeIconBox, selected === 'custom' && styles.rangeIconBoxSelected]}>
                <Text style={styles.rangeIcon}>🎯</Text>
              </View>
              <View>
                <Text style={[styles.rangeLabel, selected === 'custom' && styles.rangeLabelSelected]}>
                  Custom range
                </Text>
                <Text style={styles.rangeSubtitle}>Pick your own start and end date</Text>
              </View>
            </View>
            <View style={[styles.radioOuter, selected === 'custom' && styles.radioOuterSelected]}>
              {selected === 'custom' && <View style={styles.radioInner} />}
            </View>
          </TouchableOpacity>

          {selected === 'custom' && (
            <View style={styles.customPicker}>
              <TouchableOpacity style={styles.dateRow} onPress={() => setPickingField('from')}>
                <Text style={styles.dateRowLabel}>From</Text>
                <Text style={styles.dateRowValue}>{fmt(fromDate.getTime())}</Text>
              </TouchableOpacity>
              <View style={styles.dateDivider} />
              <TouchableOpacity style={styles.dateRow} onPress={() => setPickingField('to')}>
                <Text style={styles.dateRowLabel}>To</Text>
                <Text style={styles.dateRowValue}>{fmt(toDate.getTime())}</Text>
              </TouchableOpacity>
              {fromDate >= toDate && (
                <Text style={styles.dateError}>Start date must be before end date</Text>
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
          onValueChange={(date) => {
            if (date) {
              if (pickingField === 'from') setFromDate(date);
              else setToDate(date);
            }
            setPickingField(null);
          }}
          onDismiss={() => setPickingField(null)}
        />
      )}

      <View style={styles.footer}>
        <PrimaryButton
          label="Start Scan →"
          onPress={handleStart}
          style={canStart ? styles.ctaButton : [styles.ctaButton, styles.ctaDisabled]}
          disabled={!canStart}
        />
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.cancelButton}>
          <Text style={styles.cancelLabel}>Cancel setup</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing.containerMargin,
    paddingTop: 56,
    paddingBottom: Spacing.xl,
  },
  headline: { ...Typography.displayLg, color: Colors.onSurface, marginBottom: Spacing.md },
  subtitle: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, marginBottom: Spacing.lg, lineHeight: 24 },
  earliestBadge: {
    backgroundColor: Colors.secondaryContainer,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  earliestText: { ...Typography.bodySm, color: Colors.onSecondaryContainer },
  earliestDate: { fontFamily: 'WorkSans_500Medium' },
  rangeList: { gap: Spacing.sm, marginBottom: Spacing.xl },
  rangeCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    borderRadius: Radius.xl, padding: Spacing.md,
  },
  rangeCardSelected: {
    borderColor: Colors.primary, backgroundColor: '#f1f8f4',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  rangeLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  rangeIconBox: {
    width: 48, height: 48, borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  rangeIconBoxSelected: { backgroundColor: `${Colors.primary}15` },
  rangeIcon: { fontSize: 22 },
  rangeLabel: { ...Typography.titleLg, color: Colors.onSurface, fontSize: 16 },
  rangeLabelSelected: { color: Colors.onSurface },
  rangeSubtitle: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  rangeSubtitleRecommended: { color: Colors.primary, fontFamily: 'WorkSans_500Medium' },
  radioOuter: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: Colors.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: Colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  customPicker: {
    marginTop: Spacing.xs,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    borderRadius: Radius.xl, overflow: 'hidden',
  },
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },
  dateDivider: { height: 1, backgroundColor: Colors.outlineVariant, marginHorizontal: Spacing.md },
  dateRowLabel: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  dateRowValue: { ...Typography.bodyMd, color: Colors.primary, fontFamily: 'WorkSans_500Medium' },
  dateError: {
    ...Typography.bodySm, color: '#c0392b',
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
  },
  footer: {
    paddingHorizontal: Spacing.containerMargin,
    paddingBottom: 32, paddingTop: Spacing.md, gap: Spacing.sm,
  },
  ctaButton: { borderRadius: Radius.lg, height: 56 },
  ctaDisabled: { opacity: 0.4 },
  cancelButton: { height: 48, alignItems: 'center', justifyContent: 'center' },
  cancelLabel: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
});
