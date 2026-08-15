import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { File } from 'expo-file-system';
import { MainStackScreenProps } from '../../navigation/types';
import { parseAxioCsv } from '../../services/imports/axioCsv';
import { buildReconciliationPlan, type ReconciliationPlan } from '../../services/imports/reconcile';
import { getReconciliationCandidates, getCategories, type Category } from '../../db/database';

type Step = 'idle' | 'unmapped-categories' | 'preview' | 'importing' | 'done';

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

  // 'unmapped-categories', 'preview', 'importing', 'done' states are handled in Task 6.
  return null;
}
