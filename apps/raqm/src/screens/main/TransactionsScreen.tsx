import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, Pressable } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { useTxStore } from '../../store/txStore';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';
import { mergeTxs, groupTxs, type TxRecord } from '../../db/database';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { formatAmount } from '../../utils/format';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function txColor(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME:
    case TransactionType.CREDIT: return Colors.primary;
    case TransactionType.EXPENSE: return Colors.errorMuted;
    default: return Colors.onSurfaceVariant;
  }
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

type Row =
  | { kind: 'single'; tx: TxRecord }
  | { kind: 'group'; groupId: number; members: TxRecord[] };

export function TransactionsScreen() {
  const txs = useTxStore((s) => s.txs);
  const refresh = useTxStore((s) => s.refresh);
  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const [query, setQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [modal, setModal] = useState<null | 'merge' | 'group'>(null);
  const [modalName, setModalName] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);

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

  const rows: Row[] = useMemo(() => {
    const seen = new Set<number>();
    const out: Row[] = [];
    for (const tx of filtered) {
      if (tx.groupId != null) {
        if (seen.has(tx.groupId)) continue;
        seen.add(tx.groupId);
        const members = filtered.filter(t => t.groupId === tx.groupId);
        out.push({ kind: 'group', groupId: tx.groupId, members });
      } else {
        out.push({ kind: 'single', tx });
      }
    }
    return out;
  }, [filtered]);

  function toggleSelected(id: number) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function enterSelectMode(id: number) {
    setSelectMode(true);
    setSelected(new Set([id]));
  }

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

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Transactions</Text>
        {selectMode ? (
          <TouchableOpacity onPress={exitSelectMode}><Text style={styles.cancelText}>Cancel</Text></TouchableOpacity>
        ) : (
          <Text style={styles.count}>{filtered.length} total</Text>
        )}
      </View>

      {!selectMode && (
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.search}
            placeholder="Search merchant or bank…"
            placeholderTextColor={Colors.outline}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      )}

      <FlatList
        data={rows}
        keyExtractor={(r) => (r.kind === 'group' ? `g${r.groupId}` : `t${r.tx.id}`)}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => {
          if (item.kind === 'group') {
            const sum = item.members.reduce((s, m) => s + (isDebit(m.type) ? m.amount : -m.amount), 0);
            const expanded = expandedGroups.has(item.groupId);
            return (
              <View>
                <TouchableOpacity
                  style={styles.item}
                  activeOpacity={0.7}
                  onPress={() => setExpandedGroups(prev => {
                    const next = new Set(prev);
                    if (next.has(item.groupId)) next.delete(item.groupId); else next.add(item.groupId);
                    return next;
                  })}
                >
                  <View style={[styles.dot, { backgroundColor: `${Colors.mossStructure}30` }]}>
                    <Text style={[styles.dotText, { color: Colors.mossStructure }]}>{expanded ? '⌄' : '›'}</Text>
                  </View>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemMerchant} numberOfLines={1}>Group · {item.members.length} transactions</Text>
                    <Text style={styles.itemMeta}>Tap to {expanded ? 'collapse' : 'expand'}</Text>
                  </View>
                  <Text style={[styles.itemAmount, { color: txColor(sum >= 0 ? TransactionType.EXPENSE : TransactionType.CREDIT) }]}>
                    {formatAmount(sum, currency)}
                  </Text>
                </TouchableOpacity>
                {expanded && item.members.map(m => (
                  <TxItem
                    key={m.id}
                    tx={m}
                    currency={currency}
                    indent
                    selectMode={selectMode}
                    selected={selected.has(m.id)}
                    onPress={() => selectMode ? toggleSelected(m.id) : navigation.navigate('TransactionDetail', { transactionId: m.id })}
                    onLongPress={() => !selectMode && enterSelectMode(m.id)}
                  />
                ))}
              </View>
            );
          }
          return (
            <TxItem
              tx={item.tx}
              currency={currency}
              selectMode={selectMode}
              selected={selected.has(item.tx.id)}
              onPress={() => selectMode ? toggleSelected(item.tx.id) : navigation.navigate('TransactionDetail', { transactionId: item.tx.id })}
              onLongPress={() => !selectMode && enterSelectMode(item.tx.id)}
            />
          );
        }}
        ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyText}>No transactions found</Text></View>}
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
              placeholderTextColor={Colors.outline}
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

