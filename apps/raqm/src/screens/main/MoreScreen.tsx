import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, Linking, FlatList, Modal } from 'react-native';
import { File } from 'expo-file-system';
import { useFocusEffect } from '@react-navigation/native';
import { Colors } from '../../theme';
import { useAppStore } from '../../store/appStore';
import { useTxStore } from '../../store/txStore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';
import { rescanTransactionsRange } from '../../services/rescan';
import { buildMonthlySummary, exportCsv, exportPdf } from '../../services/export';
import { RescanModal } from '../../components/RescanModal';
import { parseImportCsv } from '../../services/csvImport';
import {
  syncDiscoveredAccounts, getCategoryRules, getTransactionGroups,
  getSetting, setSetting, insertCsvRows,
} from '../../db/database';
import {
  BankIcon, RepeatIcon, BanknoteIcon, RefreshIcon, ExportIcon, TrashIcon,
  GearIcon, InfoIcon, ChevronRightIcon, GroceryIcon,
  StorefrontIcon, RuleIcon, HelpIcon, LockIcon,
  PaletteIcon, SupportAgentIcon, ImportIcon, CalendarMonthIcon,
} from '../../components/TabIcon';

const FEEDBACK_EMAIL = 'rahxtsayyed@daxa.ai';
const MONTH_START_DAYS = Array.from({ length: 28 }, (_, i) => i + 1);

function ordinal(n: number): string {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  switch (n % 10) {
    case 1: return `${n}st`;
    case 2: return `${n}nd`;
    case 3: return `${n}rd`;
    default: return `${n}th`;
  }
}

type RowDef = {
  key: string;
  label: string;
  Icon: React.ComponentType<{ color: string; size?: number }>;
  meta?: string;
  onPress?: () => void;
};

type SectionDef = { title: string; rows: RowDef[] };

function Row({ row, isLast }: { row: RowDef; isLast: boolean }) {
  return (
    <TouchableOpacity
      className={`flex-row items-center justify-between py-md ${!isLast ? 'border-b border-border-subtle' : ''}`}
      onPress={row.onPress}
      activeOpacity={0.6}
    >
      <View className="flex-row items-center gap-sm">
        <row.Icon color={Colors.inkLabel} size={16} />
        <Text className="font-inter text-body-standard text-on-surface">{row.label}</Text>
      </View>
      <View className="flex-row items-center gap-xs">
        {row.meta && <Text className="font-inter text-annotation text-ink-label">{row.meta}</Text>}
        <ChevronRightIcon color={Colors.inkLabel} size={18} />
      </View>
    </TouchableOpacity>
  );
}

