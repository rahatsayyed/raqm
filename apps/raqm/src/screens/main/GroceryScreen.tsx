import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import type { MainStackParamList, MainTabScreenProps } from '../../navigation/types';
import { GroceryList, getGroceryLists, addGroceryList, getGroceryItems } from '../../db/database';

function formatAmount(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface ListSummary {
  list: GroceryList;
  uncheckedCount: number;
  estimatedTotal: number;
}

export function GroceryScreen({ navigation }: MainTabScreenProps<'Grocery'>) {
  const [summaries, setSummaries] = useState<ListSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newBudget, setNewBudget] = useState('');

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
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const activeLists = useMemo(() => summaries.filter((s) => s.list.completedAt === null), [summaries]);
  const historyLists = useMemo(
    () =>
      summaries
        .filter((s) => s.list.completedAt !== null)
        .sort((a, b) => (b.list.completedAt ?? 0) - (a.list.completedAt ?? 0)),
    [summaries],
  );

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
            {historyLists.map((s, i) => (
              <View key={s.list.id} style={[styles.historyRow, i !== historyLists.length - 1 && styles.listRowBorder]}>
                <View style={styles.listRowInfo}>
                  <Text style={styles.listName}>{s.list.name}</Text>
                  <Text style={styles.listMeta}>Completed {formatDate(s.list.completedAt!)}</Text>
                </View>
                <Text style={styles.listTotal}>{formatAmount(s.estimatedTotal)}</Text>
              </View>
            ))}
          </View>
        )}
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
  historyRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  listRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  listRowInfo: { flex: 1 },
  listName: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
  listMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
  listTotal: { ...Typography.numericSm, color: Colors.onSurface, fontSize: 15 },
});
