import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { GhostButton } from '../../components/GhostButton';
import { Icon } from '../../components/Icon';
import { useOnboardingStore } from '../../store/onboardingStore';
import { formatAmount } from '../../utils/format';

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
const textAreaStyle = { alignItems: 'center' as const, marginBottom: 40, gap: 8 };
const statsRowStyle = { flexDirection: 'row' as const, gap: 16, marginBottom: 40, width: '100%' as const };
const footerStyle = { width: '100%' as const, gap: 8 };

export function ScanCompleteScreen({ navigation }: OnboardingScreenProps<'ScanComplete'>) {
  const { transactions, dateRange } = useOnboardingStore();

  const accountCount = useMemo(() => {
    const seen = new Set(transactions.map(tx => `${tx.bankName}|${tx.accountLast4 ?? ''}`));
    return seen.size;
  }, [transactions]);

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
    <View className="flex-1 bg-background items-center justify-center px-container-margin">
      <View className="absolute w-[340px] h-[340px] rounded-[170px] bg-accent-primary opacity-[0.04]" />
      <View className="absolute w-[260px] h-[260px] rounded-[130px] bg-accent-primary opacity-[0.06]" />

      <Animated.View style={[successRingStyle, { transform: [{ scale }] }]}>
        <View
          className="w-[96px] h-[96px] rounded-[48px] bg-accent-primary items-center justify-center"
          style={{ shadowColor: Colors.accentPrimary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 }}
        >
          <Icon name="check" size={40} color={Colors.bgBase} />
        </View>
      </Animated.View>

      <Animated.View style={[textAreaStyle, { opacity: fade, transform: [{ translateY: slideUp }] }]}>
        <Text className="font-inter-bold text-display-lg text-ink-headline text-center">Transactions loaded</Text>
        <Text className="font-inter text-body-md text-ink-body text-center max-w-[280px]">
          {transactions.length} transactions found. {formatAmount(transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0), transactions[0]?.currency)} tracked.
        </Text>
      </Animated.View>

      <Animated.View style={[statsRowStyle, { opacity: fade }]}>
        {stats.map(stat => (
          <View
            key={stat.label}
            className="flex-1 bg-bg-surface rounded-xl p-md items-center gap-[4px] border border-border-subtle"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}
          >
            <Icon name={stat.icon as any} size={22} color={Colors.inkBody} />
            <Text className="font-mono-medium text-metric-hero text-accent-primary">{stat.value}</Text>
            <Text className="font-inter text-[11px] leading-[16px] text-ink-body">{stat.label}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View style={[footerStyle, { opacity: fade }]}>
        <PrimaryButton
          label="Set up my account →"
          onPress={() => navigation.replace('BudgetSetup')}
        />
        <GhostButton
          label="Skip — explore locally"
          onPress={() => navigation.replace('NameEntry')}
        />
      </Animated.View>
    </View>
  );
}
