import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getTxById, getCategories, upsertCategoryRule } from '../../db/database';
import type { Category } from '../../db/database';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function EditTransactionScreen({ route, navigation }: MainStackScreenProps<'EditTransaction'>) {
  const { transactionId } = route.params;
  const updateTx = useTxStore((s) => s.update);

  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [subcategoryId, setSubcategoryId] = useState<number | undefined>(undefined);
  const [categoryLabel, setCategoryLabel] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const tx = await getTxById(transactionId);
      if (!tx) {
        setLoading(false);
        return;
      }
      setAmount(String(tx.amount));
      setType(tx.type);
      setMerchant(tx.merchant ?? '');
      setDate(new Date(tx.timestamp));
      setCategoryId(tx.categoryId);
      setSubcategoryId(tx.subcategoryId ?? undefined);
      setNotes(tx.notes ?? '');
      setTags(tx.tags ?? []);
      if (tx.categoryId != null) {
        const categories = await getCategories();
        const cat = categories.find((c) => c.id === tx.categoryId);
        setCategoryLabel(cat ? `${cat.emoji} ${cat.name}` : null);
      }
      setLoading(false);
    })();
  }, [transactionId]);

  const parsedAmount = parseFloat(amount);
  const canSave = !Number.isNaN(parsedAmount) && parsedAmount > 0;

  const openCategoryPicker = () => {
    navigation.navigate('CategoryPicker', { returnTo: 'EditTransaction', transactionId });
  };

  useEffect(() => {
    const pickedCategoryId = route.params?.pickedCategoryId;
    const pickedSubcategoryId = route.params?.pickedSubcategoryId;
    if (pickedCategoryId == null) return;

    setCategoryId(pickedCategoryId);
    setSubcategoryId(pickedSubcategoryId);
    getCategories().then((categories: Category[]) => {
      const cat = categories.find((c) => c.id === pickedCategoryId);
      setCategoryLabel(cat ? `${cat.emoji} ${cat.name}` : null);
    });
    navigation.setParams({ pickedCategoryId: undefined, pickedSubcategoryId: undefined });
  }, [route.params?.pickedCategoryId, route.params?.pickedSubcategoryId]);

  const addTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed || tags.includes(trimmed)) {
      setNewTag('');
      return;
    }
    setTags([...tags, trimmed]);
    setNewTag('');
  };

  const removeTag = (tag: string) => setTags(tags.filter((t) => t !== tag));

  const handleSave = async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const trimmedMerchant = merchant.trim();
      await updateTx(transactionId, {
        amount: parsedAmount,
        type,
        merchant: trimmedMerchant || null,
        timestamp: date.getTime(),
        categoryId,
        subcategoryId: subcategoryId ?? null,
        notes: notes.trim() || null,
        tags,
      });
      // C7: remember merchant → category mapping for future auto-categorization.
      if (trimmedMerchant && categoryId != null) {
        await upsertCategoryRule(trimmedMerchant, categoryId, subcategoryId ?? null);
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.root, styles.centered]}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Edit Transaction</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.amountInput}
          placeholder="0"
          placeholderTextColor={Colors.outline}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>Type</Text>
        <View style={styles.segmentRow}>
          <TouchableOpacity
            style={[styles.segment, type === TransactionType.EXPENSE && styles.segmentActive]}
            onPress={() => setType(TransactionType.EXPENSE)}
          >
            <Text style={[styles.segmentText, type === TransactionType.EXPENSE && styles.segmentTextActive]}>Expense</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.segment, type === TransactionType.INCOME && styles.segmentActive]}
            onPress={() => setType(TransactionType.INCOME)}
          >
            <Text style={[styles.segmentText, type === TransactionType.INCOME && styles.segmentTextActive]}>Income</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Merchant</Text>
        <TextInput
          style={styles.textInput}
          placeholder="e.g. Blue Tokai Coffee"
          placeholderTextColor={Colors.outline}
          value={merchant}
          onChangeText={setMerchant}
        />

        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.dateRow} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateRowText}>{fmtDate(date.getTime())}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(_event, selected) => {
              setShowDatePicker(false);
              if (selected) setDate(selected);
            }}
          />
        )}

        <Text style={styles.label}>Category</Text>
        <TouchableOpacity style={styles.categoryRow} onPress={openCategoryPicker}>
          <Text style={styles.categoryRowText}>{categoryLabel ?? 'Choose a category'}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={styles.notesInput}
          placeholder="Optional note…"
          placeholderTextColor={Colors.outline}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Text style={styles.label}>Tags</Text>
        <View style={styles.tagsWrap}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagChipText}>{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(tag)}>
                <Text style={styles.tagChipRemove}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View style={styles.tagInputRow}>
          <TextInput
            style={styles.tagInput}
            placeholder="Add tag…"
            placeholderTextColor={Colors.outline}
            value={newTag}
            onChangeText={setNewTag}
            onSubmitEditing={addTag}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={addTag} style={styles.tagAddButton}>
            <Text style={styles.tagAddButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, (!canSave || saving) && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text style={styles.saveButtonText}>Save changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  centered: { alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  backText: { ...Typography.bodyMd, color: Colors.primary, width: 70 },
  title: { ...Typography.titleLg, color: Colors.onSurface },

  content: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 48 },
  label: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginTop: Spacing.lg, marginBottom: Spacing.sm },

  amountInput: {
    ...Typography.numericLg, color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
  },

  segmentRow: { flexDirection: 'row', gap: Spacing.sm },
  segment: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceContainerLowest,
  },
  segmentActive: { backgroundColor: Colors.primaryContainer, borderColor: Colors.primary },
  segmentText: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  segmentTextActive: { color: Colors.onPrimaryContainer, fontFamily: 'Inter_500Medium' },

  textInput: {
    ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },

  dateRow: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  dateRowText: { ...Typography.bodyMd, color: Colors.onSurface },

  categoryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  categoryRowText: { ...Typography.bodyMd, color: Colors.onSurface },
  chevron: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },

  notesInput: {
    ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    minHeight: 72, textAlignVertical: 'top',
  },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  tagChipText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  tagChipRemove: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  tagInputRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  tagInput: {
    flex: 1, ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  tagAddButton: {
    paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
  },
  tagAddButtonText: { ...Typography.bodySm, color: Colors.onPrimary, fontFamily: 'Inter_500Medium' },

  saveButton: {
    marginTop: Spacing.xl, paddingVertical: Spacing.md, alignItems: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.xl,
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { ...Typography.bodyMd, color: Colors.onPrimary, fontFamily: 'Inter_500Medium' },
});
