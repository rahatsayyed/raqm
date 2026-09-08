import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getSetting, getAccounts, getCategories, type TxRecord, type Account, type Category } from '../../db/database';
import { countsTowardTotals } from '../../services/txIntelligence';
import { getBudgetStatuses, type BudgetStatus } from '../../services/budgets';
import { getMonthBounds, getDayBounds, getWeekBounds, type PeriodBounds } from '../../utils/period';
import { formatAmount } from '../../utils/format';
import { accountLabel } from '../../utils/accountLabel';
import { Colors, Spacing } from '../../theme';
import { DonutChart, type DonutDatum } from '../../components/DonutChart';
import { SpendBarChart, type BarDatum } from '../../components/SpendBarChart';
import { MonthSwitcher } from '../../components/MonthSwitcher';
import { BottomSheet } from './TransactionDetailScreen';
import { KeyboardAwareScrollView } from '../../components/KeyboardAwareScrollView';
import { FilterIcon, CloseIcon } from '../../components/TabIcon';

const DAY_MS = 86_400_000;

// Same color-cycling palette CategoryOverviewScreen already uses for its category donut —
// reused here rather than inventing a new one.
const SLICE_COLORS = [
  Colors.primary, Colors.secondary, Colors.tertiary, Colors.error,
  Colors.mossStructure, Colors.outline, Colors.onSurfaceVariant, Colors.surfaceContainerHigh,
];

// No amber/warning token exists yet in theme/colors.ts — literal hex used only for the
// "approaching budget" banner below; everything else stays on Colors.* tokens.
const AMBER = '#E8B339';

