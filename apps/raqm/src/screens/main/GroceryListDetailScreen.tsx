import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Alert, Share, ScrollView } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../theme';
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
    <View className="flex-1 bg-background">
      <View className="flex-row justify-between items-center px-container-margin pt-sm">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="font-inter text-body-md text-primary">← Back</Text>
        </TouchableOpacity>
        <View className="flex-row gap-md">
          <TouchableOpacity onPress={handleShare} className="py-[4px]">
            <Text className="font-inter text-body-md text-on-surface-variant">Share</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleComplete} className="py-[4px]">
            <Text className="font-inter-medium text-body-md text-primary">Complete</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="flex-row justify-between items-baseline px-container-margin pt-md pb-sm">
        <Text className="font-inter-bold text-headline-sm text-on-surface flex-1">{listName}</Text>
        <Text className="font-mono-medium text-[18px] leading-[28px] text-on-surface">{formatAmount(runningTotal)}</Text>
      </View>

      {list?.budgetCap != null && (
        <View className={`mx-container-margin mb-sm rounded-md py-[8px] px-md ${overBudget ? 'bg-[#C1666B30]' : 'bg-surface-container'}`}>
          <Text className={`font-mono text-label-sm tracking-[0px] ${overBudget ? 'text-error-muted' : 'text-on-surface-variant'}`}>
            {overBudget
              ? `Over budget by ${formatAmount(runningTotal - list.budgetCap)}`
              : `Budget cap ${formatAmount(list.budgetCap)}`}
          </Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        contentContainerClassName="px-container-margin pb-[16px]"
        renderItem={({ item }) => (
          <TouchableOpacity
            className="flex-row items-center gap-md py-[12px] border-b border-outline-variant"
            onPress={() => toggleChecked(item)}
            onLongPress={() => handleDelete(item)}
            activeOpacity={0.7}
          >
            <View className={`w-[22px] h-[22px] rounded-sm border-2 items-center justify-center ${item.checkedAt !== null ? 'bg-primary border-primary' : 'border-outline'}`}>
              {item.checkedAt !== null && <Text className="text-on-primary text-[13px] font-inter-bold">✓</Text>}
            </View>
            <Text className={`font-inter text-body-md flex-1 ${item.checkedAt !== null ? 'text-on-surface-variant line-through' : 'text-on-surface'}`} numberOfLines={1}>
              {item.name}
            </Text>
            {item.price !== null && (
              <Text className={`font-mono text-numeric-sm ${item.checkedAt !== null ? 'text-on-surface-variant line-through' : 'text-on-surface-variant'}`}>
                {formatAmount(item.price)}
              </Text>
            )}
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text className="font-inter text-body-md text-on-surface-variant text-center pt-[40px]">No items yet. Add one below.</Text>}
      />

      {showSuggestions && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          // Without this, tapping a chip while the name input has focus is swallowed
          // as a keyboard-dismiss gesture and the blur hides the row before onPress fires.
          keyboardShouldPersistTaps="handled"
          className="max-h-[44px] border-t border-outline-variant bg-surface-container-lowest"
          contentContainerClassName="px-container-margin py-sm gap-sm"
        >
          {frequentItems.map((f) => (
            <TouchableOpacity key={f.name} className="bg-surface-container rounded-full border border-outline-variant px-md py-[6px]" onPress={() => handlePickFrequent(f.name)} activeOpacity={0.7}>
              <Text className="font-mono text-label-sm text-on-surface tracking-[0px]">{f.name}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <View className="flex-row gap-sm items-center px-container-margin py-md border-t border-outline-variant bg-surface-container-lowest">
        <TextInput
          className="bg-surface-container rounded-md border border-outline-variant px-md py-[10px] font-inter text-body-md text-on-surface flex-[2]"
          placeholder="Item name"
          placeholderTextColor={Colors.outline}
          value={name}
          onChangeText={setName}
          onFocus={() => setNameFocused(true)}
          onBlur={() => setNameFocused(false)}
        />
        <TextInput
          className="bg-surface-container rounded-md border border-outline-variant px-md py-[10px] font-inter text-body-md text-on-surface flex-1"
          placeholder={ghostPrice !== null ? formatAmount(ghostPrice) : '₹'}
          placeholderTextColor={Colors.outline}
          value={price}
          onChangeText={setPrice}
          keyboardType="decimal-pad"
        />
        <TouchableOpacity className="bg-primary rounded-md px-md py-[10px]" onPress={handleAdd} activeOpacity={0.8}>
          <Text className="font-inter-medium text-body-sm text-on-primary">Add</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
