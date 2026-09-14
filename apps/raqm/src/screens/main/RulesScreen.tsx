import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MainStackScreenProps } from '../../navigation/types';
import {
  getCategoryRules, deleteCategoryRule, type CategoryRule,
  getTransactionGroups, deleteTransactionGroup, type TransactionGroupSummary,
  getWordMatchRules, upsertWordMatchRule, deleteWordMatchRule, reorderWordMatchRules, type WordMatchRule,
  getCategories, type Category,
} from '../../db/database';
import { reapplyWordMatchRule } from '../../services/rulesReapply';
import { useTxStore } from '../../store/txStore';
import { formatAmount } from '../../utils/format';
import { Colors } from '../../theme';
import { TrashIcon } from '../../components/TabIcon';

type Section = 'category' | 'word_match' | 'merchant' | 'amount' | 'privacy';

const SECTIONS: { key: Section; label: string }[] = [
  { key: 'category', label: 'Category' },
  { key: 'word_match', label: 'Word Match' },
  { key: 'merchant', label: 'Merchant' },
  { key: 'amount', label: 'Amount' },
  { key: 'privacy', label: 'Privacy' },
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
  const [wordMatchRules, setWordMatchRules] = useState<WordMatchRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [addingWordMatch, setAddingWordMatch] = useState(false);
  const [newPattern, setNewPattern] = useState('');
  const [newCategoryId, setNewCategoryId] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const currency = useTxStore((s) => s.txs[0]?.currency);
  const refreshTxs = useTxStore((s) => s.refresh);

  const load = useCallback(async () => {
    const [rules, groups, wordRules, cats] = await Promise.all([
      getCategoryRules(),
      getTransactionGroups(),
      getWordMatchRules(),
      getCategories(),
    ]);
    setCategoryRules(rules);
    setMerchantGroups(groups);
    setWordMatchRules(wordRules);
    setCategories(cats);
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

  const handleSaveWordMatch = useCallback(async () => {
    const trimmed = newPattern.trim();
    if (!trimmed || newCategoryId == null) return;
    await upsertWordMatchRule(null, trimmed, newCategoryId, null);
    setAddingWordMatch(false);
    setNewPattern('');
    setNewCategoryId(null);
    await load();
    Alert.alert(
      'Apply to past transactions?',
      `Re-categorize existing transactions matching "${trimmed}" as well, or only new ones from now on?`,
      [
        { text: 'From now on only', style: 'cancel' },
        {
          text: 'Apply to past too',
          onPress: async () => {
            const count = await reapplyWordMatchRule(trimmed, newCategoryId, null);
            Alert.alert('Done', `${count} transaction${count === 1 ? '' : 's'} updated.`);
          },
        },
      ],
    );
  }, [newPattern, newCategoryId, load]);

  const handleDeleteWordMatch = useCallback(
    (rule: WordMatchRule) => {
      Alert.alert('Remove Word Match rule', `"${rule.pattern}" will no longer auto-categorize matching merchants.`, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await deleteWordMatchRule(rule.id);
            await load();
          },
        },
      ]);
    },
    [load],
  );

  const handleMoveWordMatch = useCallback(
    async (index: number, direction: -1 | 1) => {
      const newOrder = [...wordMatchRules];
      const target = index + direction;
      if (target < 0 || target >= newOrder.length) return;
      [newOrder[index], newOrder[target]] = [newOrder[target], newOrder[index]];
      setWordMatchRules(newOrder);
      await reorderWordMatchRules(newOrder.map((r) => r.id));
    },
    [wordMatchRules],
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

      {section === 'word_match' && (
        <>
          <Text className="font-inter text-supporting-text text-on-surface-variant mb-md">
            Match any part of a merchant name (e.g. "kirana") to a category. Checked only when no
            exact merchant rule already applies.
          </Text>
          {addingWordMatch ? (
            <View className="gap-sm mb-md">
              <TextInput
                value={newPattern}
                onChangeText={setNewPattern}
                placeholder="e.g. kirana"
                placeholderTextColor={Colors.onSurfaceVariant}
                className="border border-outline-variant rounded-sm px-md py-sm font-inter text-on-surface"
              />
              <View className="flex-row flex-wrap gap-xs">
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    onPress={() => setNewCategoryId(c.id)}
                    className={`px-md py-[6px] rounded-full ${newCategoryId === c.id ? 'bg-primary' : 'bg-surface-variant'}`}
                  >
                    <Text className={`font-inter text-annotation ${newCategoryId === c.id ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="flex-row gap-sm">
                <TouchableOpacity onPress={() => setAddingWordMatch(false)} className="flex-1 py-sm items-center rounded-sm bg-surface-variant">
                  <Text className="font-inter-medium text-on-surface-variant">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveWordMatch} className="flex-1 py-sm items-center rounded-sm bg-primary">
                  <Text className="font-inter-medium text-on-primary">Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setAddingWordMatch(true)} className="py-sm mb-md items-center rounded-sm bg-surface-variant">
              <Text className="font-inter-medium text-on-surface-variant">+ Add Word Match rule</Text>
            </TouchableOpacity>
          )}
          <FlatList
            data={wordMatchRules}
            keyExtractor={(rule) => String(rule.id)}
            contentContainerClassName="pb-[32px]"
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={
              loaded ? (
                <View className="pt-[60px] items-center">
                  <Text className="font-inter text-body-md text-on-surface-variant">No Word Match rules yet.</Text>
                </View>
              ) : null
            }
            renderItem={({ item, index }) => (
              <View className="flex-row items-center justify-between py-md gap-sm">
                <View className="flex-1">
                  <Text className="font-inter-medium text-body-standard text-on-surface" numberOfLines={1}>
                    {item.pattern}
                  </Text>
                  <Text className="font-inter text-annotation text-on-surface-variant mt-[2px]" numberOfLines={1}>
                    → {item.categoryName}
                  </Text>
                </View>
                <TouchableOpacity hitSlop={8} onPress={() => handleMoveWordMatch(index, -1)} disabled={index === 0}>
                  <Text className={index === 0 ? 'text-outline-variant' : 'text-on-surface-variant'}>↑</Text>
                </TouchableOpacity>
                <TouchableOpacity hitSlop={8} onPress={() => handleMoveWordMatch(index, 1)} disabled={index === wordMatchRules.length - 1}>
                  <Text className={index === wordMatchRules.length - 1 ? 'text-outline-variant' : 'text-on-surface-variant'}>↓</Text>
                </TouchableOpacity>
                <TouchableOpacity hitSlop={8} onPress={() => handleDeleteWordMatch(item)}>
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
