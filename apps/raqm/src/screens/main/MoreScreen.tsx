import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, Linking } from 'react-native';
import { Colors } from '../../theme';
import { useAppStore } from '../../store/appStore';
import { useTxStore } from '../../store/txStore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';
import { rescanTransactions } from '../../services/rescan';
import { buildMonthlySummary, exportCsv, exportPdf } from '../../services/export';
import { AddAccountModal } from '../../components/AddAccountModal';
import { syncDiscoveredAccounts } from '../../db/database';
import {
  BankIcon, RepeatIcon, BanknoteIcon, RefreshIcon, ExportIcon, TrashIcon,
  GearIcon, PinIcon, InfoIcon, ChevronRightIcon, SearchIcon, GroceryIcon,
} from '../../components/TabIcon';

type RowDef = {
  key: string;
  label: string;
  Icon: React.ComponentType<{ color: string; size?: number }>;
  onPress?: () => void;
};

type SectionDef = { title: string; rows: RowDef[] };

function Row({ row, isLast }: { row: RowDef; isLast: boolean }) {
  return (
    <TouchableOpacity
      className={`flex-row items-center justify-between p-md ${!isLast ? 'border-b border-border-subtle' : ''}`}
      onPress={row.onPress}
      activeOpacity={0.7}
    >
      <View className="flex-row items-center gap-[12px]">
        <row.Icon color={Colors.inkLabel} size={20} />
        <Text className="font-inter-medium text-insight-reading text-on-surface">{row.label}</Text>
      </View>
      <ChevronRightIcon color={Colors.inkLabel} size={18} />
    </TouchableOpacity>
  );
}

