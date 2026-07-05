import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
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

interface RowProps {
  icon: string;
  label: string;
  onPress?: () => void;
  destructive?: boolean;
}

function Row({ icon, label, onPress, destructive }: RowProps) {
  return (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.rowIcon, destructive && styles.rowIconDestructive]}>
        <Text style={styles.rowIconText}>{icon}</Text>
      </View>
      <Text style={[styles.rowLabel, destructive && styles.rowLabelDestructive]}>{label}</Text>
      <Text style={styles.rowChevron}>›</Text>
    </TouchableOpacity>
  );
}

export function MoreScreen() {
  const { userName } = useAppStore();
  const transactions = useTxStore((s) => s.txs);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const firstName = userName.trim().split(' ')[0] || 'User';

  const [rescanStatus, setRescanStatus] = useState<'idle' | 'scanning' | 'done'>('idle');
  const [rescanCount, setRescanCount] = useState(0);
  const [addAccountVisible, setAddAccountVisible] = useState(false);

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

  const handleLocationPermissions = () => {
    Linking.openSettings();
  };

  const rescanLabel =
    rescanStatus === 'scanning' ? `Re-scanning… ${rescanCount} found` : 'Re-scan SMS';

  return (
    <View style={styles.root}>
      <Text style={styles.pageTitle}>More</Text>

      {/* Profile card */}
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{firstName[0].toUpperCase()}</Text>
        </View>
        <View>
          <Text style={styles.profileName}>{userName || 'User'}</Text>
          <Text style={styles.profileMeta}>{transactions.length} transactions scanned</Text>
        </View>
      </View>

      {/* Data section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>DATA</Text>
        <View style={styles.card}>
          <Row
            icon="🔄"
            label={rescanLabel}
            onPress={rescanStatus === 'scanning' ? undefined : handleRescan}
          />
          <View style={styles.sep} />
          <Row icon="📤" label="Export transactions" onPress={handleExport} />
          <View style={styles.sep} />
          <Row icon="🏦" label="Add account" onPress={() => setAddAccountVisible(true)} />
          <View style={styles.sep} />
          <Row icon="🛒" label="Grocery lists" onPress={() => navigation.navigate('Grocery')} />
          <View style={styles.sep} />
          <Row icon="🗑️" label="Deleted transactions" onPress={() => navigation.navigate('DeletedTransactions')} />
        </View>
      </View>

      {/* App section */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>APP</Text>
        <View style={styles.card}>
          <Row icon="⚙️" label="Settings" onPress={() => navigation.navigate('Settings')} />
          <View style={styles.sep} />
          <Row icon="📍" label="Location permissions" onPress={handleLocationPermissions} />
          <View style={styles.sep} />
          <Row icon="ℹ️" label="About Raqm" onPress={handleAbout} />
        </View>
      </View>

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
  pageTitle: {
    ...Typography.headlineSm, color: Colors.onSurface,
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    marginHorizontal: Spacing.containerMargin,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    marginBottom: Spacing.xl,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Typography.headlineSm, color: Colors.onPrimaryContainer, fontSize: 22 },
  profileName: { ...Typography.titleLg, color: Colors.onSurface },
  profileMeta: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },

  section: { marginHorizontal: Spacing.containerMargin, marginBottom: Spacing.lg },
  sectionLabel: {
    ...Typography.labelSm, color: Colors.onSurfaceVariant,
    marginBottom: Spacing.sm, marginLeft: 4,
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  rowIconDestructive: { backgroundColor: `${Colors.error}15` },
  rowIconText: { fontSize: 18 },
  rowLabel: { ...Typography.bodyMd, color: Colors.onSurface, flex: 1 },
  rowLabelDestructive: { color: Colors.error },
  rowChevron: { fontSize: 20, color: Colors.outline, lineHeight: 24 },
  sep: { height: 1, backgroundColor: Colors.outlineVariant, marginLeft: 56 },
});
