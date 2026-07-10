import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Share, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import {
  GroceryList,
  GroceryItem,
  getGroceryLists,
  getGroceryItems,
  addGroceryItem,
  updateGroceryItem,
  deleteGroceryItem,
  updateGroceryList,
  getLastPriceForItem,
  getFrequentItems,
} from '../../db/database';
import { formatAmount } from '../../utils/format';

export function GroceryListDetailScreen({ route, navigation }: MainStackScreenProps<'GroceryListDetail'>) {
  const { listId, listName } = route.params;
  const [list, setList] = useState<GroceryList | null>(null);
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [ghostPrice, setGhostPrice] = useState<number | null>(null);
  const [nameFocused, setNameFocused] = useState(false);
  const [frequentItems, setFrequentItems] = useState<{ name: string; count: number }[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const [rows, lists] = await Promise.all([getGroceryItems(listId), getGroceryLists()]);
    setItems(rows);
    setList(lists.find((l) => l.id === listId) ?? null);
  }, [listId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    getFrequentItems(10).then(setFrequentItems);
  }, []);

  // G5: debounced ghost price lookup on name change (300ms)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = name.trim();
    if (!trimmed) {
      setGhostPrice(null);
      return;
    }
    let stale = false; // guard: an older in-flight lookup must not overwrite a newer one
    debounceRef.current = setTimeout(async () => {
      const last = await getLastPriceForItem(trimmed);
      if (!stale) setGhostPrice(last);
    }, 300);
    return () => {
      stale = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [name]);

  const runningTotal = useMemo(
    () => items.filter((it) => it.checkedAt === null).reduce((sum, it) => sum + (it.price ?? 0), 0),
    [items],
  );

  const overBudget = list?.budgetCap != null && runningTotal > list.budgetCap;

  const toggleChecked = async (item: GroceryItem) => {
    await updateGroceryItem(item.id, { checkedAt: item.checkedAt === null ? Date.now() : null });
    load();
  };

  const handleDelete = (item: GroceryItem) => {
    Alert.alert('Delete item', `Remove "${item.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => { await deleteGroceryItem(item.id); load(); } },
    ]);
  };

  const handleAdd = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const parsedPrice = price.trim() ? Number(price.trim()) : ghostPrice;
    const finalPrice = parsedPrice !== null && Number.isFinite(parsedPrice) ? parsedPrice : null;
    await addGroceryItem(listId, trimmed, finalPrice);
    setName('');
    setPrice('');
    setGhostPrice(null);
    load();
  };

  const handlePickFrequent = (itemName: string) => {
    setName(itemName);
    getLastPriceForItem(itemName).then(setGhostPrice);
  };

  const handleComplete = async () => {
    await updateGroceryList(listId, { completedAt: Date.now() });
    navigation.goBack();
  };

  const handleShare = async () => {
    const lines = items.map(
      (it) => `${it.checkedAt !== null ? '☑' : '☐'} ${it.name}${it.price !== null ? ` — ${formatAmount(it.price)}` : ''}`,
    );
    const message = `${listName}\n${lines.join('\n')}`;
    try {
      await Share.share({ message });
    } catch {
      // user cancelled or share failed — no-op
    }
  };

  const showSuggestions = nameFocused && name.trim().length === 0 && frequentItems.length > 0;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
            <Text style={styles.headerBtnText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleComplete} style={styles.headerBtn}>
            <Text style={styles.completeText}>Complete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{listName}</Text>
        <Text style={styles.total}>{formatAmount(runningTotal)}</Text>
      </View>

      {list?.budgetCap != null && (
        <View style={[styles.capBanner, overBudget && styles.capBannerOver]}>
          <Text style={[styles.capBannerText, overBudget && styles.capBannerTextOver]}>
            {overBudget
              ? `Over budget by ${formatAmount(runningTotal - list.budgetCap)}`
              : `Budget cap ${formatAmount(list.budgetCap)}`}
          </Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.itemRow}
            onPress={() => toggleChecked(item)}
            onLongPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, item.checkedAt !== null && styles.checkboxChecked]}>
              {item.checkedAt !== null && <Text style={styles.checkMark}>✓</Text>}
            </View>
            <Text style={[styles.itemName, item.checkedAt !== null && styles.itemNameChecked]} numberOfLines={1}>
              {item.name}
            </Text>
            {item.price !== null && (
              <Text style={[styles.itemPrice, item.checkedAt !== null && styles.itemNameChecked]}>
                {formatAmount(item.price)}
              </Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No items yet. Add one below.</Text>}
      />

      {showSuggestions && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // Without this, tapping a chip while the name input has focus is swallowed
          // as a keyboard-dismiss gesture and the blur hides the row before onPress fires.
          keyboardShouldPersistTaps="handled"
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
        >
          {frequentItems.map((f) => (
            <TouchableOpacity key={f.name} style={styles.chip} onPress={() => handlePickFrequent(f.name)} activeOpacity={0.7}>
              <Text style={styles.chipText}>{f.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View style={styles.quickAdd}>
        <TextInput
          style={[styles.input, styles.inputName]}
          placeholder="Item name"
          placeholderTextColor={Colors.outline}
          value={name}
          onChangeText={setName}
          onFocus={() => setNameFocused(true)}
          onBlur={() => setNameFocused(false)}
        />
        <TextInput
          style={[styles.input, styles.inputPrice]}
          placeholder={ghostPrice !== null ? formatAmount(ghostPrice) : '₹'}
          placeholderTextColor={Colors.outline}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.sm,
  },
  headerActions: { flexDirection: 'row', gap: Spacing.md },
  headerBtn: { paddingVertical: 4 },
  headerBtnText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  backText: { ...Typography.bodyMd, color: Colors.primary },
  completeText: { ...Typography.bodyMd, color: Colors.primary, fontFamily: 'Inter_500Medium' },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  title: { ...Typography.headlineSm, color: Colors.onSurface, flex: 1 },
  total: { ...Typography.numericMd, color: Colors.onSurface, fontSize: 18 },

  capBanner: {
    marginHorizontal: Spacing.containerMargin, marginBottom: Spacing.sm,
    borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceContainer,
  },
  capBannerOver: { backgroundColor: `${Colors.errorMuted}30` },
  capBannerText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  capBannerTextOver: { color: Colors.errorMuted },

  list: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 16 },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
  },
  checkbox: {
    width: 22, height: 22, borderRadius: Radius.sm, borderWidth: 2, borderColor: Colors.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkMark: { color: Colors.onPrimary, fontSize: 13, fontWeight: '700' },
  itemName: { ...Typography.bodyMd, color: Colors.onSurface, flex: 1 },
  itemNameChecked: { color: Colors.onSurfaceVariant, textDecorationLine: 'line-through' },
  itemPrice: { ...Typography.numericSm, color: Colors.onSurfaceVariant },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', paddingTop: 40 },

  chipsRow: { maxHeight: 44, borderTopWidth: 1, borderTopColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest },
  chipsContent: { paddingHorizontal: Spacing.containerMargin, paddingVertical: Spacing.sm, gap: Spacing.sm },
  chip: {
    backgroundColor: Colors.surfaceContainer, borderRadius: Radius.full,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 6,
  },
  chipText: { ...Typography.labelSm, color: Colors.onSurface, letterSpacing: 0 },

  quickAdd: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'center',
    paddingHorizontal: Spacing.containerMargin, paddingVertical: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  input: {
    backgroundColor: Colors.surfaceContainer, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...Typography.bodyMd, color: Colors.onSurface,
  },
  inputName: { flex: 2 },
  inputPrice: { flex: 1 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 10 },
  addBtnText: { ...Typography.bodySm, color: Colors.onPrimary, fontFamily: 'Inter_500Medium' },
});
