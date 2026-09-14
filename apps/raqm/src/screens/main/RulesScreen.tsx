import React, { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { MainStackScreenProps } from '../../navigation/types';
import {
  getCategoryRules, deleteCategoryRule, type CategoryRule,
  getTransactionGroups, deleteTransactionGroup, type TransactionGroupSummary,
  getWordMatchRules, upsertWordMatchRule, deleteWordMatchRule, reorderWordMatchRules, type WordMatchRule,
  getCategories, type Category,
  getAmountRules, upsertAmountRule, deleteAmountRule, type AmountRule,
  getMerchantPrivacyRules, upsertMerchantPrivacyRule, deleteMerchantPrivacyRule, type MerchantPrivacyRule,
} from '../../db/database';
import {
  reapplyWordMatchRule, reapplyAmountMaskRule, reapplyAmountTransferRule,
  reapplyHideMerchantRule, reapplyExcludeFromBudgetRule, countAmountTransferMatches,
} from '../../services/rulesReapply';
import { invalidateAmountRulesCache } from '../../store/amountRulesStore';
import { useTxStore } from '../../store/txStore';
import { formatAmount } from '../../utils/format';
import { Colors, Spacing } from '../../theme';
import { TrashIcon } from '../../components/TabIcon';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';

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
  const [maskRules, setMaskRules] = useState<AmountRule[]>([]);
  const [transferRules, setTransferRules] = useState<AmountRule[]>([]);
  const [addingMask, setAddingMask] = useState(false);
  const [maskThreshold, setMaskThreshold] = useState('');
  const [maskDirection, setMaskDirection] = useState<'above' | 'below'>('above');
  const [maskScope, setMaskScope] = useState<'everywhere' | 'list_widgets'>('everywhere');
  const [addingTransfer, setAddingTransfer] = useState(false);
  const [transferThreshold, setTransferThreshold] = useState('');
  const [privacyRules, setPrivacyRules] = useState<MerchantPrivacyRule[]>([]);
  const [addingPrivacy, setAddingPrivacy] = useState(false);
  const [privacyPattern, setPrivacyPattern] = useState('');
  const [privacyHide, setPrivacyHide] = useState(false);
  const [privacyExclude, setPrivacyExclude] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const currency = useTxStore((s) => s.txs[0]?.currency);
  const refreshTxs = useTxStore((s) => s.refresh);

  const load = useCallback(async () => {
    const [rules, groups, wordRules, cats, maskR, transferR, privacyR] = await Promise.all([
      getCategoryRules(),
      getTransactionGroups(),
      getWordMatchRules(),
      getCategories(),
      getAmountRules('mask'),
      getAmountRules('transfer'),
      getMerchantPrivacyRules(),
    ]);
    setCategoryRules(rules);
    setMerchantGroups(groups);
    setWordMatchRules(wordRules);
    setCategories(cats);
    setMaskRules(maskR);
    setTransferRules(transferR);
    setPrivacyRules(privacyR);
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

  const handleSaveMask = useCallback(async () => {
    const threshold = Number(maskThreshold);
    if (!Number.isFinite(threshold) || threshold <= 0) return;
    await upsertAmountRule(null, 'mask', threshold, maskDirection, maskScope);
    setAddingMask(false);
    setMaskThreshold('');
    invalidateAmountRulesCache();
    await load();
    Alert.alert(
      'Apply to past transactions?',
      'Mask matching amounts already on your ledger too, or only new ones from now on?',
      [
        { text: 'From now on only', style: 'cancel' },
        { text: 'Apply to past too', onPress: () => reapplyAmountMaskRule() },
      ],
    );
  }, [maskThreshold, maskDirection, maskScope, load]);

  const handleDeleteMask = useCallback(
    async (rule: AmountRule) => {
      await deleteAmountRule(rule.id);
      invalidateAmountRulesCache();
      await load();
    },
    [load],
  );

  const handleSaveTransfer = useCallback(async () => {
    const threshold = Number(transferThreshold);
    if (!Number.isFinite(threshold) || threshold <= 0) return;
    await upsertAmountRule(null, 'transfer', threshold, 'above', null);
    setAddingTransfer(false);
    setTransferThreshold('');
    await load();
    // This permanently rewrites the `type` column with no undo (unlike mask/budget-exclude,
    // which are no-ops, or Hide Merchant, which soft-deletes) — show the affected count
    // up front so the user isn't confirming an irreversible action blind.
    const matchCount = await countAmountTransferMatches(threshold);
    Alert.alert(
      'Apply to past transactions?',
      `This will mark ${matchCount} existing transaction${matchCount === 1 ? '' : 's'} above ` +
        `${formatAmount(threshold, '₹')} as transfers. This cannot be undone. Also apply going forward?`,
      [
        { text: 'From now on only', style: 'cancel' },
        {
          text: 'Apply to past too',
          onPress: async () => {
            const count = await reapplyAmountTransferRule(threshold);
            Alert.alert('Done', `${count} transaction${count === 1 ? '' : 's'} marked as transfers.`);
          },
        },
      ],
    );
  }, [transferThreshold, load]);

  const handleDeleteTransfer = useCallback(
    async (rule: AmountRule) => {
      await deleteAmountRule(rule.id);
      await load();
    },
    [load],
  );

  const handleSavePrivacy = useCallback(async () => {
    const trimmed = privacyPattern.trim();
    if (!trimmed || (!privacyHide && !privacyExclude)) return;
    await upsertMerchantPrivacyRule(null, trimmed, privacyHide, privacyExclude);
    setAddingPrivacy(false);
    const pattern = trimmed;
    const hide = privacyHide;
    const exclude = privacyExclude;
    setPrivacyPattern('');
    setPrivacyHide(false);
    setPrivacyExclude(false);
    await load();

    if (hide) {
      Alert.alert(
        'Remove past transactions too?',
        `New SMS from merchants matching "${pattern}" will always be dropped from now on. Also move existing matching transactions to Deleted?`,
        [
          { text: 'Keep past transactions', style: 'cancel' },
          {
            text: 'Move to Deleted',
            style: 'destructive',
            onPress: async () => {
              const count = await reapplyHideMerchantRule(pattern);
              Alert.alert('Done', `${count} transaction${count === 1 ? '' : 's'} moved to Deleted.`);
            },
          },
        ],
      );
    }
    if (exclude) {
      await reapplyExcludeFromBudgetRule();
    }
  }, [privacyPattern, privacyHide, privacyExclude, load]);

  const handleDeletePrivacy = useCallback(
    async (rule: MerchantPrivacyRule) => {
      await deleteMerchantPrivacyRule(rule.id);
      await load();
    },
    [load],
  );

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-background"
      contentContainerClassName="p-container-margin"
      enableOnAndroid
      extraScrollHeight={Spacing.lg}
      keyboardShouldPersistTaps="handled"
    >
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
          <View className="pb-[32px]">
            {categoryRules.length === 0 && loaded && (
              <View className="pt-[60px] items-center">
                <Text className="font-inter text-body-md text-on-surface-variant">
                  No rules yet — editing a transaction's category creates one automatically.
                </Text>
              </View>
            )}
            {categoryRules.map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 && renderSeparator()}
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
              </React.Fragment>
            ))}
          </View>
        </>
      )}

      {section === 'merchant' && (
        <>
          <Text className="font-inter text-supporting-text text-on-surface-variant mb-md">
            Transactions you've grouped together on the timeline (e.g. related charges from the same
            merchant or trip) show up here. Ungrouping keeps every transaction — it just splits them
            apart again.
          </Text>
          <View className="pb-[32px]">
            {merchantGroups.length === 0 && loaded && (
              <View className="pt-[60px] items-center">
                <Text className="font-inter text-body-md text-on-surface-variant">
                  No grouped merchants yet.
                </Text>
              </View>
            )}
            {merchantGroups.map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 && renderSeparator()}
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
              </React.Fragment>
            ))}
          </View>
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
          <View className="pb-[32px]">
            {wordMatchRules.length === 0 && loaded && (
              <View className="pt-[60px] items-center">
                <Text className="font-inter text-body-md text-on-surface-variant">No Word Match rules yet.</Text>
              </View>
            )}
            {wordMatchRules.map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 && renderSeparator()}
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
              </React.Fragment>
            ))}
          </View>
        </>
      )}

      {section === 'amount' && (
        <>
          <Text className="font-inter-semibold text-section-header text-on-surface mb-sm">Mask Amount</Text>
          <Text className="font-inter text-supporting-text text-on-surface-variant mb-md">
            Hide the amount for transactions above or below a threshold, everywhere or just in
            lists and widgets. Tap a masked amount to reveal it.
          </Text>
          {addingMask ? (
            <View className="gap-sm mb-md">
              <TextInput
                value={maskThreshold}
                onChangeText={setMaskThreshold}
                placeholder="e.g. 10000"
                keyboardType="numeric"
                placeholderTextColor={Colors.onSurfaceVariant}
                className="border border-outline-variant rounded-sm px-md py-sm font-inter text-on-surface"
              />
              <View className="flex-row gap-xs">
                {(['above', 'below'] as const).map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setMaskDirection(d)}
                    className={`flex-1 py-sm items-center rounded-full ${maskDirection === d ? 'bg-primary' : 'bg-surface-variant'}`}
                  >
                    <Text className={`font-inter-medium text-annotation ${maskDirection === d ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                      {d === 'above' ? 'Above' : 'Below'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="flex-row gap-xs">
                {(['everywhere', 'list_widgets'] as const).map((s) => (
                  <TouchableOpacity
                    key={s}
                    onPress={() => setMaskScope(s)}
                    className={`flex-1 py-sm items-center rounded-full ${maskScope === s ? 'bg-primary' : 'bg-surface-variant'}`}
                  >
                    <Text className={`font-inter-medium text-annotation ${maskScope === s ? 'text-on-primary' : 'text-on-surface-variant'}`}>
                      {s === 'everywhere' ? 'Everywhere' : 'List & widgets only'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View className="flex-row gap-sm">
                <TouchableOpacity onPress={() => setAddingMask(false)} className="flex-1 py-sm items-center rounded-sm bg-surface-variant">
                  <Text className="font-inter-medium text-on-surface-variant">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveMask} className="flex-1 py-sm items-center rounded-sm bg-primary">
                  <Text className="font-inter-medium text-on-primary">Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setAddingMask(true)} className="py-sm mb-md items-center rounded-sm bg-surface-variant">
              <Text className="font-inter-medium text-on-surface-variant">+ Add mask rule</Text>
            </TouchableOpacity>
          )}
          {maskRules.map((rule) => (
            <View key={rule.id} className="flex-row items-center justify-between py-sm">
              <Text className="font-inter text-body-standard text-on-surface">
                {rule.direction === 'above' ? 'Above' : 'Below'} {formatAmount(rule.threshold, currency)} ·{' '}
                {rule.scope === 'everywhere' ? 'Everywhere' : 'List & widgets'}
              </Text>
              <TouchableOpacity hitSlop={8} onPress={() => handleDeleteMask(rule)}>
                <TrashIcon color={Colors.errorMuted} size={18} />
              </TouchableOpacity>
            </View>
          ))}

          <View className="h-[1px] bg-outline-variant my-lg" />

          <Text className="font-inter-semibold text-section-header text-on-surface mb-sm">Amount → Transfer</Text>
          <Text className="font-inter text-supporting-text text-on-surface-variant mb-md">
            Automatically treat any transaction above this amount as a transfer, excluded from
            Analytics and budget totals (Dashboard's spend total counts transfers separately,
            per its existing behavior).
          </Text>
          {addingTransfer ? (
            <View className="gap-sm mb-md">
              <TextInput
                value={transferThreshold}
                onChangeText={setTransferThreshold}
                placeholder="e.g. 50000"
                keyboardType="numeric"
                placeholderTextColor={Colors.onSurfaceVariant}
                className="border border-outline-variant rounded-sm px-md py-sm font-inter text-on-surface"
              />
              <View className="flex-row gap-sm">
                <TouchableOpacity onPress={() => setAddingTransfer(false)} className="flex-1 py-sm items-center rounded-sm bg-surface-variant">
                  <Text className="font-inter-medium text-on-surface-variant">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSaveTransfer} className="flex-1 py-sm items-center rounded-sm bg-primary">
                  <Text className="font-inter-medium text-on-primary">Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setAddingTransfer(true)} className="py-sm items-center rounded-sm bg-surface-variant">
              <Text className="font-inter-medium text-on-surface-variant">+ Add transfer rule</Text>
            </TouchableOpacity>
          )}
          {transferRules.map((rule) => (
            <View key={rule.id} className="flex-row items-center justify-between py-sm">
              <Text className="font-inter text-body-standard text-on-surface">
                Above {formatAmount(rule.threshold, currency)}
              </Text>
              <TouchableOpacity hitSlop={8} onPress={() => handleDeleteTransfer(rule)}>
                <TrashIcon color={Colors.errorMuted} size={18} />
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      {section === 'privacy' && (
        <>
          <Text className="font-inter text-supporting-text text-on-surface-variant mb-md">
            Hide a merchant's SMS entirely, or keep tracking it everywhere except your budgets.
          </Text>
          {addingPrivacy ? (
            <View className="gap-sm mb-md">
              <TextInput
                value={privacyPattern}
                onChangeText={setPrivacyPattern}
                placeholder="e.g. some spam sender"
                placeholderTextColor={Colors.onSurfaceVariant}
                className="border border-outline-variant rounded-sm px-md py-sm font-inter text-on-surface"
              />
              <TouchableOpacity
                onPress={() => setPrivacyHide((v) => !v)}
                className="flex-row items-center gap-sm py-sm"
              >
                <View className={`w-[20px] h-[20px] rounded-sm border-2 items-center justify-center ${privacyHide ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
                  {privacyHide && <Text className="text-on-primary text-[12px]">✓</Text>}
                </View>
                <Text className="font-inter text-body-standard text-on-surface">Hide entirely (never saved)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPrivacyExclude((v) => !v)}
                className="flex-row items-center gap-sm py-sm"
              >
                <View className={`w-[20px] h-[20px] rounded-sm border-2 items-center justify-center ${privacyExclude ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
                  {privacyExclude && <Text className="text-on-primary text-[12px]">✓</Text>}
                </View>
                <Text className="font-inter text-body-standard text-on-surface">Exclude from budgeting only</Text>
              </TouchableOpacity>
              <View className="flex-row gap-sm">
                <TouchableOpacity onPress={() => setAddingPrivacy(false)} className="flex-1 py-sm items-center rounded-sm bg-surface-variant">
                  <Text className="font-inter-medium text-on-surface-variant">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSavePrivacy} className="flex-1 py-sm items-center rounded-sm bg-primary">
                  <Text className="font-inter-medium text-on-primary">Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity onPress={() => setAddingPrivacy(true)} className="py-sm mb-md items-center rounded-sm bg-surface-variant">
              <Text className="font-inter-medium text-on-surface-variant">+ Add privacy rule</Text>
            </TouchableOpacity>
          )}
          <View className="pb-[32px]">
            {privacyRules.length === 0 && loaded && (
              <View className="pt-[60px] items-center">
                <Text className="font-inter text-body-md text-on-surface-variant">No privacy rules yet.</Text>
              </View>
            )}
            {privacyRules.map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 && renderSeparator()}
                <View className="flex-row items-center justify-between py-md gap-sm">
                  <View className="flex-1">
                    <Text className="font-inter-medium text-body-standard text-on-surface" numberOfLines={1}>
                      {item.merchantPattern}
                    </Text>
                    <Text className="font-inter text-annotation text-on-surface-variant mt-[2px]" numberOfLines={1}>
                      {[item.hide && 'Hidden', item.excludeFromBudget && 'Excluded from budget'].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  <TouchableOpacity hitSlop={8} onPress={() => handleDeletePrivacy(item)}>
                    <TrashIcon color={Colors.errorMuted} size={18} />
                  </TouchableOpacity>
                </View>
              </React.Fragment>
            ))}
          </View>
        </>
      )}
    </KeyboardAwareScrollView>
  );
}
