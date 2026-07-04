import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Modal, Pressable, TouchableOpacity } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useAppStore } from '../../store/appStore';
import { useTxStore } from '../../store/txStore';
import { SmsReader } from '../../native/SmsReader';
import { BankParserFactory } from '@rahatsayyed/bank-sms-parser';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import type { TxRecord, GroceryList } from '../../db/database';
import { getSetting, getCategories, getGroceryLists, linkTxToList } from '../../db/database';
import { countsTowardTotals } from '../../services/txIntelligence';
import { postTxNotification } from '../../notifications/notifications';
import { getMonthBounds } from '../../utils/period';
import type { MainStackParamList } from '../../navigation/types';

const GROCERY_KEYWORDS = /grocer|bigbasket|blinkit|zepto|dmart|instamart/i;

function greeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatAmount(n: number, currency = '₹'): string {
  return `${currency}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function txIcon(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME:
    case TransactionType.CREDIT: return '⬆';
    case TransactionType.EXPENSE: return '⬇';
    case TransactionType.TRANSFER: return '↔';
    case TransactionType.INVESTMENT: return '📈';
    default: return '·';
  }
}

function txColor(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME:
    case TransactionType.CREDIT: return Colors.primary;
    case TransactionType.EXPENSE: return Colors.error;
    case TransactionType.TRANSFER: return Colors.onSurfaceVariant;
    default: return Colors.onSurfaceVariant;
  }
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

export function DashboardScreen() {
  const { userName } = useAppStore();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const txs = useTxStore((s) => s.txs);
  const [newTxLabel, setNewTxLabel] = React.useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [linkPromptTxId, setLinkPromptTxId] = useState<number | null>(null);
  const [showListPicker, setShowListPicker] = useState(false);
  // Snapshot of the tx id for the open picker — the toast's auto-dismiss timer clears
  // linkPromptTxId independently, which would otherwise null it under an open modal.
  const [pickerTxId, setPickerTxId] = useState<number | null>(null);
  const [activeGroceryLists, setActiveGroceryLists] = useState<GroceryList[]>([]);
  const [groceriesCategoryId, setGroceriesCategoryId] = useState<number | null>(null);

  useEffect(() => {
    getCategories().then((cats) => {
      setGroceriesCategoryId(cats.find((c) => c.name === 'Groceries')?.id ?? null);
    });
  }, []);

  useEffect(() => {
    const sub = SmsReader.addNewSmsListener(async ({ body, sender, timestamp }) => {
      try {
        const tx = BankParserFactory.parse(body, sender, timestamp);
        if (!tx) return;

        const id = await useTxStore.getState().addParsedWithLocation(tx);
        if (id === null) {
          // duplicate SMS suppressed per T13 - show user feedback
          setNewTxLabel('Duplicate SMS ignored');
          Animated.sequence([
            Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.delay(2000),
            Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
          ]).start(() => setNewTxLabel(null));
          return;
        }

        const sign = tx.type === TransactionType.EXPENSE ? '-' : '+';
        const label = tx.merchant
          ? `${sign}₹${tx.amount.toLocaleString('en-IN')} · ${tx.merchant}`
          : `New transaction from ${tx.bankName}`;
        setNewTxLabel(label);

        const newTx = useTxStore.getState().txs.find((t) => t.id === id) ?? null;
        const isGrocery =
          (newTx?.categoryId !== null && newTx?.categoryId === groceriesCategoryId) ||
          (tx.merchant ? GROCERY_KEYWORDS.test(tx.merchant) : false);

        if (isGrocery) {
          setLinkPromptTxId(id);
          const lists = await getGroceryLists();
          setActiveGroceryLists(lists.filter((l) => l.completedAt === null));
        } else {
          setLinkPromptTxId(null);
        }

        const dismissDelay = isGrocery ? 6000 : 3000;
        Animated.sequence([
          Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(dismissDelay),
          Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => {
          setNewTxLabel(null);
          setLinkPromptTxId(null);
        });

        const notifBody = tx.merchant
          ? `${sign}₹${tx.amount.toLocaleString('en-IN')} · ${tx.merchant}`
          : `${sign}₹${tx.amount.toLocaleString('en-IN')} · ${tx.bankName}`;
        await postTxNotification(id, 'New transaction', notifBody);
      } catch (error) {
        console.warn('SMS listener error:', error);
      }
    });
    return () => sub.remove();
  }, [groceriesCategoryId]);

  const [stats, setStats] = useState({ income: 0, expenses: 0, net: 0 });

  // Extract stats computation into useCallback for reuse in both effect and focus hook.
  // getMonthBounds internally clamps startDay to [1, 28], so pass raw value.
  const computeStats = useCallback(() => {
    let cancelled = false;
    (async () => {
      const startDayStr = await getSetting('month_start_day');
      const startDay = startDayStr ? Number(startDayStr) : 1;
      const { from, to } = getMonthBounds(new Date(), startDay);
      let income = 0;
      let expenses = 0;
      for (const tx of txs) {
        if (tx.timestamp < from || tx.timestamp > to) continue;
        if (tx.deletedAt) continue;
        if (!countsTowardTotals(tx)) continue;
        const isCredit = tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT;
        if (isCredit && tx.linkType === 'refund') {
          expenses -= tx.amount; // refund nets against expense, not counted as income
        } else if (isCredit) {
          income += tx.amount;
        } else if (tx.type === TransactionType.EXPENSE || tx.type === TransactionType.TRANSFER || tx.type === TransactionType.INVESTMENT) {
          expenses += tx.amount;
        }
      }
      if (!cancelled) setStats({ income, expenses, net: income - expenses });
    })();
    return () => {
      cancelled = true;
    };
  }, [txs]);

  // Recompute stats when txs change.
  useEffect(() => {
    const cleanup = computeStats();
    return cleanup;
  }, [computeStats]);

  // Recompute stats when screen gains focus (e.g., after Settings change).
  useFocusEffect(
    useCallback(() => {
      return computeStats(); // chain the cancelled-flag cleanup on blur/unfocus
    }, [computeStats]),
  );

  const accounts = useMemo(() => {
    const map = new Map<string, { bank: string; last4: string | null; isCard: boolean; count: number }>();
    for (const tx of txs) {
      const key = `${tx.bankName}|${tx.accountLast4 ?? ''}`;
      if (map.has(key)) {
        map.get(key)!.count += 1;
      } else {
        map.set(key, { bank: tx.bankName, last4: tx.accountLast4, isCard: !!tx.isFromCard, count: 1 });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [txs]);

  const recent = useMemo(
    () => [...txs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 15),
    [txs],
  );

  const currency = txs[0]?.currency ?? '₹';
  const firstName = userName.trim().split(' ')[0];
  const netIsPositive = stats.net >= 0;

  return (
    <View style={{ flex: 1 }}>
    {newTxLabel && (
      <Animated.View style={[styles.toast, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
        <Text style={styles.toastText}>⚡ {newTxLabel}</Text>
        {linkPromptTxId !== null && (
          <TouchableOpacity
            onPress={() => {
              setPickerTxId(linkPromptTxId);
              setShowListPicker(true);
            }}
            style={styles.toastLinkBtn}
          >
            <Text style={styles.toastLinkText}>Link to list?</Text>
          </TouchableOpacity>
        )}
      </Animated.View>
    )}

    <Modal
      visible={showListPicker}
      transparent
      animationType="fade"
      onRequestClose={() => {
        setShowListPicker(false);
        setPickerTxId(null);
      }}
    >
      <Pressable
        style={styles.modalBackdrop}
        onPress={() => {
          setShowListPicker(false);
          setPickerTxId(null);
        }}
      >
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Link to which list?</Text>
          {activeGroceryLists.map((l) => (
            <TouchableOpacity
              key={l.id}
              style={styles.modalRow}
              onPress={async () => {
                if (pickerTxId !== null) await linkTxToList(l.id, pickerTxId);
                setShowListPicker(false);
                setPickerTxId(null);
                setLinkPromptTxId(null);
              }}
            >
              <Text style={styles.modalRowText}>{l.name}</Text>
            </TouchableOpacity>
          ))}
          {activeGroceryLists.length === 0 && <Text style={styles.modalEmpty}>No active lists</Text>}
        </View>
      </Pressable>
    </Modal>
    <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greetingLabel}>{greeting()}</Text>
          <Text style={styles.greetingName}>{firstName || 'there'} 👋</Text>
        </View>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{(firstName?.[0] ?? 'R').toUpperCase()}</Text>
        </View>
      </View>

      {/* Net flow hero card */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>Net cash flow (this month)</Text>
        <Text style={[styles.heroAmount, { color: netIsPositive ? Colors.onPrimary : Colors.onError }]}>
          {netIsPositive ? '+' : '-'}{formatAmount(stats.net, currency)}
        </Text>
        <View style={styles.heroRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>⬆ Income</Text>
            <Text style={styles.heroStatValue}>{formatAmount(stats.income, currency)}</Text>
          </View>
          <View style={styles.heroSeparator} />
          <View style={styles.heroStat}>
            <Text style={styles.heroStatLabel}>⬇ Expenses</Text>
            <Text style={styles.heroStatValue}>{formatAmount(stats.expenses, currency)}</Text>
          </View>
        </View>
        <Text style={styles.heroMeta}>{txs.length} transactions across {accounts.length} account{accounts.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Accounts */}
      {accounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Accounts</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
            {accounts.map((acc, i) => (
              <TouchableOpacity
                key={i}
                style={styles.accountChip}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('AccountDetail', { bankName: acc.bank, last4: acc.last4 ?? undefined })}
              >
                <Text style={styles.accountChipIcon}>{acc.isCard ? '💳' : '🏦'}</Text>
                <View>
                  <Text style={styles.accountChipBank}>{acc.bank}</Text>
                  <Text style={styles.accountChipMeta}>
                    {acc.last4 ? `•••• ${acc.last4}` : 'Account'} · {acc.count} txns
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Recent transactions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent transactions</Text>
        <View style={styles.txList}>
          {recent.length === 0 ? (
            <View style={styles.emptyTx}>
              <Text style={styles.emptyTxText}>No transactions found</Text>
            </View>
          ) : (
            recent.map((tx, i) => (
              <TxRow key={tx.id} tx={tx} currency={currency} isLast={i === recent.length - 1} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
    </View>
  );
}

function TxRow({ tx, currency, isLast }: { tx: TxRecord; currency: string; isLast: boolean }) {
  const debit = isDebit(tx.type);
  const color = txColor(tx.type);
  const sign = debit ? '-' : '+';

  return (
    <View style={[styles.txRow, !isLast && styles.txRowBorder]}>
      <View style={[styles.txIconBox, { backgroundColor: `${color}18` }]}>
        <Text style={[styles.txIcon, { color }]}>{txIcon(tx.type)}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txMerchant} numberOfLines={1}>
          {tx.merchant || tx.bankName}
        </Text>
        <Text style={styles.txMeta}>
          {tx.bankName}{tx.accountLast4 ? ` ···${tx.accountLast4}` : ''} · {formatDate(tx.timestamp)}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color }]}>
        {sign}{formatAmount(tx.amount, currency)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 32 },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
  },
  greetingLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  greetingName: { ...Typography.headlineSm, color: Colors.onSurface, marginTop: 2 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Typography.titleLg, color: Colors.onPrimaryContainer, fontSize: 18 },

  heroCard: {
    marginHorizontal: Spacing.containerMargin,
    borderRadius: Radius.xxl,
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    gap: Spacing.sm,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3, shadowRadius: 20, elevation: 8,
  },
  heroLabel: { ...Typography.labelSm, color: Colors.onPrimary, letterSpacing: 0.8 },
  heroAmount: { ...Typography.numericXl, color: Colors.onPrimary },
  heroRow: { flexDirection: 'row', marginTop: Spacing.sm },
  heroStat: { flex: 1, gap: 4 },
  heroSeparator: { width: 1, backgroundColor: 'rgba(0,56,35,0.2)', marginHorizontal: Spacing.md },
  heroStatLabel: { ...Typography.labelSm, color: Colors.onPrimary },
  heroStatValue: { ...Typography.numericMd, color: Colors.onPrimary, fontSize: 18 },
  heroMeta: { ...Typography.labelSm, color: Colors.onPrimary, marginTop: 4 },

  section: { marginTop: Spacing.xl, paddingHorizontal: Spacing.containerMargin },
  sectionTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.md, fontSize: 16 },

  accountsRow: { gap: Spacing.sm, paddingRight: Spacing.containerMargin },
  accountChip: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    minWidth: 160,
  },
  accountChipIcon: { fontSize: 22 },
  accountChipBank: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
  accountChipMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },

  txList: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  txIconBox: {
    width: 40, height: 40, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  txIcon: { fontSize: 16, fontWeight: '700' },
  txInfo: { flex: 1 },
  txMerchant: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
  txMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
  txAmount: { ...Typography.numericSm, fontSize: 15 },

  emptyTx: { padding: Spacing.xl, alignItems: 'center' },
  emptyTxText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },

  toast: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    margin: Spacing.md, borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 12, elevation: 8,
  },
  toastText: { ...Typography.bodyMd, color: Colors.onPrimaryContainer, fontFamily: 'WorkSans_500Medium' },
  toastLinkBtn: { marginTop: Spacing.sm, alignSelf: 'flex-start' },
  toastLinkText: { ...Typography.labelLg, color: Colors.onPrimaryContainer, textDecorationLine: 'underline' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.xl },
  modalCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant, padding: Spacing.lg, gap: Spacing.sm,
  },
  modalTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.sm },
  modalRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  modalRowText: { ...Typography.bodyMd, color: Colors.onSurface },
  modalEmpty: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 12 },
});
