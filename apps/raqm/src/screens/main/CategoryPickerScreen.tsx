import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
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
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.closeText}>✕ Close</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Pick a category</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {categories.map((cat) => {
          const expanded = expandedId === cat.id;
          const subs = subcategoriesByCategory[cat.id] ?? [];
          return (
            <View key={cat.id} style={styles.categoryCard}>
              <TouchableOpacity style={styles.categoryRow} onPress={() => handleSelectCategory(cat.id)}>
                <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                <Text style={styles.categoryName}>{cat.name}</Text>
                <TouchableOpacity onPress={() => toggleExpand(cat.id)} hitSlop={8}>
                  <Text style={styles.chevron}>{expanded ? '︿' : '﹀'}</Text>
                </TouchableOpacity>
              </TouchableOpacity>

              {expanded && (
                <View style={styles.subList}>
                  {subs.map((sub) => (
                    <TouchableOpacity
                      key={sub.id}
                      style={styles.subRow}
                      onPress={() => handleSelectSubcategory(cat.id, sub.id)}
                    >
                      <Text style={styles.subName}>{sub.name}</Text>
                    </TouchableOpacity>
                  ))}

                  {addingSubFor === cat.id ? (
                    <View style={styles.addSubRow}>
                      <TextInput
                        style={styles.addSubInput}
                        placeholder="Sub-category name…"
                        placeholderTextColor={Colors.outline}
                        value={newSubcategoryName}
                        onChangeText={setNewSubcategoryName}
                        autoFocus
                        onSubmitEditing={() => handleAddSubcategory(cat.id)}
                      />
                      <TouchableOpacity onPress={() => handleAddSubcategory(cat.id)} style={styles.addSubButton}>
                        <Text style={styles.addSubButtonText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.subRow}
                      onPress={() => { setAddingSubFor(cat.id); setNewSubcategoryName(''); }}
                    >
                      <Text style={styles.addSubLabel}>+ New sub-category</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          );
        })}

        {showAddCategory ? (
          <View style={styles.addCategoryCard}>
            <View style={styles.addCategoryRow}>
              <TextInput
                style={styles.addCategoryEmojiInput}
                placeholder="📦"
                placeholderTextColor={Colors.outline}
                value={newCategoryEmoji}
                onChangeText={setNewCategoryEmoji}
                maxLength={4}
              />
              <TextInput
                style={styles.addCategoryNameInput}
                placeholder="Category name…"
                placeholderTextColor={Colors.outline}
                value={newCategoryName}
                onChangeText={setNewCategoryName}
                autoFocus
                onSubmitEditing={handleAddCategory}
              />
            </View>
            <View style={styles.addCategoryActions}>
              <TouchableOpacity onPress={() => setShowAddCategory(false)} style={styles.addCategoryCancel}>
                <Text style={styles.addCategoryCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleAddCategory} style={styles.addCategoryConfirm}>
                <Text style={styles.addCategoryConfirmText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.newCategoryButton} onPress={() => setShowAddCategory(true)}>
            <Text style={styles.newCategoryButtonText}>+ New category</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  closeText: { ...Typography.bodyMd, color: Colors.primary, width: 70 },
  title: { ...Typography.titleLg, color: Colors.onSurface },

  content: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 48, gap: Spacing.sm },

  categoryCard: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  categoryRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  categoryEmoji: { fontSize: 22 },
  categoryName: { ...Typography.bodyMd, color: Colors.onSurface, flex: 1, fontFamily: 'WorkSans_500Medium' },
  chevron: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, paddingHorizontal: Spacing.xs },

  subList: { borderTopWidth: 1, borderTopColor: Colors.outlineVariant },
  subRow: { paddingHorizontal: Spacing.md, paddingVertical: 12, paddingLeft: Spacing.xl + Spacing.md },
  subName: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  addSubLabel: { ...Typography.bodySm, color: Colors.primary },
  addSubRow: {
    flexDirection: 'row', gap: Spacing.sm, alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingVertical: 10, paddingLeft: Spacing.xl + Spacing.md,
  },
  addSubInput: {
    flex: 1, ...Typography.bodySm, color: Colors.onSurface,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  addSubButton: {
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
    backgroundColor: Colors.primary, borderRadius: Radius.md,
  },
  addSubButtonText: { ...Typography.labelSm, color: Colors.onPrimary, letterSpacing: 0 },

  newCategoryButton: {
    marginTop: Spacing.sm, paddingVertical: Spacing.md, alignItems: 'center',
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant, borderStyle: 'dashed',
  },
  newCategoryButtonText: { ...Typography.bodyMd, color: Colors.primary, fontFamily: 'WorkSans_500Medium' },

  addCategoryCard: {
    marginTop: Spacing.sm, padding: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
    gap: Spacing.md,
  },
  addCategoryRow: { flexDirection: 'row', gap: Spacing.sm },
  addCategoryEmojiInput: {
    width: 56, textAlign: 'center', ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.md, paddingVertical: 8,
  },
  addCategoryNameInput: {
    flex: 1, ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.md,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  addCategoryActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.md },
  addCategoryCancel: { paddingVertical: 8, paddingHorizontal: Spacing.md },
  addCategoryCancelText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  addCategoryConfirm: { paddingVertical: 8, paddingHorizontal: Spacing.md, backgroundColor: Colors.primary, borderRadius: Radius.md },
  addCategoryConfirmText: { ...Typography.bodySm, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
});
