import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Animated, Easing } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { GhostButton } from '../../components/GhostButton';
import { useOnboardingStore } from '../../store/onboardingStore';

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
  borderWidth: 3, borderColor: `${Colors.primary}30`,
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
    <View className="flex-1 bg-surface items-center justify-center px-container-margin">
      <View className="absolute w-[340px] h-[340px] rounded-[170px] bg-primary opacity-[0.04]" />
      <View className="absolute w-[260px] h-[260px] rounded-[130px] bg-primary opacity-[0.06]" />

      <Animated.View style={[successRingStyle, { transform: [{ scale }] }]}>
        <View
          className="w-[96px] h-[96px] rounded-[48px] bg-primary items-center justify-center"
          style={{ shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8 }}
        >
          <Text className="text-[40px] text-on-primary font-bold">✓</Text>
        </View>
      </Animated.View>

      <Animated.View style={[textAreaStyle, { opacity: fade, transform: [{ translateY: slideUp }] }]}>
        <Text className="font-inter-bold text-display-lg text-on-surface text-center">All done!</Text>
        <Text className="font-inter text-body-md text-on-surface-variant text-center max-w-[280px]">
          Raqm has analyzed your messages and built your financial picture.
        </Text>
      </Animated.View>

      <Animated.View style={[statsRowStyle, { opacity: fade }]}>
        {stats.map(stat => (
          <View
            key={stat.label}
            className="flex-1 bg-bg-surface-raised rounded-xl p-md items-center gap-[4px] border border-border-subtle"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}
          >
            <Text className="text-[22px]">{stat.icon}</Text>
            <Text className="font-inter-semibold text-headline-md text-primary">{stat.value}</Text>
            <Text className="font-mono text-[11px] leading-[16px] text-on-surface-variant">{stat.label}</Text>
          </View>
        ))}
      </Animated.View>

      <Animated.View style={[footerStyle, { opacity: fade }]}>
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
