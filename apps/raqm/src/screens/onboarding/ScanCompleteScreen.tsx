import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OnboardingScreenProps } from '../../navigation/types';
import { useOnboardingStore } from '../../store/onboardingStore';
import { formatAmount } from '../../utils/format';
import { loadTxRecords, getCategories, getAccounts, getSetting, softDeleteAccountTxs } from '../../db/database';
import { countsTowardTotals } from '../../services/txIntelligenceCore';
import { getMonthBounds } from '../../utils/period';
import { logEvent } from '../../services/logger';
import { StepDots } from '../../components/onboarding/StepDots';
import { GlassCard } from '../../components/onboarding/GlassCard';
import { RqButton } from '../../components/onboarding/RqButton';
import { AccountLiquidityCard } from '../../components/AccountLiquidityCard';
import { Icon } from '../../components/Icon';
import { useOnbColors } from '../../theme/onboardingColors';
import { cn } from '../../utils/cn';

// Account-grouping shape, carried over from the now-merged AccountSelectionScreen
// (item 6 of the fix list — that screen's own route is no longer navigated to).
// balance/currency/updatedAt are looked up from the real `accounts` table (set 6:
// AccountLiquidityCard reuse) once the scan's transactions have been written.
type Account = {
  id: string;
  bank: string;
  last4: string | null;
  type: string;
  txCount: number;
  balance: number;
  currency: string;
  updatedAt: number;
  monthSpend: number;
};

// Bar tint order matches the mockup's category-bar colors (dark variant
// values; light variant swaps only the neutral "Other" grey). "Other" is
// always the last slot — it's the rolled-up remainder bucket, not a real
// category (set 5 fix: never silently drop categories past the top N).
const BAR_TINTS = ['accentPrimary', 'notice', 'neutral', 'blue', 'purple', 'grey'] as const;
const TOP_N_CATEGORIES = 5;
const UNCATEGORIZED_LABEL = 'Uncategorized';
const OTHER_LABEL = 'Other';

