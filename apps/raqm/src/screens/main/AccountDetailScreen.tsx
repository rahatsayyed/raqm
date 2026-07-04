import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getAccounts, updateAccount, Account } from '../../db/database';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import type { TxRecord } from '../../db/database';

function formatAmount(n: number, currency = '₹'): string {
  return `${currency}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

function txColor(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME:
    case TransactionType.CREDIT: return Colors.primary;
    case TransactionType.EXPENSE: return Colors.error;
    default: return Colors.onSurfaceVariant;
  }
}

export function AccountDetailScreen({ route, navigation }: MainStackScreenProps<'AccountDetail'>) {
  const { bankName, last4 } = route.params;
  const txs = useTxStore(s => s.txs);
  const [account, setAccount] = useState<Account | null>(null);
  const [nickname, setNickname] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const accountTxs = useMemo(
    () => txs.filter(t => t.bankName === bankName && (t.accountLast4 ?? '') === (last4 ?? '')),
    [txs, bankName, last4],
  );

  const isCard = account?.isCard ?? accountTxs.some(t => t.isFromCard);
  const currency = accountTxs[0]?.currency ?? '₹';

  const lastBalanceTx = useMemo(
    () => accountTxs.find(t => t.balance != null),
    [accountTxs],
  );

  const outstanding = useMemo(() => {
    if (!account?.creditLimit || lastBalanceTx?.balance == null) return null;
    return account.creditLimit - lastBalanceTx.balance;
  }, [account, lastBalanceTx]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const accounts = await getAccounts();
      const match = accounts.find(a => a.bankName === bankName && (a.last4 ?? '') === (last4 ?? '')) ?? null;
      if (cancelled) return;
      setAccount(match);
      setNickname(match?.nickname ?? '');
      setCreditLimit(match?.creditLimit != null ? String(match.creditLimit) : '');
      setDueDate(match?.dueDate ?? '');
    })();
    return () => { cancelled = true; };
  }, [bankName, last4]);

  const handleSave = async () => {
    if (!account) return;
    setSaving(true);
    try {
      const parsedLimit = Number(creditLimit.trim());
      await updateAccount(account.id, {
        nickname: nickname.trim() || null,
        creditLimit: creditLimit.trim() && Number.isFinite(parsedLimit) ? parsedLimit : null,
        dueDate: dueDate.trim() || null,
      });
      const accounts = await getAccounts();
      const refreshed = accounts.find(a => a.id === account.id) ?? null;
      setAccount(refreshed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <Text style={styles.headerIcon}>{isCard ? '💳' : '🏦'}</Text>
          <Text style={styles.headerBank}>{account?.nickname || bankName}</Text>
          <Text style={styles.headerSub}>{last4 ? `•••• ${last4}` : 'Account'}</Text>
          <Text style={styles.balanceLabel}>Last known balance</Text>
          <Text style={styles.balanceValue}>
            {lastBalanceTx?.balance != null ? formatAmount(lastBalanceTx.balance, currency) : '—'}
          </Text>
          {lastBalanceTx && (
            <Text style={styles.balanceMeta}>as of {formatDate(lastBalanceTx.timestamp)}</Text>
          )}
        </View>

        {isCard && (
          <View style={styles.cardPanel}>
            <Text style={styles.sectionTitle}>Card details</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Nickname</Text>
              <TextInput
                style={styles.cardInput}
                value={nickname}
                onChangeText={setNickname}
                placeholder="e.g. Everyday card"
                placeholderTextColor={Colors.outline}
              />
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Credit limit</Text>
              <TextInput
                style={styles.cardInput}
                value={creditLimit}
                onChangeText={setCreditLimit}
                keyboardType="numeric"
                placeholder="e.g. 100000"
                placeholderTextColor={Colors.outline}
              />
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Due date</Text>
              <TextInput
                style={styles.cardInput}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="e.g. 5th of month"
                placeholderTextColor={Colors.outline}
              />
            </View>
            {outstanding != null && (
              <View style={styles.outstandingRow}>
                <Text style={styles.cardLabel}>Outstanding</Text>
                <Text style={styles.outstandingValue}>{formatAmount(outstanding, currency)}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving || !account}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save card details'}</Text>
            </TouchableOpacity>
            {!account && (
              <Text style={styles.hint}>Account row not found yet — it appears after the next scan or app restart.</Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transactions ({accountTxs.length})</Text>
          <View style={styles.txList}>
            {accountTxs.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No transactions for this account</Text>
              </View>
            ) : (
              accountTxs.map((tx, i) => (
                <AccountTxRow
                  key={tx.id}
                  tx={tx}
                  currency={currency}
                  isLast={i === accountTxs.length - 1}
                  onPress={() => navigation.navigate('TransactionDetail', { transactionId: tx.id })}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function AccountTxRow({
  tx, currency, isLast, onPress,
}: { tx: TxRecord; currency: string; isLast: boolean; onPress: () => void }) {
  const debit = isDebit(tx.type);
  const color = txColor(tx.type);
  return (
    <TouchableOpacity style={[styles.txRow, !isLast && styles.txRowBorder]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.txDot, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.txDotText, { color }]}>{debit ? '↓' : '↑'}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txMerchant} numberOfLines={1}>{tx.merchant || tx.bankName}</Text>
        <Text style={styles.txMeta}>{formatDate(tx.timestamp)}</Text>
      </View>
      <Text style={[styles.txAmount, { color }]}>{debit ? '-' : '+'}{formatAmount(tx.amount, currency)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.containerMargin, paddingBottom: 40 },
  back: { marginBottom: Spacing.md },
  backText: { ...Typography.bodyMd, color: Colors.primary },

  headerCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    padding: Spacing.lg, alignItems: 'center', gap: 4, marginBottom: Spacing.lg,
  },
  headerIcon: { fontSize: 32, marginBottom: 4 },
  headerBank: { ...Typography.headlineSm, color: Colors.onSurface },
  headerSub: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  balanceLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginTop: Spacing.md },
  balanceValue: { ...Typography.numericXl, color: Colors.onSurface },
  balanceMeta: { ...Typography.labelSm, color: Colors.outline },

  cardPanel: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    padding: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.sm,
  },
  sectionTitle: { ...Typography.titleLg, color: Colors.onSurface, fontSize: 16, marginBottom: Spacing.sm },
  cardRow: { gap: 4 },
  cardLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant },
  cardInput: {
    ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
  },
  outstandingRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  outstandingValue: { ...Typography.numericMd, color: Colors.error, fontSize: 16 },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 10, alignItems: 'center', marginTop: Spacing.sm,
  },
  saveBtnText: { ...Typography.bodyMd, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
  hint: { ...Typography.labelSm, color: Colors.outline, marginTop: 4 },

  section: {},
  txList: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant, overflow: 'hidden',
  },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: 14 },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  txDot: { width: 40, height: 40, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  txDotText: { fontSize: 16, fontWeight: '700' },
  txInfo: { flex: 1 },
  txMerchant: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
  txMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
  txAmount: { ...Typography.numericSm, fontSize: 15 },
  empty: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
});
