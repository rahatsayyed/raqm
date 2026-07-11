import React, { memo, useCallback, useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Colors } from '../../theme';
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

// FAB glow shadow — shadow* values aren't expressible as core NativeWind classes.
const fabShadow = {
  shadowColor: Colors.primary,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.35,
  shadowRadius: 14,
  elevation: 8,
};

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
        <View className="flex-row justify-between items-baseline mt-[32px] pb-[12px] border-b border-border-subtle">
          <Text className="font-inter-semibold text-section-header text-ink-label">{item.label}</Text>
          <Text className="font-mono text-[13px] leading-[20px] text-ink-label">{formatAmount(item.total, currency)}</Text>
        </View>
      );
    }
    if (item.kind === 'group') {
      const sum = item.members.reduce((s, m) => s + (isDebit(m.type) ? m.amount : -m.amount), 0);
      const expanded = expandedGroups.has(item.groupId);
      return (
        <View>
          <TouchableOpacity className="flex-row items-start gap-[16px] py-[8px]" activeOpacity={0.7} onPress={() => toggleGroup(item.groupId)}>
            <View className="flex-1">
              <Text className="font-inter-medium text-insight-reading text-ink-headline" numberOfLines={1}>Group · {item.members.length} transactions</Text>
              <Text className="font-inter text-supporting-text text-ink-body mt-[2px]">Tap to {expanded ? 'collapse' : 'expand'}</Text>
            </View>
            <Text className={`font-mono-medium text-[18px] leading-[26px] ${sum < 0 ? 'text-primary-container' : 'text-ink-headline'}`}>
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
    <View className="flex-1 bg-background">
      {/* Top bar: avatar + Fraunces title, search / cancel on the right */}
      <View className="flex-row justify-between items-center px-[24px] pt-[8px] pb-[16px]">
        <View className="flex-row items-center gap-[12px]">
          <View className="w-[32px] h-[32px] rounded-[16px] bg-surface-variant border border-border-subtle items-center justify-center">
            <Text className="font-inter text-supporting-text text-ink-headline">{initial}</Text>
          </View>
          <Text className="font-fraunces text-[22px] leading-[28px] text-on-surface">Timeline</Text>
        </View>
        {selectMode ? (
          <TouchableOpacity onPress={exitSelectMode} hitSlop={8}>
            <Text className="font-inter text-body-standard text-primary">Cancel</Text>
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
        <View className="px-[24px] pb-[16px]">
          <TextInput
            className="bg-bg-surface rounded-[12px] border border-border-subtle px-[16px] py-[10px] font-inter text-body-standard text-on-surface"
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
        contentContainerClassName="px-[24px] pb-[100px]"
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          !searchOpen && statement ? (
            <Text className="font-fraunces text-statement-mobile text-on-surface mt-[8px] mb-[24px]">{statement}</Text>
          ) : null
        }
        ListEmptyComponent={
          <View className="pt-[80px] items-center px-[24px]">
            <Text className="font-inter text-supporting-text text-ink-body text-center">
              {query.trim()
                ? 'Nothing matches your search.'
                : "We're still learning your financial patterns. Transactions will appear as your timeline grows."}
            </Text>
          </View>
        }
      />

      {selectMode && selected.size >= 2 && (
        <View className="absolute left-0 right-0 bottom-0 flex-row gap-[8px] bg-bg-surface-raised border-t border-border-subtle p-[16px]">
          <TouchableOpacity className="flex-1 bg-primary rounded-[12px] py-[8px] items-center" onPress={() => { setModalError(null); setModal('merge'); }}>
            <Text className="font-inter-medium text-body-standard text-on-primary">Merge ({selected.size})</Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 bg-primary rounded-[12px] py-[8px] items-center" onPress={() => { setModalError(null); setModal('group'); }}>
            <Text className="font-inter-medium text-body-standard text-on-primary">Group ({selected.size})</Text>
          </TouchableOpacity>
        </View>
      )}

      {!selectMode && (
        <TouchableOpacity
          className="absolute right-[24px] bottom-[32px] w-[56px] h-[56px] rounded-full bg-primary items-center justify-center"
          style={fabShadow}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('AddTransaction')}
        >
          <Text className="text-[26px] leading-[28px] text-on-primary">＋</Text>
        </TouchableOpacity>
      )}

      <Modal visible={modal !== null} transparent animationType="fade" onRequestClose={() => { setModal(null); setModalError(null); }}>
        <Pressable className="flex-1 bg-black/50 items-center justify-center" onPress={() => { setModal(null); setModalError(null); }}>
          <Pressable className="w-[85%] bg-bg-surface-raised rounded-[16px] border border-border-subtle p-[24px] gap-[16px]" onPress={e => e.stopPropagation()}>
            <Text className="font-inter-medium text-insight-reading text-ink-headline">{modal === 'merge' ? 'Merge into' : 'Group name'}</Text>
            <TextInput
              className="bg-bg-surface rounded-[12px] border border-border-subtle px-[16px] py-[10px] font-inter text-body-standard text-on-surface"
              placeholder={modal === 'merge' ? 'Merchant name…' : 'e.g. Goa Trip'}
              placeholderTextColor={Colors.inkLabel}
              value={modalName}
              onChangeText={setModalName}
              autoFocus
            />
            {modalError && <Text className="font-inter text-supporting-text text-error-muted">{modalError}</Text>}
            <TouchableOpacity
              className="bg-primary rounded-[12px] py-[8px] items-center"
              onPress={modal === 'merge' ? confirmMerge : confirmGroup}
            >
              <Text className="font-inter-medium text-body-standard text-on-primary">Confirm</Text>
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
      className={`flex-row items-start gap-[16px] py-[8px] ${indent ? 'pl-[24px]' : ''}`}
      onPress={() => onPressId(tx.id)}
      onLongPress={() => onLongPressId(tx.id)}
      activeOpacity={0.7}
    >
      {selectMode && (
        <View className={`w-[22px] h-[22px] rounded-full border-2 items-center justify-center self-center ${selected ? 'bg-primary border-primary' : 'border-ink-label'}`}>
          {selected && <Text className="text-on-primary text-[12px] font-inter-bold">✓</Text>}
        </View>
      )}
      <View className="flex-1">
        <Text className="font-inter-medium text-insight-reading text-ink-headline" numberOfLines={1}>{tx.merchant || tx.bankName}</Text>
        <Text className="font-inter text-supporting-text text-ink-body mt-[2px]" numberOfLines={1}>
          {tx.bankName}  •  {timeLabel(tx.timestamp)}  •  {categoryName
            ? categoryName
            : tx.type === TransactionType.EXPENSE
              ? <Text className="text-secondary">Uncategorized</Text>
              : txTypeLabel(tx.type)}
        </Text>
      </View>
      <Text className={`font-mono-medium text-[18px] leading-[26px] ${credit ? 'text-primary-container' : 'text-ink-headline'}`}>
        {formatAmount(tx.amount, currency)}
      </Text>
    </TouchableOpacity>
  );
});
