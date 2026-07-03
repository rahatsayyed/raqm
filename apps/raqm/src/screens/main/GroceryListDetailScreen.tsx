import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import {
  GroceryItem,
  getGroceryItems,
  addGroceryItem,
  updateGroceryItem,
  deleteGroceryItem,
  updateGroceryList,
} from '../../db/database';

function formatAmount(n: number): string {
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
}

export function GroceryListDetailScreen({ route, navigation }: MainStackScreenProps<'GroceryListDetail'>) {
  const { listId, listName } = route.params;
  const [items, setItems] = useState<GroceryItem[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');

  const load = useCallback(async () => {
    const rows = await getGroceryItems(listId);
    setItems(rows);
  }, [listId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const runningTotal = useMemo(
    () => items.filter((it) => it.checkedAt === null).reduce((sum, it) => sum + (it.price ?? 0), 0),
    [items],
  );

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
    const parsedPrice = price.trim() ? Number(price.trim()) : null;
    const finalPrice = parsedPrice !== null && Number.isFinite(parsedPrice) ? parsedPrice : null;
    await addGroceryItem(listId, trimmed, finalPrice);
    setName('');
    setPrice('');
    load();
  };

  const handleComplete = async () => {
    await updateGroceryList(listId, { completedAt: Date.now() });
    navigation.goBack();
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleComplete}>
          <Text style={styles.completeText}>Complete</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.title}>{listName}</Text>
        <Text style={styles.total}>{formatAmount(runningTotal)}</Text>
      </View>

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

      <View style={styles.quickAdd}>
        <TextInput
          style={[styles.input, styles.inputName]}
          placeholder="Item name"
          placeholderTextColor={Colors.outline}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={[styles.input, styles.inputPrice]}
          placeholder="₹"
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
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg,
  },
  backText: { ...Typography.bodyMd, color: Colors.primary },
  completeText: { ...Typography.bodyMd, color: Colors.primary, fontFamily: 'WorkSans_500Medium' },
  titleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  title: { ...Typography.headlineSm, color: Colors.onSurface, flex: 1 },
  total: { ...Typography.numericMd, color: Colors.onSurface, fontSize: 18 },
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
  addBtnText: { ...Typography.bodySm, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
});