export function MoreScreen() {
  const { userName } = useAppStore();
  const transactions = useTxStore((s) => s.txs);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [rescanStatus, setRescanStatus] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [rescanCount, setRescanCount] = useState(0);
  const [addAccountVisible, setAddAccountVisible] = useState(false);
  const [query, setQuery] = useState('');

  const initials = useMemo(() => {
    const parts = userName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'R';
    return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  }, [userName]);

  const handleRescan = () => {
    Alert.alert(
      'Re-scan SMS',
      'Scans the last 30 days for transactions that are missing. Your categories, notes, and edits are untouched, and deleted transactions stay deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Re-scan',
          onPress: async () => {
            setRescanStatus('scanning');
            setRescanCount(0);
            try {
              const { found } = await rescanTransactions(count => setRescanCount(count));
              await syncDiscoveredAccounts();
              setRescanStatus('done');
              Alert.alert(
                'Re-scan complete',
                found === 0 ? 'No missing transactions found.' : `${found} missing transaction${found === 1 ? '' : 's'} added.`,
              );
            } catch (e) {
              setRescanStatus('idle');
              Alert.alert('Re-scan failed', e instanceof Error ? e.message : 'Unknown error');
            }
          },
        },
      ],
    );
  };

  const handleExport = async () => {
    try {
      const summary = await buildMonthlySummary(new Date());
      Alert.alert(
        'Export transactions',
        `This month: income ₹${summary.income.toFixed(0)} · spent ₹${summary.expense.toFixed(0)} · savings ${summary.savingsRate.toFixed(0)}%`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Export CSV',
            onPress: async () => {
              try {
                await exportCsv();
              } catch (e) {
                Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
              }
            },
          },
          {
            text: 'Export PDF (this month)',
            onPress: async () => {
              try {
                await exportPdf(new Date());
              } catch (e) {
                Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
              }
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert('Export failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleAbout = () => {
    const version = require('../../../app.json').expo.version as string;
    Alert.alert('About Raqm', `Raqm v${version}\nA private, on-device finance tracker.`);
  };

  const rescanLabel =
    rescanStatus === 'scanning' ? `Re-scanning… ${rescanCount} found` : 'Re-scan SMS';

  // Only rows backed by real functionality — no dead entries (DESIGN.md: silence is a feature).
  const sections: SectionDef[] = [
    {
      title: 'ACCOUNTS',
      rows: [
        { key: 'add-account', label: 'Add account', Icon: BankIcon, onPress: () => setAddAccountVisible(true) },
      ],
    },
    {
      title: 'ORGANIZATION',
      rows: [
        { key: 'grocery', label: 'Grocery lists', Icon: GroceryIcon as RowDef['Icon'], onPress: () => navigation.navigate('Grocery') },
        { key: 'recurring', label: 'Recurring payments', Icon: RepeatIcon, onPress: () => navigation.navigate('Analytics' as never) },
        { key: 'budgets', label: 'Budgets', Icon: BanknoteIcon, onPress: () => navigation.navigate('Settings') },
      ],
    },
    {
      title: 'DATA',
      rows: [
        { key: 'rescan', label: rescanLabel, Icon: RefreshIcon, onPress: rescanStatus === 'scanning' ? undefined : handleRescan },
        { key: 'export', label: 'Export data', Icon: ExportIcon, onPress: handleExport },
        { key: 'deleted', label: 'Deleted transactions', Icon: TrashIcon, onPress: () => navigation.navigate('DeletedTransactions') },
      ],
    },
    {
      title: 'PERSONALIZATION',
      rows: [
        { key: 'settings', label: 'Settings', Icon: GearIcon, onPress: () => navigation.navigate('Settings') },
        { key: 'location', label: 'Location permissions', Icon: PinIcon, onPress: () => Linking.openSettings() },
      ],
    },
    {
      title: 'SUPPORT',
      rows: [
        { key: 'about', label: 'About Raqm', Icon: InfoIcon, onPress: handleAbout },
      ],
    },
  ];

  const q = query.trim().toLowerCase();
  const visibleSections = q
    ? sections
        .map((s) => ({ ...s, rows: s.rows.filter((r) => r.label.toLowerCase().includes(q)) }))
        .filter((s) => s.rows.length > 0)
    : sections;

  const version = require('../../../app.json').expo.version as string;

  return (
    <View className="flex-1 bg-background">
      {/* Top bar: settings action left, centered title */}
      <View className="flex-row justify-between items-center px-container-margin pt-sm pb-md border-b border-border-subtle">
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={8}>
          <GearIcon color={Colors.primary} size={22} />
        </TouchableOpacity>
        <Text className="font-fraunces text-[22px] leading-[28px] text-on-surface">More</Text>
        <View className="w-[22px]" />
      </View>

      <ScrollView contentContainerClassName="p-container-margin pb-[40px]" showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <TouchableOpacity className="flex-row items-center gap-md bg-bg-surface border border-border-subtle rounded-xl p-md mb-lg" activeOpacity={0.7} onPress={() => navigation.navigate('Settings')}>
          <View className="w-[56px] h-[56px] rounded-[28px] bg-primary-container items-center justify-center">
            <Text className="font-fraunces text-[20px] leading-[26px] text-on-primary-container">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-inter-medium text-insight-reading text-ink-headline">{userName || 'User'}</Text>
            <Text className="font-inter text-annotation text-ink-label mt-[2px]">{transactions.length} transactions on record</Text>
          </View>
          <ChevronRightIcon color={Colors.inkLabel} size={18} />
        </TouchableOpacity>

        {/* Search (filters the rows below) */}
        <View className="relative mb-lg">
          <View className="absolute left-md top-0 bottom-0 justify-center z-[1]">
            <SearchIcon color={Colors.inkLabel} size={18} />
          </View>
          <TextInput
            className="bg-bg-surface border border-border-subtle rounded-xl py-[14px] pl-[44px] pr-md font-inter text-body-standard text-on-surface"
            placeholder="Search settings…"
            placeholderTextColor={Colors.inkLabel}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        {/* Sections */}
        {visibleSections.map((section) => (
          <View key={section.title} className="mb-xl">
            <Text className="font-inter-semibold text-section-header text-ink-label mb-md px-[2px]">{section.title}</Text>
            <View className="bg-bg-surface border border-border-subtle rounded-xl overflow-hidden">
              {section.rows.map((row, i) => (
                <Row key={row.key} row={row} isLast={i === section.rows.length - 1} />
              ))}
            </View>
          </View>
        ))}
        {visibleSections.length === 0 && (
          <Text className="font-inter text-supporting-text text-ink-body text-center py-xl">Nothing matches "{query.trim()}".</Text>
        )}

        {/* Footer */}
        <Text className="font-inter text-[12px] leading-[18px] text-ink-label opacity-60 text-center mt-md">Version {version}{'\n'}Made with care by Rahat Sayyed.</Text>
      </ScrollView>

      <AddAccountModal
        visible={addAccountVisible}
        onClose={() => setAddAccountVisible(false)}
        onAdded={() => { /* AccountDetail/Dashboard re-read accounts on their own effects */ }}
      />
    </View>
  );
}
