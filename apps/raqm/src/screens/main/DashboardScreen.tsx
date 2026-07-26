import React, {
  useEffect,
  useRef,
  useMemo,
  useState,
  useCallback,
} from "react";
import {
  View,
  Text,
  ScrollView,
  Animated,
  Modal,
  Pressable,
  TouchableOpacity,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Colors, Spacing, Radius } from "../../theme";
import { useTxStore } from "../../store/txStore";
import { SmsReader } from "../../native/SmsReader";
import { BankParserFactory } from "@rahatsayyed/bank-sms-parser";
import { TransactionType } from "@rahatsayyed/bank-sms-parser";
import type {
  TxRecord,
  GroceryList,
  Category,
  Reminder,
} from "../../db/database";
import {
  getSetting,
  getCategories,
  getGroceryLists,
  linkTxToList,
  getReminders,
  getDismissedMismatchKeys,
  dismissMismatchKey,
} from "../../db/database";
import { countsTowardTotals } from "../../services/txIntelligence";
import { detectBalanceMismatches, type BalanceMismatch } from "../../services/balanceIntegrity";
import { detectRecurringDues, mergeDues } from "../../services/dues";
import { postTxNotification } from "../../notifications/notifications";
import { getMonthBounds, getDayBounds } from "../../utils/period";
import type { MainStackParamList } from "../../navigation/types";
import { formatAmount } from "../../utils/format";
import { TopHeader } from "../../components/TopHeader";
import {
  HeroMetric,
  AdvisorCard,
  SectionHeader,
  TransactionRow,
  BalanceMismatchStack,
  ObligationCard,
} from "../../components/dashboard";
import { AccountLiquidityCard } from "../../components/AccountLiquidityCard";
import { RefreshAccountSheet } from "../../components/RefreshAccountSheet";

const GROCERY_KEYWORDS = /grocer|bigbasket|blinkit|zepto|dmart|instamart/i;
const DAY_MS = 24 * 60 * 60 * 1000;

function isDebit(type: TransactionType): boolean {
  return (
    type === TransactionType.EXPENSE ||
    type === TransactionType.TRANSFER ||
    type === TransactionType.INVESTMENT
  );
}

function isCredit(type: TransactionType): boolean {
  return type === TransactionType.INCOME || type === TransactionType.CREDIT;
}

