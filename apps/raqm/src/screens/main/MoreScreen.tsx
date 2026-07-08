import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Linking } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
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
      style={[styles.row, !isLast && styles.rowBorder]}
      onPress={row.onPress}
      activeOpacity={0.7}
    >
      <View style={styles.rowLeft}>
        <row.Icon color={Colors.inkLabel} size={20} />
        <Text style={styles.rowLabel}>{row.label}</Text>
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
    <View style={styles.root}>
      {/* Top bar: settings action left, centered title */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={8}>
          <GearIcon color={Colors.primary} size={22} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>More</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile */}
        <TouchableOpacity style={styles.profileCard} activeOpacity={0.7} onPress={() => navigation.navigate('Settings')}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{userName || 'User'}</Text>
            <Text style={styles.profileMeta}>{transactions.length} transactions on record</Text>
          </View>
          <ChevronRightIcon color={Colors.inkLabel} size={18} />
        </TouchableOpacity>

        {/* Search (filters the rows below) */}
        <View style={styles.searchWrap}>
          <View style={styles.searchIcon}>
            <SearchIcon color={Colors.inkLabel} size={18} />
          </View>
          <TextInput
            style={styles.searchInput}
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
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionHeader}>{section.title}</Text>
            <View style={styles.card}>
              {section.rows.map((row, i) => (
                <Row key={row.key} row={row} isLast={i === section.rows.length - 1} />
              ))}
            </View>
          </View>
        ))}
        {visibleSections.length === 0 && (
          <Text style={styles.emptyText}>Nothing matches "{query.trim()}".</Text>
        )}

        {/* Footer */}
        <Text style={styles.footer}>Version {version}{'\n'}Made with care by Rahat Sayyed.</Text>
      </ScrollView>

      <AddAccountModal
        visible={addAccountVisible}
        onClose={() => setAddAccountVisible(false)}
        onAdded={() => { /* AccountDetail/Dashboard re-read accounts on their own effects */ }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  topBarTitle: { ...Typography.statementMobile, fontSize: 22, lineHeight: 28, color: Colors.onSurface },

  content: { padding: Spacing.containerMargin, paddingBottom: 40 },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.borderSubtle,
    borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.lg,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Typography.statementMobile, fontSize: 20, lineHeight: 26, color: Colors.onPrimaryContainer },
  profileInfo: { flex: 1 },
  profileName: { ...Typography.insightReading, color: Colors.inkHeadline },
  profileMeta: { ...Typography.annotation, color: Colors.inkLabel, marginTop: 2 },

  searchWrap: { position: 'relative', marginBottom: Spacing.lg },
  searchIcon: { position: 'absolute', left: Spacing.md, top: 0, bottom: 0, justifyContent: 'center', zIndex: 1 },
  searchInput: {
    backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.borderSubtle,
    borderRadius: Radius.xl, paddingVertical: 14, paddingLeft: 44, paddingRight: Spacing.md,
    ...Typography.bodyStandard, color: Colors.onSurface,
  },

  section: { marginBottom: Spacing.xl },
  sectionHeader: { ...Typography.sectionHeader, color: Colors.inkLabel, marginBottom: Spacing.md, paddingHorizontal: 2 },
  card: {
    backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.borderSubtle,
    borderRadius: Radius.xl, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing.md,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4 },
  rowLabel: { ...Typography.insightReading, color: Colors.onSurface },

  emptyText: { ...Typography.supportingText, color: Colors.inkBody, textAlign: 'center', paddingVertical: Spacing.xl },

  footer: {
    ...Typography.annotation, color: Colors.inkLabel, opacity: 0.6,
    textAlign: 'center', marginTop: Spacing.md, lineHeight: 18,
  },
});
