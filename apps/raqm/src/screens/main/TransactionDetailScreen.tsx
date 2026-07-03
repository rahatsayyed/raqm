import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getCategories, getSubcategories, getTxById } from '../../db/database';
import type { Category, Subcategory, TxRecord } from '../../db/database';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';

function formatAmount(n: number, currency = '₹'): string {
  return `${currency}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function txTypeLabel(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME: return 'Income';
    case TransactionType.CREDIT: return 'Credit';
    case TransactionType.EXPENSE: return 'Expense';
    case TransactionType.TRANSFER: return 'Transfer';
    case TransactionType.INVESTMENT: return 'Investment';
    case TransactionType.BALANCE_UPDATE: return 'Balance update';
    default: return type;
  }
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

export function TransactionDetailScreen({ route, navigation }: MainStackScreenProps<'TransactionDetail'>) {
  const { transactionId } = route.params;
  const storeTx = useTxStore((s) => s.txs.find((t) => t.id === transactionId));
  const removeTx = useTxStore((s) => s.remove);
  const restoreTx = useTxStore((s) => s.restore);
  const updateTx = useTxStore((s) => s.update);

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [notesDraft, setNotesDraft] = useState('');
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [deleting, setDeleting] = useState(false);
  // Snapshot taken right before a soft-delete so the row filtered out of the
  // store doesn't make `tx` disappear (and the undo snackbar with it).
  const [snapshot, setSnapshot] = useState<TxRecord | null>(null);
  // Fallback lookup for when the store hasn't loaded this row yet (e.g. deep link).
  const [fallbackTx, setFallbackTx] = useState<TxRecord | null>(null);
  const [fallbackChecked, setFallbackChecked] = useState(false);

  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notesDraftRef = useRef('');
  const savedNotesRef = useRef<string | null>(null);
  const updateTxRef = useRef(updateTx);
  updateTxRef.current = updateTx;

  const tx = snapshot ?? storeTx ?? fallbackTx;

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    if (tx?.categoryId != null) {
      getSubcategories(tx.categoryId).then(setSubcategories);
    } else {
      setSubcategories([]);
    }
  }, [tx?.categoryId]);

  useEffect(() => {
    setNotesDraft(tx?.notes ?? '');
    setTagsDraft(tx?.tags ?? []);
    savedNotesRef.current = tx?.notes ?? '';
  }, [tx?.id]);

  useEffect(() => {
    notesDraftRef.current = notesDraft;
  }, [notesDraft]);

  // Store lookup missed and we're not mid-delete: try the db directly (e.g.
  // screen opened before the store has finished loading).
  useEffect(() => {
    if (storeTx || snapshot || deleting) {
      setFallbackChecked(false);
      return;
    }
    let cancelled = false;
    getTxById(transactionId).then((row) => {
      if (!cancelled) {
        setFallbackTx(row);
        setFallbackChecked(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [storeTx, snapshot, deleting, transactionId]);

  // Flush an unsaved notes edit if the screen unmounts before onBlur fires.
  useEffect(() => {
    return () => {
      if (deleteTimerRef.current) {
        clearTimeout(deleteTimerRef.current);
      }
      const currentId = tx?.id;
      if (currentId != null && notesDraftRef.current !== (savedNotesRef.current ?? '')) {
        updateTxRef.current(currentId, { notes: notesDraftRef.current });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx?.id]);

  const category = useMemo(
    () => categories.find((c) => c.id === tx?.categoryId) ?? null,
    [categories, tx?.categoryId],
  );
  const subcategory = useMemo(
    () => subcategories.find((s) => s.id === tx?.subcategoryId) ?? null,
    [subcategories, tx?.subcategoryId],
  );

  const handleUndo = (id: number) => {
    if (deleteTimerRef.current) {
      clearTimeout(deleteTimerRef.current);
      deleteTimerRef.current = null;
    }
    restoreTx(id);
    setDeleting(false);
    setSnapshot(null);
  };

  if (deleting && snapshot) {
    return (
      <View style={styles.root}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.snackbar}>
          <Text style={styles.snackbarText}>Transaction deleted</Text>
          <TouchableOpacity onPress={() => handleUndo(snapshot.id)}>
            <Text style={styles.snackbarUndo}>UNDO</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!tx) {
    if (!fallbackChecked) {
      return <View style={styles.root} />;
    }
    return (
      <View style={styles.root}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Transaction not found</Text>
      </View>
    );
  }

  const debit = isDebit(tx.type);
  const sign = debit ? '-' : '+';
  const amountColor = debit ? Colors.error : Colors.primary;

  const saveNotes = () => {
    if (notesDraft !== (tx.notes ?? '')) {
      savedNotesRef.current = notesDraft;
      updateTx(tx.id, { notes: notesDraft });
    }
  };

  const addTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed || tagsDraft.includes(trimmed)) {
      setNewTag('');
      return;
    }
    const next = [...tagsDraft, trimmed];
    setTagsDraft(next);
    setNewTag('');
    updateTx(tx.id, { tags: next });
  };

  const removeTag = (tag: string) => {
    const next = tagsDraft.filter((t) => t !== tag);
    setTagsDraft(next);
    updateTx(tx.id, { tags: next });
  };

  const handleDelete = () => {
    setSnapshot(tx);
    setDeleting(true);
    removeTx(tx.id);
    deleteTimerRef.current = setTimeout(() => {
      deleteTimerRef.current = null;
      navigation.goBack();
    }, 5000);
  };

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('EditTransaction', { transactionId: tx.id })}>
          <Text style={styles.editText}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.amount, { color: amountColor }]}>
          {sign}{formatAmount(tx.amount, tx.currency)}
        </Text>
        <Text style={styles.merchant}>{tx.merchant || tx.bankName}</Text>

        <View style={styles.card}>
          <Row label="Type" value={txTypeLabel(tx.type)} />
          <Row label="Bank" value={tx.bankName} />
          <Row label="Account" value={tx.accountLast4 ? `•••• ${tx.accountLast4}` : '—'} />
          <Row label="Date" value={formatDateTime(tx.timestamp)} />
          <Row
            label="Category"
            value={category ? `${category.emoji} ${category.name}${subcategory ? ` · ${subcategory.name}` : ''}` : 'Uncategorized'}
            last
          />
        </View>

        <Text style={styles.sectionLabel}>NOTES</Text>
        <View style={styles.card}>
          <TextInput
            style={styles.notesInput}
            placeholder="Add a note…"
            placeholderTextColor={Colors.outline}
            value={notesDraft}
            onChangeText={setNotesDraft}
            onBlur={saveNotes}
            multiline
          />
        </View>

        <Text style={styles.sectionLabel}>TAGS</Text>
        <View style={styles.card}>
          <View style={styles.tagsWrap}>
            {tagsDraft.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagChipText}>{tag}</Text>
                <TouchableOpacity onPress={() => removeTag(tag)}>
                  <Text style={styles.tagChipRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          <View style={styles.tagInputRow}>
            <TextInput
              style={styles.tagInput}
              placeholder="Add tag…"
              placeholderTextColor={Colors.outline}
              value={newTag}
              onChangeText={setNewTag}
              onSubmitEditing={addTag}
              autoCapitalize="none"
            />
            <TouchableOpacity onPress={addTag} style={styles.tagAddButton}>
              <Text style={styles.tagAddButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionLabel}>OTHER INFO</Text>
        <View style={styles.card}>
          <Text style={styles.rawSmsLabel}>Raw SMS</Text>
          <Text style={styles.rawSmsBody}>{tx.rawSms ?? 'No raw SMS stored (manual entry).'}</Text>
        </View>

        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete transaction</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function Row({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
  },
  back: {},
  backText: { ...Typography.bodyMd, color: Colors.primary },
  editText: { ...Typography.bodyMd, color: Colors.primary, fontFamily: 'WorkSans_500Medium' },
  content: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 48 },
  title: { ...Typography.headlineSm, color: Colors.onSurface, marginTop: Spacing.md },

  amount: { ...Typography.numericXl, color: Colors.onSurface, marginTop: Spacing.md },
  merchant: { ...Typography.titleLg, color: Colors.onSurfaceVariant, marginTop: 4, marginBottom: Spacing.lg },

  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
    marginBottom: Spacing.lg, overflow: 'hidden',
  },
  row: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  rowLabel: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
  rowValue: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },

  sectionLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginBottom: Spacing.sm, marginLeft: 4 },

  notesInput: {
    ...Typography.bodyMd, color: Colors.onSurface,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    minHeight: 72, textAlignVertical: 'top',
  },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, padding: Spacing.md },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 6,
  },
  tagChipText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  tagChipRemove: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
  tagInputRow: {
    flexDirection: 'row', gap: Spacing.sm,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
    borderTopWidth: 1, borderTopColor: Colors.outlineVariant, paddingTop: Spacing.md,
  },
  tagInput: {
    flex: 1, ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },
  tagAddButton: {
    paddingHorizontal: Spacing.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
  },
  tagAddButtonText: { ...Typography.bodySm, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },

  rawSmsLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, padding: Spacing.md, paddingBottom: 0 },
  rawSmsBody: { ...Typography.bodySm, color: Colors.onSurface, padding: Spacing.md, lineHeight: 20 },

  deleteButton: {
    marginTop: Spacing.sm, paddingVertical: Spacing.md, alignItems: 'center',
    borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.error,
  },
  deleteButtonText: { ...Typography.bodyMd, color: Colors.error, fontFamily: 'WorkSans_500Medium' },

  snackbar: {
    position: 'absolute', left: Spacing.containerMargin, right: Spacing.containerMargin, bottom: Spacing.xl,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  snackbarText: { ...Typography.bodyMd, color: Colors.inkHeadline },
  snackbarUndo: { ...Typography.bodyMd, color: Colors.primary, fontFamily: 'WorkSans_500Medium' },
});
