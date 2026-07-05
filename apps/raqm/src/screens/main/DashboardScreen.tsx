import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Modal, Pressable, TouchableOpacity } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useAppStore } from '../../store/appStore';
import { useTxStore } from '../../store/txStore';
import { SmsReader } from '../../native/SmsReader';
import { BankParserFactory } from '@rahatsayyed/bank-sms-parser';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import type { TxRecord, GroceryList, Category } from '../../db/database';
import { getSetting, getCategories, getGroceryLists, linkTxToList } from '../../db/database';
import { countsTowardTotals } from '../../services/txIntelligence';
import { postTxNotification } from '../../notifications/notifications';
import { getMonthBounds, getDayBounds } from '../../utils/period';
import type { MainStackParamList } from '../../navigation/types';
import { formatAmount } from '../../utils/format';

const GROCERY_KEYWORDS = /grocer|bigbasket|blinkit|zepto|dmart|instamart/i;
const DAY_MS = 24 * 60 * 60 * 1000;

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

function isCredit(type: TransactionType): boolean {
  return type === TransactionType.INCOME || type === TransactionType.CREDIT;
}

/** "Friday, 24 October" */
function todayLine(): string {
  return new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' });
}

function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/** "IN 3 DAYS" / "OCT 30" style labels for upcoming obligations. */
function upcomingLabel(ts: number): string {
  const days = Math.max(0, Math.round((ts - Date.now()) / DAY_MS));
  if (days === 0) return 'TODAY';
  if (days === 1) return 'TOMORROW';
  if (days <= 7) return `IN ${days} DAYS`;
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }).toUpperCase();
}

interface HomeMetrics {
  net: number;
  monthSpent: number;
  spentToday: number;
  vsAvgPct: number | null; // today vs daily average, +ve = above average
  forecast: number | null; // projected month-end spend
  vsLastMonthPct: number | null; // month-to-date vs same span last month, +ve = higher
  topCategoryName: string | null;
}

const EMPTY_METRICS: HomeMetrics = {
  net: 0, monthSpent: 0, spentToday: 0, vsAvgPct: null, forecast: null, vsLastMonthPct: null, topCategoryName: null,
};

