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

  const tintColor: Record<(typeof BAR_TINTS)[number], string> = {
    accentPrimary: c.accentPrimary,
    notice: c.notice,
    neutral: c.inkBody,
    blue: scheme === 'dark' ? '#8FA8D9' : '#6B7FA6',
    purple: scheme === 'dark' ? '#C99BC0' : '#9C6B8A',
    grey: scheme === 'dark' ? '#6E6C66' : '#A6A29B',
  };

  return (
    <View
      style={{ flex: 1, backgroundColor: c.bgBase, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
      className="px-lg"
    >
      <View className="mb-lg">
        <StepDots total={8} filled={5} scheme={scheme} />
      </View>

      <Text style={{ fontFamily: 'Newsreader_400Regular_Italic', fontSize: 28, color: c.inkHeadline }} className="mb-md">
        Found it. All of it.
      </Text>

      <GlassCard scheme={scheme} style={{ marginBottom: 14 }}>
        <View style={{ gap: 6 }}>
          <Text
            style={{
              fontFamily: 'InstrumentSans_400Regular',
              fontSize: 12,
              color: c.inkBody,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
            }}
          >
            Spent last month
          </Text>
          <Text style={{ fontFamily: 'JetBrainsMono_600SemiBold', fontSize: 34, color: c.inkHeadline, letterSpacing: -0.6 }}>
            {formatAmount(totalSpend, currency)}
          </Text>
        </View>
      </GlassCard>

      <View style={{ flex: 1, backgroundColor: c.bgSurface, borderRadius: 4, padding: 16, gap: 12 }}>
        <Text style={{ fontFamily: 'InstrumentSans_600SemiBold', fontSize: 13, color: c.inkHeadline }}>Top categories</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ gap: 9 }}>
            {topCategories.length === 0 ? (
              <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 13, color: c.inkBody }}>
                We're still learning your financial patterns.
              </Text>
            ) : (
              topCategories.map((cat) => (
                <View key={cat.name}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 13, color: c.inkBody }}>{cat.name}</Text>
                    <Text style={{ fontFamily: 'JetBrainsMono_500Medium', fontSize: 13, color: c.inkBody }}>
                      {formatAmount(cat.amount, currency)}
                    </Text>
                  </View>
                  <View style={{ height: 6, borderRadius: 1, backgroundColor: c.borderSubtle, overflow: 'hidden' }}>
                    <View style={{ width: `${cat.pct}%`, height: '100%', borderRadius: 1, backgroundColor: tintColor[cat.tint] }} />
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>

      {accounts.length > 0 && (
        <View className="mt-md">
          <Text style={{ fontFamily: 'InstrumentSans_600SemiBold', fontSize: 12, color: c.inkBody }} className="mb-sm">
            Accounts found · tap to include or exclude
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {accounts.map((account, i) => {
              const isSelected = selectedAccounts.has(account.id);
              return (
                <Animated.View
                  key={account.id}
                  entering={FadeInDown.duration(350).delay(i * 60)}
                  style={{
                    borderRadius: 4,
                    borderWidth: 1,
                    borderColor: isSelected ? c.accentPrimary : c.borderSubtle,
                    opacity: isSelected ? 1 : 0.6,
                  }}
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
          style={{ fontFamily: 'InstrumentSans_400Regular', fontSize: 11, color: c.inkBody, textAlign: 'center', textDecorationLine: 'underline' }}
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