export function MoreScreen() {
  const { userName } = useAppStore();
  const transactions = useTxStore((s) => s.txs);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const [rescanStatus, setRescanStatus] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [rescanCount, setRescanCount] = useState(0);
  const [rescanModalVisible, setRescanModalVisible] = useState(false);
  const [ruleCount, setRuleCount] = useState<number | null>(null);
  const [groupCount, setGroupCount] = useState<number | null>(null);
  const [monthStartDay, setMonthStartDay] = useState(1);
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [csvImporting, setCsvImporting] = useState(false);

  // These screens stay mounted beneath pushed screens, so counts can go stale
  // without a focus-triggered reload (e.g. deleting a rule, then coming back).
  useFocusEffect(
    useCallback(() => {
      getCategoryRules().then((rules) => setRuleCount(rules.length));
      getTransactionGroups().then((groups) => setGroupCount(groups.length));
      getSetting('month_start_day').then((day) => setMonthStartDay(day ? Number(day) : 1));
    }, []),
  );

  const handleSelectMonthStartDay = async (day: number) => {
    setMonthStartDay(day);
    setShowDayPicker(false);
    await setSetting('month_start_day', String(day));
  };

  const initials = useMemo(() => {
    const parts = userName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'R';
    return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  }, [userName]);

  const handleScan = async (from: number, to: number) => {
    setRescanModalVisible(false);
    setRescanStatus('scanning');
    setRescanCount(0);
    try {
      const { found } = await rescanTransactionsRange(from, to, count => setRescanCount(count));
      await syncDiscoveredAccounts();
      setRescanStatus('done');
      Alert.alert(
        'Scan complete',
        found === 0 ? 'No missing transactions found.' : `${found} missing transaction${found === 1 ? '' : 's'} added.`,
      );
    } catch (e) {
      setRescanStatus('idle');
      Alert.alert('Scan failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleImportCsv = async () => {
    if (csvImporting) return;
    try {
      const pick = await File.pickFileAsync({
        mimeTypes: ['text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain'],
      });
      if (pick.canceled || !pick.result) return;

      const text = await pick.result.text();
      const { rows, skipped } = parseImportCsv(text);
      if (rows.length === 0) {
        Alert.alert('Nothing to import', 'No rows with a recognizable date and amount were found in that file.');
        return;
      }

      Alert.alert(
        'Import CSV',
        `Found ${rows.length} transaction${rows.length === 1 ? '' : 's'}` +
          (skipped > 0 ? ` (${skipped} row${skipped === 1 ? '' : 's'} skipped — missing date/amount).` : '.'),
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Import',
            onPress: async () => {
              setCsvImporting(true);
              try {
                const { inserted, duplicates } = await insertCsvRows(rows);
                await useTxStore.getState().refresh();
                Alert.alert(
                  'Import complete',
                  `${inserted} transaction${inserted === 1 ? '' : 's'} added` +
                    (duplicates > 0 ? `, ${duplicates} already present (skipped).` : '.'),
                );
              } catch (e) {
                Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
              } finally {
                setCsvImporting(false);
              }
            },
          },
        ],
      );
    } catch (e) {
      Alert.alert('Import failed', e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const handleExportData = async () => {
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

  const handleAppearance = () => {
    Alert.alert('Appearance', 'Raqm is dark-only for now — a light theme is planned.');
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
        { key: 'manage-accounts', label: 'Manage accounts', Icon: BankIcon, onPress: () => navigation.navigate('ManageAccounts') },
        { key: 'month-start', label: 'Start of month', Icon: CalendarMonthIcon, meta: ordinal(monthStartDay), onPress: () => setShowDayPicker(true) },
      ],
    },
    {
      title: 'MONEY',
      rows: [
        { key: 'grocery', label: 'Grocery lists', Icon: GroceryIcon as RowDef['Icon'], onPress: () => navigation.navigate('Grocery') },
        { key: 'recurring', label: 'Recurring payments', Icon: RepeatIcon, onPress: () => navigation.navigate('Analytics' as never) },
        { key: 'budgets', label: 'Budgets', Icon: BanknoteIcon, onPress: () => navigation.navigate('Settings') },
      ],
    },
    {
      title: 'AUTOMATION',
      rows: [
        {
          key: 'merchant-rules',
          label: 'Merchant rules',
          Icon: StorefrontIcon,
          meta: groupCount == null ? undefined : `${groupCount} grouped`,
          onPress: () => navigation.navigate('MerchantRules'),
        },
        {
          key: 'category-rules',
          label: 'Category rules',
          Icon: RuleIcon,
          meta: ruleCount == null ? undefined : `${ruleCount} rules`,
          onPress: () => navigation.navigate('CategoryRules'),
        },
      ],
    },
    {
      title: 'DATA',
      rows: [
        { key: 'rescan', label: rescanLabel, Icon: RefreshIcon, onPress: rescanStatus === 'scanning' ? undefined : () => setRescanModalVisible(true) },
        { key: 'import-csv', label: csvImporting ? 'Importing…' : 'Import CSV', Icon: ImportIcon, onPress: csvImporting ? undefined : handleImportCsv },
        { key: 'export', label: 'Export data', Icon: ExportIcon, onPress: handleExportData },
        { key: 'deleted', label: 'Deleted transactions', Icon: TrashIcon, onPress: () => navigation.navigate('DeletedTransactions') },
      ],
    },
    {
      title: 'PREFERENCES',
      rows: [
        { key: 'settings', label: 'Settings', Icon: GearIcon, onPress: () => navigation.navigate('Settings') },
        { key: 'appearance', label: 'Appearance', Icon: PaletteIcon, onPress: handleAppearance },
        { key: 'privacy', label: 'Privacy & security', Icon: LockIcon, onPress: () => Linking.openSettings() },
      ],
    },
    {
      title: 'SUPPORT',
      rows: [
        { key: 'feedback', label: 'Feedback', Icon: SupportAgentIcon, onPress: () => Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('Raqm Feedback')}`) },
        { key: 'feature-request', label: 'Feature request', Icon: HelpIcon, onPress: () => Linking.openURL(`mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent('Raqm Feature Request')}`) },
        { key: 'about', label: 'About Raqm', Icon: InfoIcon, onPress: handleAbout },
      ],
    },
  ];

  const version = require('../../../app.json').expo.version as string;

  return (
    <View className="flex-1 bg-background">
      {/* Header: avatar/name (→ Settings) + gear shortcut, editorial (unboxed) style */}
      <View className="flex-row justify-between items-center px-container-margin pt-sm pb-md border-b border-border-subtle">
        <TouchableOpacity className="flex-row items-center gap-sm flex-1" activeOpacity={0.7} onPress={() => navigation.navigate('Settings')}>
          <View className="w-8 h-8 rounded-full bg-primary-container/20 border border-primary/20 items-center justify-center">
            <Text className="font-inter-semibold text-[10px] text-primary">{initials}</Text>
          </View>
          <View className="flex-1">
            <Text className="font-fraunces text-[15px] leading-none text-on-surface" numberOfLines={1}>{userName || 'User'}</Text>
            <Text className="font-inter text-[10px] text-ink-label opacity-60 mt-[2px]">{transactions.length} transactions on record</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={8}>
          <GearIcon color={Colors.inkLabel} size={20} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerClassName="px-container-margin pt-lg pb-[40px]" showsVerticalScrollIndicator={false}>
        {/* Sections — unboxed/editorial: uppercase header, divide-y rows, no card container */}
        {sections.map((section) => (
          <View key={section.title} className="mb-xl">
            <Text className="font-inter-semibold text-section-header text-ink-label uppercase tracking-widest opacity-60 mb-xs px-[2px]">{section.title}</Text>
            <View>
              {section.rows.map((row, i) => (
                <Row key={row.key} row={row} isLast={i === section.rows.length - 1} />
              ))}
            </View>
          </View>
        ))}

        {/* Footer */}
        <Text className="font-inter text-[12px] leading-[18px] text-ink-label opacity-60 text-center mt-md">Version {version}{'\n'}Made with care by Rahat Sayyed.</Text>
      </ScrollView>

      <RescanModal
        visible={rescanModalVisible}
        onClose={() => setRescanModalVisible(false)}
        onScan={handleScan}
      />

      <Modal visible={showDayPicker} transparent animationType="fade" onRequestClose={() => setShowDayPicker(false)}>
        <TouchableOpacity className="flex-1 bg-black/60 justify-center p-lg" activeOpacity={1} onPress={() => setShowDayPicker(false)}>
          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg">
            <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">Start of month</Text>
            <FlatList
              data={MONTH_START_DAYS}
              keyExtractor={(d) => String(d)}
              numColumns={7}
              renderItem={({ item }) => (
                <TouchableOpacity
                  className={`flex-1 aspect-square m-[2px] rounded-sm items-center justify-center ${item === monthStartDay ? 'bg-primary' : 'bg-surface-container'}`}
                  onPress={() => handleSelectMonthStartDay(item)}
                >
                  <Text className={`font-mono text-label-sm tracking-[0px] ${item === monthStartDay ? 'text-on-primary font-inter-medium' : 'text-on-surface-variant'}`}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