function TxItem({
  tx, currency, indent, selectMode, selected, onPress, onLongPress,
}: {
  tx: TxRecord; currency: string; indent?: boolean; selectMode: boolean; selected: boolean;
  onPress: () => void; onLongPress: () => void;
}) {
  const debit = isDebit(tx.type);
  const color = txColor(tx.type);
  return (
    <TouchableOpacity style={[styles.item, indent && styles.itemIndent]} onPress={onPress} onLongPress={onLongPress} activeOpacity={0.7}>
      {selectMode && (
        <View style={[styles.checkbox, selected && styles.checkboxOn]}>
          {selected && <Text style={styles.checkboxMark}>✓</Text>}
        </View>
      )}
      <View style={[styles.dot, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.dotText, { color }]}>{debit ? '↓' : '↑'}</Text>
      </View>
      <View style={styles.itemInfo}>
        <Text style={styles.itemMerchant} numberOfLines={1}>{tx.merchant || tx.bankName}</Text>
        <Text style={styles.itemMeta}>
          {txTypeLabel(tx.type)} · {tx.bankName}
          {tx.accountLast4 ? ` ···${tx.accountLast4}` : ''}
        </Text>
        <Text style={styles.itemDate}>{formatDate(tx.timestamp)}</Text>
      </View>
      <Text style={[styles.itemAmount, { color }]}>
        {debit ? '-' : '+'}{formatAmount(tx.amount, currency)}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
  },
  title: { ...Typography.headlineSm, color: Colors.onSurface },
  count: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  cancelText: { ...Typography.bodyMd, color: Colors.primary },
  searchWrap: { paddingHorizontal: Spacing.containerMargin, paddingBottom: Spacing.md },
  search: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
    paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...Typography.bodyMd, color: Colors.onSurface,
  },
  list: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 100 },
  item: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  itemIndent: { paddingLeft: Spacing.lg, backgroundColor: Colors.surfaceContainerLow },
  checkbox: {
    width: 22, height: 22, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.outline,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  checkboxMark: { color: Colors.onPrimary, fontSize: 12, fontWeight: '700' },
  dot: {
    width: 40, height: 40, borderRadius: Radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  dotText: { fontSize: 16, fontWeight: '700' },
  itemInfo: { flex: 1 },
  itemMerchant: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'Inter_500Medium' },
  itemMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
  itemDate: { ...Typography.labelSm, color: Colors.outline, letterSpacing: 0, marginTop: 1 },
  itemAmount: { ...Typography.numericSm, fontSize: 15 },
  sep: { height: 1, backgroundColor: Colors.outlineVariant, marginLeft: 56 },
  empty: { paddingTop: 80, alignItems: 'center' },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
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
  actionBtnText: { ...Typography.bodyMd, color: Colors.onPrimary, fontFamily: 'Inter_500Medium' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalCard: {
    width: '85%', backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.lg, gap: Spacing.md,
  },
  modalTitle: { ...Typography.titleLg, color: Colors.onSurface, fontSize: 16 },
  modalErrorText: { ...Typography.bodySm, color: Colors.error },
  modalInput: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.outlineVariant, paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...Typography.bodyMd, color: Colors.onSurface,
  },
  modalConfirm: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.sm, alignItems: 'center' },
  modalConfirmText: { ...Typography.bodyMd, color: Colors.onPrimary, fontFamily: 'Inter_500Medium' },
});
