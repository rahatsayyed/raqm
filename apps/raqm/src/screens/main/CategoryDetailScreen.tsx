import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getSubcategories, getSetting, type Subcategory, type TxRecord } from '../../db/database';
import { countsTowardTotals } from '../../services/txIntelligence';
import { getBudgetStatuses, type BudgetStatus } from '../../services/budgets';
import { getMonthBounds, type PeriodBounds } from '../../utils/period';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { formatAmount } from '../../utils/format';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function parsePeriod(period: string | undefined): PeriodBounds | null {
  if (!period) return null;
  const [fromStr, toStr] = period.split('-');
  const from = Number(fromStr);
  const to = Number(toStr);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return null;
  return { from, to };
}

export function CategoryDetailScreen({ route, navigation }: MainStackScreenProps<'CategoryDetail'>) {
  const { categoryId, categoryName, period } = route.params;
  const { txs } = useTxStore();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [budgetStatuses, setBudgetStatuses] = useState<BudgetStatus[]>([]);
  const parsedBounds = useMemo(() => parsePeriod(period), [period]);
  const [fallbackBounds, setFallbackBounds] = useState<PeriodBounds | null>(null);

  useEffect(() => {
    getSubcategories(categoryId).then(setSubcategories);
    getBudgetStatuses().then(setBudgetStatuses);
  }, [categoryId]);

  // No period param passed in (e.g. deep link) — fall back to the current custom month.
  useEffect(() => {
    if (parsedBounds) return;
    let cancelled = false;
    getSetting('month_start_day').then((startDayStr) => {
      if (cancelled) return;
      const startDay = startDayStr ? Number(startDayStr) : 1;
      setFallbackBounds(getMonthBounds(new Date(), startDay));
    });
    return () => {
      cancelled = true;
    };
  }, [parsedBounds]);

  const bounds = parsedBounds ?? fallbackBounds;

  const categoryTxs = useMemo(
    () =>
      bounds
        ? txs
            .filter(
              (tx) =>
                tx.categoryId === categoryId &&
                tx.timestamp >= bounds.from &&
                tx.timestamp <= bounds.to &&
                countsTowardTotals(tx),
            )
            .sort((a, b) => b.timestamp - a.timestamp)
        : [],
    [txs, categoryId, bounds],
  );

  // Refund credits linked to this category's expenses net against the total —
  // resolved via the link partner since the credit usually carries no categoryId.
  const refundNet = useMemo(() => {
    if (!bounds) return 0;
    const byId = new Map(txs.map((t) => [t.id, t]));
    let net = 0;
    for (const tx of txs) {
      if (tx.timestamp < bounds.from || tx.timestamp > bounds.to) continue;
      if (!countsTowardTotals(tx)) continue;
      const credit = tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT;
      if (!credit || tx.linkType !== 'refund') continue;
      const partner = tx.linkPartnerId != null ? byId.get(tx.linkPartnerId) : undefined;
      if ((partner?.categoryId ?? tx.categoryId) === categoryId) net += tx.amount;
    }
    return net;
  }, [txs, categoryId, bounds]);

  const total = useMemo(
    () =>
      Math.max(
        0,
        categoryTxs.filter((tx) => tx.type === TransactionType.EXPENSE).reduce((s, tx) => s + tx.amount, 0) - refundNet,
      ),
    [categoryTxs, refundNet],
  );

  const subBreakdown = useMemo(() => {
    const map = new Map<number | null, number>();
    for (const tx of categoryTxs) {
      if (tx.type !== TransactionType.EXPENSE) continue;
      map.set(tx.subcategoryId, (map.get(tx.subcategoryId) ?? 0) + tx.amount);
    }
    return Array.from(map.entries())
      .map(([subId, amount]) => ({
        name: subId == null ? 'Other' : subcategories.find((s) => s.id === subId)?.name ?? 'Other',
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [categoryTxs, subcategories]);

  const budget = budgetStatuses.find((bs) => bs.budget.categoryId === categoryId);

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>{categoryName}</Text>
      <Text style={styles.totalAmount}>{formatAmount(total)}</Text>
      <Text style={styles.totalMeta}>
        {categoryTxs.length} transaction{categoryTxs.length !== 1 ? 's' : ''} this period
      </Text>

      {budget && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Budget</Text>
          <View style={styles.card}>
            <View style={styles.budgetTrack}>
              <View
                style={[
                  styles.budgetFill,
                  {
                    width: `${Math.min(100, Math.round(budget.pct))}%`,
                    backgroundColor: budget.pct > 100 ? Colors.errorMuted : budget.pct >= 80 ? Colors.secondary : Colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={styles.budgetLabel}>
              {formatAmount(budget.spent)} of {formatAmount(budget.limit)} ({Math.round(budget.pct)}%)
            </Text>
          </View>
        </View>
      )}

      {subBreakdown.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>By sub-category</Text>
          <View style={styles.card}>
            {subBreakdown.map((row, i) => (
              <View key={`${i}-${row.name}`} style={styles.subRow}>
                <Text style={styles.subName}>{row.name}</Text>
                <Text style={styles.subAmount}>{formatAmount(row.amount)}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Transactions</Text>
        <View style={styles.card}>
          {categoryTxs.length === 0 ? (
            <Text style={styles.emptyText}>No transactions in this period</Text>
          ) : (
            categoryTxs.map((tx, i) => (
              <TxRow key={tx.id} tx={tx} isLast={i === categoryTxs.length - 1} navigation={navigation} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function TxRow({
  tx,
  isLast,
  navigation,
}: {
  tx: TxRecord;
  isLast: boolean;
  navigation: MainStackScreenProps<'CategoryDetail'>['navigation'];
}) {
  const debit = tx.type === TransactionType.EXPENSE;
  const color = debit ? Colors.errorMuted : Colors.primary;
  return (
    <TouchableOpacity
      style={[styles.txRow, !isLast && styles.txRowBorder]}
      onPress={() => navigation.navigate('TransactionDetail', { transactionId: tx.id })}
    >
      <View style={styles.txInfo}>
        <Text style={styles.txMerchant} numberOfLines={1}>
          {tx.merchant || tx.bankName}
        </Text>
        <Text style={styles.txMeta}>{formatDate(tx.timestamp)}</Text>
      </View>
      <Text style={[styles.txAmount, { color }]}>
        {debit ? '-' : '+'}
        {formatAmount(tx.amount)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.containerMargin, paddingBottom: 40 },
  back: { marginBottom: Spacing.md },
  backText: { ...Typography.bodyMd, color: Colors.primary },
  title: { ...Typography.headlineSm, color: Colors.onSurface },
  totalAmount: { ...Typography.numericLg, color: Colors.onSurface, marginTop: Spacing.sm },
  totalMeta: { ...Typography.supportingText, color: Colors.onSurfaceVariant, marginTop: 4 },

  section: { marginTop: Spacing.xl },
  sectionTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.md, fontSize: 16 },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.md,
  },

  budgetTrack: { height: 6, backgroundColor: Colors.surfaceVariant, borderRadius: 3, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 3 },
  budgetLabel: { ...Typography.supportingText, color: Colors.onSurfaceVariant, marginTop: Spacing.sm },

  subRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  subName: { ...Typography.bodySm, color: Colors.onSurface },
  subAmount: { ...Typography.numericSm, color: Colors.onSurfaceVariant },

  txRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  txInfo: { flex: 1 },
  txMerchant: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
  txMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
  txAmount: { ...Typography.numericSm, fontSize: 15 },

  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', padding: Spacing.md },
});