/** "Friday, 24 October" */
function todayLine(): string {
  return new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function shortTime(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** "IN 3 DAYS" / "OCT 30" style labels for upcoming obligations. */
function upcomingLabel(ts: number): string {
  const rawDays = Math.round((ts - Date.now()) / DAY_MS);
  if (rawDays < 0)
    return rawDays === -1
      ? "OVERDUE 1 DAY"
      : `OVERDUE ${Math.abs(rawDays)} DAYS`;
  const days = rawDays;
  if (days === 0) return "TODAY";
  if (days === 1) return "TOMORROW";
  if (days <= 7) return `IN ${days} DAYS`;
  return new Date(ts)
    .toLocaleDateString("en-IN", { day: "numeric", month: "short" })
    .toUpperCase();
}

interface HomeMetrics {
  net: number;
  income: number;
  monthSpent: number;
  spentToday: number;
  vsAvgPct: number | null; // today vs daily average, +ve = above average
  forecast: number | null; // projected month-end spend
  vsLastMonthPct: number | null; // month-to-date vs same span last month, +ve = higher
  topCategoryName: string | null;
}

const EMPTY_METRICS: HomeMetrics = {
  net: 0,
  income: 0,
  monthSpent: 0,
  spentToday: 0,
  vsAvgPct: null,
  forecast: null,
  vsLastMonthPct: null,
  topCategoryName: null,
};

/** Refund-netted expense sum over a window (same math as the rest of the app). */
function spentIn(txs: TxRecord[], from: number, to: number): number {
  let spent = 0;
  for (const tx of txs) {
    if (tx.timestamp < from || tx.timestamp > to) continue;
    if (tx.deletedAt) continue;
    if (!countsTowardTotals(tx)) continue;
    if (isCredit(tx.type) && tx.linkType === "refund") spent -= tx.amount;
    else if (isDebit(tx.type)) spent += tx.amount;
  }
  return spent;
}

// Animated.View isn't wrapped by NativeWind's interop — the toast keeps a
// style object so the animated opacity/translate compose with its layout.
const toastStyle = {
  position: "absolute" as const,
  top: 0,
  left: 0,
  right: 0,
  zIndex: 100,
  margin: Spacing.md,
  borderRadius: Radius.xl,
  backgroundColor: Colors.primary,
  paddingHorizontal: Spacing.md,
  paddingVertical: 12,
};

export function DashboardScreen() {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const txs = useTxStore((s) => s.txs);
  const [newTxLabel, setNewTxLabel] = React.useState<string | null>(null);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const [linkPromptTxId, setLinkPromptTxId] = useState<number | null>(null);
  const [showListPicker, setShowListPicker] = useState(false);
  // Snapshot of the tx id for the open picker — the toast's auto-dismiss timer clears
  // linkPromptTxId independently, which would otherwise null it under an open modal.
  const [pickerTxId, setPickerTxId] = useState<number | null>(null);
  const [activeGroceryLists, setActiveGroceryLists] = useState<GroceryList[]>(
    [],
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [dismissedMismatchKeys, setDismissedMismatchKeys] = useState<Set<string>>(new Set());
  const [manualUpdateTarget, setManualUpdateTarget] = useState<BalanceMismatch | null>(null);
  const groceriesCategoryId = useMemo(
    () => categories.find((c) => c.name === "Groceries")?.id ?? null,
    [categories],
  );

  const loadReminders = useCallback(() => {
    getReminders().then(setReminders);
  }, []);

  useEffect(() => {
    getCategories().then(setCategories);
    loadReminders();
    getDismissedMismatchKeys().then(setDismissedMismatchKeys);
  }, [loadReminders]);

  // This screen stays mounted beneath the pushed Dues & Reminders / SMS Inbox screens, so
  // a reminder added there, or a dismiss recorded from a previous mount, needs a
  // focus-triggered reload to show up here.
  useFocusEffect(
    useCallback(() => {
      loadReminders();
      getDismissedMismatchKeys().then(setDismissedMismatchKeys);
    }, [loadReminders]),
  );

  const handleDismissMismatch = useCallback((mismatch: BalanceMismatch) => {
    setDismissedMismatchKeys((prev) => {
      const next = new Set(prev);
      next.add(mismatch.key);
      return next;
    });
    dismissMismatchKey(mismatch.key);
  }, []);

  const handleUpdateMismatchBalance = useCallback(async (newBalance: number) => {
    if (!manualUpdateTarget) return;
    await useTxStore.getState().add({
      amount: 0,
      type: TransactionType.BALANCE_UPDATE,
      bankName: manualUpdateTarget.bankName,
      accountLast4: manualUpdateTarget.last4,
      timestamp: Date.now(),
      balance: newBalance,
      currency: manualUpdateTarget.currency,
      isManual: true,
    });
    // A manual correction is a resolution, not just an acknowledgement — the historical
    // mismatch record won't disappear on its own (it's dated in the past), so dismiss it.
    handleDismissMismatch(manualUpdateTarget);
  }, [manualUpdateTarget, handleDismissMismatch]);

  useEffect(() => {
    const sub = SmsReader.addNewSmsListener(
      async ({ body, sender, timestamp }) => {
        try {
          const tx = BankParserFactory.parse(body, sender, timestamp);
          if (!tx) return;

          const id = await useTxStore.getState().addParsedWithLocation(tx);
          if (id === null) {
            // duplicate SMS suppressed per T13 - show user feedback
            setNewTxLabel("Duplicate SMS ignored");
            Animated.sequence([
              Animated.timing(toastAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
              }),
              Animated.delay(2000),
              Animated.timing(toastAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
              }),
            ]).start(() => setNewTxLabel(null));
            return;
          }

          const sign = tx.type === TransactionType.EXPENSE ? "-" : "+";
          const label = tx.merchant
            ? `${sign}₹${tx.amount.toLocaleString("en-IN")} · ${tx.merchant}`
            : `New transaction from ${tx.bankName}`;
          setNewTxLabel(label);

          const newTx =
            useTxStore.getState().txs.find((t) => t.id === id) ?? null;
          const isGrocery =
            (newTx?.categoryId !== null &&
              newTx?.categoryId === groceriesCategoryId) ||
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
            Animated.timing(toastAnim, {
              toValue: 1,
              duration: 300,
              useNativeDriver: true,
            }),
            Animated.delay(dismissDelay),
            Animated.timing(toastAnim, {
              toValue: 0,
              duration: 300,
              useNativeDriver: true,
            }),
          ]).start(() => {
            setNewTxLabel(null);
            setLinkPromptTxId(null);
          });

          const notifBody = tx.merchant
            ? `${sign}₹${tx.amount.toLocaleString("en-IN")} · ${tx.merchant}`
            : `${sign}₹${tx.amount.toLocaleString("en-IN")} · ${tx.bankName}`;
          await postTxNotification(id, "New transaction", notifBody);
        } catch (error) {
          console.warn("SMS listener error:", error);
        }
      },
    );
    return () => sub.remove();
  }, [groceriesCategoryId]);

  const [metrics, setMetrics] = useState<HomeMetrics>(EMPTY_METRICS);
  const [monthBounds, setMonthBounds] = useState<{
    from: number;
    to: number;
  } | null>(null);

  // getMonthBounds internally clamps startDay to [1, 28], so pass raw value.
  const computeMetrics = useCallback(() => {
    let cancelled = false;
    (async () => {
      const startDayStr = await getSetting("month_start_day");
      const startDay = startDayStr ? Number(startDayStr) : 1;
      const now = new Date();
      const { from, to } = getMonthBounds(now, startDay);
      if (!cancelled) setMonthBounds({ from, to });

      let income = 0;
      const catSpend = new Map<number, number>();
      for (const tx of txs) {
        if (tx.timestamp < from || tx.timestamp > to) continue;
        if (tx.deletedAt) continue;
        if (!countsTowardTotals(tx)) continue;
        if (isCredit(tx.type) && tx.linkType !== "refund") income += tx.amount;
        if (tx.type === TransactionType.EXPENSE && tx.categoryId != null) {
          catSpend.set(
            tx.categoryId,
            (catSpend.get(tx.categoryId) ?? 0) + tx.amount,
          );
        }
      }
      const monthSpent = spentIn(txs, from, to);
      const net = income - monthSpent;

      const day = getDayBounds(now);
      const spentToday = spentIn(txs, day.from, day.to);

      const daysElapsed = Math.max(
        1,
        Math.ceil((now.getTime() - from) / DAY_MS),
      );
      const totalDays = Math.max(daysElapsed, Math.round((to - from) / DAY_MS));
      const dailyAvg = monthSpent / daysElapsed;
      const vsAvgPct =
        dailyAvg > 0
          ? Math.round(((spentToday - dailyAvg) / dailyAvg) * 100)
          : null;
      const forecast =
        monthSpent > 0 ? (monthSpent / daysElapsed) * totalDays : null;

      // Same span last month: from last period's start, the same number of ms elapsed.
      const lastRef = new Date(from - DAY_MS);
      const last = getMonthBounds(lastRef, startDay);
      const lastSpanSpent = spentIn(
        txs,
        last.from,
        last.from + (now.getTime() - from),
      );
      const vsLastMonthPct =
        lastSpanSpent > 0
          ? Math.round(((monthSpent - lastSpanSpent) / lastSpanSpent) * 100)
          : null;

      let topCategoryName: string | null = null;
      let topAmount = 0;
      for (const [catId, amount] of catSpend) {
        if (amount > topAmount) {
          topAmount = amount;
          topCategoryName =
            categories.find((c) => c.id === catId)?.name ?? null;
        }
      }

      if (!cancelled) {
        setMetrics({
          net,
          income,
          monthSpent,
          spentToday,
          vsAvgPct,
          forecast,
          vsLastMonthPct,
          topCategoryName,
        });
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
    const map = new Map<
      string,
      {
        bankName: string;
        last4: string | null;
        balance: number;
        currency: string;
        timestamp: number;
        monthSpend: number;
      }
    >();
    for (const tx of txs) {
      if (tx.isFromCard || tx.balance == null) continue;
      const key = `${tx.bankName}|${tx.accountLast4 ?? ""}`;
      const existing = map.get(key);
      if (!existing || tx.timestamp > existing.timestamp) {
        map.set(key, {
          bankName: tx.bankName,
          last4: tx.accountLast4,
          balance: tx.balance,
          currency: tx.currency,
          timestamp: tx.timestamp,
          monthSpend: existing?.monthSpend ?? 0,
        });
      }
    }
    // Same debit convention as the rest of this screen (EXPENSE + TRANSFER + INVESTMENT).
    if (monthBounds) {
      for (const tx of txs) {
        if (tx.deletedAt || !countsTowardTotals(tx) || !isDebit(tx.type))
          continue;
        if (tx.timestamp < monthBounds.from || tx.timestamp > monthBounds.to)
          continue;
        const key = `${tx.bankName}|${tx.accountLast4 ?? ""}`;
        const acc = map.get(key);
        if (acc) acc.monthSpend += tx.amount;
      }
    }
    return Array.from(map.values()).sort((a, b) => b.monthSpend - a.monthSpend);
  }, [txs, monthBounds]);

  const recent = useMemo(
    () => [...txs].sort((a, b) => b.timestamp - a.timestamp).slice(0, 4),
    [txs],
  );

  // Needs attention: a gap between the bank-reported balance and what our transaction
  // history would predict — usually means we missed/failed to parse an SMS. Dismissed
  // mismatches are keyed per-transaction, so a *new* gap still surfaces even after an
  // older one on the same account was dismissed.
  const balanceMismatches = useMemo(
    () => detectBalanceMismatches(txs).filter((m) => !dismissedMismatchKeys.has(m.key)),
    [txs, dismissedMismatchKeys],
  );

  // Dues & Reminders: recurring merchants' next expected charge, merged with manual
  // reminders, soonest first. Detection logic is shared with DuesRemindersScreen.
  const upcoming = useMemo(
    () =>
      mergeDues(detectRecurringDues(txs, 30 * DAY_MS), reminders).slice(0, 5),
    [txs, reminders],
  );

  const categoryName = useCallback(
    (id: number | null) =>
      id == null ? null : (categories.find((c) => c.id === id)?.name ?? null),
    [categories],
  );

  const currency = txs[0]?.currency ?? "₹";
  const netIsNegative = metrics.net < 0;

  // Advisor line: calm, factual, never shaming (DESIGN.md §11/§12).
  const advisorLine = useMemo(() => {
    if (txs.length === 0)
      return "We're still learning your financial patterns. Insights will appear as your timeline grows.";
    if (metrics.vsLastMonthPct == null) {
      return `You've spent ${formatAmount(metrics.monthSpent, currency)} so far this month.`;
    }
    if (metrics.vsLastMonthPct <= 0) {
      return `Your spending is ${Math.abs(metrics.vsLastMonthPct)}% lower than this time last month.`;
    }
    const driver = metrics.topCategoryName
      ? `, led by ${metrics.topCategoryName}`
      : "";
    return `Spending is ${metrics.vsLastMonthPct}% higher than this time last month${driver}.`;
  }, [txs.length, metrics, currency]);

  return (
    <View className="flex-1">
      {newTxLabel && (
        <Animated.View
          style={[
            toastStyle,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-16, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text className="font-inter-medium text-[16px] leading-[24px] text-on-primary-container">
            ⚡ {newTxLabel}
          </Text>
          {linkPromptTxId !== null && (
            <TouchableOpacity
              onPress={() => {
                setPickerTxId(linkPromptTxId);
                setShowListPicker(true);
              }}
              className="mt-[8px] self-start"
            >
              <Text className="font-mono text-[12px] leading-[16px] tracking-[0.6px] text-on-primary underline">
                Link to list?
              </Text>
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
            <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-[16px]">
              Link to which list?
            </Text>
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
                <Text className="font-inter text-body-standard text-on-surface">
                  {l.name}
                </Text>
              </TouchableOpacity>
            ))}
            {activeGroceryLists.length === 0 && (
              <Text className="font-inter text-[14px] leading-[20px] text-on-surface-variant py-[8px]">
                No active lists
              </Text>
            )}
          </View>
        </Pressable>
      </Modal>

      <ScrollView
        className="flex-1 bg-background"
        contentContainerClassName="pb-[40px]"
        showsVerticalScrollIndicator={false}
      >
        <TopHeader
          onNotificationPress={() => navigation.navigate("DuesReminders")}
        />

        {/* Hero: net this month, over a soft radial glow */}
        <HeroMetric
          label="NET THIS MONTH"
          value={`${netIsNegative ? "−" : ""}${formatAmount(metrics.net, currency)}`}
          valueColorClassName={
            netIsNegative ? "text-error-muted" : "text-ink-headline"
          }
          sublabel={todayLine()}
          stats={[
            {
              label: "Debit",
              value: formatAmount(metrics.monthSpent, currency),
              direction: "up",
            },
            {
              label: "Credit",
              value: formatAmount(metrics.income, currency),
              direction: "down",
            },
          ]}
        />

        {/* Personal advisor */}
        <AdvisorCard
          insight={advisorLine}
          footnote={
            txs.length > 0 ? `Based on ${txs.length} transactions` : undefined
          }
        />

        {/* Recent activity */}
        <View className="mx-[24px] mb-[32px]">
          <SectionHeader
            title="RECENT ACTIVITY"
            actionLabel="VIEW ALL"
            onAction={() => navigation.navigate("Transactions", undefined)}
          />
          {recent.length === 0 ? (
            <Text className="font-inter text-supporting-text text-ink-body">
              We're still learning your financial patterns.
            </Text>
          ) : (
            recent.map((tx) => (
              <TransactionRow
                key={tx.id}
                merchant={tx.merchant || tx.bankName}
                categoryName={categoryName(tx.categoryId)}
                dateLabel={shortDate(tx.timestamp)}
                timeLabel={shortTime(tx.timestamp)}
                amountLabel={formatAmount(tx.amount, tx.currency)}
                isDebit={isDebit(tx.type)}
                onPress={() =>
                  navigation.navigate("TransactionDetail", {
                    transactionId: tx.id,
                  })
                }
              />
            ))
          )}
        </View>

        {/* Needs attention — balance mismatch: a gap between the bank-reported balance
          and what our transaction history predicts, usually a missed/unparsed SMS.
          Swipeable stack (up to 3 shown); dismissing one persists so it won't resurface
          unless the same account produces a *new* mismatch. */}
        <BalanceMismatchStack
          mismatches={balanceMismatches}
          onDismiss={handleDismissMismatch}
          onReportSms={() => navigation.navigate("SmsInbox")}
          onUpdateBalance={(mismatch) => setManualUpdateTarget(mismatch)}
        />

        {/* Dues & Reminders — detected recurring charges + manually-added reminders. Always shown
          (not just when data exists) since the header is how a user opens the screen to add one. */}
        <View className="mx-[24px] mb-[32px]">
          <SectionHeader
            title="DUES & REMINDERS"
            onPress={() => navigation.navigate("DuesReminders")}
          />
          {upcoming.length === 0 ? (
            <TouchableOpacity
              onPress={() => navigation.navigate("DuesReminders")}
              activeOpacity={0.7}
              className="border border-dashed border-outline-variant rounded-md py-xl px-lg items-center justify-center min-h-[150px]"
            >
              <Text className="font-inter text-body-sm text-ink-label text-center">
                Your dues and reminders are clear.
              </Text>
            </TouchableOpacity>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-[16px] pr-[24px]"
            >
              {upcoming.map((u) => (
                <ObligationCard
                  key={u.key}
                  dueLabel={upcomingLabel(u.dueTs)}
                  soon={u.dueTs - Date.now() <= 3 * DAY_MS}
                  name={u.name}
                  amountLabel={formatAmount(u.amount, u.currency ?? currency)}
                />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Accounts — entry point to AccountDetail, same balance card used on the Briefing tab */}
        {accounts.length > 0 && (
          <View className="mb-[32px]">
            <View className="mx-[24px]">
              <SectionHeader title="ACCOUNTS" />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerClassName="gap-[12px] px-container-margin pr-[24px]"
            >
              {accounts.map((acc) => (
                <AccountLiquidityCard
                  key={`${acc.bankName}|${acc.last4 ?? ""}`}
                  bankName={acc.bankName}
                  last4={acc.last4}
                  balance={acc.balance}
                  currency={acc.currency}
                  updatedAt={acc.timestamp}
                  monthSpend={acc.monthSpend}
                  onManualUpdate={(newBalance) =>
                    useTxStore.getState().add({
                      amount: 0,
                      type: TransactionType.BALANCE_UPDATE,
                      bankName: acc.bankName,
                      accountLast4: acc.last4,
                      timestamp: Date.now(),
                      balance: newBalance,
                      currency: acc.currency,
                      isManual: true,
                    })
                  }
                  onPress={() =>
                    navigation.navigate("AccountDetail", {
                      bankName: acc.bankName,
                      last4: acc.last4 ?? undefined,
                    })
                  }
                />
              ))}
            </ScrollView>
          </View>
        )}

        <Text className="font-inter text-supporting-text text-ink-label italic text-center mt-[24px] px-[32px]">
          "Wealth is the ability to fully experience life."
        </Text>
      </ScrollView>

      {manualUpdateTarget && (
        <RefreshAccountSheet
          visible
          initialMode="manual"
          onClose={() => setManualUpdateTarget(null)}
          bankName={manualUpdateTarget.bankName}
          last4={manualUpdateTarget.last4}
          onManualUpdate={handleUpdateMismatchBalance}
        />
      )}
    </View>
  );
}
