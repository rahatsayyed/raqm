import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MainStackScreenProps } from '../../navigation/types';
import {
  getTransactionGroups,
  deleteTransactionGroup,
  type TransactionGroupSummary,
} from '../../db/database';
import { useTxStore } from '../../store/txStore';
import { formatAmount } from '../../utils/format';
import { Colors } from '../../theme';
import { TrashIcon } from '../../components/TabIcon';

function keyExtractor(group: TransactionGroupSummary): string {
  return String(group.id);
}

function renderSeparator() {
  return <View className="h-[1px] bg-outline-variant" />;
}

export function MerchantRulesScreen({ navigation }: MainStackScreenProps<'MerchantRules'>) {
  const [groups, setGroups] = useState<TransactionGroupSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const currency = useTxStore((s) => s.txs[0]?.currency);
  const refresh = useTxStore((s) => s.refresh);

  const load = useCallback(async () => {
    setGroups(await getTransactionGroups());
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleUngroup = useCallback(
    (group: TransactionGroupSummary) => {
      Alert.alert(
        'Ungroup transactions',
        `"${group.name || 'This group'}" will be dissolved — its ${group.txCount} transaction${group.txCount === 1 ? '' : 's'} stay on the ledger, just no longer grouped together.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Ungroup',
            style: 'destructive',
            onPress: async () => {
              await deleteTransactionGroup(group.id);
              await load();
              await refresh();
            },
          },
        ],
      );
    },
    [load, refresh],
  );

  const renderItem = useCallback(
    ({ item }: { item: TransactionGroupSummary }) => (
      <View className="flex-row items-center justify-between py-md gap-sm">
        <View className="flex-1">
          <Text className="font-inter-medium text-body-standard text-on-surface" numberOfLines={1}>
            {item.name || 'Unnamed group'}
          </Text>
          <Text className="font-inter text-annotation text-on-surface-variant mt-[2px]">
            {item.txCount} transaction{item.txCount === 1 ? '' : 's'} · {formatAmount(item.totalAmount, currency)}
          </Text>
        </View>
        <TouchableOpacity hitSlop={8} onPress={() => handleUngroup(item)}>
          <TrashIcon color={Colors.errorMuted} size={18} />
        </TouchableOpacity>
      </View>
    ),
    [handleUngroup, currency],
  );

  return (
    <View className="flex-1 bg-background p-container-margin">
      <TouchableOpacity onPress={() => navigation.goBack()} className="mt-sm">
        <Text className="font-inter text-body-md text-primary">← Back</Text>
      </TouchableOpacity>
      <Text className="font-inter-bold text-headline-sm text-on-surface mt-md">Merchant rules</Text>
      <Text className="font-inter text-supporting-text text-on-surface-variant mt-sm mb-md">
        Transactions you've grouped together on the timeline (e.g. related charges from the same
        merchant or trip) show up here. Ungrouping keeps every transaction — it just splits them
        apart again.
      </Text>

      <FlatList
        data={groups}
        keyExtractor={keyExtractor}
        contentContainerClassName="pb-[32px]"
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={renderSeparator}
        ListEmptyComponent={
          loaded ? (
            <View className="pt-[60px] items-center">
              <Text className="font-inter text-body-md text-on-surface-variant">
                No grouped merchants yet.
              </Text>
            </View>
          ) : null
        }
        renderItem={renderItem}
      />
    </View>
  );
}
