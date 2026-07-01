import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useAppStore } from '../../store/appStore';
import { useOnboardingStore } from '../../store/onboardingStore';
import { SmsReader } from '../../native/SmsReader';
import { BankParserFactory } from '@rahatsayyed/bank-sms-parser';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatAmount(n: number, currency = '₹'): string {
  return `${currency}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function txIcon(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME:
    case TransactionType.CREDIT: return '⬆';
    case TransactionType.EXPENSE: return '⬇';
    case TransactionType.TRANSFER: return '↔';
    case TransactionType.INVESTMENT: return '📈';
    default: return '·';
  }
}

function txColor(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME:
    case TransactionType.CREDIT: return Colors.primary;
    case TransactionType.EXPENSE: return Colors.error;
    case TransactionType.TRANSFER: return Colors.onSurfaceVariant;
    default: return Colors.onSurfaceVariant;
  }
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

export function DashboardScreen() {
  const { userName } = useAppStore();
  const { transactions, addTransaction } = useOnboardingStore();
  const [newTxLabel, setNewTxLabel] = React.useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const sub = SmsReader.addNewSmsListener(({ body, sender, timestamp }) => {
      const tx = BankParserFactory.parse(body, sender, timestamp);
      if (tx) {
        addTransaction(tx);
        const label = tx.merchant
          ? `${tx.type === TransactionType.EXPENSE ? '-' : '+'}₹${tx.amount.toLocaleString('en-IN')} · ${tx.merchant}`
          : `New transaction from ${tx.bankName}`;
        setNewTxLabel(label);
        Animated.sequence([
          Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(3000),
          Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setNewTxLabel(null));
      }
    });
    return () => sub.remove();
  }, []);

  const stats = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const tx of transactions) {
      if (tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT) {
        income += tx.amount;
      } else if (isDebit(tx.type)) {
        expenses += tx.amount;
      }
    }
    return { income, expenses, net: income - expenses };
  }, [transactions]);

  const accounts = useMemo(() => {
    const map = new Map<string, { bank: string; last4: string | null; isCard: boolean; count: number }>();
    for (const tx of transactions) {
      const key = `${tx.bankName}|${tx.accountLast4 ?? ''}`;
      if (map.has(key)) {
        map.get(key)!.count += 1;
      } else {
        map.set(key, { bank: tx.bankName, last4: tx.accountLast4, isCard: !!tx.isFromCard, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [transactions]);

  const recent = useMemo(
    () => [...transactions].sort((a, b) => b.timestamp - a.timestamp).slice(0, 15),
    [transactions],
  );

  const currency = transactions[0]?.currency ?? '₹';
  const firstName = userName.trim().split(' ')[0];
  const netIsPositive = stats.net >= 0;

  return (
    <View style={{ flex: 1 }}>
    {newTxLabel && (
      <Animated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
        <Text style={styles.toastText}>⚡ {newTxLabel}</Text>
      </Animated.View>
    )}
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingLabel}>{greeting()}</Text>
          <Text style={styles.greetingName}>{firstName || 'there'} 👋</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{(firstName?.[0] ?? 'R').toUpperCase()}</Text>
        </View>
      </View>

      {/* Net flow hero card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Net cash flow</Text>
        <Text style={[styles.heroAmount, { color: netIsPositive ? '#fff' : '#ffd5d5' }]}>
          {netIsPositive ? '+' : '-'}{formatAmount(stats.net, currency)}
        </Text>
        <View style={styles.heroRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>⬆ Income</Text>
            <Text style={styles.heroStatValue}>{formatAmount(stats.income, currency)}</Text>
          </View>
          <View style={styles.heroSeparator} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>⬇ Expenses</Text>
            <Text style={styles.heroStatValue}>{formatAmount(stats.expenses, currency)}</Text>
          </View>
        </View>
        <Text style={styles.heroMeta}>{transactions.length} transactions across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Accounts */}
      {accounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
            {accounts.map((acc, i) => (
              <View key={i} style={styles.accountChip}>
                <Text style={styles.accountChipIcon}>{acc.isCard ? '💳' : '🏦'}</Text>
                <View>
                  <Text style={styles.accountChipBank}>{acc.bank}</Text>
                  <Text style={styles.accountChipMeta}>
                    {acc.last4 ? `•••• ${acc.last4}` : 'Account'} · {acc.count} txns
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent transactions</Text>
        <View style={styles.txList}>
          {recent.length === 0 ? (
            <View style={styles.emptyTx}>
              <Text style={styles.emptyTxText}>No transactions found</Text>
            </View>
          ) : (
            recent.map((tx, i) => (
              <TxRow key={i} tx={tx} currency={currency} isLast={i === recent.length - 1} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

function TxRow({ tx, currency, isLast }: { tx: ParsedTransaction; currency: string; isLast: boolean }) {
  const debit = isDebit(tx.type);
  const color = txColor(tx.type);
  const sign = debit ? '-' : '+';

  return (
    <View style={[styles.txRow, !isLast && styles.txRowBorder]}>
      <View style={[styles.txIconBox, { backgroundColor: `${color}18` }]}>
        <Text style={[styles.txIcon, { color }]}>{txIcon(tx.type)}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txMerchant} numberOfLines={1}>
          {tx.merchant || tx.bankName}
        </Text>
        <Text style={styles.txMeta}>
          {tx.bankName}{tx.accountLast4 ? ` ···${tx.accountLast4}` : ''} · {formatDate(tx.timestamp)}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color }]}>
        {sign}{formatAmount(tx.amount, currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  greetingLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  greetingName: { ...Typography.headlineSm, color: Colors.onSurface, marginTop: 2 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Typography.titleLg, color: Colors.onPrimaryContainer, fontSize: 18 },

  heroCard: {
    marginHorizontal: Spacing.containerMargin,
    borderRadius: Radius.xxl,
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    gap: Spacing.sm,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
  },
  heroLabel: { ...Typography.labelSm, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.8 },
  heroAmount: { ...Typography.numericXl, color: '#fff' },
  heroRow: { flexDirection: 'row', marginTop: Spacing.sm },
  heroStat: { flex: 1, gap: 4 },
  heroSeparator: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginHorizontal: Spacing.md },
  heroStatLabel: { ...Typography.labelSm, color: 'rgba(255,255,255,0.65)' },
  heroStatValue: { ...Typography.numericMd, color: '#fff', fontSize: 18 },
  heroMeta: { ...Typography.labelSm, color: 'rgba(255,255,255,0.5)', marginTop: 4 },

  section: { marginTop: Spacing.xl, paddingHorizontal: Spacing.containerMargin },
  sectionTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.md, fontSize: 16 },

  accountsRow: { gap: Spacing.sm, paddingRight: Spacing.containerMargin },
  accountChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    minWidth: 160,
  },
  accountChipIcon: { fontSize: 22 },
  accountChipBank: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
  accountChipMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },

  txList: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  txIconBox: {
    width: 40, height: 40, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  txIcon: { fontSize: 16, fontWeight: '700' },
  txInfo: { flex: 1 },
  txMerchant: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
  txMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
  txAmount: { ...Typography.numericSm, fontSize: 15 },

  emptyTx: { padding: Spacing.xl, alignItems: 'center' },
  emptyTxText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },

  toast: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    margin: Spacing.md, borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  toastText: { ...Typography.bodyMd, color: '#fff', fontFamily: 'WorkSans_500Medium' },
});