function withAlpha(hex: string, alpha: number): string {
  const bigint = parseInt(hex.replace('#', ''), 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

function isExpense(tx: TxRecord): boolean {
  return tx.type === TransactionType.EXPENSE;
}

function isRefundCredit(tx: TxRecord): boolean {
  return (
    (tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT) &&
    (tx.linkType === 'refund' || tx.linkType === 'split_payment')
  );
}

// Nets refund credits against the original expense they're linked to (via linkPartnerId),
// mirroring services/budgets.ts's sumSpend() — every spend total on this screen (header,
// bar chart, period comparison) must go through this, never a plain isDebit/isExpense-only
// reduce, or refunded spend silently double-counts.
//
// Takes the full unfiltered tx list plus explicit bounds/match predicates rather than an
// already-filtered array: a refund credit usually carries no categoryId/merchant of its
// own, so it would be dropped by the very filters that correctly scope the expense it
// refunds — exactly the workaround categoryBreakdown/accountBreakdown below already use.
// Builds a linkPartnerId -> refunded-amount map first (O(n)) rather than nesting loops,
// since this can be called with the full (unbounded) store tx list, not just the small
// period-bounded filteredTxs.
function netSpendTotal(
  allTxs: TxRecord[],
  inBounds: (tx: TxRecord, b: PeriodBounds) => boolean,
  bounds: PeriodBounds,
  matches: (tx: TxRecord) => boolean,
): number {
  const byId = new Map(allTxs.map((t) => [t.id, t]));
  const refundByPartner = new Map<number, number>();
  for (const tx of allTxs) {
    if (!inBounds(tx, bounds) || !isRefundCredit(tx) || tx.linkPartnerId == null) continue;
    const partner = byId.get(tx.linkPartnerId);
    if (partner && matches(partner)) {
      refundByPartner.set(tx.linkPartnerId, (refundByPartner.get(tx.linkPartnerId) ?? 0) + tx.amount);
    }
  }
  let total = 0;
  for (const tx of allTxs) {
    if (!inBounds(tx, bounds) || !isExpense(tx) || !matches(tx)) continue;
    const refunded = refundByPartner.get(tx.id) ?? 0;
    total += Math.max(0, tx.amount - refunded);
  }
  return Math.max(0, total);
}

type AccountFilter = { bankName: string; last4?: string };

interface BreakdownRow {
  label: string;
  value: number;
  color: string;
}

// Shared "heavy graph page" for a single category, account, or merchant, opened by tapping
// a category row, an account card, or a transaction's "View Merchant" link. Real charts +
// a filter sheet live here (design deferred no longer applies — see the design brief).
export function SpendDetailScreen({ route, navigation }: MainStackScreenProps<'SpendDetail'>) {
  const params = route.params;
  const txs = useTxStore((s) => s.txs);
  const accountLabels = useTxStore((s) => s.accountLabels);

  const [refDate, setRefDate] = useState(() => new Date());
  const [monthStartDay, setMonthStartDay] = useState(1);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Filter-sheet state, seeded once from route params (exactly one of the three is
  // non-null depending on how this screen was reached), freely editable afterward.
  const [categoryFilter, setCategoryFilter] = useState<number | null>(
    params.filterType === 'category' ? params.categoryId : null,
  );
  const [accountFilter, setAccountFilter] = useState<AccountFilter | null>(
    params.filterType === 'account' ? { bankName: params.bankName, last4: params.last4 } : null,
  );
  const [merchantFilter, setMerchantFilter] = useState<string | null>(
    params.filterType === 'merchant' ? params.merchant : null,
  );

  const [dateRangeMode, setDateRangeMode] = useState<'period' | 'custom'>('period');
  // Drives ONLY which date chip highlights as active and whether the manual From/To
  // picker renders. Separate from dateRangeMode because "Last 3 months" and "Custom" both
  // resolve to dateRangeMode==='custom' internally (both set customRange), but they are
  // distinct user selections that must not share one highlighted chip or one picker.
  const [activePreset, setActivePreset] = useState<'thisMonth' | 'lastMonth' | 'last3months' | 'custom' | null>('thisMonth');
  const [customRange, setCustomRange] = useState<PeriodBounds | null>(null);
  const [customFromDate, setCustomFromDate] = useState(() => new Date(Date.now() - 30 * DAY_MS));
  const [customToDate, setCustomToDate] = useState(() => new Date());
  const [pickingField, setPickingField] = useState<'from' | 'to' | null>(null);

  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [budgetStatus, setBudgetStatus] = useState<BudgetStatus | null>(null);

  const loadMonthStartDay = useCallback(() => {
    getSetting('month_start_day').then((v) => setMonthStartDay(v ? Number(v) : 1));
  }, []);
  useEffect(() => { loadMonthStartDay(); }, [loadMonthStartDay]);
  // This screen stays mounted beneath the filter sheet (a Modal, not a pushed route) so a
  // mount-only effect would normally be enough, but it's also reachable while Settings is
  // pushed on top of it (category row → SpendDetail → ... → Settings) — re-read on focus
  // to match the AnalyticsScreen/DashboardScreen convention.
  useFocusEffect(useCallback(() => { loadMonthStartDay(); }, [loadMonthStartDay]));

  // Accounts/categories rarely change and aren't affected by anything this screen does —
  // load once on mount rather than gating behind the filter sheet's first open.
  useEffect(() => {
    getAccounts().then(setAccounts);
    getCategories().then(setCategories);
  }, []);

  const bounds = useMemo(() => getMonthBounds(refDate, monthStartDay), [refDate, monthStartDay]);
  // customRange (when set) overrides `bounds` everywhere below. MonthSwitcher is hidden
  // while a custom range is active — stepping "one month" has no clear meaning once the
  // displayed range is an arbitrary multi-month/custom span.
  const activeBounds = useMemo(() => customRange ?? bounds, [customRange, bounds]);

  const priorBounds = useMemo<PeriodBounds>(() => {
    if (dateRangeMode === 'custom' && customRange) {
      const span = customRange.to - customRange.from;
      return { from: customRange.from - span, to: customRange.to - span };
    }
    const prevRefDate = new Date(refDate.getFullYear(), refDate.getMonth() - 1, refDate.getDate());
    return getMonthBounds(prevRefDate, monthStartDay);
  }, [dateRangeMode, customRange, refDate, monthStartDay]);

  const passesFilters = useCallback(
    (tx: TxRecord) => {
      if (categoryFilter != null && tx.categoryId !== categoryFilter) return false;
      if (
        accountFilter != null &&
        (tx.bankName !== accountFilter.bankName || (tx.accountLast4 ?? '') !== (accountFilter.last4 ?? ''))
      )
        return false;
      // Merchant filter matches the exact tx.merchant string of an existing transaction
      // (not free text) — the picker lists real merchant values, so exact match is correct
      // and avoids partial-match false positives that a search box would invite.
      if (merchantFilter != null && tx.merchant !== merchantFilter) return false;
      return true;
    },
    [categoryFilter, accountFilter, merchantFilter],
  );

  const inBounds = useCallback(
    (tx: TxRecord, b: PeriodBounds) =>
      !tx.deletedAt &&
      countsTowardTotals(tx) &&
      tx.type !== TransactionType.BALANCE_UPDATE &&
      tx.timestamp >= b.from &&
      tx.timestamp <= b.to,
    [],
  );

  const filteredTxs = useMemo(
    () =>
      txs
        .filter((tx) => inBounds(tx, activeBounds) && passesFilters(tx))
        .sort((a, b) => b.timestamp - a.timestamp),
    [txs, activeBounds, inBounds, passesFilters],
  );

  // isExpense-only (not isDebit) to match categoryBreakdown/accountBreakdown below and the
  // budget/Analytics convention documented in CLAUDE.md — TRANSFER/INVESTMENT don't count
  // toward "spend" here, so the header total and the pie slices sum to the same number.
  const total = useMemo(() => netSpendTotal(txs, inBounds, activeBounds, passesFilters), [txs, inBounds, activeBounds, passesFilters]);

  const priorTotal = useMemo(
    () => netSpendTotal(txs, inBounds, priorBounds, passesFilters),
    [txs, inBounds, priorBounds, passesFilters],
  );

  const comparison = useMemo(() => {
    if (priorTotal === 0) {
      return total > 0 ? { text: 'New spend this period', color: Colors.onSurfaceVariant } : null;
    }
    const pctChange = ((total - priorTotal) / priorTotal) * 100;
    const rounded = Math.round(pctChange);
    if (rounded === 0) return null;
    return rounded > 0
      ? { text: `↑${rounded}% vs last period`, color: Colors.errorMuted }
      : { text: `↓${Math.abs(rounded)}% vs last period`, color: Colors.primary };
  }, [total, priorTotal]);

  // Budget banner only makes sense against the ACTUAL current month (getBudgetStatuses has
  // no historical-period parameter), a single category filter, and the non-custom period mode.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (categoryFilter == null || dateRangeMode !== 'period') {
        if (!cancelled) setBudgetStatus(null);
        return;
      }
      const currentMonthBounds = getMonthBounds(new Date(), monthStartDay);
      if (currentMonthBounds.from !== bounds.from) {
        if (!cancelled) setBudgetStatus(null);
        return;
      }
      const statuses = await getBudgetStatuses();
      if (cancelled) return;
      setBudgetStatus(statuses.find((s) => s.budget.categoryId === categoryFilter) ?? null);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [categoryFilter, dateRangeMode, bounds, monthStartDay]);

  // Bucket net (refund-adjusted) expense spend across the active period. ≤45 days keeps
  // ≤45 daily buckets; beyond that a custom range switches to weekly buckets so a 6-month
  // range still lands under ~26 buckets rather than 180+ daily ones.
  const barData: BarDatum[] = useMemo(() => {
    const spanDays = (activeBounds.to - activeBounds.from) / DAY_MS;
    const useDaily = spanDays <= 45;
    const buckets: { from: number; to: number; label: string }[] = [];
    if (useDaily) {
      let cursor = new Date(activeBounds.from);
      while (cursor.getTime() <= activeBounds.to) {
        const db = getDayBounds(cursor);
        buckets.push({ from: db.from, to: db.to, label: String(cursor.getDate()) });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      }
    } else {
      let cursor = new Date(activeBounds.from);
      while (cursor.getTime() <= activeBounds.to) {
        const wb = getWeekBounds(cursor);
        buckets.push({
          from: wb.from,
          to: wb.to,
          label: new Date(wb.from).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        });
        cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 7);
      }
    }
    const sums = buckets.map((b) => ({ label: b.label, value: 0 }));

    // Net refunds against the ORIGINAL expense's bucket (the day/week the expense
    // occurred), not the refund's own bucket — same rule as netSpendTotal/sumSpend, just
    // applied per-bucket instead of over the whole period. Scans `txs` (not filteredTxs)
    // for refund detection since a refund credit usually fails passesFilters itself
    // (no categoryId/merchant of its own) — see netSpendTotal's comment above.
    const byId = new Map(txs.map((t) => [t.id, t]));
    const refundByPartner = new Map<number, number>();
    for (const tx of txs) {
      if (!inBounds(tx, activeBounds) || !isRefundCredit(tx) || tx.linkPartnerId == null) continue;
      const partner = byId.get(tx.linkPartnerId);
      if (partner && passesFilters(partner)) {
        refundByPartner.set(tx.linkPartnerId, (refundByPartner.get(tx.linkPartnerId) ?? 0) + tx.amount);
      }
    }
    for (const tx of txs) {
      if (!inBounds(tx, activeBounds) || !isExpense(tx) || !passesFilters(tx)) continue;
      const refunded = refundByPartner.get(tx.id) ?? 0;
      const net = Math.max(0, tx.amount - refunded);
      if (net === 0) continue;
      const idx = buckets.findIndex((b) => tx.timestamp >= b.from && tx.timestamp <= b.to);
      if (idx >= 0) sums[idx].value += net;
    }
    return sums;
  }, [txs, activeBounds, inBounds, passesFilters]);

  // Pure-category view: breakdown by merchant, netting refund credits against the
  // ORIGINAL expense's merchant (mirroring sumSpend()'s linkPartnerId resolution in
  // budgets.ts) since the credit itself usually carries no categoryId/merchant tie.
  const categoryBreakdown: BreakdownRow[] | null = useMemo(() => {
    if (categoryFilter == null || accountFilter != null || merchantFilter != null) return null;
    const byId = new Map(txs.map((t) => [t.id, t]));
    const byMerchant = new Map<string, number>();
    for (const tx of txs) {
      if (!inBounds(tx, activeBounds)) continue;
      if (isRefundCredit(tx)) {
        const partner = tx.linkPartnerId != null ? byId.get(tx.linkPartnerId) : undefined;
        const cat = partner?.categoryId ?? tx.categoryId;
        if (cat !== categoryFilter) continue;
        const merchant = partner?.merchant || tx.merchant || 'Unknown';
        byMerchant.set(merchant, (byMerchant.get(merchant) ?? 0) - tx.amount);
        continue;
      }
      if (!isExpense(tx) || tx.categoryId !== categoryFilter) continue;
      const merchant = tx.merchant || 'Unknown';
      byMerchant.set(merchant, (byMerchant.get(merchant) ?? 0) + tx.amount);
    }
    return buildBreakdownRows(byMerchant);
  }, [txs, categoryFilter, accountFilter, merchantFilter, activeBounds, inBounds]);

  // Pure-account view: same pattern, grouped by resolved category instead of merchant.
  const accountBreakdown: BreakdownRow[] | null = useMemo(() => {
    if (accountFilter == null || categoryFilter != null || merchantFilter != null) return null;
    const byId = new Map(txs.map((t) => [t.id, t]));
    const catById = new Map(categories.map((c) => [c.id, c]));
    const byCat = new Map<number | null, number>();
    for (const tx of txs) {
      if (!inBounds(tx, activeBounds)) continue;
      if (tx.bankName !== accountFilter.bankName || (tx.accountLast4 ?? '') !== (accountFilter.last4 ?? '')) continue;
      if (isRefundCredit(tx)) {
        const partner = tx.linkPartnerId != null ? byId.get(tx.linkPartnerId) : undefined;
        const cat = partner?.categoryId ?? tx.categoryId;
        byCat.set(cat, (byCat.get(cat) ?? 0) - tx.amount);
        continue;
      }
      if (!isExpense(tx)) continue;
      byCat.set(tx.categoryId, (byCat.get(tx.categoryId) ?? 0) + tx.amount);
    }
    const byLabel = new Map<string, number>();
    for (const [catId, value] of byCat.entries()) {
      const label = catId == null ? 'Uncategorized' : catById.get(catId)?.name ?? 'Unknown';
      byLabel.set(label, (byLabel.get(label) ?? 0) + value);
    }
    return buildBreakdownRows(byLabel);
  }, [txs, accountFilter, categoryFilter, merchantFilter, activeBounds, inBounds, categories]);

  const distinctMerchants = useMemo(() => {
    const set = new Set<string>();
    for (const tx of txs) {
      if (tx.deletedAt || !tx.merchant) continue;
      if (tx.timestamp < activeBounds.from || tx.timestamp > activeBounds.to) continue;
      set.add(tx.merchant);
    }
    return Array.from(set).sort();
  }, [txs, activeBounds]);

  const disableNext = bounds.to >= Date.now();

  // The originating entity (from route params) stays the screen's primary identity even
  // if the user layers additional filters on top from the sheet — simplest reasonable
  // default that can't crash regardless of which filters diverge from it.
  const title =
    params.filterType === 'category'
      ? params.categoryName
      : params.filterType === 'merchant'
        ? params.merchant
        : accountLabel(params.bankName, params.last4, accountLabels);
  const subtitle =
    params.filterType === 'category' ? 'Category' : params.filterType === 'merchant' ? 'Merchant' : params.last4 ? `•••• ${params.last4}` : 'Account';

  // Fix 6: title/subtitle above only reflect the route params this screen was entered
  // with — they don't track filter-sheet edits made afterward. Rather than restructure
  // title resolution to track arbitrary combinations of the three filters live (nontrivial:
  // "which filter wins" for display is ambiguous once more than one is set), just flag the
  // divergence so the header doesn't silently lie about what's shown below it.
  const filtersDiffer =
    (params.filterType === 'category' ? categoryFilter !== params.categoryId : categoryFilter != null) ||
    (params.filterType === 'account'
      ? accountFilter?.bankName !== params.bankName || (accountFilter?.last4 ?? '') !== (params.last4 ?? '')
      : accountFilter != null) ||
    (params.filterType === 'merchant' ? merchantFilter !== params.merchant : merchantFilter != null);

  // Fix 3: the screen is one scrollable page (header content, THEN an unbounded
  // transaction list), so the outer container is a single FlatList — everything above the
  // list goes in ListHeaderComponent — rather than a `.map()` nested inside a ScrollView,
  // which would defeat virtualization for lists that can hold thousands of rows.
  const handleRowPress = useCallback(
    (id: number) => navigation.navigate('TransactionDetail', { transactionId: id }),
    [navigation],
  );
  const renderItem = useCallback(
    ({ item }: { item: TxRecord }) => <SpendTxRow tx={item} onPressId={handleRowPress} />,
    [handleRowPress],
  );
  const keyExtractor = useCallback((tx: TxRecord) => String(tx.id), []);

  const listHeader = (
    <>
      <View className="flex-row items-center justify-between mb-md">
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text className="font-inter text-body-md text-primary">← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setFilterSheetVisible(true)} hitSlop={8} className="p-xs">
          <FilterIcon color={Colors.onSurface} size={22} />
        </TouchableOpacity>
      </View>

      <Text className="font-inter-bold text-headline-sm text-on-surface">
        {title}
        {filtersDiffer ? ' (filtered)' : ''}
      </Text>
      <Text className="font-inter text-supporting-text text-on-surface-variant mt-[2px]">{subtitle}</Text>
      <Text className="font-mono-medium text-numeric-lg text-on-surface mt-sm">{formatAmount(total)}</Text>
      <View className="flex-row items-center gap-sm mt-[4px]">
        <Text className="font-inter text-supporting-text text-on-surface-variant">
          {filteredTxs.length} transaction{filteredTxs.length !== 1 ? 's' : ''} this period
        </Text>
        {comparison && (
          <Text className="font-inter-medium text-supporting-text" style={{ color: comparison.color }}>
            {comparison.text}
          </Text>
        )}
      </View>

      {dateRangeMode === 'period' && (
        <View className="mt-md">
          <MonthSwitcher
            bounds={bounds}
            disableNext={disableNext}
            onChange={(direction) =>
              setRefDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + (direction === 'next' ? 1 : -1), prev.getDate()))
            }
          />
        </View>
      )}

      {budgetStatus && budgetStatus.pct >= 100 && (
        <View
          className="mt-md rounded-lg p-md"
          style={{ backgroundColor: withAlpha(Colors.errorMuted, 0.15), borderWidth: 1, borderColor: Colors.errorMuted }}
        >
          <Text className="font-inter-medium text-body-sm" style={{ color: Colors.errorMuted }}>
            Over budget — spent {formatAmount(budgetStatus.spent)} of {formatAmount(budgetStatus.limit)}
          </Text>
        </View>
      )}
      {budgetStatus && budgetStatus.pct >= 80 && budgetStatus.pct < 100 && (
        <View className="mt-md rounded-lg p-md" style={{ backgroundColor: withAlpha(AMBER, 0.15), borderWidth: 1, borderColor: AMBER }}>
          <Text className="font-inter-medium text-body-sm" style={{ color: AMBER }}>
            Approaching budget — {Math.round(budgetStatus.pct)}% used
          </Text>
        </View>
      )}

      <View className="mt-xl bg-surface-container-lowest rounded-xl border border-outline-variant p-md">
        <SpendBarChart data={barData} />
      </View>

      {(categoryBreakdown || accountBreakdown) && (
        <View className="mt-xl">
          <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md">
            {categoryBreakdown ? 'By merchant' : 'By category'}
          </Text>
          <View className="bg-surface-container-lowest rounded-xl border border-outline-variant p-lg items-center">
            <DonutChart
              data={(categoryBreakdown ?? accountBreakdown ?? []).map((r): DonutDatum => ({ label: r.label, value: r.value, color: r.color }))}
              size={180}
              strokeWidth={26}
            />
            <View className="w-full mt-lg">
              {(categoryBreakdown ?? accountBreakdown ?? []).map((row) => (
                <View key={row.label} className="flex-row items-center gap-sm py-xs">
                  <View className="w-[10px] h-[10px] rounded-full" style={{ backgroundColor: row.color }} />
                  <Text className="flex-1 font-inter-medium text-body-sm text-on-surface" numberOfLines={1}>{row.label}</Text>
                  <Text className="font-mono text-numeric-sm text-on-surface-variant">{formatAmount(row.value)}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      )}
      {categoryFilter != null && accountFilter != null && (
        <Text className="font-inter text-body-sm text-on-surface-variant mt-xl">
          Breakdown not shown when both category and account filters are active
        </Text>
      )}

      <Text className="font-inter-bold text-[16px] leading-[26px] text-on-surface mb-md mt-xl">Transactions</Text>
    </>
  );

  return (
    <>
      <FlatList
        className="flex-1 bg-background"
        contentContainerClassName="p-container-margin pb-[40px]"
        showsVerticalScrollIndicator={false}
        data={filteredTxs}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        ItemSeparatorComponent={ItemSeparator}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          <Text className="font-inter text-body-md text-on-surface-variant text-center p-md">No transactions in this period</Text>
        }
      />

      <BottomSheet visible={filterSheetVisible} onClose={() => setFilterSheetVisible(false)}>
        <KeyboardAwareScrollView
          enableOnAndroid
          extraScrollHeight={Spacing.lg}
          keyboardShouldPersistTaps="handled"
          contentContainerClassName="pb-lg"
        >
          <View className="flex-row items-center justify-between mb-md">
            <Text className="font-inter-bold text-headline-sm text-on-surface">Filters</Text>
            <TouchableOpacity onPress={() => setFilterSheetVisible(false)} hitSlop={8}>
              <CloseIcon color={Colors.onSurfaceVariant} size={20} />
            </TouchableOpacity>
          </View>

          <Text className="font-inter-semibold text-section-header text-on-surface-variant mb-sm">DATE RANGE</Text>
          <View className="flex-row flex-wrap gap-sm mb-lg">
            <DateChip
              label="This month"
              // Bounds-compared (not activePreset-driven) so this stays accurate if the
              // MonthSwitcher above is used to step back to the current month without
              // re-tapping this chip.
              active={dateRangeMode === 'period' && bounds.from === getMonthBounds(new Date(), monthStartDay).from}
              onPress={() => {
                setDateRangeMode('period');
                setCustomRange(null);
                setRefDate(new Date());
                setActivePreset('thisMonth');
              }}
            />
            <DateChip
              label="Last month"
              active={
                dateRangeMode === 'period' &&
                bounds.from ===
                  getMonthBounds(new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()), monthStartDay).from
              }
              onPress={() => {
                setDateRangeMode('period');
                setCustomRange(null);
                setRefDate((prev) => new Date(new Date().getFullYear(), new Date().getMonth() - 1, new Date().getDate()));
                setActivePreset('lastMonth');
              }}
            />
            <DateChip
              label="Last 3 months"
              active={activePreset === 'last3months'}
              onPress={() => {
                // A single `bounds` can't span multiple month-start-day periods, so "Last 3
                // months" is expressed as a custom range from 3 months back through now.
                // Applied immediately on tap — no manual picker for this preset.
                const now = new Date();
                const threeBack = new Date(now.getFullYear(), now.getMonth() - 2, now.getDate());
                const start = getMonthBounds(threeBack, monthStartDay);
                const end = getMonthBounds(now, monthStartDay);
                setDateRangeMode('custom');
                setCustomRange({ from: start.from, to: end.to });
                setActivePreset('last3months');
              }}
            />
            <DateChip
              label="Custom"
              active={activePreset === 'custom'}
              onPress={() => {
                setDateRangeMode('custom');
                setCustomRange({ from: getDayBounds(customFromDate).from, to: getDayBounds(customToDate).to });
                setActivePreset('custom');
              }}
            />
          </View>

          {activePreset === 'custom' && (
            <View className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden mb-lg">
              <TouchableOpacity className="flex-row items-center justify-between px-md py-md" onPress={() => setPickingField('from')}>
                <Text className="font-inter text-body-standard text-on-surface-variant">From</Text>
                <Text className="font-inter-medium text-body-standard text-primary">{formatDate(customFromDate.getTime())}</Text>
              </TouchableOpacity>
              <View className="h-[1px] bg-outline-variant mx-md" />
              <TouchableOpacity className="flex-row items-center justify-between px-md py-md" onPress={() => setPickingField('to')}>
                <Text className="font-inter text-body-standard text-on-surface-variant">To</Text>
                <Text className="font-inter-medium text-body-standard text-primary">{formatDate(customToDate.getTime())}</Text>
              </TouchableOpacity>
            </View>
          )}
          {pickingField !== null && (
            <DateTimePicker
              value={pickingField === 'from' ? customFromDate : customToDate}
              mode="date"
              display="default"
              maximumDate={pickingField === 'from' ? customToDate : new Date()}
              minimumDate={pickingField === 'to' ? customFromDate : undefined}
              onChange={(_event, selected) => {
                if (selected) {
                  if (pickingField === 'from') {
                    setCustomFromDate(selected);
                    setCustomRange({ from: getDayBounds(selected).from, to: getDayBounds(customToDate).to });
                  } else {
                    setCustomToDate(selected);
                    setCustomRange({ from: getDayBounds(customFromDate).from, to: getDayBounds(selected).to });
                  }
                }
                setPickingField(null);
              }}
            />
          )}

          <FilterSection
            title="ACCOUNT"
            activeLabel={accountFilter ? accountLabel(accountFilter.bankName, accountFilter.last4, accountLabels) : null}
            onClear={() => setAccountFilter(null)}
          >
            {accounts.map((acc) => {
              const active = accountFilter?.bankName === acc.bankName && (accountFilter?.last4 ?? '') === (acc.last4 ?? '');
              return (
                <PickerRow
                  key={acc.id}
                  label={accountLabel(acc.bankName, acc.last4, accountLabels) + (acc.last4 ? ` •••• ${acc.last4}` : '')}
                  active={active}
                  onPress={() => setAccountFilter({ bankName: acc.bankName, last4: acc.last4 ?? undefined })}
                />
              );
            })}
          </FilterSection>

          <FilterSection
            title="CATEGORY"
            activeLabel={categoryFilter != null ? categories.find((c) => c.id === categoryFilter)?.name ?? null : null}
            onClear={() => setCategoryFilter(null)}
          >
            {categories.map((cat) => (
              <PickerRow
                key={cat.id}
                label={`${cat.emoji} ${cat.name}`}
                active={categoryFilter === cat.id}
                onPress={() => setCategoryFilter(cat.id)}
              />
            ))}
          </FilterSection>

          <FilterSection title="MERCHANT" activeLabel={merchantFilter} onClear={() => setMerchantFilter(null)}>
            {distinctMerchants.length === 0 ? (
              <Text className="font-inter text-body-sm text-on-surface-variant px-md py-sm">No merchants in this period</Text>
            ) : (
              distinctMerchants.map((merchant) => (
                <PickerRow key={merchant} label={merchant} active={merchantFilter === merchant} onPress={() => setMerchantFilter(merchant)} />
              ))
            )}
          </FilterSection>

          <TouchableOpacity
            className="items-center py-3 rounded-lg bg-primary mt-md"
            onPress={() => setFilterSheetVisible(false)}
          >
            <Text className="font-inter-medium text-body-standard text-on-primary">Done</Text>
          </TouchableOpacity>
        </KeyboardAwareScrollView>
      </BottomSheet>
    </>
  );
}

