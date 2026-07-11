import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
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
    <View className="flex-1 bg-background p-container-margin">
      <TouchableOpacity onPress={() => navigation.goBack()} className="mt-sm">
        <Text className="font-inter text-body-md text-primary">← Back</Text>
      </TouchableOpacity>
      <Text className="font-inter-bold text-headline-sm text-on-surface mt-md">Deleted transactions</Text>
      <Text className="font-inter text-supporting-text text-on-surface-variant mt-sm mb-md">
        Deleted transactions are never re-added by scans. Restore one to bring it back with its
        category, notes, and tags intact.
      </Text>

      <FlatList
        data={deleted}
        keyExtractor={(tx) => String(tx.id)}
        contentContainerClassName="pb-[32px]"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View className="h-[1px] bg-outline-variant" />}
        ListEmptyComponent={
          loaded ? (
            <View className="pt-[60px] items-center">
              <Text className="font-inter text-body-md text-on-surface-variant">Nothing here — no deleted transactions.</Text>
            </View>
          ) : null
        }
        renderItem={({ item: tx }) => {
          const debit =
            tx.type === TransactionType.EXPENSE ||
            tx.type === TransactionType.TRANSFER ||
            tx.type === TransactionType.INVESTMENT;
          return (
            <View className="flex-row items-center gap-sm py-sm">
              <View className="flex-1">
                <Text className="font-inter-medium text-body-sm text-on-surface" numberOfLines={1}>
                  {tx.merchant || tx.bankName}
                </Text>
                <Text className="font-mono text-label-sm text-on-surface-variant tracking-[0] mt-[2px]">
                  {formatDate(tx.timestamp)} · deleted {tx.deletedAt ? formatDate(tx.deletedAt) : '—'}
                </Text>
              </View>
              <Text className={`font-mono text-numeric-sm ${debit ? 'text-error-muted' : 'text-primary'}`}>
                {debit ? '-' : '+'}
                {formatAmount(tx.amount, tx.currency)}
              </Text>
              <TouchableOpacity className="border border-primary rounded-md px-sm py-[6px]" onPress={() => handleRestore(tx)}>
                <Text className="font-mono text-label-sm text-primary tracking-[0]">Restore</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}
