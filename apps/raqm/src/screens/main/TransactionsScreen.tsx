import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useOnboardingStore } from '../../store/onboardingStore';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';

function formatAmount(n: number, currency = '₹'): string {
  return `${currency}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function txColor(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME:
    case TransactionType.CREDIT: return Colors.primary;
    case TransactionType.EXPENSE: return Colors.error;
    default: return Colors.onSurfaceVariant;
  }
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

function txTypeLabel(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME: return 'Income';
    case TransactionType.CREDIT: return 'Credit';
    case TransactionType.EXPENSE: return 'Expense';
    case TransactionType.TRANSFER: return 'Transfer';
    case TransactionType.INVESTMENT: return 'Investment';
    case TransactionType.BALANCE_UPDATE: return 'Balance';
    default: return type;
  }
}

function TxItem({ tx, currency }: { tx: ParsedTransaction; currency: string }) {
  const debit = isDebit(tx.type);
  const color = txColor(tx.type);
  return (
    <View style={styles.item}>
      <View style={[styles.dot, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.dotText, { color }]}>{debit ? '↓' : '↑'}</Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemMerchant} numberOfLines={1}>{tx.merchant || tx.bankName}</Text>
        <Text style={styles.itemMeta}>
          {txTypeLabel(tx.type)} · {tx.bankName}
          {tx.accountLast4 ? ` ···${tx.accountLast4}` : ''}
        </Text>
        <Text style={styles.itemDate}>{formatDate(tx.timestamp)}</Text>
      </View>
      <Text style={[styles.itemAmount, { color }]}>
        {debit ? '-' : '+'}{formatAmount(tx.amount, currency)}
      </Text>
    </View>
  );
}

export function TransactionsScreen() {
  const { transactions } = useOnboardingStore();
  const [query, setQuery] = useState('');

  const currency = transactions[0]?.currency ?? '₹';

  const sorted = useMemo(
    () => [...transactions].sort((a, b) => b.timestamp - a.timestamp),
    [transactions],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      tx => (tx.merchant ?? '').toLowerCase().includes(q) || tx.bankName.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.count}>{filtered.length} total</Text>
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="Search merchant or bank…"
          placeholderTextColor={Colors.outline}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => <TxItem tx={item} currency={currency} />}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No transactions found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
  },
  title: { ...Typography.headlineSm, color: Colors.onSurface },
  count: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  searchWrap: { paddingHorizontal: Spacing.containerMargin, paddingBottom: Spacing.md },
  search: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...Typography.bodyMd, color: Colors.onSurface,
  },
  list: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 32 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  dot: {
    width: 40, height: 40, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  dotText: { fontSize: 16, fontWeight: '700' },
  itemInfo: { flex: 1 },
  itemMerchant: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
  itemMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
  itemDate: { ...Typography.labelSm, color: Colors.outline, letterSpacing: 0, marginTop: 1 },
  itemAmount: { ...Typography.numericSm, fontSize: 15 },
  sep: { height: 1, backgroundColor: Colors.outlineVariant, marginLeft: 56 },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
});
