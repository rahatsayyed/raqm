import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { OnboardingScreenProps } from '../../navigation/types';
import { useOnboardingStore } from '../../store/onboardingStore';
import { formatAmount } from '../../utils/format';
import { loadTxRecords, getCategories } from '../../db/database';
import { countsTowardTotals } from '../../services/txIntelligenceCore';
import { StepDots } from '../../components/onboarding/StepDots';
import { GlassCard } from '../../components/onboarding/GlassCard';
import { RqButton } from '../../components/onboarding/RqButton';
import { Icon } from '../../components/Icon';
import { useOnbColors } from '../../theme/onboardingColors';

// Bar tint order matches the mockup's category-bar colors (dark variant
// values; light variant swaps only the neutral "Other" grey).
const BAR_TINTS = ['accentPrimary', 'notice', 'neutral', 'blue', 'purple', 'grey'] as const;

// Onboarding-v3 redesign: matches the mockup's ScanComplete-Dark/Light —
// the "aha moment" screen. Real per-category monthly-spend math is
// unchanged from the pre-redesign screen (I4 fix: threaded to
// BudgetSetupScreen via nav params).
export function ScanCompleteScreen({ navigation }: OnboardingScreenProps<'ScanComplete'>) {
  const insets = useSafeAreaInsets();
  const { scheme, colors: c } = useOnbColors();
  // ponytail: accountCount/dateRange (used by the pre-redesign screen's
  // stats row) are dropped — the mockup's layout has no room for them and
  // nothing downstream reads them; suggestBudgetsFromSpend only needs
  // categorySpend.
  const { transactions } = useOnboardingStore();

  const [categorySpend, setCategorySpend] = useState<Record<string, number>>({});
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [records, categories] = await Promise.all([loadTxRecords(), getCategories('expense')]);
        const nameById = new Map(categories.map((cat) => [cat.id, cat.name]));
        const spend: Record<string, number> = {};
        let earliestTs: number | null = null;
        let latestTs: number | null = null;
        for (const tx of records) {
          if (tx.type !== 'EXPENSE' || tx.categoryId == null || !countsTowardTotals(tx)) continue;
          const name = nameById.get(tx.categoryId);
          if (!name) continue;
          spend[name] = (spend[name] ?? 0) + Math.abs(tx.amount);
          if (earliestTs === null || tx.timestamp < earliestTs) earliestTs = tx.timestamp;
          if (latestTs === null || tx.timestamp > latestTs) latestTs = tx.timestamp;
        }
        // Bug fix (kept from pre-redesign screen): normalize by the actual
        // span of the aggregated transactions, not the nominal date-range
        // preset, since "All time" has no fixed duration to divide by.
        const MONTH_MS = 30 * 86_400_000;
        const monthsSpanned =
          earliestTs !== null && latestTs !== null ? Math.max(1, (latestTs - earliestTs) / MONTH_MS) : 1;
        const monthlySpend = Object.fromEntries(
          Object.entries(spend).map(([name, total]) => [name, total / monthsSpanned]),
        );
        if (!cancelled) setCategorySpend(monthlySpend);
      } catch {
        // Non-fatal: BudgetSetupScreen falls back to a blank form.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalSpend = transactions.reduce((sum, tx) => sum + (tx.amount || 0), 0);
  const currency = transactions[0]?.currency;

  const topCategories = useMemo(() => {
    const entries = Object.entries(categorySpend).sort((a, b) => b[1] - a[1]);
    const max = entries.length > 0 ? entries[0][1] : 1;
    return entries.slice(0, 6).map(([name, amount], i) => ({
      name,
      amount,
      pct: Math.max(6, Math.round((amount / max) * 100)),
      tint: BAR_TINTS[i] ?? 'grey',
    }));
  }, [categorySpend]);

  const tintColor: Record<(typeof BAR_TINTS)[number], string> = {
    accentPrimary: c.accentPrimary,
    notice: c.notice,
    neutral: c.inkBody,
    blue: scheme === 'dark' ? '#8FA8D9' : '#6B7FA6',
    purple: scheme === 'dark' ? '#C99BC0' : '#9C6B8A',
    grey: scheme === 'dark' ? '#6E6C66' : '#A6A29B',
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bgBase, paddingTop: insets.top + 16 }} className="px-lg pb-lg">
      <View className="mb-lg">
        <StepDots total={7} filled={5} scheme={scheme} />
      </View>

      <Text style={{ fontFamily: 'Newsreader_400Regular_Italic', fontSize: 28, color: c.inkHeadline }} className="mb-md">
        Found it. All of it.
      </Text>

      <GlassCard scheme={scheme} style={{ marginBottom: 14 }}>
        <View style={{ gap: 6 }}>
          <Text
            style={{
              fontFamily: 'InstrumentSans_400Regular',
              fontSize: 12,
              color: c.inkBody,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
            }}
          >
            Spent last month
          </Text>
          <Text style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 34, color: c.inkHeadline, letterSpacing: -0.6 }}>
            {formatAmount(totalSpend, currency)}
          </Text>
        </View>
      </GlassCard>

      <View style={{ flex: 1, backgroundColor: c.bgSurface, borderRadius: 4, padding: 16, gap: 12 }}>
        <Text style={{ fontFamily: 'InstrumentSans_600SemiBold', fontSize: 13, color: c.inkHeadline }}>Top categories</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: 9 }}>
            {topCategories.length === 0 ? (
              <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 13, color: c.inkBody }}>
                We're still learning your financial patterns.
              </Text>
            ) : (
              topCategories.map((cat) => (
                <View key={cat.name}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 13, color: c.inkBody }}>{cat.name}</Text>
                    <Text style={{ fontFamily: 'JetBrainsMono_500Medium', fontSize: 13, color: c.inkBody }}>
                      {formatAmount(cat.amount, currency)}
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 1, backgroundColor: c.borderSubtle, overflow: 'hidden' }}>
                    <View style={{ width: `${cat.pct}%`, height: '100%', borderRadius: 1, backgroundColor: tintColor[cat.tint] }} />
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      <Pressable onPress={() => navigation.navigate('GPayPdfImport')} className="mt-md mb-sm">
        <Text
          style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 11, color: c.inkBody, textAlign: 'center', textDecorationLine: 'underline' }}
        >
          Bank not detected? Import a PDF statement instead
        </Text>
      </Pressable>

      <RqButton
        label="Set your budget"
        scheme={scheme}
        onPress={() => navigation.replace('BudgetSetup', { categorySpend })}
        icon={<Icon name="arrow-right" size={18} color={c.onAccent} />}
      />
    </View>
  );
}
