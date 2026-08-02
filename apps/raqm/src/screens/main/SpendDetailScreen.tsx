import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getSetting, type TxRecord } from '../../db/database';
import { countsTowardTotals } from '../../services/txIntelligence';
import { getMonthBounds, type PeriodBounds } from '../../utils/period';
import { formatAmount } from '../../utils/format';
import { accountLabel } from '../../utils/accountLabel';
import { Colors } from '../../theme';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

// Shared "heavy graph page" for a single category or a single account, opened by tapping
// a category row or an account card anywhere in the app. Charts are intentionally a
// placeholder for now (design deferred) — the header stats and transaction list are real.
export function SpendDetailScreen({ route, navigation }: MainStackScreenProps<'SpendDetail'>) {
  const params = route.params;
  const txs = useTxStore((s) => s.txs);
  const accountLabels = useTxStore((s) => s.accountLabels);
  const [bounds, setBounds] = useState<PeriodBounds | null>(null);

  useEffect(() => {
    getSetting('month_start_day').then((day) => setBounds(getMonthBounds(new Date(), day ? Number(day) : 1)));
  }, []);

  const filteredTxs = useMemo(() => {
    if (!bounds) return [];
    return txs
      .filter((tx) => {
        if (tx.deletedAt || !countsTowardTotals(tx)) return false;
        if (tx.type === TransactionType.BALANCE_UPDATE) return false; // ₹0 internal bookkeeping marker, not real activity
        if (tx.timestamp < bounds.from || tx.timestamp > bounds.to) return false;
        if (params.filterType === 'category') return tx.categoryId === params.categoryId;
        return tx.bankName === params.bankName && (tx.accountLast4 ?? '') === (params.last4 ?? '');
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }, [txs, bounds, params]);

  const total = useMemo(
    () => filteredTxs.filter((tx) => isDebit(tx.type)).reduce((s, tx) => s + tx.amount, 0),
    [filteredTxs],
  );

  const title =
    params.filterType === 'category' ? params.categoryName : accountLabel(params.bankName, params.last4, accountLabels);
  const subtitle = params.filterType === 'category' ? 'Category' : params.last4 ? `•••• ${params.last4}` : 'Account';

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="p-container-margin pb-[40px]" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => navigation.goBack()} className="mb-md">
        <Text className="font-inter text-body-md text-primary">← Back</Text>
      </TouchableOpacity>

      <Text className="font-inter-bold text-headline-sm text-on-surface">{title}</Text>
      <Text className="font-inter text-supporting-text text-on-surface-variant mt-[2px]">{subtitle}</Text>
      <Text className="font-mono-medium text-numeric-lg text-on-surface mt-sm">{formatAmount(total)}</Text>
      <Text className="font-inter text-supporting-text text-on-surface-variant mt-[4px]">
        {filteredTxs.length} transaction{filteredTxs.length !== 1 ? 's' : ''} this period
      </Text>

      <View className="mt-xl bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant p-xl items-center justify-center min-h-[160px]">
        <Text className="font-inter text-body-md text-on-surface-variant">Charts coming soon.</Text>
      </View>

      <View className="mt-xl">
        <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">Transactions</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
          {filteredTxs.length === 0 ? (
            <Text className="font-inter text-body-md text-on-surface-variant text-center p-md">No transactions in this period</Text>
          ) : (
            filteredTxs.map((tx, i) => (
              <SpendTxRow key={tx.id} tx={tx} isLast={i === filteredTxs.length - 1} onPress={() => navigation.navigate('TransactionDetail', { transactionId: tx.id })} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function SpendTxRow({ tx, isLast, onPress }: { tx: TxRecord; isLast: boolean; onPress: () => void }) {
  const debit = isDebit(tx.type);
  const color = debit ? Colors.errorMuted : Colors.primary;
  const accountLabels = useTxStore((s) => s.accountLabels);
  return (
    <TouchableOpacity
      className={`flex-row justify-between items-center py-[12px] ${!isLast ? 'border-b border-outline-variant' : ''}`}
      onPress={onPress}
    >
      <View className="flex-1">
        <Text className="font-inter-medium text-body-sm text-on-surface" numberOfLines={1}>{tx.merchant || accountLabel(tx.bankName, tx.accountLast4, accountLabels)}</Text>
        <Text className="font-mono text-label-sm tracking-[0px] text-on-surface-variant mt-[2px]">{formatDate(tx.timestamp)}</Text>
      </View>
      <Text className="font-mono text-[15px] leading-[20px]" style={{ color }}>
        {debit ? '-' : '+'}{formatAmount(tx.amount, tx.currency)}
      </Text>
    </TouchableOpacity>
  );
}