// Onboarding-v3 redesign: matches the mockup's ScanComplete-Dark/Light —
// the "aha moment" screen. Real per-category monthly-spend math is
// unchanged from the pre-redesign screen (I4 fix: threaded to
// BudgetSetupScreen via nav params).
export function ScanCompleteScreen({ navigation }: OnboardingScreenProps<'ScanComplete'>) {
  const insets = useSafeAreaInsets();
  const { scheme, colors: c } = useOnbColors();
  // ponytail: accountCount/dateRange (used by the pre-redesign screen's
  // stats row) are dropped — the mockup's layout has no room for them and
  // nothing downstream reads them; suggestBudgetsFromSpend only needs
  // categorySpend.
  const { transactions } = useOnboardingStore();
  const [busy, setBusy] = useState(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const toggleAccount = (id: string) => {
    setSelectedAccounts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const [categorySpend, setCategorySpend] = useState<Record<string, number>>({});
  const [totalSpend, setTotalSpend] = useState(0);
  const currency = transactions[0]?.currency ?? '₹';

  // Root-cause fix (set 5): the old code summed `transactions` (the raw, un-deduped,
  // un-filtered scan output — every type, every date the scan covered) for the
  // top-line figure, while the category cards below summed a completely different
  // query (loadTxRecords, EXPENSE-only, deduped, averaged over the whole scan span).
  // Two different queries over two different date ranges can never agree. Fixed by
  // computing BOTH from the exact same query + the exact same "last month" window
  // (getMonthBounds, honoring the user's month-start-day setting — defaults to 1
  // during onboarding since the setting hasn't been touched yet), and by never
  // capping the category list without rolling the remainder into a visible bucket:
  // every EXPENSE tx with no categoryId goes into "Uncategorized" (not dropped),
  // and anything past the top 5 named categories rolls into "Other" — so top-line
  // total === sum of every row shown, always.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const monthStartDayRaw = await getSetting('month_start_day');
        const monthStartDay = monthStartDayRaw ? Number(monthStartDayRaw) : 1;
        const { from, to } = getMonthBounds(new Date(), monthStartDay);

        const [records, categories, dbAccounts] = await Promise.all([
          loadTxRecords(),
          getCategories('expense'),
          getAccounts(),
        ]);
        const nameById = new Map(categories.map((cat) => [cat.id, cat.name]));
        const accountByKey = new Map(dbAccounts.map((a) => [`${a.bankName}|${a.last4 ?? 'unknown'}`, a]));

        const spend: Record<string, number> = {};
        const perAccount = new Map<string, Account>();
        let total = 0;

        for (const tx of records) {
          if (tx.type !== 'EXPENSE' || !countsTowardTotals(tx)) continue;
          if (tx.timestamp < from || tx.timestamp > to) continue;
          const amount = Math.abs(tx.amount);
          const name = tx.categoryId != null ? nameById.get(tx.categoryId) : undefined;
          const bucket = name ?? UNCATEGORIZED_LABEL;
          spend[bucket] = (spend[bucket] ?? 0) + amount;
          total += amount;

          const acctKey = `${tx.bankName}|${tx.accountLast4 ?? 'unknown'}`;
          const acctInfo = accountByKey.get(acctKey);
          const existing = perAccount.get(acctKey);
          if (existing) {
            existing.monthSpend += amount;
          } else {
            perAccount.set(acctKey, {
              id: acctKey,
              bank: tx.bankName,
              last4: tx.accountLast4,
              type: acctInfo?.isCard ? 'Credit Card' : 'Bank Account',
              txCount: 0,
              balance: acctInfo?.balance ?? 0,
              currency: tx.currency,
              updatedAt: acctInfo?.balanceUpdatedAt ?? tx.timestamp,
              monthSpend: amount,
            });
          }
        }
        // txCount per account should reflect ALL of that account's transactions
        // found in this scan (not just last-month EXPENSE ones used for spend) —
        // matches the pre-redesign "N txns" label people expect on these cards.
        for (const tx of records) {
          const acctKey = `${tx.bankName}|${tx.accountLast4 ?? 'unknown'}`;
          let acct = perAccount.get(acctKey);
          if (!acct) {
            const acctInfo = accountByKey.get(acctKey);
            acct = {
              id: acctKey,
              bank: tx.bankName,
              last4: tx.accountLast4,
              type: acctInfo?.isCard ? 'Credit Card' : 'Bank Account',
              txCount: 0,
              balance: acctInfo?.balance ?? 0,
              currency: tx.currency,
              updatedAt: acctInfo?.balanceUpdatedAt ?? tx.timestamp,
              monthSpend: 0,
            };
            perAccount.set(acctKey, acct);
          }
          acct.txCount += 1;
        }

        const accountList = Array.from(perAccount.values()).sort((a, b) => b.txCount - a.txCount);

        if (!cancelled) {
          setCategorySpend(spend);
          setTotalSpend(total);
          setAccounts(accountList);
          setSelectedAccounts(new Set(accountList.map((a) => a.id)));
        }
      } catch (e) {
        console.warn('ScanCompleteScreen: failed to load spend totals:', e);
        logEvent('error.caught', `ScanCompleteScreen totals: ${e instanceof Error ? e.message : String(e)}`);
        // Non-fatal: BudgetSetupScreen falls back to a blank form; the screen
        // still renders with a zero total rather than the wrong-but-confident one.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [transactions]);

  const topCategories = useMemo(() => {
    const entries = Object.entries(categorySpend).sort((a, b) => b[1] - a[1]);
    const top = entries.slice(0, TOP_N_CATEGORIES);
    const rest = entries.slice(TOP_N_CATEGORIES);
    const restTotal = rest.reduce((sum, [, amount]) => sum + amount, 0);
    const rows = restTotal > 0 ? [...top, [OTHER_LABEL, restTotal] as [string, number]] : top;
    const max = rows.length > 0 ? rows[0][1] : 1;
    return rows.map(([name, amount], i) => ({
      name,
      amount,
      pct: Math.max(6, Math.round((amount / max) * 100)),
      tint: BAR_TINTS[i] ?? 'grey',
    }));
  }, [categorySpend]);

  // Class-name equivalent of the old raw-hex tintColor map — accentPrimary/
  // notice/neutral reuse the shared onb-* tokens; blue/purple/grey are
  // literal one-off chart accents (not part of OnbColors) via arbitrary
  // bracket values, `dark:` variant since darkMode defaults to 'media'
  // (matches this app's OS-based useColorScheme()).
  const tintClass: Record<(typeof BAR_TINTS)[number], string> = {
    accentPrimary: 'bg-onb-accent-primary dark:bg-onb-accent-primary-dark',
    notice: 'bg-onb-notice dark:bg-onb-notice-dark',
    neutral: 'bg-onb-ink-body dark:bg-onb-ink-body-dark',
    blue: 'bg-[#6B7FA6] dark:bg-[#8FA8D9]',
    purple: 'bg-[#9C6B8A] dark:bg-[#C99BC0]',
    grey: 'bg-[#A6A29B] dark:bg-[#6E6C66]',
  };

  return (
    <View
      // Design bug fixes found while rechecking ScanComplete-Light/Dark.dc.html:
      // horizontal padding is literally 20px (was px-lg = 24), and bottom
      // padding is literally 32px (was +24).
      style={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }}
      className="flex-1 bg-onb-bg-base dark:bg-onb-bg-base-dark px-[20px]"
    >
      {/* Design bug fix: dots row margin-bottom is 20px (was mb-lg = 24).
          Also: the artifact's dot row is 7 dots (5 filled), not 8/5 — this
          screen's own artboard, so fixed here; other onboarding screens'
          StepDots counts are out of this file's scope. */}
      <View className="mb-[20px]">
        <StepDots total={7} filled={5} scheme={scheme} />
      </View>

      <Text className="mb-md text-[28px] font-newsreader-italic text-onb-ink-headline dark:text-onb-ink-headline-dark">
        Found it. All of it.
      </Text>

      <GlassCard scheme={scheme} className="mb-[14px]">
        <View className="gap-1.5">
          <Text
            className="text-[12px] uppercase tracking-[1.2px] font-instrument text-onb-ink-body dark:text-onb-ink-body-dark"
          >
            Spent last month
          </Text>
          <Text
            className="text-[34px] tracking-[-0.6px] font-mono-semibold text-onb-ink-headline dark:text-onb-ink-headline-dark"
          >
            {formatAmount(totalSpend, currency)}
          </Text>
        </View>
      </GlassCard>

      <View className="flex-1 bg-onb-bg-surface dark:bg-onb-bg-surface-dark rounded-inner p-md gap-3">
        <Text className="text-[13px] font-instrument-semibold text-onb-ink-headline dark:text-onb-ink-headline-dark">
          Top categories
        </Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-[9px]">
            {topCategories.length === 0 ? (
              <Text className="text-[13px] font-instrument text-onb-ink-body dark:text-onb-ink-body-dark">
                We're still learning your financial patterns.
              </Text>
            ) : (
              topCategories.map((cat) => (
                <View key={cat.name}>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-[13px] font-instrument text-onb-ink-body dark:text-onb-ink-body-dark">
                      {cat.name}
                    </Text>
                    <Text className="text-[13px] font-mono-medium text-onb-ink-body dark:text-onb-ink-body-dark">
                      {formatAmount(cat.amount, currency)}
                    </Text>
                  </View>
                  <View className="h-[6px] rounded-dot bg-onb-border-subtle dark:bg-onb-border-subtle-dark overflow-hidden">
                    {/* `pct` is computed at runtime per render — a dynamic
                        arbitrary-value className can't be picked up by
                        NativeWind's static content scanner, so width stays
                        a style (CLAUDE.md's NativeWind carve-out). */}
                    <View style={{ width: `${cat.pct}%` }} className={cn('h-full rounded-dot', tintClass[cat.tint])} />
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      {accounts.length > 0 && (
        <View className="mt-md">
          <Text
            className="mb-sm text-[12px] uppercase font-instrument-semibold text-onb-ink-body dark:text-onb-ink-body-dark"
          >
            Accounts found · tap to include or exclude
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {accounts.map((account, i) => {
              const isSelected = selectedAccounts.has(account.id);
              return (
                <Animated.View
                  key={account.id}
                  entering={FadeInDown.duration(350).delay(i * 60)}
                  className={cn(
                    'rounded-inner border',
                    isSelected
                      ? 'border-onb-accent-primary dark:border-onb-accent-primary-dark opacity-100'
                      : 'border-onb-border-subtle dark:border-onb-border-subtle-dark opacity-60',
                  )}
                >
                  {/* Set 3 fix: reuse the real Dashboard/Analytics account card component
                      instead of a bespoke one-off card — same visual/interaction pattern,
                      just wrapped for onboarding's select-to-include/exclude behavior (the
                      border/opacity above stands in for AccountLiquidityCard's own selection
                      state, which it doesn't have — this screen is the only place that needs it). */}
                  <AccountLiquidityCard
                    bankName={account.bank}
                    last4={account.last4}
                    balance={account.balance}
                    currency={account.currency}
                    updatedAt={account.updatedAt}
                    monthSpend={account.monthSpend}
                    onPress={() => toggleAccount(account.id)}
                  />
                </Animated.View>
              );
            })}
          </ScrollView>
        </View>
      )}

      <Pressable onPress={() => navigation.navigate('GPayPdfImport')} className="mt-md mb-sm">
        <Text
          className="text-[11px] text-center underline font-instrument text-onb-ink-body dark:text-onb-ink-body-dark"
        >
          Missing data? Import a PDF statement
        </Text>
      </Pressable>

      <RqButton
        label="Set your budget"
        scheme={scheme}
        disabled={busy}
        onPress={async () => {
          if (busy) return;
          setBusy(true);
          try {
            // Carried over from AccountSelectionScreen: deselected accounts'
            // transactions are soft-deleted (recoverable from More → Deleted
            // transactions), never hard-removed.
            for (const acc of accounts) {
              if (!selectedAccounts.has(acc.id)) {
                await softDeleteAccountTxs(acc.bank, acc.last4 ?? null);
              }
            }
          } catch (e) {
            console.warn('Deselect cleanup failed:', e);
            logEvent('error.caught', `ScanCompleteScreen deselect cleanup: ${e instanceof Error ? e.message : String(e)}`);
          } finally {
            setBusy(false);
          }
          navigation.replace('BudgetSetup', { categorySpend });
        }}
        icon={<Icon name="arrow-right" size={18} color={c.onAccent} />}
      />
    </View>
  );
}
