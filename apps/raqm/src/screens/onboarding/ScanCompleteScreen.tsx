import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors, Shadows } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { GhostButton } from '../../components/GhostButton';
import { Icon } from '../../components/Icon';
import { useOnboardingStore } from '../../store/onboardingStore';
import { formatAmount } from '../../utils/format';
import { loadTxRecords, getCategories } from '../../db/database';
import { countsTowardTotals } from '../../services/txIntelligenceCore';

const DATE_RANGE_LABELS: Record<string, string> = {
  all: 'All time',
  '1year': '1 year',
  '6months': '6 mo',
  '3months': '3 mo',
};

// Animated.View isn't wrapped by NativeWind's interop — these keep their static
// layout in the same style object as the Animated-driven transform/opacity.
const successRingStyle = {
  width: 120, height: 120, borderRadius: 60,
  borderWidth: 3, borderColor: `${Colors.accentPrimary}30`,
  alignItems: 'center' as const, justifyContent: 'center' as const,
  marginBottom: 40,
};
const textAreaStyle = { alignItems: 'center' as const, marginBottom: 40, gap: 4 };
const statsRowStyle = { flexDirection: 'row' as const, gap: 16, marginBottom: 40, width: '100%' as const };
const footerStyle = { width: '100%' as const, gap: 8 };

export function ScanCompleteScreen({ navigation }: OnboardingScreenProps<'ScanComplete'>) {
  const { transactions, dateRange } = useOnboardingStore();

  const accountCount = useMemo(() => {
    const seen = new Set(transactions.map(tx => `${tx.bankName}|${tx.accountLast4 ?? ''}`));
    return seen.size;
  }, [transactions]);

  // I4 fix: real per-category spend from the scan that just completed
  // (already persisted to the DB by ScanningProgressScreen's insertParsedTxs,
  // which is where categorization actually happens), threaded to
  // BudgetSetupScreen so its "suggested budgets" copy is no longer a lie and
  // suggestBudgetsFromSpend (Task 13) is actually used.
  const [categorySpend, setCategorySpend] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [records, categories] = await Promise.all([loadTxRecords(), getCategories('expense')]);
        const nameById = new Map(categories.map((c) => [c.id, c.name]));
        const spend: Record<string, number> = {};
        for (const tx of records) {
          if (tx.type !== 'EXPENSE' || tx.categoryId == null || !countsTowardTotals(tx)) continue;
          const name = nameById.get(tx.categoryId);
          if (!name) continue;
          spend[name] = (spend[name] ?? 0) + Math.abs(tx.amount);
        }
        if (!cancelled) setCategorySpend(spend);
      } catch {
        // Non-fatal: BudgetSetupScreen falls back to a blank form.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { icon: 'credit-card-outline', value: String(transactions.length), label: 'Transactions' },
    { icon: 'bank-outline', value: String(accountCount), label: 'Accounts' },
    { icon: 'calendar-range-outline', value: DATE_RANGE_LABELS[dateRange] ?? dateRange, label: 'History' },
  ];

  const scale = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(slideUp, { toValue: 0, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  return (
    <View className="flex-1 bg-bg-base items-center justify-center px-container-margin">
      <View className="absolute w-[340px] h-[340px] rounded-[170px] bg-accent-primary opacity-[0.04]" />
      <View className="absolute w-[260px] h-[260px] rounded-[130px] bg-accent-primary opacity-[0.06]" />

      <Animated.View style={[successRingStyle, { transform: [{ scale }] }]}>
        <View
          className="w-[96px] h-[96px] rounded-[48px] bg-accent-primary items-center justify-center"
          style={Shadows.card}
        >
          <Icon name="check" size={40} color={Colors.bgBase} />
        </View>
      </Animated.View>

      <Animated.View style={[textAreaStyle, { opacity: fade, transform: [{ translateY: slideUp }] }]}>
        <Text className="font-mono-medium text-metric-hero text-ink-headline">
          {transactions.length}
        </Text>
        <Text className="font-inter text-body-md text-ink-body text-center">
          transactions found
        </Text>
        <Text className="font-mono-medium text-metric-hero text-ink-headline pt-sm">
          {formatAmount(transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0), transactions[0]?.currency)}
        </Text>
        <Text className="font-inter text-body-md text-ink-body text-center">
          tracked
        </Text>
      </Animated.View>

      <Animated.View style={[statsRowStyle, { opacity: fade }]}>
        {stats.map(stat => (
          <View
            key={stat.label}
            className="flex-1 bg-bg-surface rounded-xl p-md items-center gap-[4px] border border-border-subtle"
            style={Shadows.card}
          >
            <Icon name={stat.icon as any} size={22} color={Colors.inkBody} />
            <Text className="font-mono-medium text-numeric-md text-accent-primary">{stat.value}</Text>
            <Text className="font-inter text-[11px] leading-[16px] text-ink-body">{stat.label}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View style={[footerStyle, { opacity: fade }]}>
        <PrimaryButton
          label="Set up my account →"
          onPress={() => navigation.replace('BudgetSetup', { categorySpend })}
        />
        <GhostButton
          label="Skip — explore locally"
          onPress={() => navigation.replace('NameEntry')}
        />
      </Animated.View>
    </View>
  );
}
