import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { File } from 'expo-file-system';
import { parseGpayPdf, type GpayPdfRow } from '../../services/imports/gpayPdf';
import { applyGpayPdfImport } from '../../db/database';
import { useTxStore } from '../../store/txStore';
import type { MainStackScreenProps, OnboardingScreenProps } from '../../navigation/types';

type Step = 'idle' | 'preview' | 'importing';

// Reused from both MainNavigator (MainStackParamList's GPayPdfImport route) and
// OnboardingNavigator (OnboardingStackParamList's GPayPdfImport route — see Task 17,
// those two stacks are mutually exclusive and share no parent). Typed against only
// what this screen actually uses (`navigation.goBack()`; `route` is never read) so
// it type-checks as either stack's screen component without duplicating the screen.
type GPayPdfImportScreenProps = { navigation: { goBack: () => void } };

// Compile-time guard: if a future edit makes this screen use route.params,
// navigation.replace(...), setOptions(...), or anything else beyond goBack(),
// one of these assignments stops compiling — catching the drift at build time
// instead of at runtime inside whichever navigator lacks that capability.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assertCompatibleWithMain: GPayPdfImportScreenProps = null as unknown as MainStackScreenProps<'GPayPdfImport'>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _assertCompatibleWithOnboarding: GPayPdfImportScreenProps = null as unknown as OnboardingScreenProps<'GPayPdfImport'>;

export function GPayPdfImportScreen({ navigation }: GPayPdfImportScreenProps) {
  const [step, setStep] = useState<Step>('idle');
  const [rows, setRows] = useState<GpayPdfRow[]>([]);
  const [skippedBlocks, setSkippedBlocks] = useState(0);
  const [busy, setBusy] = useState(false);

  const handlePickFile = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const pick = await File.pickFileAsync({ mimeTypes: ['application/pdf'] });
      if (pick.canceled || !pick.result) return;

      const buffer = await pick.result.arrayBuffer();
      const { rows: parsedRows, skippedBlocks: skipped } = await parseGpayPdf(new Uint8Array(buffer));
      if (parsedRows.length === 0) {
        Alert.alert('Nothing to import', 'No transactions were found in that statement.');
        return;
      }

      setRows(parsedRows);
      setSkippedBlocks(skipped);
      setStep('preview');
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async () => {
    if (busy) return;
    setBusy(true);
    setStep('importing');
    try {
      const { inserted, merchantsUpdated } = await applyGpayPdfImport(rows);
      await useTxStore.getState().refresh();
      Alert.alert(
        'Import complete',
        `${inserted} new transaction${inserted === 1 ? '' : 's'} added, ${merchantsUpdated} merchant name${merchantsUpdated === 1 ? '' : 's'} upgraded.`,
      );
      navigation.goBack();
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
      setStep('preview');
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
        <Text className="font-inter-bold text-headline-sm text-on-surface mt-md">Google Pay statement</Text>
        <Text className="font-inter text-supporting-text text-on-surface-variant mt-sm mb-md">
          Pick a Google Pay "Transaction statement" PDF. New transactions are added, and existing
          ones with a matching UPI reference get their merchant name upgraded to the PDF's full name.
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

  if (step === 'preview') {
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
            {rows.length} transaction{rows.length === 1 ? '' : 's'} found in the statement
          </Text>
          <Text className="mb-2 font-inter text-supporting-text text-on-surface-variant">
            Transactions already in Raqm (matched by UPI reference) will only have their merchant
            name updated — nothing else changes.
          </Text>
          {skippedBlocks > 0 && (
            <Text className="mb-2 font-inter text-supporting-text text-on-surface-variant">
              {skippedBlocks} row{skippedBlocks === 1 ? '' : 's'} in the PDF couldn't be parsed and were skipped
            </Text>
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

  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="font-inter text-supporting-text text-on-surface-variant">Importing…</Text>
    </View>
  );
}
