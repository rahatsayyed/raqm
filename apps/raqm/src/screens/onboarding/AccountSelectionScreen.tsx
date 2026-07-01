import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { OnboardingScreenProps } from '../../navigation/types';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { PrimaryButton } from '../../components/PrimaryButton';
import { useOnboardingStore } from '../../store/onboardingStore';

type Account = { id: string; bank: string; last4: string | null; type: string; icon: string; txCount: number };

export function AccountSelectionScreen({ navigation }: OnboardingScreenProps<'AccountSelection'>) {
  const { transactions } = useOnboardingStore();

  const accounts = useMemo<Account[]>(() => {
    const map = new Map<string, Account>();
    for (const tx of transactions) {
      const key = `${tx.bankName}|${tx.accountLast4 ?? 'unknown'}`;
      if (map.has(key)) {
        map.get(key)!.txCount += 1;
      } else {
        map.set(key, {
          id: key,
          bank: tx.bankName,
          last4: tx.accountLast4,
          type: tx.isFromCard ? 'Credit Card' : 'Bank Account',
          icon: tx.isFromCard ? '💳' : '🏦',
          txCount: 1,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.txCount - a.txCount);
  }, [transactions]);

  const [selected, setSelected] = useState<Set<string>>(() => new Set(accounts.map(a => a.id)));

  const toggle = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const totalTx = accounts.filter(a => selected.has(a.id)).reduce((s, a) => s + a.txCount, 0);

  if (accounts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>🔍</Text>
        <Text style={styles.emptyHeadline}>No accounts detected</Text>
        <Text style={styles.emptyBody}>
          We couldn't find any bank transactions in your SMS. Make sure Read SMS permission was granted and try scanning again.
        </Text>
        <PrimaryButton
          label="Go back"
          onPress={() => navigation.goBack()}
          style={styles.emptyBtn}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>

        <Text style={styles.headline}>Your accounts</Text>
        <Text style={styles.subtitle}>
          We detected {accounts.length} account{accounts.length !== 1 ? 's' : ''} from your messages. Select the ones to include.
        </Text>

        <View style={styles.accountList}>
          {accounts.map(account => {
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
                    {account.type}
                    {account.last4 ? ` •••• ${account.last4}` : ''} · {account.txCount} txns
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
            <Text style={styles.summaryAccent}>{totalTx}</Text> transactions across{' '}
            <Text style={styles.summaryAccent}>{selected.size}</Text> account{selected.size !== 1 ? 's' : ''} selected
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton
          label={`Continue with ${selected.size} account${selected.size !== 1 ? 's' : ''}`}
          onPress={() => navigation.replace('ScanComplete')}
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
  accountCardSelected: { borderColor: Colors.primary, backgroundColor: '#f1f8f4' },
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
  emptyContainer: {
    flex: 1, backgroundColor: Colors.background,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: Spacing.containerMargin, gap: Spacing.md,
  },
  emptyIcon: { fontSize: 56 },
  emptyHeadline: { ...Typography.headlineMd, color: Colors.onSurface, textAlign: 'center' },
  emptyBody: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 24 },
  emptyBtn: { marginTop: Spacing.lg, width: '100%' },
});