/** Refund-netted expense sum over a window (same math as the rest of the app). */
function spentIn(txs: TxRecord[], from: number, to: number): number {
  let spent = 0;
  for (const tx of txs) {
    if (tx.timestamp < from || tx.timestamp > to) continue;
    if (tx.deletedAt) continue;
    if (!countsTowardTotals(tx)) continue;
    if (isCredit(tx.type) && tx.linkType === 'refund') spent -= tx.amount;
    else if (isDebit(tx.type)) spent += tx.amount;
  }
  return spent;
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
  const [categories, setCategories] = useState<Category[]>([]);
  const groceriesCategoryId = useMemo(
    () => categories.find((c) => c.name === 'Groceries')?.id ?? null,
    [categories],
  );

  useEffect(() => {
    getCategories().then(setCategories);
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

  const [metrics, setMetrics] = useState<HomeMetrics>(EMPTY_METRICS);

  // getMonthBounds internally clamps startDay to [1, 28], so pass raw value.
  const computeMetrics = useCallback(() => {
    let cancelled = false;
    (async () => {
      const startDayStr = await getSetting('month_start_day');
      const startDay = startDayStr ? Number(startDayStr) : 1;
      const now = new Date();
      const { from, to } = getMonthBounds(now, startDay);

      let income = 0;
      const catSpend = new Map<number, number>();
      for (const tx of txs) {
        if (tx.timestamp < from || tx.timestamp > to) continue;
        if (tx.deletedAt) continue;
        if (!countsTowardTotals(tx)) continue;
        if (isCredit(tx.type) && tx.linkType !== 'refund') income += tx.amount;
        if (tx.type === TransactionType.EXPENSE && tx.categoryId != null) {
          catSpend.set(tx.categoryId, (catSpend.get(tx.categoryId) ?? 0) + tx.amount);
        }
      }
      const monthSpent = spentIn(txs, from, to);
      const net = income - monthSpent;

      const day = getDayBounds(now);
      const spentToday = spentIn(txs, day.from, day.to);

      const daysElapsed = Math.max(1, Math.ceil((now.getTime() - from) / DAY_MS));
      const totalDays = Math.max(daysElapsed, Math.round((to - from) / DAY_MS));
      const dailyAvg = monthSpent / daysElapsed;
      const vsAvgPct = dailyAvg > 0 ? Math.round(((spentToday - dailyAvg) / dailyAvg) * 100) : null;
      const forecast = monthSpent > 0 ? (monthSpent / daysElapsed) * totalDays : null;

      // Same span last month: from last period's start, the same number of ms elapsed.
      const lastRef = new Date(from - DAY_MS);
      const last = getMonthBounds(lastRef, startDay);
      const lastSpanSpent = spentIn(txs, last.from, last.from + (now.getTime() - from));
      const vsLastMonthPct =
        lastSpanSpent > 0 ? Math.round(((monthSpent - lastSpanSpent) / lastSpanSpent) * 100) : null;

      let topCategoryName: string | null = null;
      let topAmount = 0;
      for (const [catId, amount] of catSpend) {
        if (amount > topAmount) {
          topAmount = amount;
          topCategoryName = categories.find((c) => c.id === catId)?.name ?? null;
        }
      }

      if (!cancelled) {
        setMetrics({ net, monthSpent, spentToday, vsAvgPct, forecast, vsLastMonthPct, topCategoryName });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [txs, categories]);

  // Recompute when txs change.
  useEffect(() => {
    const cleanup = computeMetrics();
    return cleanup;
  }, [computeMetrics]);

  // Recompute when screen gains focus (e.g., after Settings change).
  useFocusEffect(
    useCallback(() => {
      return computeMetrics(); // chain the cancelled-flag cleanup on blur/unfocus
    }, [computeMetrics]),
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
    () => [...txs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 4),
    [txs],
  );

  // Upcoming obligations: recurring merchants' next expected charge (soonest first).
  const upcoming = useMemo(() => {
    const byMerchant = new Map<string, TxRecord[]>();
    for (const tx of txs) {
      if (!tx.recurring || !tx.merchant || tx.deletedAt) continue;
      const key = tx.merchant.trim().toLowerCase();
      if (!byMerchant.has(key)) byMerchant.set(key, []);
      byMerchant.get(key)!.push(tx);
    }
    const items: { name: string; amount: number; dueTs: number; currency?: string | null }[] = [];
    for (const group of byMerchant.values()) {
      const sorted = [...group].sort((a, b) => a.timestamp - b.timestamp);
      const latest = sorted[sorted.length - 1];
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) gaps.push(sorted[i].timestamp - sorted[i - 1].timestamp);
      gaps.sort((a, b) => a - b);
      const medianGap = gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)] : 30 * DAY_MS;
      const dueTs = latest.timestamp + medianGap;
      if (dueTs > Date.now() - DAY_MS && dueTs < Date.now() + 45 * DAY_MS) {
        items.push({ name: latest.merchant!, amount: latest.amount, dueTs, currency: latest.currency });
      }
    }
    return items.sort((a, b) => a.dueTs - b.dueTs).slice(0, 5);
  }, [txs]);

  const categoryName = useCallback(
    (id: number | null) => (id == null ? null : categories.find((c) => c.id === id)?.name ?? null),
    [categories],
  );

  const currency = txs[0]?.currency ?? '₹';
  const netIsNegative = metrics.net < 0;

  // Advisor line: calm, factual, never shaming (DESIGN.md §11/§12).
  const advisorLine = useMemo(() => {
    if (txs.length === 0) return "We're still learning your financial patterns. Insights will appear as your timeline grows.";
    if (metrics.vsLastMonthPct == null) {
      return `You've spent ${formatAmount(metrics.monthSpent, currency)} so far this month.`;
    }
    if (metrics.vsLastMonthPct <= 0) {
      return `Your spending is ${Math.abs(metrics.vsLastMonthPct)}% lower than this time last month.`;
    }
    const driver = metrics.topCategoryName ? `, led by ${metrics.topCategoryName}` : '';
    return `Spending is ${metrics.vsLastMonthPct}% higher than this time last month${driver}.`;
  }, [txs.length, metrics, currency]);

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
      {/* Top bar: avatar + wordmark, settings on the right */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(userName.trim()[0] ?? 'R').toUpperCase()}</Text>
          </View>
          <Text style={styles.wordmark}>Raqm</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={8}>
          <Text style={styles.topBarAction}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Hero: net this month, over a soft radial glow */}
      <View style={styles.hero}>
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient id="heroGlow" cx="50%" cy="50%" r="60%">
              <Stop offset="0%" stopColor={Colors.primary} stopOpacity={0.08} />
              <Stop offset="100%" stopColor={Colors.primary} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroGlow)" />
        </Svg>
        <Text style={styles.heroLabel}>NET THIS MONTH</Text>
        <Text style={[styles.heroMetric, netIsNegative && { color: Colors.errorMuted }]}>
          {netIsNegative ? '−' : ''}{formatAmount(metrics.net, currency)}
        </Text>
        <Text style={styles.heroDate}>{todayLine()}</Text>
      </View>

      {/* Personal advisor */}
      <View style={styles.advisorCard}>
        <Text style={styles.advisorHeader}>PERSONAL ADVISOR</Text>
        <Text style={styles.advisorText}>{advisorLine}</Text>
        {txs.length > 0 && (
          <Text style={styles.advisorMeta}>Based on {txs.length} transactions</Text>
        )}
      </View>

      {/* Stat squares */}
      <View style={styles.statRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>SPENT TODAY</Text>
          <View>
            <Text style={styles.statValue}>{formatAmount(metrics.spentToday, currency)}</Text>
            {metrics.vsAvgPct != null && (
              <Text style={[styles.statMeta, { color: metrics.vsAvgPct > 0 ? Colors.errorMuted : Colors.primary }]}>
                {metrics.vsAvgPct > 0 ? '↑' : '↓'} {Math.abs(metrics.vsAvgPct)}% vs avg
              </Text>
            )}
          </View>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>FORECAST</Text>
          <View>
            <Text style={styles.statValue}>
              {metrics.forecast != null ? formatAmount(metrics.forecast, currency) : '—'}
            </Text>
            <Text style={[styles.statMeta, { color: Colors.primary }]}>End of month</Text>
          </View>
        </View>
      </View>

      {/* Recent activity */}
      <View style={styles.section}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeader}>RECENT ACTIVITY</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions' as never)} hitSlop={8}>
            <Text style={styles.viewAll}>VIEW ALL</Text>
          </TouchableOpacity>
        </View>
        {recent.length === 0 ? (
          <Text style={styles.emptyText}>We're still learning your financial patterns.</Text>
        ) : (
          recent.map((tx) => {
            const debit = isDebit(tx.type);
            const cat = categoryName(tx.categoryId);
            return (
              <TouchableOpacity
                key={tx.id}
                style={styles.activityRow}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('TransactionDetail', { transactionId: tx.id })}
              >
                <View style={styles.activityIcon}>
                  <Text style={styles.activityIconGlyph}>{debit ? '↓' : '↑'}</Text>
                </View>
                <View style={styles.activityInfo}>
                  <Text style={styles.activityName} numberOfLines={1}>{tx.merchant || tx.bankName}</Text>
                  <Text style={styles.activityMeta}>
                    {cat ? `${cat} • ` : ''}{shortDate(tx.timestamp)}
                  </Text>
                </View>
                <Text style={[styles.activityAmount, !debit && { color: Colors.primary }]}>
                  {debit ? '−' : '+'}{formatAmount(tx.amount, tx.currency)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Upcoming obligations — omitted entirely when there's nothing to say */}
      {upcoming.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>UPCOMING OBLIGATIONS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.upcomingRow}>
            {upcoming.map((u, i) => {
              const soon = u.dueTs - Date.now() <= 3 * DAY_MS;
              return (
                <View key={`${i}-${u.name}`} style={styles.upcomingCard}>
                  <Text style={[styles.upcomingWhen, soon && { color: Colors.secondary }]}>{upcomingLabel(u.dueTs)}</Text>
                  <Text style={styles.upcomingName} numberOfLines={1}>{u.name}</Text>
                  <Text style={styles.upcomingAmount}>{formatAmount(u.amount, u.currency)}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Accounts — quiet strip, entry point to AccountDetail */}
      {accounts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionHeader}>ACCOUNTS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountsRow}>
            {accounts.map((acc, i) => (
              <TouchableOpacity
                key={i}
                style={styles.accountChip}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('AccountDetail', { bankName: acc.bank, last4: acc.last4 ?? undefined })}
              >
                <Text style={styles.accountBank} numberOfLines={1}>{acc.bank}</Text>
                <Text style={styles.accountMeta}>{acc.last4 ? `•••• ${acc.last4}` : 'Account'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.footerQuote}>"Wealth is the ability to fully experience life."</Text>
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { paddingBottom: 40 },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  avatar: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: Colors.bgSurfaceRaised, borderWidth: 1, borderColor: Colors.borderSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Typography.bodyStandard, color: Colors.inkHeadline },
  wordmark: { ...Typography.statementMobile, fontSize: 22, lineHeight: 28, color: Colors.onSurface },
  topBarAction: { fontSize: 20, color: Colors.inkLabel },

  hero: { alignItems: 'center', paddingVertical: Spacing.xxl, marginBottom: Spacing.lg },
  heroLabel: { ...Typography.labelCaps, color: Colors.inkLabel, marginBottom: Spacing.sm },
  heroMetric: { ...Typography.metricHero, color: Colors.inkHeadline },
  heroDate: { ...Typography.bodyStandard, color: Colors.inkBody, marginTop: Spacing.sm },

  advisorCard: {
    marginHorizontal: Spacing.containerMargin, marginBottom: Spacing.md,
    backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.borderSubtle,
    borderRadius: Radius.lg, padding: Spacing.lg,
  },
  advisorHeader: { ...Typography.sectionHeader, color: Colors.primary, marginBottom: Spacing.md },
  advisorText: { ...Typography.insightReading, color: Colors.onSurface },
  advisorMeta: { ...Typography.annotation, color: Colors.inkLabel, marginTop: Spacing.md, opacity: 0.8 },

  statRow: {
    flexDirection: 'row', gap: Spacing.gutter,
    marginHorizontal: Spacing.containerMargin, marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1, aspectRatio: 1.15,
    backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.borderSubtle,
    borderRadius: Radius.lg, padding: Spacing.gutter, justifyContent: 'space-between',
  },
  statLabel: { ...Typography.labelCaps, color: Colors.inkLabel },
  statValue: { ...Typography.statementLg, color: Colors.onSurface },
  statMeta: { ...Typography.annotation, marginTop: 4 },

  section: { marginHorizontal: Spacing.containerMargin, marginBottom: Spacing.xl },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionHeader: { ...Typography.sectionHeader, color: Colors.onSurface, marginBottom: Spacing.md },
  viewAll: { ...Typography.labelCaps, color: Colors.primary },

  activityRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  activityIcon: {
    width: 40, height: 40, borderRadius: Radius.lg,
    backgroundColor: Colors.bgSurfaceRaised, borderWidth: 1, borderColor: Colors.borderSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  activityIconGlyph: { fontSize: 15, color: Colors.inkLabel },
  activityInfo: { flex: 1 },
  activityName: { ...Typography.bodyStandard, color: Colors.onSurface },
  activityMeta: { ...Typography.annotation, color: Colors.inkLabel, marginTop: 2 },
  activityAmount: { ...Typography.bodyStandard, color: Colors.onSurface },

  upcomingRow: { gap: Spacing.gutter, paddingRight: Spacing.containerMargin },
  upcomingCard: {
    minWidth: 180,
    backgroundColor: Colors.bgSurfaceRaised, borderWidth: 1, borderColor: Colors.borderSubtle,
    borderRadius: Radius.lg, padding: Spacing.gutter,
  },
  upcomingWhen: { ...Typography.labelCaps, color: Colors.inkLabel, marginBottom: Spacing.md },
  upcomingName: { ...Typography.bodyStandard, color: Colors.onSurface, marginBottom: 4 },
  upcomingAmount: { ...Typography.statementLg, color: Colors.onSurface },

  accountsRow: { gap: Spacing.sm, paddingRight: Spacing.containerMargin },
  accountChip: {
    backgroundColor: Colors.bgSurface, borderWidth: 1, borderColor: Colors.borderSubtle,
    borderRadius: Radius.lg, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.md, minWidth: 130,
  },
  accountBank: { ...Typography.supportingText, color: Colors.onSurface },
  accountMeta: { ...Typography.annotation, color: Colors.inkLabel, marginTop: 2 },

  emptyText: { ...Typography.supportingText, color: Colors.inkBody },
  footerQuote: {
    ...Typography.supportingText, color: Colors.inkLabel, fontStyle: 'italic',
    textAlign: 'center', marginTop: Spacing.lg, paddingHorizontal: Spacing.xl,
  },

  toast: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
    margin: Spacing.md, borderRadius: Radius.xl,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.md, paddingVertical: 12,
  },
  toastText: { ...Typography.bodyMd, color: Colors.onPrimaryContainer, fontFamily: 'WorkSans_500Medium' },
  toastLinkBtn: { marginTop: 8, alignSelf: 'flex-start' },
  toastLinkText: { ...Typography.labelSm, color: Colors.onPrimary, textDecorationLine: 'underline' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: Spacing.lg },
  modalCard: {
    backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.lg,
  },
  modalTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.md, fontSize: 16 },
  modalRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  modalRowText: { ...Typography.bodyStandard, color: Colors.onSurface },
  modalEmpty: { ...Typography.bodySm, color: Colors.onSurfaceVariant, paddingVertical: Spacing.sm },
});
