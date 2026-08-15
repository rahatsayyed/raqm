import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { MainStackScreenProps } from '../../navigation/types';

interface SourceOption {
  key: 'axio' | 'pennywise' | 'bank-pdf' | 'upi-pdf';
  title: string;
  subtitle: string;
  enabled: boolean;
}

const SOURCES: SourceOption[] = [
  { key: 'axio', title: 'Axio CSV', subtitle: 'Import categories, notes, and tags from an Axio expense report', enabled: true },
  { key: 'pennywise', title: 'Pennywise', subtitle: 'Coming soon', enabled: false },
  { key: 'bank-pdf', title: 'Bank statement (PDF)', subtitle: 'Coming soon', enabled: false },
  { key: 'upi-pdf', title: 'GPay / PhonePe (PDF)', subtitle: 'Coming soon', enabled: false },
];

export function ImportScreen({ navigation }: MainStackScreenProps<'Import'>) {
  return (
    <View className="flex-1 bg-background p-container-margin">
      <TouchableOpacity onPress={() => navigation.goBack()} className="mt-sm">
        <Text className="font-inter text-body-md text-primary">← Back</Text>
      </TouchableOpacity>
      <Text className="font-inter-bold text-headline-sm text-on-surface mt-md">Import</Text>
      <Text className="font-inter text-supporting-text text-on-surface-variant mt-sm mb-md">
        Bring in transactions from another app or a statement export.
      </Text>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {SOURCES.map((source) => (
          <TouchableOpacity
            key={source.key}
            disabled={!source.enabled}
            onPress={() => navigation.navigate('AxioImport')}
            className={`mb-3 rounded-2xl border border-outline-variant bg-surface-container-high p-4 ${
              source.enabled ? '' : 'opacity-50'
            }`}
          >
            <Text className="font-inter-semibold text-body-sm text-on-surface">{source.title}</Text>
            <Text className="mt-1 font-inter text-supporting-text text-on-surface-variant">{source.subtitle}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}
