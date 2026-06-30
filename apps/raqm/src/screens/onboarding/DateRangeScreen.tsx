import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';

type Range = 'all' | '1year' | '6months' | '3months';

const RANGES: { id: Range; label: string; subtitle: string; icon: string; recommended?: boolean }[] = [
  { id: 'all', label: 'All time', subtitle: 'Complete transaction history', icon: '∞' },
  { id: '1year', label: 'Last 1 year', subtitle: 'Full annual overview', icon: '📅' },
  { id: '6months', label: 'Last 6 months', subtitle: 'Better for seasonal trends', icon: '🗓️' },
  { id: '3months', label: 'Last 3 months', subtitle: 'Recommended for speed', icon: '⚡', recommended: true },
];

const EARLIEST_SMS = 'Oct 14, 2025';

export function DateRangeScreen({ navigation }: OnboardingScreenProps<'DateRange'>) {
  const [selected, setSelected] = useState<Range>('3months');

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.headline}>How far back{'\n'}should we look?</Text>
        <Text style={styles.subtitle}>
          We'll analyze your SMS messages to categorize your spending history. Select a timeframe to begin.
        </Text>

        <View style={styles.rangeList}>
          {RANGES.map((range) => {
            const isSelected = selected === range.id;
            return (
              <TouchableOpacity
                key={range.id}
                style={[styles.rangeCard, isSelected && styles.rangeCardSelected]}
                onPress={() => setSelected(range.id)}
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
                      {range.subtitle}
                    </Text>
                  </View>
                </View>
                <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                  {isSelected && <View style={styles.radioInner} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoIcon}>ℹ️</Text>
          <Text style={styles.infoText}>
            Earliest available SMS: <Text style={styles.infoAccent}>{EARLIEST_SMS}</Text>
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label="Start Scan →"
          onPress={() => navigation.navigate('ScanningProgress')}
          style={styles.ctaButton}
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
  subtitle: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, marginBottom: Spacing.xxl, lineHeight: 24 },
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
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceVariant,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.xl,
  },
  infoIcon: { fontSize: 16 },
  infoText: { ...Typography.bodySm, color: Colors.onSurfaceVariant, flex: 1 },
  infoAccent: { color: Colors.primary, fontFamily: 'WorkSans_500Medium' },
  footer: {
    paddingHorizontal: Spacing.containerMargin,
    paddingBottom: 32, paddingTop: Spacing.md, gap: Spacing.sm,
  },
  ctaButton: { borderRadius: Radius.lg, height: 56 },
  cancelButton: { height: 48, alignItems: 'center', justifyContent: 'center' },
  cancelLabel: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
});
