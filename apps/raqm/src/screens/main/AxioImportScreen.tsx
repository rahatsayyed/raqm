import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { File } from 'expo-file-system';
import { MainStackScreenProps } from '../../navigation/types';
import { parseAxioCsv } from '../../services/imports/axioCsv';
import { buildReconciliationPlan, computeConflict, type ReconciliationPlan } from '../../services/imports/reconcile';
import {
  getReconciliationCandidates,
  getCategories,
  applyImportReconciliation,
  type Category,
} from '../../db/database';
import { useTxStore } from '../../store/txStore';

type Step = 'idle' | 'unmapped-categories' | 'preview' | 'importing';

function resolvePlanWithOverrides(
  basePlan: ReconciliationPlan,
  overrides: Record<string, number | null>,
): ReconciliationPlan {
  if (Object.keys(overrides).length === 0) return basePlan;
  return {
    ...basePlan,
    updates: basePlan.updates.map((u) => {
      if (u.categoryId !== null || !u.categoryRaw || !(u.categoryRaw in overrides)) return u;
      const newCategoryId = overrides[u.categoryRaw];
      return {
        ...u,
        categoryId: newCategoryId,
        conflict: computeConflict(u.existingCategoryId, u.existingNotes, u.existingTags, newCategoryId, u.notes, u.tags),
      };
    }),
    inserts: basePlan.inserts.map((ins) =>
      ins.categoryId === null && ins.categoryRaw && ins.categoryRaw in overrides
        ? { ...ins, categoryId: overrides[ins.categoryRaw] }
        : ins,
    ),
  };
}