function buildBreakdownRows(byLabel: Map<string, number>): BreakdownRow[] {
  const entries = Array.from(byLabel.entries())
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1]);
  const top = entries.slice(0, 5);
  const restTotal = entries.slice(5).reduce((s, [, v]) => s + v, 0);
  const rows: BreakdownRow[] = top.map(([label, value], i) => ({ label, value, color: SLICE_COLORS[i % SLICE_COLORS.length] }));
  if (restTotal > 0) rows.push({ label: 'Other', value: restTotal, color: SLICE_COLORS[rows.length % SLICE_COLORS.length] });
  return rows;
}

function DateChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className={`px-md py-xs rounded-full border ${active ? 'bg-primary border-primary' : 'border-outline-variant'}`}
    >
      <Text className={`font-inter-medium text-body-sm ${active ? 'text-on-primary' : 'text-on-surface-variant'}`}>{label}</Text>
    </TouchableOpacity>
  );
}

function FilterSection({
  title,
  activeLabel,
  onClear,
  children,
}: {
  title: string;
  activeLabel: string | null;
  onClear: () => void;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-lg">
      <View className="flex-row items-center justify-between mb-sm">
        <Text className="font-inter-semibold text-section-header text-on-surface-variant">
          {title}
          {activeLabel ? ` — ${activeLabel}` : ''}
        </Text>
        {activeLabel && (
          <TouchableOpacity onPress={onClear}>
            <Text className="font-inter-medium text-body-sm text-primary">Clear</Text>
          </TouchableOpacity>
        )}
      </View>
      <View className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden max-h-[220px]">
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {children}
        </ScrollView>
      </View>
    </View>
  );
}

