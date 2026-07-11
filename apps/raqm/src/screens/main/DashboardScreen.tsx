import React, { useEffect, useRef, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Animated, Modal, Pressable, TouchableOpacity } from 'react-native';
import Svg, { Defs, RadialGradient, Stop, Rect } from 'react-native-svg';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Spacing, Radius } from '../../theme';
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

// Animated.View isn't wrapped by NativeWind's interop — the toast keeps a
// style object so the animated opacity/translate compose with its layout.
const toastStyle = {
  position: 'absolute' as const,
  top: 0, left: 0, right: 0, zIndex: 100,
  margin: Spacing.md, borderRadius: Radius.xl,
  backgroundColor: Colors.primary,
  paddingHorizontal: Spacing.md, paddingVertical: 12,
};

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
    <View className="flex-1">
    {newTxLabel && (
      <Animated.View style={[toastStyle, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] }]}>
        <Text className="font-inter-medium text-[16px] leading-[24px] text-on-primary-container">⚡ {newTxLabel}</Text>
        {linkPromptTxId !== null && (
          <TouchableOpacity
            onPress={() => {
              setPickerTxId(linkPromptTxId);
              setShowListPicker(true);
            }}
            className="mt-[8px] self-start"
          >
            <Text className="font-mono text-[12px] leading-[16px] tracking-[0.6px] text-on-primary underline">Link to list?</Text>
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
        className="flex-1 bg-black/60 justify-center p-[24px]"
        onPress={() => {
          setShowListPicker(false);
          setPickerTxId(null);
        }}
      >
        <View className="bg-bg-surface-raised rounded-[16px] border border-border-subtle p-[24px]">
          <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-[16px]">Link to which list?</Text>
          {activeGroceryLists.map((l) => (
            <TouchableOpacity
              key={l.id}
              className="py-[12px] border-b border-border-subtle"
              onPress={async () => {
                if (pickerTxId !== null) await linkTxToList(l.id, pickerTxId);
                setShowListPicker(false);
                setPickerTxId(null);
                setLinkPromptTxId(null);
              }}
            >
              <Text className="font-inter text-body-standard text-on-surface">{l.name}</Text>
            </TouchableOpacity>
          ))}
          {activeGroceryLists.length === 0 && (
            <Text className="font-inter text-[14px] leading-[20px] text-on-surface-variant py-[8px]">No active lists</Text>
          )}
        </View>
      </Pressable>
    </Modal>

    <ScrollView className="flex-1 bg-background" contentContainerClassName="pb-[40px]" showsVerticalScrollIndicator={false}>
      {/* Top bar: avatar + wordmark, settings on the right */}
      <View className="flex-row justify-between items-center px-[24px] pt-[8px] pb-[8px]">
        <View className="flex-row items-center gap-[8px]">
          <View className="w-[36px] h-[36px] rounded-[18px] bg-bg-surface-raised border border-border-subtle items-center justify-center">
            <Text className="font-inter text-body-standard text-ink-headline">{(userName.trim()[0] ?? 'R').toUpperCase()}</Text>
          </View>
          <Text className="font-fraunces text-[22px] leading-[28px] text-on-surface">Raqm</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')} hitSlop={8}>
          <Text className="text-[20px] text-ink-label">⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Hero: net this month, over a soft radial glow */}
      <View className="items-center py-[40px] mb-[24px]">
        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
          <Defs>
            <RadialGradient id="heroGlow" cx="50%" cy="50%" r="60%">
              <Stop offset="0%" stopColor={Colors.primary} stopOpacity={0.08} />
              <Stop offset="100%" stopColor={Colors.primary} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#heroGlow)" />
        </Svg>
        <Text className="font-inter-semibold text-label-caps text-ink-label mb-[8px]">NET THIS MONTH</Text>
        <Text className={`font-mono-medium text-metric-hero ${netIsNegative ? 'text-error-muted' : 'text-ink-headline'}`}>
          {netIsNegative ? '−' : ''}{formatAmount(metrics.net, currency)}
        </Text>
        <Text className="font-inter text-body-standard text-ink-body mt-[8px]">{todayLine()}</Text>
      </View>

      {/* Personal advisor */}
      <View className="mx-[24px] mb-[16px] bg-bg-surface border border-border-subtle rounded-[12px] p-[24px]">
        <Text className="font-inter-semibold text-section-header text-primary mb-[16px]">PERSONAL ADVISOR</Text>
        <Text className="font-inter-medium text-insight-reading text-on-surface">{advisorLine}</Text>
        {txs.length > 0 && (
          <Text className="font-inter text-annotation text-ink-label mt-[16px] opacity-80">Based on {txs.length} transactions</Text>
        )}
      </View>

      {/* Stat squares */}
      <View className="flex-row gap-[16px] mx-[24px] mb-[32px]">
        <View className="flex-1 aspect-[1.15] bg-bg-surface border border-border-subtle rounded-[12px] p-[16px] justify-between">
          <Text className="font-inter-semibold text-label-caps text-ink-label">SPENT TODAY</Text>
          <View>
            <Text className="font-mono-medium text-numeric-lg text-on-surface">{formatAmount(metrics.spentToday, currency)}</Text>
            {metrics.vsAvgPct != null && (
              <Text className={`font-inter text-annotation mt-[4px] ${metrics.vsAvgPct > 0 ? 'text-error-muted' : 'text-primary'}`}>
                {metrics.vsAvgPct > 0 ? '↑' : '↓'} {Math.abs(metrics.vsAvgPct)}% vs avg
              </Text>
            )}
          </View>
        </View>
        <View className="flex-1 aspect-[1.15] bg-bg-surface border border-border-subtle rounded-[12px] p-[16px] justify-between">
          <Text className="font-inter-semibold text-label-caps text-ink-label">FORECAST</Text>
          <View>
            <Text className="font-mono-medium text-numeric-lg text-on-surface">
              {metrics.forecast != null ? formatAmount(metrics.forecast, currency) : '—'}
            </Text>
            <Text className="font-inter text-annotation mt-[4px] text-primary">End of month</Text>
          </View>
        </View>
      </View>

      {/* Recent activity */}
      <View className="mx-[24px] mb-[32px]">
        <View className="flex-row justify-between items-center">
          <Text className="font-inter-semibold text-section-header text-on-surface mb-[16px]">RECENT ACTIVITY</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Transactions' as never)} hitSlop={8}>
            <Text className="font-inter-semibold text-label-caps text-primary">VIEW ALL</Text>
          </TouchableOpacity>
        </View>
        {recent.length === 0 ? (
          <Text className="font-inter text-supporting-text text-ink-body">We're still learning your financial patterns.</Text>
        ) : (
          recent.map((tx) => {
            const debit = isDebit(tx.type);
            const cat = categoryName(tx.categoryId);
            return (
              <TouchableOpacity
                key={tx.id}
                className="flex-row items-center gap-[16px] py-[16px] border-b border-border-subtle"
                activeOpacity={0.7}
                onPress={() => navigation.navigate('TransactionDetail', { transactionId: tx.id })}
              >
                <View className="w-[40px] h-[40px] rounded-[12px] bg-bg-surface-raised border border-border-subtle items-center justify-center">
                  <Text className="text-[15px] text-ink-label">{debit ? '↓' : '↑'}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-inter text-body-standard text-on-surface" numberOfLines={1}>{tx.merchant || tx.bankName}</Text>
                  <Text className="font-inter text-annotation text-ink-label mt-[2px]">
                    {cat ? `${cat} • ` : ''}{shortDate(tx.timestamp)}
                  </Text>
                </View>
                <Text className={`font-mono text-numeric-sm ${debit ? 'text-on-surface' : 'text-primary'}`}>
                  {debit ? '−' : '+'}{formatAmount(tx.amount, tx.currency)}
                </Text>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Upcoming obligations — omitted entirely when there's nothing to say */}
      {upcoming.length > 0 && (
        <View className="mx-[24px] mb-[32px]">
          <Text className="font-inter-semibold text-section-header text-on-surface mb-[16px]">UPCOMING OBLIGATIONS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-[16px] pr-[24px]">
            {upcoming.map((u, i) => {
              const soon = u.dueTs - Date.now() <= 3 * DAY_MS;
              return (
                <View key={`${i}-${u.name}`} className="min-w-[180px] bg-bg-surface-raised border border-border-subtle rounded-[12px] p-[16px]">
                  <Text className={`font-inter-semibold text-label-caps mb-[16px] ${soon ? 'text-secondary' : 'text-ink-label'}`}>{upcomingLabel(u.dueTs)}</Text>
                  <Text className="font-inter text-body-standard text-on-surface mb-[4px]" numberOfLines={1}>{u.name}</Text>
                  <Text className="font-mono-medium text-numeric-md text-on-surface">{formatAmount(u.amount, u.currency)}</Text>
                </View>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Accounts — quiet strip, entry point to AccountDetail */}
      {accounts.length > 0 && (
        <View className="mx-[24px] mb-[32px]">
          <Text className="font-inter-semibold text-section-header text-on-surface mb-[16px]">ACCOUNTS</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-[8px] pr-[24px]">
            {accounts.map((acc, i) => (
              <TouchableOpacity
                key={i}
                className="bg-bg-surface border border-border-subtle rounded-[12px] py-[8px] px-[16px] min-w-[130px]"
                activeOpacity={0.7}
                onPress={() => navigation.navigate('AccountDetail', { bankName: acc.bank, last4: acc.last4 ?? undefined })}
              >
                <Text className="font-inter text-supporting-text text-on-surface" numberOfLines={1}>{acc.bank}</Text>
                <Text className="font-inter text-annotation text-ink-label mt-[2px]">{acc.last4 ? `•••• ${acc.last4}` : 'Account'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text className="font-inter text-supporting-text text-ink-label italic text-center mt-[24px] px-[32px]">"Wealth is the ability to fully experience life."</Text>
    </ScrollView>
    </View>
  );
}
