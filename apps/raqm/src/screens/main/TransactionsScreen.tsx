import React, { memo, useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useTxStore } from '../../store/txStore';
import { useAppStore } from '../../store/appStore';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';
import { getCategories, mergeTxs, groupTxs, type Category, type TxRecord } from '../../db/database';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { formatAmount } from '../../utils/format';
import { SearchIcon } from '../../components/TabIcon';

const DAY_MS = 86_400_000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function dayLabel(ts: number): string {
  const now = Date.now();
  const diff = Math.round((startOfDay(now) - startOfDay(ts)) / DAY_MS);
  if (diff === 0) return 'TODAY';
  if (diff === 1) return 'YESTERDAY';
  const d = new Date(ts);
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  if (d.getFullYear() !== new Date(now).getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-IN', opts).toUpperCase();
}

function isCredit(type: TransactionType): boolean {
  return type === TransactionType.INCOME || type === TransactionType.CREDIT;
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

function txTypeLabel(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME: return 'Income';
    case TransactionType.CREDIT: return 'Credit';
    case TransactionType.EXPENSE: return 'Expense';
    case TransactionType.TRANSFER: return 'Transfer';
    case TransactionType.INVESTMENT: return 'Investment';
    case TransactionType.BALANCE_UPDATE: return 'Balance';
    default: return type;
  }
}

function timeLabel(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
}

type ListItem =
  | { kind: 'header'; key: string; label: string; total: number }
  | { kind: 'single'; key: string; tx: TxRecord }
  | { kind: 'group'; key: string; groupId: number; members: TxRecord[] };

export function TransactionsScreen() {
  const txs = useTxStore((s) => s.txs);
  const refresh = useTxStore((s) => s.refresh);
  const { userName } = useAppStore();
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<null | 'merge' | 'group'>(null);
  const [modalName, setModalName] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getCategories().then((cats) => { if (!cancelled) setCategories(cats); }).catch(() => {});
      return () => { cancelled = true; };
    }, []),
  );

  const categoryNames = useMemo(() => {
    const map = new Map<number, string>();
    for (const c of categories) map.set(c.id, c.name);
    return map;
  }, [categories]);

  const initial = (userName.trim()[0] ?? 'R').toUpperCase();
  const currency = txs[0]?.currency ?? '₹';

  const sorted = useMemo(
    () => [...txs].sort((a, b) => b.timestamp - a.timestamp),
    [txs],
  );

  const filtered = useMemo(() => {
    if (!query.trim()) return sorted;
    const q = query.toLowerCase();
    return sorted.filter(
      tx => (tx.merchant ?? '').toLowerCase().includes(q) || tx.bankName.toLowerCase().includes(q),
    );
  }, [sorted, query]);

  // Narrative statement: this week (since Monday) vs the same span last week.
  const statement = useMemo(() => {
    if (txs.length === 0) return null;
    const now = new Date();
    const monday = startOfDay(now.getTime()) - ((now.getDay() + 6) % 7) * DAY_MS;
    const span = now.getTime() - monday;
    const thisWeek = txs.filter(t => t.timestamp >= monday).length;
    if (thisWeek === 0) return 'A quiet week so far — no transactions since Monday.';
    const lastWeek = txs.filter(t => t.timestamp >= monday - 7 * DAY_MS && t.timestamp < monday - 7 * DAY_MS + span).length;
    const pace = thisWeek < lastWeek ? 'quiet' : thisWeek > lastWeek ? 'busy' : 'steady';
    return `You had a ${pace} start to the week, with ${thisWeek} transaction${thisWeek === 1 ? '' : 's'} since Monday.`;
  }, [txs]);

  // Day-grouped ledger: header items interleaved with rows; grouped txs stay
  // one row (expandable) keyed to their most recent member's day. The header
  // total is that day's outflow (debits only), matching the design's day sums.
  const items: ListItem[] = useMemo(() => {
    const dayTotals = new Map<number, number>();
    for (const tx of filtered) {
      if (!isDebit(tx.type)) continue;
      const day = startOfDay(tx.timestamp);
      dayTotals.set(day, (dayTotals.get(day) ?? 0) + tx.amount);
    }
    const seenGroups = new Set<number>();
    const out: ListItem[] = [];
    let currentDay = -1;
    for (const tx of filtered) {
      if (tx.groupId != null && seenGroups.has(tx.groupId)) continue;
      const day = startOfDay(tx.timestamp);
      if (day !== currentDay) {
        currentDay = day;
        out.push({ kind: 'header', key: `h${day}`, label: dayLabel(tx.timestamp), total: dayTotals.get(day) ?? 0 });
      }
      if (tx.groupId != null) {
        seenGroups.add(tx.groupId);
        out.push({
          kind: 'group',
          key: `g${tx.groupId}`,
          groupId: tx.groupId,
          members: filtered.filter(t => t.groupId === tx.groupId),
        });
      } else {
        out.push({ kind: 'single', key: `t${tx.id}`, tx });
      }
    }
    return out;
  }, [filtered]);

  const handleRowPress = useCallback((id: number) => {
    if (selectMode) {
      setSelected(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    } else {
      navigation.navigate('TransactionDetail', { transactionId: id });
    }
  }, [selectMode, navigation]);

  const handleRowLongPress = useCallback((id: number) => {
    if (!selectMode) {
      setSelectMode(true);
      setSelected(new Set([id]));
    }
  }, [selectMode]);

  const toggleGroup = useCallback((groupId: number) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId); else next.add(groupId);
      return next;
    });
  }, []);

  function exitSelectMode() {
    setSelectMode(false);
    setSelected(new Set());
  }

  // In-flight guard: a double-tap on Confirm used to run mergeTxs twice, producing
  // two merged rows (the second call re-merged the already-soft-deleted originals).
  const [modalBusy, setModalBusy] = useState(false);

  async function confirmMerge() {
    if (!modalName.trim() || selected.size < 2 || modalBusy) return;
    setModalBusy(true);
    setModalError(null);
    try {
      await mergeTxs(Array.from(selected), modalName.trim());
      await refresh();
      setModal(null);
      setModalName('');
      exitSelectMode();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Could not merge transactions');
    } finally {
      setModalBusy(false);
    }
  }

  async function confirmGroup() {
    if (!modalName.trim() || selected.size < 2 || modalBusy) return;
    setModalBusy(true);
    try {
      await groupTxs(Array.from(selected), modalName.trim());
      await refresh();
      setModal(null);
      setModalName('');
      exitSelectMode();
    } catch (e) {
      setModalError(e instanceof Error ? e.message : 'Could not group transactions');
    } finally {
      setModalBusy(false);
    }
  }

  const renderItem = useCallback(({ item }: { item: ListItem }) => {
    if (item.kind === 'header') {
      return (
        <View style={styles.dayHeader}>
          <Text style={styles.dayLabel}>{item.label}</Text>
          <Text style={styles.dayTotal}>{formatAmount(item.total, currency)}</Text>
        </View>
      );
    }
    if (item.kind === 'group') {
      const sum = item.members.reduce((s, m) => s + (isDebit(m.type) ? m.amount : -m.amount), 0);
      const expanded = expandedGroups.has(item.groupId);
      return (
        <View>
          <TouchableOpacity style={styles.row} activeOpacity={0.7} onPress={() => toggleGroup(item.groupId)}>
            <View style={styles.rowInfo}>
              <Text style={styles.rowMerchant} numberOfLines={1}>Group · {item.members.length} transactions</Text>
              <Text style={styles.rowMeta}>Tap to {expanded ? 'collapse' : 'expand'}</Text>
            </View>
            <Text style={[styles.rowAmount, { color: sum < 0 ? Colors.primaryContainer : Colors.inkHeadline }]}>
              {formatAmount(sum, currency)}
            </Text>
          </TouchableOpacity>
          {expanded && item.members.map(m => (
            <TxRow
              key={m.id}
              tx={m}
              currency={currency}
              categoryName={m.categoryId != null ? categoryNames.get(m.categoryId) ?? null : null}
              indent
              selectMode={selectMode}
              selected={selected.has(m.id)}
              onPressId={handleRowPress}
              onLongPressId={handleRowLongPress}
            />
          ))}
        </View>
      );
    }
    return (
      <TxRow
        tx={item.tx}
        currency={currency}
        categoryName={item.tx.categoryId != null ? categoryNames.get(item.tx.categoryId) ?? null : null}
        selectMode={selectMode}
        selected={selected.has(item.tx.id)}
        onPressId={handleRowPress}
        onLongPressId={handleRowLongPress}
      />
    );
  }, [expandedGroups, toggleGroup, currency, categoryNames, selectMode, selected, handleRowPress, handleRowLongPress]);

  const keyExtractor = useCallback((item: ListItem) => item.key, []);

  return (
    <View style={styles.root}>
      {/* Top bar: avatar + Fraunces title, search / cancel on the right */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.topBarTitle}>Timeline</Text>
        </View>
        {selectMode ? (
          <TouchableOpacity onPress={exitSelectMode} hitSlop={8}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={() => setSearchOpen(open => { if (open) setQuery(''); return !open; })}
            hitSlop={8}
          >
            <SearchIcon color={Colors.primary} size={22} />
          </TouchableOpacity>
        )}
      </View>

      {searchOpen && !selectMode && (
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.search}
            placeholder="Search merchant or bank…"
            placeholderTextColor={Colors.inkLabel}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
          />
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          !searchOpen && statement ? <Text style={styles.statement}>{statement}</Text> : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>
              {query.trim()
                ? 'Nothing matches your search.'
                : "We're still learning your financial patterns. Transactions will appear as your timeline grows."}
            </Text>
          </View>
        }
      />

      {selectMode && selected.size >= 2 && (
        <View style={styles.actionBar}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setModalError(null); setModal('merge'); }}>
            <Text style={styles.actionBtnText}>Merge ({selected.size})</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => { setModalError(null); setModal('group'); }}>
            <Text style={styles.actionBtnText}>Group ({selected.size})</Text>
          </TouchableOpacity>
        </View>
      )}

      {!selectMode && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('AddTransaction')}
        >
          <Text style={styles.fabIcon}>＋</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modal !== null} transparent animationType="fade" onRequestClose={() => { setModal(null); setModalError(null); }}>
        <Pressable style={styles.modalBackdrop} onPress={() => { setModal(null); setModalError(null); }}>
          <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{modal === 'merge' ? 'Merge into' : 'Group name'}</Text>
            <TextInput
              style={styles.modalInput}
              placeholder={modal === 'merge' ? 'Merchant name…' : 'e.g. Goa Trip'}
              placeholderTextColor={Colors.inkLabel}
              value={modalName}
              onChangeText={setModalName}
              autoFocus
            />
            {modalError && <Text style={styles.modalErrorText}>{modalError}</Text>}
            <TouchableOpacity
              style={styles.modalConfirm}
              onPress={modal === 'merge' ? confirmMerge : confirmGroup}
            >
              <Text style={styles.modalConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const TxRow = memo(function TxRow({
  tx, currency, categoryName, indent, selectMode, selected, onPressId, onLongPressId,
}: {
  tx: TxRecord;
  currency: string;
  categoryName: string | null;
  indent?: boolean;
  selectMode: boolean;
  selected: boolean;
  onPressId: (id: number) => void;
  onLongPressId: (id: number) => void;
}) {
  const credit = isCredit(tx.type);
  return (
    <TouchableOpacity
      style={[styles.row, indent && styles.rowIndent]}
      onPress={() => onPressId(tx.id)}
      onLongPress={() => onLongPressId(tx.id)}
      activeOpacity={0.7}
    >
      {selectMode && (
        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
          {selected && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
      )}
      <View style={styles.rowInfo}>
        <Text style={styles.rowMerchant} numberOfLines={1}>{tx.merchant || tx.bankName}</Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {tx.bankName}  •  {timeLabel(tx.timestamp)}  •  {categoryName
            ? categoryName
            : tx.type === TransactionType.EXPENSE
              ? <Text style={styles.rowMetaNotice}>Uncategorized</Text>
              : txTypeLabel(tx.type)}
        </Text>
      </View>
      <Text style={[styles.rowAmount, { color: credit ? Colors.primaryContainer : Colors.inkHeadline }]}>
        {formatAmount(tx.amount, currency)}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  topBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.sm, paddingBottom: Spacing.md,
  },
  topBarLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm + 4 },
  avatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surfaceVariant, borderWidth: 1, borderColor: Colors.borderSubtle,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { ...Typography.supportingText, color: Colors.inkHeadline },
  topBarTitle: { ...Typography.statementMobile, fontSize: 22, lineHeight: 28, color: Colors.onSurface },
  cancelText: { ...Typography.bodyStandard, color: Colors.primary },

  searchWrap: { paddingHorizontal: Spacing.containerMargin, paddingBottom: Spacing.md },
  search: {
    backgroundColor: Colors.bgSurface,
    borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...Typography.bodyStandard, color: Colors.onSurface,
  },

  list: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 100 },
  statement: {
    ...Typography.statementMobile, color: Colors.onSurface,
    marginTop: Spacing.sm, marginBottom: Spacing.lg,
  },

  dayHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
    marginTop: Spacing.xl, paddingBottom: Spacing.sm + 4,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  dayLabel: { ...Typography.sectionHeader, color: Colors.inkLabel },
  dayTotal: { ...Typography.numericSm, fontSize: 13, color: Colors.inkLabel },

  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md,
    paddingVertical: Spacing.md,
  },
  rowIndent: { paddingLeft: Spacing.lg },
  rowInfo: { flex: 1 },
  rowMerchant: { ...Typography.insightReading, color: Colors.inkHeadline },
  rowMeta: { ...Typography.supportingText, color: Colors.inkBody, marginTop: 2 },
  rowMetaNotice: { color: Colors.secondary },
  rowAmount: { ...Typography.numericMd, fontSize: 18, lineHeight: 26 },

  checkbox: {
    width: 22, height: 22, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.inkLabel,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center',
  },
  checkboxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxMark: { color: Colors.onPrimary, fontSize: 12, fontWeight: '700' },

  empty: { paddingTop: 80, alignItems: 'center', paddingHorizontal: Spacing.lg },
  emptyText: { ...Typography.supportingText, color: Colors.inkBody, textAlign: 'center' },

  fab: {
    position: 'absolute', right: Spacing.containerMargin, bottom: Spacing.xl,
    width: 56, height: 56, borderRadius: Radius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },
  fabIcon: { fontSize: 26, color: Colors.onPrimary, lineHeight: 28 },

  actionBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', gap: Spacing.sm,
    backgroundColor: Colors.bgSurfaceRaised, borderTopWidth: 1, borderTopColor: Colors.borderSubtle,
    padding: Spacing.md,
  },
  actionBtn: {
    flex: 1, backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: Spacing.sm, alignItems: 'center',
  },
  actionBtnText: { ...Typography.bodyStandard, color: Colors.onPrimary, fontFamily: 'Inter_500Medium' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalCard: {
    width: '85%', backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.lg, gap: Spacing.md,
  },
  modalTitle: { ...Typography.insightReading, color: Colors.inkHeadline },
  modalErrorText: { ...Typography.supportingText, color: Colors.errorMuted },
  modalInput: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderSubtle, paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...Typography.bodyStandard, color: Colors.onSurface,
  },
  modalConfirm: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.sm, alignItems: 'center' },
  modalConfirmText: { ...Typography.bodyStandard, color: Colors.onPrimary, fontFamily: 'Inter_500Medium' },
});
