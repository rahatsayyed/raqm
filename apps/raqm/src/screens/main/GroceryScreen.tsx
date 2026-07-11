import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../theme';
import type { MainStackScreenProps } from '../../navigation/types';
import {
  GroceryList,
  getGroceryLists,
  addGroceryList,
  getGroceryItems,
  getFrequentItems,
  getCategories,
  getTxById,
  getSetting,
} from '../../db/database';
import { useTxStore } from '../../store/txStore';
import { getMonthBounds } from '../../utils/period';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { formatAmount } from '../../utils/format';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function monthLabel(d: Date): string {
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

interface ListSummary {
  list: GroceryList;
  uncheckedCount: number;
  estimatedTotal: number;
}

interface MonthBucket {
  label: string;
  total: number;
}

export function GroceryScreen({ navigation }: MainStackScreenProps<'Grocery'>) {
  const [summaries, setSummaries] = useState<ListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBudget, setNewBudget] = useState('');
  const [linkedAmounts, setLinkedAmounts] = useState<Record<number, number>>({});
  const [buckets, setBuckets] = useState<MonthBucket[]>([]);
  const [topItems, setTopItems] = useState<{ name: string; count: number }[]>([]);

  const load = useCallback(async () => {
    const lists = await getGroceryLists();
    const withItems = await Promise.all(
      lists.map(async (list) => {
        const items = await getGroceryItems(list.id);
        const unchecked = items.filter((it) => it.checkedAt === null);
        const estimatedTotal = unchecked.reduce((sum, it) => sum + (it.price ?? 0), 0);
        return { list, uncheckedCount: unchecked.length, estimatedTotal };
      }),
    );
    setSummaries(withItems);

    // G14: fetch linked tx amounts for completed lists with a linked_tx_id
    const amounts: Record<number, number> = {};
    await Promise.all(
      lists
        .filter((l) => l.linkedTxId !== null)
        .map(async (l) => {
          const tx = await getTxById(l.linkedTxId!);
          if (tx) amounts[l.id] = tx.amount;
        }),
    );
    setLinkedAmounts(amounts);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // G13/G15/G16: grocery analytics — last 6 months, top items, average
  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [categories, startDayStr, freq] = await Promise.all([
          getCategories(),
          getSetting('month_start_day'),
          getFrequentItems(10),
        ]);
        setTopItems(freq);
        const groceriesCategoryId = categories.find((c) => c.name === 'Groceries')?.id ?? null;
        const startDay = Number(startDayStr ?? '1') || 1;
        const clampedStart = Math.min(28, Math.max(1, startDay));
        const txs = useTxStore.getState().txs;
        const now = new Date();
        const next: MonthBucket[] = [];
        for (let i = 5; i >= 0; i--) {
          // ref must sit ON the period's start day — a hardcoded day-1 ref makes
          // getMonthBounds roll every bucket back a month when start day > 1
          // (same pattern as AnalyticsScreen's monthly buckets).
          const ref = new Date(now.getFullYear(), now.getMonth() - i, clampedStart);
          const { from, to } = getMonthBounds(ref, clampedStart);
          const total = txs
            .filter(
              (tx) =>
                tx.type === TransactionType.EXPENSE &&
                tx.categoryId !== null &&
                tx.categoryId === groceriesCategoryId &&
                tx.timestamp >= from &&
                tx.timestamp <= to,
            )
            .reduce((sum, tx) => sum + tx.amount, 0);
          next.push({ label: monthLabel(ref), total });
        }
        setBuckets(next);
      })();
    }, []),
  );

  const activeLists = useMemo(() => summaries.filter((s) => s.list.completedAt === null), [summaries]);
  const historyLists = useMemo(
    () =>
      summaries
        .filter((s) => s.list.completedAt !== null)
        .sort((a, b) => (b.list.completedAt ?? 0) - (a.list.completedAt ?? 0)),
    [summaries],
  );

  const maxBucket = Math.max(...buckets.map((b) => b.total), 1);
  const avgMonthly = buckets.length ? buckets.reduce((s, b) => s + b.total, 0) / buckets.length : 0;

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    const parsedBudget = newBudget.trim() ? Number(newBudget.trim()) : null;
    const budgetCap = parsedBudget !== null && Number.isFinite(parsedBudget) ? parsedBudget : null;
    await addGroceryList(trimmed, budgetCap);
    setNewName('');
    setNewBudget('');
    setShowNewForm(false);
    load();
  };

  function onListPress(listId: number, listName: string) {
    navigation.navigate('GroceryListDetail', { listId, listName });
  }

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-xl" showsVerticalScrollIndicator={false}>
      <TouchableOpacity onPress={() => navigation.goBack()} className="mb-sm">
        <Text className="font-inter text-body-md text-primary">← Back</Text>
      </TouchableOpacity>
      <View className="flex-row justify-between items-center px-container-margin pt-sm pb-md">
        <Text className="font-inter-bold text-headline-sm text-on-surface">Grocery</Text>
        <TouchableOpacity onPress={() => setShowNewForm((v) => !v)} className="bg-primary rounded-full px-md py-sm" activeOpacity={0.8}>
          <Text className="font-mono-medium text-label-lg text-on-primary tracking-[0px]">{showNewForm ? 'Cancel' : '+ New list'}</Text>
        </TouchableOpacity>
      </View>

      {showNewForm && (
        <View className="mx-container-margin mb-lg bg-surface-container-lowest rounded-xl border border-outline-variant p-md gap-sm">
          <TextInput
            className="bg-surface-container rounded-md border border-outline-variant px-md py-[10px] font-inter text-body-md text-on-surface"
            placeholder="List name"
            placeholderTextColor={Colors.outline}
            value={newName}
            onChangeText={setNewName}
          />
          <TextInput
            className="bg-surface-container rounded-md border border-outline-variant px-md py-[10px] font-inter text-body-md text-on-surface"
            placeholder="Budget cap (optional)"
            placeholderTextColor={Colors.outline}
            value={newBudget}
            onChangeText={setNewBudget}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity className="bg-primary rounded-md py-[10px] items-center" onPress={handleCreate} activeOpacity={0.8}>
            <Text className="font-inter-medium text-body-sm text-on-primary">Add list</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active lists */}
      <View className="px-container-margin mb-xl">
        <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">Active lists</Text>
        {!loading && activeLists.length === 0 && (
          <Text className="font-inter text-body-md text-on-surface-variant">No active lists. Create one above.</Text>
        )}
        {activeLists.length > 0 && (
          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
            {activeLists.map((s, i) => (
              <TouchableOpacity
                key={s.list.id}
                className={`flex-row items-center justify-between px-md py-[14px] ${i !== activeLists.length - 1 ? 'border-b border-outline-variant' : ''}`}
                onPress={() => onListPress(s.list.id, s.list.name)}
                activeOpacity={0.7}
              >
                <View className="flex-1">
                  <Text className="font-inter-medium text-body-sm text-on-surface">{s.list.name}</Text>
                  <Text className="font-mono text-label-sm text-on-surface-variant tracking-[0px] mt-[2px]">{s.uncheckedCount} item{s.uncheckedCount !== 1 ? 's' : ''} left</Text>
                </View>
                <Text className="font-mono text-[15px] leading-[20px] text-on-surface">{formatAmount(s.estimatedTotal)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* History */}
      <View className="px-container-margin mb-xl">
        <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">History</Text>
        {historyLists.length === 0 ? (
          <Text className="font-inter text-body-md text-on-surface-variant">No completed lists yet.</Text>
        ) : (
          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
            {historyLists.map((s, i) => {
              const linkedAmount = linkedAmounts[s.list.id];
              const showPlannedActual = s.list.linkedTxId !== null && s.list.budgetCap !== null && linkedAmount !== undefined;
              return (
                <View
                  key={s.list.id}
                  className={`px-md py-[14px] gap-sm ${i !== historyLists.length - 1 ? 'border-b border-outline-variant' : ''}`}
                >
                  <View className="flex-row items-center justify-between">
                    <View className="flex-1">
                      <Text className="font-inter-medium text-body-sm text-on-surface">{s.list.name}</Text>
                      <Text className="font-mono text-label-sm text-on-surface-variant tracking-[0px] mt-[2px]">Completed {formatDate(s.list.completedAt!)}</Text>
                    </View>
                    <Text className="font-mono text-[15px] leading-[20px] text-on-surface">{formatAmount(s.estimatedTotal)}</Text>
                  </View>
                  {showPlannedActual && (
                    <View className="gap-[6px]">
                      <View className="flex-row items-center gap-sm">
                        <Text className="font-mono text-label-sm text-on-surface-variant tracking-[0px] w-[52px]">Planned</Text>
                        <View className="flex-1 h-[6px] rounded-[3px] bg-surface-variant overflow-hidden flex-row">
                          <View className="bg-moss-structure rounded-[3px]" style={{ flex: 1 }} />
                        </View>
                        <Text className="font-mono text-label-sm text-on-surface-variant tracking-[0px] w-[64px] text-right">{formatAmount(s.list.budgetCap!)}</Text>
                      </View>
                      <View className="flex-row items-center gap-sm">
                        <Text className="font-mono text-label-sm text-on-surface-variant tracking-[0px] w-[52px]">Actual</Text>
                        <View className="flex-1 h-[6px] rounded-[3px] bg-surface-variant overflow-hidden flex-row">
                          <View className="bg-primary rounded-[3px]" style={{ flex: Math.min(linkedAmount / s.list.budgetCap!, 1.5) }} />
                        </View>
                        <Text className="font-mono text-label-sm text-on-surface-variant tracking-[0px] w-[64px] text-right">{formatAmount(linkedAmount)}</Text>
                      </View>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </View>

      {/* Analytics */}
      <View className="px-container-margin mb-xl">
        <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">Grocery spend trend</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-md pt-lg">
          <View className="flex-row items-end gap-[6px] h-[160px]">
            {buckets.map((b, i) => {
              const pct = b.total / maxBucket;
              return (
                <View key={i} className="flex-1 items-center gap-[6px]">
                  <Text className="font-mono text-[9px] leading-[16px] text-on-surface-variant tracking-[0px] text-center">{formatAmount(b.total)}</Text>
                  <View className="flex-1 w-full flex-col-reverse">
                    <View className="bg-primary rounded-sm min-h-[4px]" style={{ flex: pct }} />
                    <View style={{ flex: 1 - pct }} />
                  </View>
                  <Text className="font-mono text-[10px] leading-[16px] text-on-surface-variant tracking-[0px] text-center">{b.label}</Text>
                </View>
              );
            })}
          </View>
          <Text className="font-mono text-label-sm text-on-surface-variant tracking-[0px] text-center mt-md">Average monthly spend: {formatAmount(avgMonthly)}</Text>
        </View>
      </View>

      <View className="px-container-margin mb-xl">
        <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">Frequently bought</Text>
        <View className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
          {topItems.map((it, i) => (
            <View
              key={it.name}
              className={`flex-row items-center justify-between px-md py-[12px] ${i !== topItems.length - 1 ? 'border-b border-outline-variant' : ''}`}
            >
              <Text className="font-inter-medium text-body-sm text-on-surface">{it.name}</Text>
              <Text className="font-mono text-label-sm text-on-surface-variant tracking-[0px] mt-[2px]">{it.count}x</Text>
            </View>
          ))}
          {topItems.length === 0 && <Text className="font-inter text-body-md text-on-surface-variant">No items tracked yet.</Text>}
        </View>
      </View>
    </ScrollView>
  );
}
