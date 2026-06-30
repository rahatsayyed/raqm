import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';

type Account = { id: string; bank: string; last4: string; type: string; icon: string; txCount: number };

const DETECTED_ACCOUNTS: Account[] = [
  { id: '1', bank: 'HDFC Bank', last4: '4821', type: 'Savings Account', icon: '🏦', txCount: 54 },
  { id: '2', bank: 'ICICI Bank', last4: '9034', type: 'Credit Card', icon: '💳', txCount: 43 },
  { id: '3', bank: 'Axis Bank', last4: '1276', type: 'Savings Account', icon: '🏦', txCount: 31 },
];

export function AccountSelectionScreen({ navigation }: OnboardingScreenProps<'AccountSelection'>) {
  const [selected, setSelected] = useState<Set<string>>(new Set(DETECTED_ACCOUNTS.map(a => a.id)));

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const total = DETECTED_ACCOUNTS.filter(a => selected.has(a.id)).reduce((s, a) => s + a.txCount, 0);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>

        <Text style={styles.headline}>Your accounts</Text>
        <Text style={styles.subtitle}>
          We detected {DETECTED_ACCOUNTS.length} accounts from your messages. Select the ones to include.
        </Text>

        <View style={styles.accountList}>
          {DETECTED_ACCOUNTS.map(account => {
            const isSelected = selected.has(account.id);
            return (
              <TouchableOpacity
                key={account.id}
                style={[styles.accountCard, isSelected && styles.accountCardSelected]}
                onPress={() => toggle(account.id)}
                activeOpacity={0.8}
              >
                <View style={[styles.accountIconBox, isSelected && styles.accountIconBoxSelected]}>
                  <Text style={styles.accountIcon}>{account.icon}</Text>
                </View>
                <View style={styles.accountInfo}>
                  <Text style={styles.accountName}>{account.bank}</Text>
                  <Text style={styles.accountMeta}>
                    {account.type} •••• {account.last4} · {account.txCount} txns
                  </Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryText}>
            <Text style={styles.summaryAccent}>{total}</Text> transactions across{' '}
            <Text style={styles.summaryAccent}>{selected.size}</Text> accounts selected
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={`Continue with ${selected.size} account${selected.size !== 1 ? 's' : ''}`}
          onPress={() => navigation.navigate('ScanComplete')}
          disabled={selected.size === 0}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.containerMargin, paddingTop: 48, paddingBottom: Spacing.xl },
  progressBar: {
    height: 4, backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full, marginBottom: Spacing.xxl,
  },
  progressFill: { width: '80%', height: '100%', backgroundColor: Colors.primary, borderRadius: Radius.full },
  headline: { ...Typography.displayLg, color: Colors.onSurface, marginBottom: Spacing.sm },
  subtitle: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, marginBottom: Spacing.xl, lineHeight: 24 },
  accountList: { gap: Spacing.sm, marginBottom: Spacing.xl },
  accountCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    backgroundColor: Colors.surfaceContainerLowest,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    borderRadius: Radius.xl, padding: Spacing.md,
  },
  accountCardSelected: {
    borderColor: Colors.primary, backgroundColor: '#f1f8f4',
  },
  accountIconBox: {
    width: 48, height: 48, borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceVariant,
    alignItems: 'center', justifyContent: 'center',
  },
  accountIconBoxSelected: { backgroundColor: `${Colors.primary}15` },
  accountIcon: { fontSize: 22 },
  accountInfo: { flex: 1 },
  accountName: { ...Typography.titleLg, color: Colors.onSurface, fontSize: 16 },
  accountMeta: { ...Typography.bodySm, color: Colors.onSurfaceVariant, marginTop: 2 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6,
    borderWidth: 2, borderColor: Colors.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkmark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  summaryCard: {
    backgroundColor: Colors.primaryContainer,
    borderRadius: Radius.xl, padding: Spacing.md,
    alignItems: 'center',
  },
  summaryText: { ...Typography.bodyMd, color: Colors.onPrimaryContainer, textAlign: 'center' },
  summaryAccent: { fontFamily: 'WorkSans_700Bold', color: Colors.primary },
  footer: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 32, paddingTop: Spacing.md },
});
