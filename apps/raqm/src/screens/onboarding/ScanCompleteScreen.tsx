import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { GhostButton } from '../../components/GhostButton';
import { useOnboardingStore } from '../../store/onboardingStore';

const DATE_RANGE_LABELS: Record<string, string> = {
  all: 'All time',
  '1year': '1 year',
  '6months': '6 mo',
  '3months': '3 mo',
};

export function ScanCompleteScreen({ navigation }: OnboardingScreenProps<'ScanComplete'>) {
  const { transactions, dateRange } = useOnboardingStore();

  const accountCount = useMemo(() => {
    const seen = new Set(transactions.map(tx => `${tx.bankName}|${tx.accountLast4 ?? ''}`));
    return seen.size;
  }, [transactions]);

  const stats = [
    { icon: '💳', value: String(transactions.length), label: 'Transactions' },
    { icon: '🏦', value: String(accountCount), label: 'Accounts' },
    { icon: '📅', value: DATE_RANGE_LABELS[dateRange] ?? dateRange, label: 'History' },
  ];

  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.decorOuter} />
      <View style={styles.decorInner} />

      <Animated.View style={[styles.successRing, { transform: [{ scale }] }]}>
        <View style={styles.successCircle}>
          <Text style={styles.successIcon}>✓</Text>
        </View>
      </Animated.View>

      <Animated.View style={[styles.textArea, { opacity: fade, transform: [{ translateY: slideUp }] }]}>
        <Text style={styles.headline}>All done!</Text>
        <Text style={styles.subtitle}>
          Raqm has analyzed your messages and built your financial picture.
        </Text>
      </Animated.View>

      <Animated.View style={[styles.statsRow, { opacity: fade }]}>
        {stats.map(stat => (
          <View key={stat.label} style={styles.statCard}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View style={[styles.footer, { opacity: fade }]}>
        <PrimaryButton
          label="Set up my account →"
          onPress={() => navigation.replace('SignUp')}
        />
        <GhostButton
          label="Skip — explore locally"
          onPress={() => navigation.replace('NameEntry')}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: Colors.surface,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.containerMargin,
  },
  decorOuter: {
    position: 'absolute', width: 340, height: 340, borderRadius: 170,
    backgroundColor: Colors.primary, opacity: 0.04,
  },
  decorInner: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130,
    backgroundColor: Colors.primary, opacity: 0.06,
  },
  successRing: {
    width: 120, height: 120, borderRadius: 60,
    borderWidth: 3, borderColor: `${Colors.primary}30`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xxl,
  },
  successCircle: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  successIcon: { fontSize: 40, color: '#fff', fontWeight: '700' },
  textArea: { alignItems: 'center', marginBottom: Spacing.xxl, gap: Spacing.sm },
  headline: { ...Typography.displayLg, color: Colors.onSurface, textAlign: 'center' },
  subtitle: {
    ...Typography.bodyMd, color: Colors.onSurfaceVariant,
    textAlign: 'center', maxWidth: 280, lineHeight: 24,
  },
  statsRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.xxl, width: '100%' },
  statCard: {
    flex: 1, backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: Radius.xl, padding: Spacing.md,
    alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  statIcon: { fontSize: 22 },
  statValue: { ...Typography.headlineMd, color: Colors.primary },
  statLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontSize: 11, letterSpacing: 0 },
  footer: { width: '100%', gap: Spacing.sm },
});
