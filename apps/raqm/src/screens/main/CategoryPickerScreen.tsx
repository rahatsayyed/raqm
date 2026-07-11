import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Colors } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { getCategories, getSubcategories, addCategory, addSubcategory } from '../../db/database';
import type { Category, Subcategory } from '../../db/database';

export function CategoryPickerScreen({ route, navigation }: MainStackScreenProps<'CategoryPicker'>) {
  const { returnTo, transactionId } = route.params;

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategoriesByCategory, setSubcategoriesByCategory] = useState<Record<number, Subcategory[]>>({});
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryEmoji, setNewCategoryEmoji] = useState('📦');

  const [addingSubFor, setAddingSubFor] = useState<number | null>(null);
  const [newSubcategoryName, setNewSubcategoryName] = useState('');

  const refreshCategories = () => {
    getCategories().then(setCategories);
  };

  useEffect(() => {
    refreshCategories();
  }, []);

  const toggleExpand = async (categoryId: number) => {
    if (expandedId === categoryId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(categoryId);
    if (!subcategoriesByCategory[categoryId]) {
      const subs = await getSubcategories(categoryId);
      setSubcategoriesByCategory((prev) => ({ ...prev, [categoryId]: subs }));
    }
  };

  const returnWithSelection = (categoryId: number, subcategoryId?: number) => {
    if (returnTo === 'EditTransaction') {
      navigation.popTo(
        'EditTransaction',
        { transactionId: transactionId!, pickedCategoryId: categoryId, pickedSubcategoryId: subcategoryId },
        { merge: true }
      );
    } else {
      navigation.popTo(
        'AddTransaction',
        { pickedCategoryId: categoryId, pickedSubcategoryId: subcategoryId },
        { merge: true }
      );
    }
  };

  const handleSelectCategory = (categoryId: number) => {
    returnWithSelection(categoryId, undefined);
  };

  const handleSelectSubcategory = (categoryId: number, subcategoryId: number) => {
    returnWithSelection(categoryId, subcategoryId);
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    await addCategory(name, newCategoryEmoji.trim() || '📦');
    setNewCategoryName('');
    setNewCategoryEmoji('📦');
    setShowAddCategory(false);
    refreshCategories();
  };

  const handleAddSubcategory = async (categoryId: number) => {
    const name = newSubcategoryName.trim();
    if (!name) return;
    await addSubcategory(categoryId, name);
    setNewSubcategoryName('');
    setAddingSubFor(null);
    const subs = await getSubcategories(categoryId);
    setSubcategoriesByCategory((prev) => ({ ...prev, [categoryId]: subs }));
  };

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-container-margin pt-sm pb-md">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="font-inter text-body-md text-primary w-[70px]">✕ Close</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-title-lg text-on-surface">Pick a category</Text>
        <View className="w-[60px]" />
      </View>

      <ScrollView contentContainerClassName="px-container-margin pb-[48px] gap-sm" showsVerticalScrollIndicator={false}>
        {categories.map((cat) => {
          const expanded = expandedId === cat.id;
          const subs = subcategoriesByCategory[cat.id] ?? [];
          return (
            <View key={cat.id} className="bg-surface-container-lowest rounded-xl border border-outline-variant overflow-hidden">
              <TouchableOpacity className="flex-row items-center gap-md px-md py-[14px]" onPress={() => handleSelectCategory(cat.id)}>
                <Text className="text-[22px]">{cat.emoji}</Text>
                <Text className="font-inter-medium text-body-md text-on-surface flex-1">{cat.name}</Text>
                <TouchableOpacity onPress={() => toggleExpand(cat.id)} hitSlop={8}>
                  <Text className="font-inter text-body-md text-on-surface-variant px-xs">{expanded ? '︿' : '﹀'}</Text>
                </TouchableOpacity>
              </TouchableOpacity>

              {expanded && (
                <View className="border-t border-outline-variant">
                  {subs.map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      className="px-md py-[12px] pl-[48px]"
                      onPress={() => handleSelectSubcategory(cat.id, sub.id)}
                    >
                      <Text className="font-inter text-body-sm text-on-surface-variant">{sub.name}</Text>
                    </TouchableOpacity>
                  ))}

                  {addingSubFor === cat.id ? (
                    <View className="flex-row gap-sm items-center px-md py-[10px] pl-[48px]">
                      <TextInput
                        className="flex-1 font-inter text-body-sm text-on-surface bg-surface-variant rounded-md px-sm py-[6px]"
                        placeholder="Sub-category name…"
                        placeholderTextColor={Colors.outline}
                        value={newSubcategoryName}
                        onChangeText={setNewSubcategoryName}
                        autoFocus
                        onSubmitEditing={() => handleAddSubcategory(cat.id)}
                      />
                      <TouchableOpacity onPress={() => handleAddSubcategory(cat.id)} className="px-sm py-[6px] bg-primary rounded-md">
                        <Text className="font-mono text-label-sm text-on-primary tracking-[0]">Add</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      className="px-md py-[12px] pl-[48px]"
                      onPress={() => { setAddingSubFor(cat.id); setNewSubcategoryName(''); }}
                    >
                      <Text className="font-inter text-body-sm text-primary">+ New sub-category</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {showAddCategory ? (
          <View className="mt-sm p-md bg-surface-container-lowest rounded-xl border border-outline-variant gap-md">
            <View className="flex-row gap-sm">
              <TextInput
                className="w-[56px] text-center font-inter text-body-md text-on-surface bg-surface-variant rounded-md py-[8px]"
                placeholder="📦"
                placeholderTextColor={Colors.outline}
                value={newCategoryEmoji}
                onChangeText={setNewCategoryEmoji}
                maxLength={4}
              />
              <TextInput
                className="flex-1 font-inter text-body-md text-on-surface bg-surface-variant rounded-md px-md py-[8px]"
                placeholder="Category name…"
                placeholderTextColor={Colors.outline}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus
                onSubmitEditing={handleAddCategory}
              />
            </View>
            <View className="flex-row justify-end gap-md">
              <TouchableOpacity onPress={() => setShowAddCategory(false)} className="py-[8px] px-md">
                <Text className="font-inter text-body-sm text-on-surface-variant">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddCategory} className="py-[8px] px-md bg-primary rounded-md">
                <Text className="font-inter-medium text-body-sm text-on-primary">Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            className="mt-sm py-md items-center rounded-xl border border-outline-variant border-dashed"
            onPress={() => setShowAddCategory(true)}
          >
            <Text className="font-inter-medium text-body-md text-primary">+ New category</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}
