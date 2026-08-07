import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getTxById, getCategories, upsertCategoryRule } from '../../db/database';
import type { Category } from '../../db/database';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { isCreditType } from '../../services/txIntelligence';

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
    navigation.navigate('CategoryPicker', {
      returnTo: 'EditTransaction',
      transactionId,
      direction: isCreditType(type) ? 'income' : 'expense',
    });
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
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-container-margin pt-sm pb-md">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="font-inter text-body-md text-primary w-[70px]">← Back</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-title-lg text-on-surface">Edit Transaction</Text>
        <View className="w-[60px]" />
      </View>

      <ScrollView contentContainerClassName="px-container-margin pb-[48px]" showsVerticalScrollIndicator={false}>
        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Amount</Text>
        <TextInput
          className="font-mono-medium text-numeric-lg text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-md"
          placeholder="0"
          placeholderTextColor={Colors.outline}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
        />

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Type</Text>
        <View className="flex-row gap-sm">
          <TouchableOpacity
            className={`flex-1 items-center py-[12px] rounded-lg border ${
              type === TransactionType.EXPENSE
                ? 'bg-primary-container border-primary'
                : 'bg-surface-container-lowest border-outline-variant'
            }`}
            onPress={() => setType(TransactionType.EXPENSE)}
          >
            <Text
              className={`text-body-sm ${
                type === TransactionType.EXPENSE
                  ? 'font-inter-medium text-on-primary-container'
                  : 'font-inter text-on-surface-variant'
              }`}
            >
              Expense
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 items-center py-[12px] rounded-lg border ${
              isCreditType(type)
                ? 'bg-primary-container border-primary'
                : 'bg-surface-container-lowest border-outline-variant'
            }`}
            // A CREDIT-type transaction (e.g. a card refund) already reads as "money in" —
            // tapping Income when it's already credit-direction shouldn't silently coerce
            // it to the literal INCOME type and lose that distinction.
            onPress={() => setType(isCreditType(type) ? type : TransactionType.INCOME)}
          >
            <Text
              className={`text-body-sm ${
                isCreditType(type)
                  ? 'font-inter-medium text-on-primary-container'
                  : 'font-inter text-on-surface-variant'
              }`}
            >
              Income
            </Text>
          </TouchableOpacity>
        </View>

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Merchant</Text>
        <TextInput
          className="font-inter text-body-md text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-[12px]"
          placeholder="e.g. Blue Tokai Coffee"
          placeholderTextColor={Colors.outline}
          value={merchant}
          onChangeText={setMerchant}
        />

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Date</Text>
        <TouchableOpacity
          className="bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-[12px]"
          onPress={() => setShowDatePicker(true)}
        >
          <Text className="font-inter text-body-md text-on-surface">{fmtDate(date.getTime())}</Text>
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

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Category</Text>
        <TouchableOpacity
          className="flex-row items-center justify-between bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-[12px]"
          onPress={openCategoryPicker}
        >
          <Text className="font-inter text-body-md text-on-surface">{categoryLabel ?? 'Choose a category'}</Text>
          <Text className="font-inter text-body-md text-on-surface-variant">›</Text>
        </TouchableOpacity>

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Notes</Text>
        <TextInput
          className="font-inter text-body-md text-on-surface bg-surface-container-lowest rounded-xl border border-outline-variant px-md py-[12px] min-h-[72px]"
          style={{ textAlignVertical: 'top' }}
          placeholder="Optional note…"
          placeholderTextColor={Colors.outline}
          value={notes}
          onChangeText={setNotes}
          multiline
        />

        <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Tags</Text>
        <View className="flex-row flex-wrap gap-sm">
          {tags.map((tag) => (
            <View key={tag} className="flex-row items-center gap-[6px] bg-surface-variant rounded-full px-sm py-[6px]">
              <Text className="font-mono text-label-sm text-on-surface-variant tracking-[0]">{tag}</Text>
              <TouchableOpacity onPress={() => removeTag(tag)}>
                <Text className="font-mono text-label-sm text-on-surface-variant tracking-[0]">✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
        <View className="flex-row gap-sm mt-sm">
          <TextInput
            className="flex-1 font-inter text-body-md text-on-surface bg-surface-container-lowest rounded-lg border border-outline-variant px-md py-[8px]"
            placeholder="Add tag…"
            placeholderTextColor={Colors.outline}
            value={newTag}
            onChangeText={setNewTag}
            onSubmitEditing={addTag}
            autoCapitalize="none"
          />
          <TouchableOpacity onPress={addTag} className="px-md items-center justify-center bg-primary rounded-lg">
            <Text className="font-inter-medium text-body-sm text-on-primary">Add</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          className={`mt-xl py-md items-center bg-primary rounded-xl ${!canSave || saving ? 'opacity-40' : ''}`}
          onPress={handleSave}
          disabled={!canSave || saving}
        >
          <Text className="font-inter-medium text-body-md text-on-primary">Save changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}
