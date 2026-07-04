import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import type { MainStackParamList, MainTabScreenProps } from '../../navigation/types';
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

export function GroceryScreen({ navigation }: MainTabScreenProps<'Grocery'>) {
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
    navigation.getParent<NavigationProp<MainStackParamList>>()?.navigate('GroceryListDetail', {
      listId,
      listName,
    });
  }

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.pageTitle}>Grocery</Text>
        <TouchableOpacity onPress={() => setShowNewForm((v) => !v)} style={styles.newBtn} activeOpacity={0.8}>
          <Text style={styles.newBtnText}>{showNewForm ? 'Cancel' : '+ New list'}</Text>
        </TouchableOpacity>
      </View>

      {showNewForm && (
        <View style={styles.newForm}>
          <TextInput
            style={styles.input}
            placeholder="List name"
            placeholderTextColor={Colors.outline}
            value={newName}
            onChangeText={setNewName}
          />
          <TextInput
            style={styles.input}
            placeholder="Budget cap (optional)"
            placeholderTextColor={Colors.outline}
            value={newBudget}
            onChangeText={setNewBudget}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleCreate} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>Add list</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Active lists */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active lists</Text>
        {!loading && activeLists.length === 0 && (
          <Text style={styles.emptyText}>No active lists. Create one above.</Text>
        )}
        {activeLists.length > 0 && (
          <View style={styles.listCard}>
            {activeLists.map((s, i) => (
              <TouchableOpacity
                key={s.list.id}
                style={[styles.listRow, i !== activeLists.length - 1 && styles.listRowBorder]}
                onPress={() => onListPress(s.list.id, s.list.name)}
                activeOpacity={0.7}
              >
                <View style={styles.listRowInfo}>
                  <Text style={styles.listName}>{s.list.name}</Text>
                  <Text style={styles.listMeta}>{s.uncheckedCount} item{s.uncheckedCount !== 1 ? 's' : ''} left</Text>
                </View>
                <Text style={styles.listTotal}>{formatAmount(s.estimatedTotal)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>History</Text>
        {historyLists.length === 0 ? (
          <Text style={styles.emptyText}>No completed lists yet.</Text>
        ) : (
          <View style={styles.listCard}>
            {historyLists.map((s, i) => {
              const linkedAmount = linkedAmounts[s.list.id];
              const showPlannedActual = s.list.linkedTxId !== null && s.list.budgetCap !== null && linkedAmount !== undefined;
              return (
                <View key={s.list.id} style={[styles.historyRow, i !== historyLists.length - 1 && styles.listRowBorder]}>
                  <View style={styles.historyTop}>
                    <View style={styles.listRowInfo}>
                      <Text style={styles.listName}>{s.list.name}</Text>
                      <Text style={styles.listMeta}>Completed {formatDate(s.list.completedAt!)}</Text>
                    </View>
                    <Text style={styles.listTotal}>{formatAmount(s.estimatedTotal)}</Text>
                  </View>
                  {showPlannedActual && (
                    <View style={styles.plannedActual}>
                      <View style={styles.paRow}>
                        <Text style={styles.paLabel}>Planned</Text>
                        <View style={styles.paTrack}>
                          <View style={[styles.paFillPlanned, { flex: 1 }]} />
                        </View>
                        <Text style={styles.paValue}>{formatAmount(s.list.budgetCap!)}</Text>
                      </View>
                      <View style={styles.paRow}>
                        <Text style={styles.paLabel}>Actual</Text>
                        <View style={styles.paTrack}>
                          <View style={[styles.paFillActual, { flex: Math.min(linkedAmount / s.list.budgetCap!, 1.5) }]} />
                        </View>
                        <Text style={styles.paValue}>{formatAmount(linkedAmount)}</Text>
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
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Grocery spend trend</Text>
        <View style={styles.chartCard}>
          <View style={styles.bars}>
            {buckets.map((b, i) => {
              const pct = b.total / maxBucket;
              return (
                <View key={i} style={styles.barCol}>
                  <Text style={styles.barAmount}>{formatAmount(b.total)}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { flex: pct }]} />
                    <View style={{ flex: 1 - pct }} />
                  </View>
                  <Text style={styles.barLabel}>{b.label}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.avgText}>Average monthly spend: {formatAmount(avgMonthly)}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frequently bought</Text>
        <View style={styles.listCard}>
          {topItems.map((it, i) => (
            <View key={it.name} style={[styles.freqRow, i !== topItems.length - 1 && styles.listRowBorder]}>
              <Text style={styles.listName}>{it.name}</Text>
              <Text style={styles.listMeta}>{it.count}x</Text>
            </View>
          ))}
          {topItems.length === 0 && <Text style={styles.emptyText}>No items tracked yet.</Text>}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  pageTitle: { ...Typography.headlineSm, color: Colors.onSurface },
  newBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
  },
  newBtnText: { ...Typography.labelLg, color: Colors.onPrimary, letterSpacing: 0 },

  newForm: {
    marginHorizontal: Spacing.containerMargin, marginBottom: Spacing.lg,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant, padding: Spacing.md, gap: Spacing.sm,
  },
  input: {
    backgroundColor: Colors.surfaceContainer, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...Typography.bodyMd, color: Colors.onSurface,
  },
  addBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 10, alignItems: 'center',
  },
  addBtnText: { ...Typography.bodySm, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },

  section: { paddingHorizontal: Spacing.containerMargin, marginBottom: Spacing.xl },
  sectionTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.md, fontSize: 16 },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },

  listCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant, overflow: 'hidden',
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  historyRow: { paddingHorizontal: Spacing.md, paddingVertical: 14, gap: Spacing.sm },
  historyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  freqRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  listRowInfo: { flex: 1 },
  listName: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
  listMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
  listTotal: { ...Typography.numericSm, color: Colors.onSurface, fontSize: 15 },

  plannedActual: { gap: 6 },
  paRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  paLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, width: 52 },
  paTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.surfaceVariant, overflow: 'hidden', flexDirection: 'row' },
  paFillPlanned: { backgroundColor: Colors.mossStructure, borderRadius: 3 },
  paFillActual: { backgroundColor: Colors.primary, borderRadius: 3 },
  paValue: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, width: 64, textAlign: 'right' },

  chartCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
    padding: Spacing.md, paddingTop: Spacing.lg,
  },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 160 },
  barCol: { flex: 1, alignItems: 'center', gap: 6 },
  barAmount: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontSize: 9, letterSpacing: 0, textAlign: 'center' },
  barTrack: { flex: 1, width: '100%', flexDirection: 'column-reverse' },
  barFill: { backgroundColor: Colors.primary, borderRadius: 4, minHeight: 4 },
  barLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, fontSize: 10, textAlign: 'center' },
  avgText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, textAlign: 'center', marginTop: Spacing.md },
});
