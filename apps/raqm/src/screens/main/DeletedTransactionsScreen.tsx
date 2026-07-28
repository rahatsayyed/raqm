import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MainStackScreenProps } from '../../navigation/types';
import { loadDeletedTxRecords, type TxRecord } from '../../db/database';
import { useTxStore } from '../../store/txStore';
import { formatAmount } from '../../utils/format';
import { accountLabel } from '../../utils/accountLabel';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

interface DeletedTxRowProps {
  id: number;
  merchant: string;
  dateLabel: string;
  deletedDateLabel: string;
  amountLabel: string;
  debit: boolean;
  onRestore: (id: number) => void;
}

// Memoized with primitive/stable props per CLAUDE.md's list-performance invariant —
// this list can grow as large as the active timeline (~5k+ rows on real devices).
const DeletedTxRow = React.memo(function DeletedTxRow({
  id,
  merchant,
  dateLabel,
  deletedDateLabel,
  amountLabel,
  debit,
  onRestore,
}: DeletedTxRowProps) {
  return (
    <View className="flex-row items-center gap-sm py-sm">
      <View className="flex-1">
        <Text className="font-inter-medium text-body-sm text-on-surface" numberOfLines={1}>
          {merchant}
        </Text>
        <Text className="font-mono text-label-sm text-on-surface-variant tracking-[0] mt-[2px]">
          {dateLabel} · deleted {deletedDateLabel}
        </Text>
      </View>
      <Text className={`font-mono text-numeric-sm ${debit ? 'text-error-muted' : 'text-primary'}`}>
        {debit ? '-' : '+'}
        {amountLabel}
      </Text>
      <TouchableOpacity className="border border-primary rounded-md px-sm py-[6px]" onPress={() => onRestore(id)}>
        <Text className="font-mono text-label-sm text-primary tracking-[0]">Restore</Text>
      </TouchableOpacity>
    </View>
  );
});

function keyExtractor(tx: TxRecord): string {
  return String(tx.id);
}

function renderSeparator() {
  return <View className="h-[1px] bg-outline-variant" />;
}

export function DeletedTransactionsScreen({ navigation }: MainStackScreenProps<'DeletedTransactions'>) {
  const [deleted, setDeleted] = useState<TxRecord[]>([]);
  const [loaded, setLoaded] = useState(false);
  const restore = useTxStore((s) => s.restore);
  const accountLabels = useTxStore((s) => s.accountLabels);

  const load = useCallback(async () => {
    setDeleted(await loadDeletedTxRecords());
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRestore = useCallback(
    async (id: number) => {
      await restore(id); // clears deleted_at + refreshes the main store
      await load();
    },
    [restore, load],
  );

  const renderItem = useCallback(
    ({ item: tx }: { item: TxRecord }) => (
      <DeletedTxRow
        id={tx.id}
        merchant={tx.merchant || accountLabel(tx.bankName, tx.accountLast4, accountLabels)}
        dateLabel={formatDate(tx.timestamp)}
        deletedDateLabel={tx.deletedAt ? formatDate(tx.deletedAt) : '—'}
        amountLabel={formatAmount(tx.amount, tx.currency)}
        debit={isDebit(tx.type)}
        onRestore={handleRestore}
      />
    ),
    [handleRestore, accountLabels],
  );

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
        keyExtractor={keyExtractor}
        contentContainerClassName="pb-[32px]"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={
          loaded ? (
            <View className="pt-[60px] items-center">
              <Text className="font-inter text-body-md text-on-surface-variant">Nothing here — no deleted transactions.</Text>
            </View>
          ) : null
        }
        renderItem={renderItem}
      />
    </View>
  );
}
