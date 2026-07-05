import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { loadDeletedTxRecords, type TxRecord } from '../../db/database';
import { useTxStore } from '../../store/txStore';
import { formatAmount } from '../../utils/format';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function DeletedTransactionsScreen({ navigation }: MainStackScreenProps<'DeletedTransactions'>) {
  const [deleted, setDeleted] = useState<TxRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const restore = useTxStore((s) => s.restore);

  const load = useCallback(async () => {
    setDeleted(await loadDeletedTxRecords());
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRestore = async (tx: TxRecord) => {
    await restore(tx.id); // clears deleted_at + refreshes the main store
    await load();
  };

  return (
    <View style={styles.root}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
        <Text style={styles.backText}>← Back</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Deleted transactions</Text>
      <Text style={styles.sub}>
        Deleted transactions are never re-added by scans. Restore one to bring it back with its
        category, notes, and tags intact.
      </Text>

      <FlatList
        data={deleted}
        keyExtractor={(tx) => String(tx.id)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        ListEmptyComponent={
          loaded ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Nothing here — no deleted transactions.</Text>
            </View>
          ) : null
        }
        renderItem={({ item: tx }) => {
          const debit =
            tx.type === TransactionType.EXPENSE ||
            tx.type === TransactionType.TRANSFER ||
            tx.type === TransactionType.INVESTMENT;
          return (
            <View style={styles.row}>
              <View style={styles.info}>
                <Text style={styles.merchant} numberOfLines={1}>
                  {tx.merchant || tx.bankName}
                </Text>
                <Text style={styles.meta}>
                  {formatDate(tx.timestamp)} · deleted {tx.deletedAt ? formatDate(tx.deletedAt) : '—'}
                </Text>
              </View>
              <Text style={[styles.amount, { color: debit ? Colors.errorMuted : Colors.primary }]}>
                {debit ? '-' : '+'}
                {formatAmount(tx.amount, tx.currency)}
              </Text>
              <TouchableOpacity style={styles.restoreBtn} onPress={() => handleRestore(tx)}>
                <Text style={styles.restoreText}>Restore</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background, padding: Spacing.containerMargin },
  back: { marginTop: Spacing.lg },
  backText: { ...Typography.bodyMd, color: Colors.primary },
  title: { ...Typography.headlineSm, color: Colors.onSurface, marginTop: Spacing.md },
  sub: { ...Typography.supportingText, color: Colors.onSurfaceVariant, marginTop: Spacing.sm, marginBottom: Spacing.md },
  list: { paddingBottom: 32 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.sm },
  info: { flex: 1 },
  merchant: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
  meta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
  amount: { ...Typography.numericSm, fontSize: 14 },
  restoreBtn: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  restoreText: { ...Typography.labelSm, color: Colors.primary, letterSpacing: 0 },
  sep: { height: 1, backgroundColor: Colors.outlineVariant },
  empty: { paddingTop: 60, alignItems: 'center' },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
});