function PickerRow({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity className="flex-row items-center justify-between px-md py-sm border-b border-outline-variant" onPress={onPress}>
      <Text className={`font-inter text-body-standard ${active ? 'text-primary' : 'text-on-surface'}`} numberOfLines={1}>
        {label}
      </Text>
      {active && <View className="w-[8px] h-[8px] rounded-full bg-primary" />}
    </TouchableOpacity>
  );
}

// Module-level (not a fresh closure per render) so FlatList's ItemSeparatorComponent prop
// stays a stable reference, per CLAUDE.md's list-performance rules.
function ItemSeparator() {
  return <View style={{ height: Spacing.xs }} />;
}

// Fix 3: each row is now its own bordered/rounded card (rather than one continuous card
// with the previous last-row-only divider) since FlatList's ListHeaderComponent/items are
// separate siblings — there's no single wrapping container left to put one shared card
// border around. Wrapped in React.memo with only primitive/stable props (tx object
// reference + a stable onPressId callback) so re-renders don't cascade through the list.
const SpendTxRow = React.memo(function SpendTxRow({ tx, onPressId }: { tx: TxRecord; onPressId: (id: number) => void }) {
  const debit = isDebit(tx.type);
  const color = debit ? Colors.errorMuted : Colors.primary;
  const accountLabels = useTxStore((s) => s.accountLabels);
  const onPress = useCallback(() => onPressId(tx.id), [onPressId, tx.id]);
  return (
    <TouchableOpacity
      className="flex-row justify-between items-center py-[12px] px-md bg-surface-container-lowest rounded-xl border border-outline-variant"
      onPress={onPress}
    >
      <View className="flex-1">
        <Text className="font-inter-medium text-body-sm text-on-surface" numberOfLines={1}>{tx.merchant || accountLabel(tx.bankName, tx.accountLast4, accountLabels)}</Text>
        <Text className="font-mono text-label-sm tracking-[0px] text-on-surface-variant mt-[2px]">{formatDate(tx.timestamp)}</Text>
      </View>
      <Text className="font-mono text-[15px] leading-[20px]" style={{ color }}>
        {debit ? '-' : '+'}{formatAmount(tx.amount, tx.currency)}
      </Text>
    </TouchableOpacity>
  );
});
