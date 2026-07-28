import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MainStackScreenProps } from '../../navigation/types';
import {
  getCategoryRules, deleteCategoryRule, type CategoryRule,
  getTransactionGroups, deleteTransactionGroup, type TransactionGroupSummary,
} from '../../db/database';
import { useTxStore } from '../../store/txStore';
import { formatAmount } from '../../utils/format';
import { Colors } from '../../theme';
import { TrashIcon } from '../../components/TabIcon';

type Section = 'category' | 'merchant' | 'amount';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'category', label: 'Category' },
  { key: 'merchant', label: 'Merchant' },
  { key: 'amount', label: 'Amount' },
];

function renderSeparator() {
  return <View className="h-[1px] bg-outline-variant" />;
}

// Single "Rules" umbrella screen (MORE.md lists one Rules row) over every kind of
// auto-categorization rule: merchant→category mappings, merchant groupings, and
// (once built) amount-threshold rules like "spends >10k mark as internal transfer".
export function RulesScreen({ navigation, route }: MainStackScreenProps<'Rules'>) {
  const [section, setSection] = useState<Section>(route.params?.section ?? 'category');

  const [categoryRules, setCategoryRules] = useState<CategoryRule[]>([]);
  const [merchantGroups, setMerchantGroups] = useState<TransactionGroupSummary[]>([]);
  const [loaded, setLoaded] = useState(false);
  const currency = useTxStore((s) => s.txs[0]?.currency);
  const refreshTxs = useTxStore((s) => s.refresh);

  const load = useCallback(async () => {
    const [rules, groups] = await Promise.all([getCategoryRules(), getTransactionGroups()]);
    setCategoryRules(rules);
    setMerchantGroups(groups);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleDeleteCategoryRule = useCallback(
    (rule: CategoryRule) => {
      Alert.alert(
        'Remove category rule',
        `"${rule.merchantPattern}" will no longer be auto-categorized as ${rule.categoryName}. This doesn't change past transactions.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await deleteCategoryRule(rule.id);
              await load();
            },
          },
        ],
      );
    },
    [load],
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
              await refreshTxs();
            },
          },
        ],
      );
    },
    [load, refreshTxs],
  );

  return (
    <View className="flex-1 bg-background p-container-margin">
      <TouchableOpacity onPress={() => navigation.goBack()} className="mt-sm">
        <Text className="font-inter text-body-md text-primary">← Back</Text>
      </TouchableOpacity>
      <Text className="font-inter-bold text-headline-sm text-on-surface mt-md">Rules</Text>

      <View className="flex-row gap-xs mt-md mb-md">
        {SECTIONS.map((s) => (
          <TouchableOpacity
            key={s.key}
            onPress={() => setSection(s.key)}
            className={`flex-1 py-sm rounded-full items-center ${section === s.key ? 'bg-primary' : 'bg-surface-variant'}`}
          >
            <Text className={`font-inter-medium text-annotation ${section === s.key ? 'text-on-primary' : 'text-on-surface-variant'}`}>
              {s.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {section === 'category' && (
        <>
          <Text className="font-inter text-supporting-text text-on-surface-variant mb-md">
            Whenever you edit a transaction's category, the merchant is remembered here and applied
            automatically to future SMS from the same sender.
          </Text>
          <FlatList
            data={categoryRules}
            keyExtractor={(rule) => String(rule.id)}
            contentContainerClassName="pb-[32px]"
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={
              loaded ? (
                <View className="pt-[60px] items-center">
                  <Text className="font-inter text-body-md text-on-surface-variant">
                    No rules yet — editing a transaction's category creates one automatically.
                  </Text>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View className="flex-row items-center justify-between py-md gap-sm">
                <View className="flex-1">
                  <Text className="font-inter-medium text-body-standard text-on-surface" numberOfLines={1}>
                    {item.merchantPattern}
                  </Text>
                  <Text className="font-inter text-annotation text-on-surface-variant mt-[2px]" numberOfLines={1}>
                    → {item.categoryName}{item.subcategoryName ? ` / ${item.subcategoryName}` : ''}
                  </Text>
                </View>
                <TouchableOpacity hitSlop={8} onPress={() => handleDeleteCategoryRule(item)}>
                  <TrashIcon color={Colors.errorMuted} size={18} />
                </TouchableOpacity>
              </View>
            )}
          />
        </>
      )}

      {section === 'merchant' && (
        <>
          <Text className="font-inter text-supporting-text text-on-surface-variant mb-md">
            Transactions you've grouped together on the timeline (e.g. related charges from the same
            merchant or trip) show up here. Ungrouping keeps every transaction — it just splits them
            apart again.
          </Text>
          <FlatList
            data={merchantGroups}
            keyExtractor={(group) => String(group.id)}
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
            renderItem={({ item }) => (
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
            )}
          />
        </>
      )}

      {section === 'amount' && (
        <>
          <Text className="font-inter text-supporting-text text-on-surface-variant mb-md">
            Automatically tag or categorize transactions based on their amount — e.g. "spends over
            ₹10,000 mark as internal transfer." Not built yet.
          </Text>
          <View className="pt-[60px] items-center">
            <Text className="font-inter text-body-md text-on-surface-variant">Coming soon.</Text>
          </View>
        </>
      )}
    </View>
  );
}
