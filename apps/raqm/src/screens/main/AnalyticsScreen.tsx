import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';

function formatAmount(n: number, currency = '₹'): string {
  return `${currency}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function monthKey(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

export function AnalyticsScreen() {
  const { transactions } = useOnboardingStore();
  const currency = transactions[0]?.currency ?? '₹';

  const byMonth = useMemo(() => {
    const map = new Map<string, { income: number; expenses: number }>();
    for (const tx of transactions) {
      const key = monthKey(tx.timestamp);
      if (!map.has(key)) map.set(key, { income: 0, expenses: 0 });
      const entry = map.get(key)!;
      if (tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT) {
        entry.income += tx.amount;
      } else if (tx.type === TransactionType.EXPENSE) {
        entry.expenses += tx.amount;
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6);
  }, [transactions]);

  const topMerchants = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of transactions) {
      if (tx.type !== TransactionType.EXPENSE) continue;
      const name = tx.merchant || tx.bankName;
      map.set(name, (map.get(name) ?? 0) + tx.amount);
    }
    return Array.from(map.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
  }, [transactions]);

  const maxExpense = Math.max(...byMonth.map(([, d]) => d.expenses), 1);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.pageTitle}>Analytics</Text>

      {/* Monthly spending bar chart */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Monthly spending</Text>
        <View style={styles.chartCard}>
          <View style={styles.bars}>
            {byMonth.map(([key, data]) => {
              const pct = data.expenses / maxExpense;
              return (
                <View key={key} style={styles.barCol}>
                  <Text style={styles.barAmount}>{formatAmount(data.expenses, currency)}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { flex: pct }]} />
                    <View style={{ flex: 1 - pct }} />
                  </View>
                  <Text style={styles.barLabel}>{monthLabel(key)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>

      {/* Top merchants */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top merchants by spend</Text>
        <View style={styles.merchantList}>
          {topMerchants.map(([name, amount], i) => {
            const pct = amount / (topMerchants[0]?.[1] ?? 1);
            return (
              <View key={name} style={styles.merchantRow}>
                <View style={styles.merchantRank}>
                  <Text style={styles.merchantRankText}>{i + 1}</Text>
                </View>
                <View style={styles.merchantInfo}>
                  <View style={styles.merchantTopRow}>
                    <Text style={styles.merchantName} numberOfLines={1}>{name}</Text>
                    <Text style={styles.merchantAmount}>{formatAmount(amount, currency)}</Text>
                  </View>
                  <View style={styles.merchantBar}>
                    <View style={[styles.merchantBarFill, { width: `${Math.round(pct * 100)}%` }]} />
                  </View>
                </View>
              </View>
            );
          })}
          {topMerchants.length === 0 && (
            <Text style={styles.emptyText}>No expense data yet</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },
  pageTitle: {
    ...Typography.headlineSm, color: Colors.onSurface,
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },

  section: { paddingHorizontal: Spacing.containerMargin, marginBottom: Spacing.xl },
  sectionTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.md, fontSize: 16 },

  chartCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
    padding: Spacing.md, paddingTop: Spacing.lg,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 160 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barAmount: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontSize: 9, letterSpacing: 0, textAlign: 'center' },
  barTrack: { flex: 1, width: '100%', flexDirection: 'column-reverse' },
  barFill: { backgroundColor: Colors.primary, borderRadius: 4, minHeight: 4 },
  barLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, fontSize: 10, textAlign: 'center' },

  merchantList: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
    padding: Spacing.md, gap: Spacing.md,
  },
  merchantRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  merchantRank: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  merchantRankText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontSize: 11, letterSpacing: 0 },
  merchantInfo: { flex: 1, gap: 6 },
  merchantTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  merchantName: { ...Typography.bodySm, color: Colors.onSurface, flex: 1, fontFamily: 'WorkSans_500Medium' },
  merchantAmount: { ...Typography.numericSm, color: Colors.error, fontSize: 13, marginLeft: 8 },
  merchantBar: { height: 4, backgroundColor: Colors.surfaceVariant, borderRadius: 2, overflow: 'hidden' },
  merchantBarFill: { height: '100%', backgroundColor: `${Colors.error}80`, borderRadius: 2 },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', padding: Spacing.md },
});