export function AxioImportScreen({ navigation }: MainStackScreenProps<'AxioImport'>) {
  const [step, setStep] = useState<Step>('idle');
  const [plan, setPlan] = useState<ReconciliationPlan | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryOverrides, setCategoryOverrides] = useState<Record<string, number | null>>({});
  const [conflictPolicy, setConflictPolicy] = useState<'overwrite' | 'skip'>('skip');
  const [busy, setBusy] = useState(false);

  const handlePickFile = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const pick = await File.pickFileAsync({
        mimeTypes: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain'],
      });
      if (pick.canceled || !pick.result) return;

      const text = await pick.result.text();
      const { rows, skipped } = parseAxioCsv(text);
      if (rows.length === 0) {
        Alert.alert('Nothing to import', 'No Axio transaction rows were found in that file.');
        return;
      }

      const [candidates, cats] = await Promise.all([getReconciliationCandidates(), getCategories()]);
      const builtPlan = buildReconciliationPlan(rows, candidates, cats);
      const finalPlan: ReconciliationPlan = { ...builtPlan, skippedRows: skipped };
      setPlan(finalPlan);
      setCategories(cats);
      setStep(finalPlan.unmappedCategoryNames.length > 0 ? 'unmapped-categories' : 'preview');
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'idle') {
    return (
      <View className="flex-1 bg-background p-container-margin">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-sm">
          <Text className="font-inter text-body-md text-primary">← Back</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-headline-sm text-on-surface mt-md">Axio import</Text>
        <Text className="font-inter text-supporting-text text-on-surface-variant mt-sm mb-md">
          Pick an Axio expense report CSV to match against your existing transactions.
        </Text>

        <View className="flex-1 items-center justify-center">
          <TouchableOpacity
            disabled={busy}
            onPress={handlePickFile}
            className={`rounded-2xl bg-surface-container-high border border-outline-variant px-6 py-3 ${
              busy ? 'opacity-50' : ''
            }`}
          >
            <Text className="font-inter-semibold text-body-sm text-on-surface">
              {busy ? 'Reading file…' : 'Choose file'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 'unmapped-categories' && plan) {
    return (
      <View className="flex-1 bg-background p-container-margin">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-sm">
          <Text className="font-inter text-body-md text-primary">← Back</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-headline-sm text-on-surface mt-md">Unmapped categories</Text>
        <Text className="font-inter text-supporting-text text-on-surface-variant mt-sm mb-md">
          These Axio categories don't match any of your existing categories. Pick one to use, or leave blank.
        </Text>

        <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
          {plan.unmappedCategoryNames.map((rawName) => (
            <View key={rawName} className="mb-4">
              <Text className="mb-2 font-inter-semibold text-body-sm text-on-surface">{rawName}</Text>
              <View className="flex-row flex-wrap gap-2">
                <TouchableOpacity
                  onPress={() => setCategoryOverrides((prev) => ({ ...prev, [rawName]: null }))}
                  className={`rounded-lg border px-3 py-2 ${
                    (categoryOverrides[rawName] ?? null) === null ? 'border-primary bg-primary/10' : 'border-outline-variant'
                  }`}
                >
                  <Text className="font-inter text-caption text-on-surface">Leave blank</Text>
                </TouchableOpacity>
                {categories.map((cat) => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => setCategoryOverrides((prev) => ({ ...prev, [rawName]: cat.id }))}
                    className={`rounded-lg border px-3 py-2 ${
                      categoryOverrides[rawName] === cat.id ? 'border-primary bg-primary/10' : 'border-outline-variant'
                    }`}
                  >
                    <Text className="font-inter text-caption text-on-surface">
                      {cat.emoji} {cat.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity onPress={() => setStep('preview')} className="mt-2 rounded-2xl bg-primary px-6 py-3">
          <Text className="text-center font-inter-semibold text-body-sm text-on-primary">Continue</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'preview' && plan) {
    const resolved = resolvePlanWithOverrides(plan, categoryOverrides);
    const conflictCount = resolved.updates.filter((u) => u.conflict).length;
    const cleanUpdateCount = resolved.updates.length - conflictCount;

    const handleConfirm = async () => {
      if (busy) return;
      setBusy(true);
      setStep('importing');
      try {
        const { updated, inserted } = await applyImportReconciliation({
          updates: resolved.updates,
          inserts: resolved.inserts,
          conflictPolicy,
        });
        await useTxStore.getState().refresh();
        Alert.alert(
          'Import complete',
          `${updated} transaction${updated === 1 ? '' : 's'} updated, ${inserted} new transaction${inserted === 1 ? '' : 's'} added.`,
        );
        navigation.goBack();
      } catch (e) {
        Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
        setStep('preview');
      } finally {
        setBusy(false);
      }
    };

    return (
      <View className="flex-1 bg-background p-container-margin">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mt-sm">
          <Text className="font-inter text-body-md text-primary">← Back</Text>
        </TouchableOpacity>
        <Text className="font-inter-bold text-headline-sm text-on-surface mt-md">Review import</Text>
        <Text className="font-inter text-supporting-text text-on-surface-variant mt-sm mb-md">
          Confirm what will change before importing.
        </Text>

        <View className="flex-1">
          <Text className="mb-2 font-inter text-body-sm text-on-surface">
            {cleanUpdateCount} transaction{cleanUpdateCount === 1 ? '' : 's'} will be updated
          </Text>
          <Text className="mb-2 font-inter text-body-sm text-on-surface">
            {resolved.inserts.length} new transaction{resolved.inserts.length === 1 ? '' : 's'} will be created
          </Text>
          {resolved.skippedRows > 0 && (
            <Text className="mb-2 font-inter text-supporting-text text-on-surface-variant">
              {resolved.skippedRows} row{resolved.skippedRows === 1 ? '' : 's'} skipped (unparseable)
            </Text>
          )}
          {conflictCount > 0 && (
            <View className="mt-2">
              <Text className="mb-2 font-inter text-body-sm text-on-surface">
                {conflictCount} of those already have a category, note, or tags set. What should happen to them?
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => setConflictPolicy('overwrite')}
                  className={`rounded-lg border px-3 py-2 ${
                    conflictPolicy === 'overwrite' ? 'border-primary bg-primary/10' : 'border-outline-variant'
                  }`}
                >
                  <Text className="font-inter text-caption text-on-surface">Overwrite</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setConflictPolicy('skip')}
                  className={`rounded-lg border px-3 py-2 ${
                    conflictPolicy === 'skip' ? 'border-primary bg-primary/10' : 'border-outline-variant'
                  }`}
                >
                  <Text className="font-inter text-caption text-on-surface">Skip conflicts</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <TouchableOpacity
            disabled={busy}
            onPress={handleConfirm}
            className={`mt-6 rounded-2xl bg-primary px-6 py-3 ${busy ? 'opacity-50' : ''}`}
          >
            <Text className="text-center font-inter-semibold text-body-sm text-on-primary">Import</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (step === 'importing') {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="font-inter text-supporting-text text-on-surface-variant">Importing…</Text>
      </View>
    );
  }

  return null;
}
