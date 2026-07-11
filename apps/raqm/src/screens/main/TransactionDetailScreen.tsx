import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, Pressable, FlatList,
  Linking, Switch, Animated, Easing,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import {
  getCategories, getSubcategories, getTxById, splitTx, linkTxs, unlinkTxs, setLinkSettled, groupTxs,
} from '../../db/database';
import type { Category, Subcategory, TxRecord } from '../../db/database';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import { formatAmount } from '../../utils/format';
import { iconForCategoryName, FALLBACK_CATEGORY_ICON } from '../../constants/categories';
import {
  BackIcon, MoreVertIcon, BankIcon, RepeatIcon, SplitIcon, LinkIcon, GroupWorkIcon, TrashIcon,
  ChevronLeftIcon, ChevronRightIcon, StorefrontIcon, AddIcon,
} from '../../components/TabIcon';

const DAY_MS = 86_400_000;

function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function shortTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true }).toUpperCase();
}

function monthYearLabel(ts: number): string {
  const d = new Date(ts);
  const opts: Intl.DateTimeFormatOptions = { month: 'long' };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric';
  return d.toLocaleDateString('en-IN', opts);
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

function isCredit(type: TransactionType): boolean {
  return type === TransactionType.INCOME || type === TransactionType.CREDIT;
}

export function TransactionDetailScreen({ route, navigation }: MainStackScreenProps<'TransactionDetail'>) {
  const { transactionId } = route.params;
  const storeTx = useTxStore((s) => s.txs.find((t) => t.id === transactionId));
  const allTxs = useTxStore((s) => s.txs);
  const removeTx = useTxStore((s) => s.remove);
  const restoreTx = useTxStore((s) => s.restore);
  const updateTx = useTxStore((s) => s.update);
  const refreshStore = useTxStore((s) => s.refresh);

  const [categories, setCategories] = useState<Category[]>([]);
  const [notesDraft, setNotesDraft] = useState('');
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [partner, setPartner] = useState<TxRecord | null>(null);

  // Sheets / modals
  const [actionsVisible, setActionsVisible] = useState(false);
  const [categorySheetVisible, setCategorySheetVisible] = useState(false);
  const [amountSheetVisible, setAmountSheetVisible] = useState(false);
  const [merchantSheetVisible, setMerchantSheetVisible] = useState(false);
  const [splitVisible, setSplitVisible] = useState(false);
  const [linkVisible, setLinkVisible] = useState(false);
  const [groupVisible, setGroupVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const pendingDateRef = useRef<Date>(new Date());

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

  // Keep the linked partner's summary (merchant/bank) in sync with tx.linkPartnerId.
  useEffect(() => {
    let cancelled = false;
    if (tx?.linkPartnerId != null) {
      getTxById(tx.linkPartnerId).then((row) => {
        if (!cancelled) setPartner(row);
      });
    } else {
      setPartner(null);
    }
    return () => {
      cancelled = true;
    };
  }, [tx?.linkPartnerId]);

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

  const CategoryIcon = category ? (iconForCategoryName(category.name) ?? FALLBACK_CATEGORY_ICON) : FALLBACK_CATEGORY_ICON;

  // Merchant history: real transactions only — omitted entirely (silence is a
  // feature) when this is the merchant's first recorded transaction.
  const merchantInsight = useMemo(() => {
    if (!tx?.merchant) return null;
    const name = tx.merchant.toLowerCase();
    const relevant = allTxs.filter(
      (t) => !t.deletedAt && t.merchant && t.merchant.toLowerCase() === name && isDebit(t.type),
    );
    if (relevant.length < 2) return null;
    const total = relevant.reduce((s, t) => s + t.amount, 0);
    const since = monthYearLabel(Math.min(...relevant.map((t) => t.timestamp)));
    const others = relevant.filter((t) => t.id !== tx.id).sort((a, b) => b.timestamp - a.timestamp);
    const last = others[0] ?? null;
    return {
      total,
      count: relevant.length,
      since,
      lastAmount: last?.amount ?? null,
      daysAgo: last ? Math.max(0, Math.round((tx.timestamp - last.timestamp) / DAY_MS)) : null,
    };
  }, [allTxs, tx?.id, tx?.merchant, tx?.timestamp]);

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
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <BackIcon color={Colors.onSurface} size={22} />
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerRow} hitSlop={8}>
          <BackIcon color={Colors.onSurface} size={22} />
        </TouchableOpacity>
        <Text style={styles.title}>Transaction not found</Text>
      </View>
    );
  }

  const credit = isCredit(tx.type);
  const countsToward = tx.type !== TransactionType.BALANCE_UPDATE;

  const saveNotes = () => {
    if (notesDraft !== (tx.notes ?? '')) {
      savedNotesRef.current = notesDraft;
      updateTx(tx.id, { notes: notesDraft });
    }
  };

  const commitTag = () => {
    const trimmed = newTag.trim();
    setAddingTag(false);
    // Case-insensitive dedupe: "Business" and "business" are the same tag.
    if (!trimmed || tagsDraft.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
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
    setActionsVisible(false);
    setSnapshot(tx);
    setDeleting(true);
    removeTx(tx.id);
    deleteTimerRef.current = setTimeout(() => {
      deleteTimerRef.current = null;
      navigation.goBack();
    }, 5000);
  };

  const toggleRecurring = () => {
    setActionsVisible(false);
    updateTx(tx.id, { recurring: !tx.recurring });
  };

  const toggleCountsToward = (next: boolean) => {
    if (next) {
      updateTx(tx.id, { type: tx.originalType ?? TransactionType.EXPENSE, originalType: null });
    } else {
      updateTx(tx.id, { type: TransactionType.BALANCE_UPDATE, originalType: tx.type });
    }
  };

  const handleSplitDone = async () => {
    setSplitVisible(false);
    await refreshStore();
    navigation.goBack();
  };

  const handleLinkPick = async (partnerId: number) => {
    await linkTxs(tx.id, partnerId, 'manual');
    setLinkVisible(false);
    await refreshStore();
  };

  const handleUnlink = async () => {
    await unlinkTxs(tx.id);
    await refreshStore();
  };

  const toggleSettled = async () => {
    await setLinkSettled(tx.id, !tx.linkSettled);
    await refreshStore();
  };

  const handleGroupConfirm = async (partnerId: number, name: string) => {
    await groupTxs([tx.id, partnerId], name);
    setGroupVisible(false);
    await refreshStore();
  };

  const openDateEdit = () => {
    pendingDateRef.current = new Date(tx.timestamp);
    setShowDatePicker(true);
  };

  const onDatePicked = (selected?: Date) => {
    setShowDatePicker(false);
    if (!selected) return;
    const merged = new Date(pendingDateRef.current);
    merged.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
    pendingDateRef.current = merged;
    setShowTimePicker(true);
  };

  const onTimePicked = (selected?: Date) => {
    setShowTimePicker(false);
    if (!selected) return;
    const merged = new Date(pendingDateRef.current);
    merged.setHours(selected.getHours(), selected.getMinutes());
    updateTx(tx.id, { timestamp: merged.getTime() });
  };

  return (
    <View style={styles.root}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <BackIcon color={Colors.onSurface} size={22} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Transaction</Text>
        <TouchableOpacity onPress={() => setActionsVisible(true)} hitSlop={8}>
          <MoreVertIcon color={Colors.onSurface} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <Text style={styles.eyebrow}>TRANSACTION STORY</Text>
        <TouchableOpacity onPress={() => setMerchantSheetVisible(true)} activeOpacity={0.7}>
          <Text style={styles.merchantName}>{tx.merchant || tx.bankName}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setAmountSheetVisible(true)} activeOpacity={0.7}>
          <Text style={[styles.amount, { color: credit ? Colors.primary : Colors.onSurface }]}>
            {formatAmount(tx.amount, tx.currency)}
          </Text>
        </TouchableOpacity>

        <View style={styles.metaRow}>
          <TouchableOpacity style={styles.metaItem} onPress={() => setCategorySheetVisible(true)} hitSlop={4}>
            <CategoryIcon color={Colors.onSurfaceVariant} size={16} />
            <Text style={styles.metaText}>{category?.name ?? 'Uncategorized'}</Text>
          </TouchableOpacity>
          <View style={styles.metaDot} />
          <TouchableOpacity onPress={openDateEdit} hitSlop={4}>
            <Text style={styles.metaText}>{shortDate(tx.timestamp)} • {shortTime(tx.timestamp)}</Text>
          </TouchableOpacity>
        </View>

        {tx.recurring && (
          <View style={styles.recurringBadge}>
            <RepeatIcon color={Colors.mossStructure} size={13} />
            <Text style={styles.recurringBadgeText}>Recurring</Text>
          </View>
        )}

        {/* Paid from */}
        <View style={styles.paidFromCard}>
          <View style={styles.paidFromLeft}>
            <View style={styles.bankAvatar}>
              <BankIcon color={Colors.background} size={22} />
            </View>
            <View style={styles.bankInfo}>
              <View style={styles.bankNameRow}>
                <Text style={styles.bankName} numberOfLines={1}>{tx.bankName}</Text>
                {tx.accountLast4 && <Text style={styles.bankLast4}>{tx.accountLast4}</Text>}
              </View>
              <View style={styles.paidFromDateRow}>
                <Text style={styles.paidFromDateText}>{shortDate(tx.timestamp)}</Text>
                <View style={styles.metaDotSmall} />
                <Text style={styles.paidFromDateText}>{shortTime(tx.timestamp)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.paidFromRight}>
            <Text style={styles.expenseLabel}>Expense</Text>
            <Switch
              value={countsToward}
              onValueChange={toggleCountsToward}
              trackColor={{ false: Colors.surfaceBright, true: Colors.primary }}
              thumbColor={Colors.inkHeadline}
            />
          </View>
        </View>

        {/* Merchant history */}
        {merchantInsight && (
          <View style={styles.merchantHistoryCard}>
            <View style={styles.merchantHistoryWatermark}>
              <StorefrontIcon color={Colors.onSurface} size={80} />
            </View>
            <Text style={styles.merchantHistoryHeader}>MERCHANT HISTORY</Text>
            <Text style={styles.merchantHistoryText}>
              You've spent{' '}
              <Text style={styles.merchantHistoryHighlight}>{formatAmount(merchantInsight.total, tx.currency)}</Text>
              {' '}across {merchantInsight.count} transactions since {merchantInsight.since}.
            </Text>
            {merchantInsight.lastAmount != null && (
              <Text style={styles.merchantHistorySub}>
                Last visit was {merchantInsight.daysAgo} day{merchantInsight.daysAgo === 1 ? '' : 's'} ago for{' '}
                {formatAmount(merchantInsight.lastAmount, tx.currency)}.
              </Text>
            )}
            {tx.merchant && (
              <TouchableOpacity
                style={styles.viewMerchantBtn}
                onPress={() => navigation.navigate('Tabs', { screen: 'Transactions', params: { initialQuery: tx.merchant! } })}
                hitSlop={4}
              >
                <Text style={styles.viewMerchantText}>VIEW MERCHANT</Text>
                <ChevronRightIcon color={Colors.primary} size={16} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTES</Text>
          <View style={styles.notesRule}>
            <TextInput
              style={styles.notesInput}
              placeholder="Tap to add"
              placeholderTextColor={Colors.inkLabel}
              value={notesDraft}
              onChangeText={setNotesDraft}
              onBlur={saveNotes}
              multiline
            />
          </View>
        </View>

        {/* Tags */}
        <View style={styles.section}>
          <View style={styles.tagsHeaderRow}>
            <Text style={styles.sectionLabelInline}>TAGS</Text>
            <TouchableOpacity onPress={() => setAddingTag(true)} hitSlop={8}>
              <AddIcon color={Colors.onSurface} size={22} />
            </TouchableOpacity>
          </View>
          <View style={styles.tagsWrap}>
            {tagsDraft.length === 0 && !addingTag && <Text style={styles.emptyTagsText}>No tags yet</Text>}
            {tagsDraft.map((tag) => (
              <View key={tag} style={styles.tagChip}>
                <Text style={styles.tagChipText}>#{tag}</Text>
                <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={4}>
                  <Text style={styles.tagChipRemove}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {addingTag && (
            <View style={styles.tagInputRow}>
              <TextInput
                style={styles.tagInput}
                placeholder="Tag name…"
                placeholderTextColor={Colors.inkLabel}
                value={newTag}
                onChangeText={setNewTag}
                onSubmitEditing={commitTag}
                onBlur={commitTag}
                autoCapitalize="none"
                autoFocus
              />
            </View>
          )}
        </View>

        {/* Other info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>OTHER INFO</Text>
          <View style={styles.otherInfoBody}>
            <Text style={styles.metaCaption}>ORIGINAL SMS</Text>
            <Text style={styles.rawSmsBody}>{tx.rawSms ?? 'No raw SMS stored (manual entry).'}</Text>
            {tx.reference && (
              <>
                <View style={styles.divider} />
                <Text style={styles.metaCaption}>REFERENCE NO.</Text>
                <Text style={styles.referenceText}>{tx.reference}</Text>
              </>
            )}
            {tx.lat != null && tx.lng != null && (
              <>
                <View style={styles.divider} />
                <Text style={styles.metaCaption}>LOCATION</Text>
                <View style={styles.locationRow}>
                  <Text style={styles.locationText}>{tx.lat.toFixed(4)}, {tx.lng.toFixed(4)}</Text>
                  <TouchableOpacity onPress={() => Linking.openURL(`geo:${tx.lat},${tx.lng}?q=${tx.lat},${tx.lng}`)}>
                    <Text style={styles.mapLink}>Open in Maps</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Linked partner (contextual state, not an action-sheet item) */}
        {tx.linkType && partner && (
          <>
            <Text style={styles.sectionLabel}>LINKED WITH</Text>
            <View style={styles.card}>
              <View style={styles.linkedCardInner}>
                <Text style={styles.cardTitle}>{partner.merchant || partner.bankName}</Text>
                <Text style={styles.cardSub}>Type: {tx.linkType}</Text>
                <View style={styles.linkButtonRow}>
                  <TouchableOpacity style={styles.pillBtn} onPress={toggleSettled}>
                    <Text style={styles.pillBtnText}>{tx.linkSettled ? '✓ Settled' : 'Mark Settled'}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.pillBtn, styles.pillBtnDanger]} onPress={handleUnlink}>
                    <Text style={styles.pillBtnText}>Unlink</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {showDatePicker && (
        <DateTimePicker
          value={pendingDateRef.current}
          mode="date"
          display="default"
          maximumDate={new Date()}
          onChange={(_e, selected) => onDatePicked(selected)}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={pendingDateRef.current}
          mode="time"
          display="default"
          onChange={(_e, selected) => onTimePicked(selected)}
        />
      )}

      <ActionsSheet
        visible={actionsVisible}
        onClose={() => setActionsVisible(false)}
        canSplit={!tx.isSplitChild}
        canLink={!tx.linkType}
        canGroup={tx.groupId == null}
        recurring={tx.recurring}
        onSplit={() => { setActionsVisible(false); setSplitVisible(true); }}
        onLink={() => { setActionsVisible(false); setLinkVisible(true); }}
        onGroup={() => { setActionsVisible(false); setGroupVisible(true); }}
        onToggleRecurring={toggleRecurring}
        onDelete={handleDelete}
      />

      <CategorySheet
        visible={categorySheetVisible}
        onClose={() => setCategorySheetVisible(false)}
        categories={categories}
        currentCategoryId={tx.categoryId}
        onSelect={(categoryId, subcategoryId) => {
          updateTx(tx.id, { categoryId, subcategoryId: subcategoryId ?? null });
          setCategorySheetVisible(false);
        }}
      />

      <AmountSheet
        visible={amountSheetVisible}
        onClose={() => setAmountSheetVisible(false)}
        tx={tx}
        onConfirm={(amount) => {
          updateTx(tx.id, { amount });
          setAmountSheetVisible(false);
        }}
      />

      <MerchantSheet
        visible={merchantSheetVisible}
        onClose={() => setMerchantSheetVisible(false)}
        initialValue={tx.merchant ?? ''}
        onConfirm={(merchant) => {
          updateTx(tx.id, { merchant: merchant || null });
          setMerchantSheetVisible(false);
        }}
      />

      <SplitModal
        visible={splitVisible}
        onClose={() => setSplitVisible(false)}
        tx={tx}
        onDone={handleSplitDone}
      />
      <LinkPicker
        visible={linkVisible}
        onClose={() => setLinkVisible(false)}
        candidates={allTxs.filter((t) => t.id !== tx.id && !t.deletedAt && !t.isSplitChild)}
        onPick={handleLinkPick}
      />
      <GroupPicker
        visible={groupVisible}
        onClose={() => setGroupVisible(false)}
        candidates={allTxs.filter((t) => t.id !== tx.id && !t.deletedAt && !t.isSplitChild && t.groupId == null)}
        onConfirm={handleGroupConfirm}
      />
    </View>
  );
}

// ── Bottom sheet shell ───────────────────────────────────────────────────────

function BottomSheet({
  visible, onClose, children,
}: { visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheetCard} onPress={(e) => e.stopPropagation()}>
          <View style={styles.sheetHandleWrap}>
            <View style={styles.sheetHandle} />
          </View>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Actions overflow sheet ───────────────────────────────────────────────────

function ActionsSheet({
  visible, onClose, canSplit, canLink, canGroup, recurring, onSplit, onLink, onGroup, onToggleRecurring, onDelete,
}: {
  visible: boolean; onClose: () => void;
  canSplit: boolean; canLink: boolean; canGroup: boolean; recurring: boolean;
  onSplit: () => void; onLink: () => void; onGroup: () => void; onToggleRecurring: () => void; onDelete: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.sheetActionsList}>
        {canSplit && (
          <TouchableOpacity style={styles.sheetActionRow} onPress={onSplit}>
            <SplitIcon color={Colors.onSurfaceVariant} size={24} />
            <Text style={styles.sheetActionText}>Split Transaction</Text>
          </TouchableOpacity>
        )}
        {canLink && (
          <TouchableOpacity style={styles.sheetActionRow} onPress={onLink}>
            <LinkIcon color={Colors.onSurfaceVariant} size={24} />
            <Text style={styles.sheetActionText}>Link to Original</Text>
          </TouchableOpacity>
        )}
        {canGroup && (
          <TouchableOpacity style={styles.sheetActionRow} onPress={onGroup}>
            <GroupWorkIcon color={Colors.onSurfaceVariant} size={24} />
            <Text style={styles.sheetActionText}>Group with...</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.sheetActionRow} onPress={onToggleRecurring}>
          <RepeatIcon color={Colors.onSurfaceVariant} size={24} />
          <Text style={styles.sheetActionText}>{recurring ? 'Unmark Recurring' : 'Mark as Recurring'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.sheetActionRow, styles.sheetActionRowLast]} onPress={onDelete}>
          <TrashIcon color={`${Colors.error}CC`} size={24} />
          <Text style={[styles.sheetActionText, { color: Colors.error }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// ── Category + subcategory sheet ────────────────────────────────────────────

function CategorySheet({
  visible, onClose, categories, currentCategoryId, onSelect,
}: {
  visible: boolean; onClose: () => void; categories: Category[]; currentCategoryId: number | null;
  onSelect: (categoryId: number, subcategoryId?: number) => void;
}) {
  const [step, setStep] = useState<'category' | 'subcategory'>('category');
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const shift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      setStep('category');
      setActiveCategory(null);
      shift.setValue(0);
    }
  }, [visible, shift]);

  const animateTo = (next: 'category' | 'subcategory') => {
    Animated.timing(shift, {
      toValue: 1,
      duration: 120,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start(() => {
      setStep(next);
      shift.setValue(-1);
      Animated.timing(shift, {
        toValue: 0,
        duration: 120,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }).start();
    });
  };

  const handleCategoryTap = async (cat: Category) => {
    const subs = await getSubcategories(cat.id);
    if (subs.length === 0) {
      onSelect(cat.id, undefined);
      return;
    }
    setActiveCategory(cat);
    setSubcategories(subs);
    animateTo('subcategory');
  };

  const translateX = shift.interpolate({ inputRange: [-1, 0, 1], outputRange: [-16, 0, 16] });
  const opacity = shift.interpolate({ inputRange: [-1, 0, 1], outputRange: [0, 1, 0] });

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <Animated.View style={{ transform: [{ translateX }], opacity }}>
        {step === 'category' ? (
          <View style={styles.sheetCategoryList}>
            <Text style={styles.sheetTitle}>Category</Text>
            {categories.map((cat) => {
              const Icon = iconForCategoryName(cat.name) ?? FALLBACK_CATEGORY_ICON;
              const selected = cat.id === currentCategoryId;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryPickRow, selected && styles.categoryPickRowActive]}
                  onPress={() => handleCategoryTap(cat)}
                >
                  <Icon color={selected ? Colors.primary : Colors.inkBody} size={20} />
                  <Text style={[styles.categoryPickText, selected && { color: Colors.primary }]}>{cat.name}</Text>
                  <ChevronRightIcon color={Colors.inkLabel} size={18} />
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <View style={styles.sheetCategoryList}>
            <TouchableOpacity style={styles.sheetSubHeader} onPress={() => animateTo('category')}>
              <ChevronLeftIcon color={Colors.inkBody} size={20} />
              <Text style={styles.sheetTitle}>{activeCategory?.name}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.categoryPickRow}
              onPress={() => activeCategory && onSelect(activeCategory.id, undefined)}
            >
              <Text style={styles.categoryPickText}>No sub-category</Text>
            </TouchableOpacity>
            {subcategories.map((sub) => (
              <TouchableOpacity
                key={sub.id}
                style={styles.categoryPickRow}
                onPress={() => activeCategory && onSelect(activeCategory.id, sub.id)}
              >
                <Text style={styles.categoryPickText}>{sub.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </Animated.View>
    </BottomSheet>
  );
}

// ── Amount edit sheet (with optional foreign-currency conversion helper) ────

function AmountSheet({
  visible, onClose, tx, onConfirm,
}: { visible: boolean; onClose: () => void; tx: TxRecord; onConfirm: (amount: number) => void }) {
  const [amountText, setAmountText] = useState('');
  const [showConversion, setShowConversion] = useState(false);
  const [foreignAmount, setForeignAmount] = useState('');
  const [rate, setRate] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAmountText(String(tx.amount));
      setShowConversion(false);
      setForeignAmount('');
      setRate('');
      setError(null);
    }
  }, [visible, tx.amount]);

  const converted = useMemo(() => {
    const f = Number(foreignAmount);
    const r = Number(rate);
    if (!foreignAmount || !rate || !Number.isFinite(f) || !Number.isFinite(r)) return null;
    return f * r;
  }, [foreignAmount, rate]);

  const applyConverted = () => {
    if (converted != null) setAmountText(converted.toFixed(2));
  };

  const confirm = () => {
    const parsed = Number(amountText);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('Enter a valid amount');
      return;
    }
    onConfirm(parsed);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.sheetForm}>
        <Text style={styles.sheetTitle}>Edit amount</Text>
        <View style={styles.amountInputRow}>
          <Text style={styles.amountInputPrefix}>{tx.currency}</Text>
          <TextInput
            style={styles.amountInputField}
            keyboardType="decimal-pad"
            value={amountText}
            onChangeText={setAmountText}
            autoFocus
          />
        </View>
        {error && <Text style={styles.sheetErrorText}>{error}</Text>}

        <TouchableOpacity style={styles.conversionToggle} onPress={() => setShowConversion((v) => !v)}>
          <Text style={styles.conversionToggleText}>Convert from another currency</Text>
          <Text style={styles.conversionToggleChevron}>{showConversion ? '︿' : '﹀'}</Text>
        </TouchableOpacity>

        {showConversion && (
          <View style={styles.conversionBox}>
            <View style={styles.conversionRow}>
              <TextInput
                style={styles.conversionInput}
                placeholder="Foreign amount"
                placeholderTextColor={Colors.inkLabel}
                keyboardType="decimal-pad"
                value={foreignAmount}
                onChangeText={setForeignAmount}
              />
              <TextInput
                style={styles.conversionInput}
                placeholder={`Rate (× 1 = ${tx.currency})`}
                placeholderTextColor={Colors.inkLabel}
                keyboardType="decimal-pad"
                value={rate}
                onChangeText={setRate}
              />
            </View>
            {converted != null && (
              <TouchableOpacity style={styles.conversionApply} onPress={applyConverted}>
                <Text style={styles.conversionApplyText}>
                  = {formatAmount(converted, tx.currency)} · Use this amount
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.sheetConfirm} onPress={confirm}>
          <Text style={styles.sheetConfirmText}>Save</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// ── Merchant name edit sheet ─────────────────────────────────────────────────

function MerchantSheet({
  visible, onClose, initialValue, onConfirm,
}: { visible: boolean; onClose: () => void; initialValue: string; onConfirm: (value: string) => void }) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) setName(initialValue);
  }, [visible, initialValue]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.sheetForm}>
        <Text style={styles.sheetTitle}>Edit merchant name</Text>
        <TextInput
          style={styles.sheetTextInput}
          placeholder="Merchant name"
          placeholderTextColor={Colors.inkLabel}
          value={name}
          onChangeText={setName}
          autoFocus
        />
        <TouchableOpacity style={styles.sheetConfirm} onPress={() => onConfirm(name.trim())}>
          <Text style={styles.sheetConfirmText}>Save</Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// ── Split (center modal, unchanged pattern) ─────────────────────────────────

function SplitModal({
  visible, onClose, tx, onDone,
}: { visible: boolean; onClose: () => void; tx: TxRecord; onDone: () => void }) {
  const [amounts, setAmounts] = useState<string[]>(['', '']);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAmounts(['', '']);
      setError(null);
    }
  }, [visible]);

  function setAmountAt(i: number, v: string) {
    setAmounts((prev) => prev.map((a, idx) => (idx === i ? v : a)));
  }

  function addRow() {
    setAmounts((prev) => [...prev, '']);
  }

  async function confirm() {
    const parsed = amounts.map((a) => Number(a));
    if (parsed.some((n) => !Number.isFinite(n) || n <= 0)) {
      setError('Enter valid positive amounts');
      return;
    }
    const sum = parsed.reduce((s, n) => s + n, 0);
    if (Math.abs(sum - tx.amount) > 0.01) {
      setError(`Amounts must sum to ${formatAmount(tx.amount, tx.currency)}`);
      return;
    }
    try {
      await splitTx(tx.id, parsed.map((amount) => ({ amount })));
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Split failed');
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>
            Split {formatAmount(tx.amount, tx.currency)} into {amounts.length} parts
          </Text>
          {amounts.map((a, i) => (
            <TextInput
              key={i}
              style={styles.modalInput}
              placeholder={`Part ${i + 1} amount`}
              placeholderTextColor={Colors.inkLabel}
              keyboardType="numeric"
              value={a}
              onChangeText={(v) => setAmountAt(i, v)}
            />
          ))}
          {error && <Text style={styles.errorText}>{error}</Text>}
          <TouchableOpacity style={styles.pillBtn} onPress={addRow}>
            <Text style={styles.pillBtnText}>+ Add part</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modalConfirm} onPress={confirm}>
            <Text style={styles.modalConfirmText}>Split</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function LinkPicker({
  visible, onClose, candidates, onPick,
}: { visible: boolean; onClose: () => void; candidates: TxRecord[]; onPick: (id: number) => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalCard, styles.modalCardTall]} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.modalTitle}>Link to…</Text>
          <FlatList
            data={candidates}
            keyExtractor={(t) => String(t.id)}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.pickerRow} onPress={() => onPick(item.id)}>
                <Text style={styles.pickerRowText} numberOfLines={1}>
                  {item.merchant || item.bankName} · {formatAmount(item.amount, item.currency)}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.pickerRowText}>No other transactions available.</Text>}
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function GroupPicker({
  visible, onClose, candidates, onConfirm,
}: {
  visible: boolean; onClose: () => void; candidates: TxRecord[]; onConfirm: (partnerId: number, name: string) => void;
}) {
  const [step, setStep] = useState<'pick' | 'name'>('pick');
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (visible) {
      setStep('pick');
      setPickedId(null);
      setName('');
    }
  }, [visible]);

  const pick = (id: number) => {
    setPickedId(id);
    setStep('name');
  };

  const confirm = () => {
    const trimmed = name.trim();
    if (!trimmed || pickedId == null) return;
    onConfirm(pickedId, trimmed);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={[styles.modalCard, step === 'pick' && styles.modalCardTall]} onPress={(e) => e.stopPropagation()}>
          {step === 'pick' ? (
            <>
              <Text style={styles.modalTitle}>Group with…</Text>
              <FlatList
                data={candidates}
                keyExtractor={(t) => String(t.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.pickerRow} onPress={() => pick(item.id)}>
                    <Text style={styles.pickerRowText} numberOfLines={1}>
                      {item.merchant || item.bankName} · {formatAmount(item.amount, item.currency)}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={styles.pickerRowText}>No other transactions available.</Text>}
              />
            </>
          ) : (
            <>
              <Text style={styles.modalTitle}>Group name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Goa Trip"
                placeholderTextColor={Colors.inkLabel}
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <TouchableOpacity style={styles.modalConfirm} onPress={confirm}>
                <Text style={styles.modalConfirmText}>Create group</Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  headerRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.sm, paddingBottom: Spacing.sm,
  },
  headerTitle: { ...Typography.sectionHeader, color: Colors.onSurface, textTransform: 'uppercase' },
  title: { ...Typography.headlineSm, color: Colors.onSurface, marginTop: Spacing.md, marginHorizontal: Spacing.containerMargin },
  content: { paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.md, paddingBottom: Spacing.sectionGap + Spacing.sm },

  eyebrow: { ...Typography.labelCaps, color: Colors.primary, marginBottom: Spacing.sm },
  merchantName: { ...Typography.statementMobile, color: Colors.onSurface },
  amount: { ...Typography.metricHero, marginTop: Spacing.xs },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginTop: Spacing.md, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { ...Typography.supportingText, color: Colors.onSurfaceVariant },
  metaDot: { width: Spacing.xs, height: Spacing.xs, borderRadius: Radius.sm, backgroundColor: Colors.outlineVariant },

  recurringBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start',
    backgroundColor: `${Colors.mossStructure}20`, borderRadius: Radius.full,
    paddingHorizontal: Spacing.sm, paddingVertical: 4, marginTop: Spacing.lg,
  },
  recurringBadgeText: { ...Typography.annotation, color: Colors.mossStructure },

  card: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderSubtle,
    marginBottom: Spacing.lg, overflow: 'hidden',
  },

  section: { marginBottom: Spacing.sectionGap + Spacing.lg },

  paidFromCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderSubtle,
    padding: Spacing.md, marginTop: Spacing.sectionGap + Spacing.sm, marginBottom: Spacing.sectionGap + Spacing.lg,
  },
  paidFromLeft: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1, minWidth: 0 },
  bankAvatar: {
    width: 40, height: 40, borderRadius: Radius.sm,
    backgroundColor: Colors.inkHeadline,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  bankInfo: { flex: 1, minWidth: 0 },
  bankNameRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.sm },
  bankName: { ...Typography.insightReading, color: Colors.onSurface, flexShrink: 1 },
  bankLast4: { ...Typography.numericSm, fontSize: 13, color: Colors.onSurfaceVariant },
  paidFromDateRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  paidFromDateText: { ...Typography.annotation, color: `${Colors.onSurfaceVariant}B3` },
  metaDotSmall: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: Colors.outlineVariant },
  paidFromRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flexShrink: 0, marginLeft: Spacing.md },
  expenseLabel: { ...Typography.annotation, color: Colors.onSurfaceVariant },

  merchantHistoryCard: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.borderSubtle,
    padding: Spacing.lg, marginBottom: Spacing.sectionGap + Spacing.lg, overflow: 'hidden',
  },
  merchantHistoryWatermark: { position: 'absolute', top: Spacing.xl, right: Spacing.xl, opacity: 0.05 },
  merchantHistoryHeader: { ...Typography.sectionHeader, color: Colors.primary, marginBottom: Spacing.md },
  merchantHistoryText: { ...Typography.insightReading, color: Colors.onSurface, lineHeight: 26 },
  merchantHistoryHighlight: { color: Colors.secondary },
  merchantHistorySub: { ...Typography.supportingText, color: Colors.onSurfaceVariant, marginTop: Spacing.sm },
  viewMerchantBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', marginTop: Spacing.md },
  viewMerchantText: { ...Typography.labelCaps, fontSize: 11, color: Colors.primary },

  sectionLabel: { ...Typography.sectionHeader, color: Colors.onSurfaceVariant, marginBottom: Spacing.md },
  sectionLabelInline: { ...Typography.sectionHeader, color: Colors.onSurfaceVariant },
  tagsHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },

  // minHeight here (not just on the TextInput) guarantees the border matches
  // the input's height even in the empty/placeholder-only state — RN Android
  // doesn't always respect a multiline TextInput's own minHeight until it has
  // real wrapped text, but a plain View's minHeight always holds.
  notesRule: { borderLeftWidth: 2, borderLeftColor: Colors.outlineVariant, paddingLeft: Spacing.md, minHeight: 40, justifyContent: 'center' },
  notesInput: {
    ...Typography.bodyStandard, fontStyle: 'italic', color: Colors.onSurfaceVariant,
    paddingVertical: Spacing.xs, paddingHorizontal: 0,
    minHeight: 40, textAlignVertical: 'top',
  },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, paddingLeft: Spacing.md },
  emptyTagsText: { ...Typography.supportingText, color: Colors.inkLabel },
  tagChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.surfaceContainerHighest,
    borderRadius: Radius.sm, paddingHorizontal: Spacing.sm + 4, paddingVertical: Spacing.xs,
  },
  tagChipText: { ...Typography.annotation, color: Colors.onSurface, lineHeight: 20 },
  tagChipRemove: { ...Typography.annotation, color: Colors.inkLabel },
  tagInputRow: { marginTop: Spacing.md, paddingLeft: Spacing.md },
  tagInput: {
    ...Typography.bodyStandard, color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerHighest, borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md, paddingVertical: 8,
  },

  otherInfoBody: { paddingHorizontal: Spacing.md },
  metaCaption: { ...Typography.labelCaps, fontSize: 10, color: `${Colors.onSurfaceVariant}99`, marginBottom: Spacing.xs },
  rawSmsBody: { ...Typography.supportingText, fontSize: 15, lineHeight: 24, color: Colors.onSurfaceVariant },
  divider: { height: 1, backgroundColor: Colors.borderSubtle, marginVertical: Spacing.lg },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  locationText: { ...Typography.numericSm, fontSize: 13, color: Colors.onSurfaceVariant },
  referenceText: { ...Typography.numericSm, fontSize: 14, letterSpacing: 0.5, color: Colors.onSurface },
  mapLink: { ...Typography.supportingText, color: Colors.primary, fontFamily: 'Inter_500Medium' },

  linkedCardInner: { padding: Spacing.md, gap: Spacing.sm },
  cardTitle: { ...Typography.insightReading, color: Colors.inkHeadline },
  cardSub: { ...Typography.supportingText, color: Colors.inkBody },
  linkButtonRow: { flexDirection: 'row', gap: Spacing.sm },
  pillBtn: {
    backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.full,
    paddingHorizontal: Spacing.md, paddingVertical: 8, alignSelf: 'flex-start',
  },
  pillBtnDanger: { backgroundColor: `${Colors.errorMuted}30` },
  pillBtnText: { ...Typography.annotation, color: Colors.onSurface },

  snackbar: {
    position: 'absolute', left: Spacing.containerMargin, right: Spacing.containerMargin, bottom: Spacing.xl,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md, paddingVertical: Spacing.md,
    borderWidth: 1, borderColor: Colors.borderSubtle,
  },
  snackbarText: { ...Typography.bodyStandard, color: Colors.inkHeadline },
  snackbarUndo: { ...Typography.bodyStandard, color: Colors.primary, fontFamily: 'Inter_500Medium' },

  // Bottom sheet shell
  sheetBackdrop: { flex: 1, backgroundColor: `${Colors.background}99`, justifyContent: 'flex-end' },
  sheetCard: {
    backgroundColor: Colors.surfaceContainerLow, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    borderTopWidth: 1, borderColor: Colors.borderSubtle,
    paddingBottom: Spacing.xl, maxHeight: '80%',
  },
  sheetHandleWrap: { alignItems: 'center', paddingVertical: Spacing.sm + 4 },
  sheetHandle: { width: 48, height: 6, borderRadius: Radius.full, backgroundColor: Colors.surfaceVariant },
  sheetTitle: { ...Typography.insightReading, color: Colors.inkHeadline, marginBottom: Spacing.md },

  sheetActionsList: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm },
  sheetActionRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: `${Colors.borderSubtle}80`,
  },
  sheetActionRowLast: { borderBottomWidth: 0 },
  sheetActionText: { ...Typography.insightReading, color: Colors.onSurface },

  sheetCategoryList: { paddingHorizontal: Spacing.lg },
  sheetSubHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  categoryPickRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: `${Colors.borderSubtle}80`,
  },
  categoryPickRowActive: {},
  categoryPickText: { ...Typography.bodyStandard, color: Colors.onSurface, flex: 1 },

  sheetForm: { paddingHorizontal: Spacing.lg },
  sheetTextInput: {
    ...Typography.bodyStandard, color: Colors.onSurface,
    backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.md, paddingVertical: 12, marginBottom: Spacing.md,
  },
  sheetErrorText: { ...Typography.supportingText, color: Colors.errorMuted, marginTop: Spacing.xs },
  sheetConfirm: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.sm + 2, alignItems: 'center', marginTop: Spacing.md },
  sheetConfirmText: { ...Typography.bodyStandard, color: Colors.onPrimary, fontFamily: 'Inter_500Medium' },

  amountInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.sm,
    backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.md,
  },
  amountInputPrefix: { ...Typography.numericMd, color: Colors.inkLabel },
  amountInputField: { flex: 1, ...Typography.numericLg, color: Colors.onSurface, paddingVertical: 12 },

  conversionToggle: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  conversionToggleText: { ...Typography.supportingText, color: Colors.primary },
  conversionToggleChevron: { color: Colors.primary },
  conversionBox: { gap: Spacing.sm, marginBottom: Spacing.sm },
  conversionRow: { flexDirection: 'row', gap: Spacing.sm },
  conversionInput: {
    flex: 1, ...Typography.bodyStandard, color: Colors.onSurface,
    backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderSubtle,
    paddingHorizontal: Spacing.sm, paddingVertical: 10,
  },
  conversionApply: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.borderSubtle,
    paddingVertical: Spacing.sm, alignItems: 'center',
  },
  conversionApplyText: { ...Typography.supportingText, color: Colors.primary },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  modalCard: {
    width: '85%', backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.lg, gap: Spacing.md,
  },
  modalCardTall: { maxHeight: '70%' },
  modalTitle: { ...Typography.insightReading, color: Colors.inkHeadline },
  modalInput: {
    backgroundColor: Colors.bgSurface, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.borderSubtle, paddingHorizontal: Spacing.md, paddingVertical: 10,
    ...Typography.bodyStandard, color: Colors.onSurface,
  },
  modalConfirm: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.sm, alignItems: 'center' },
  modalConfirmText: { ...Typography.bodyStandard, color: Colors.onPrimary, fontFamily: 'Inter_500Medium' },
  errorText: { ...Typography.supportingText, color: Colors.errorMuted },
  pickerRow: { paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle },
  pickerRowText: { ...Typography.bodyStandard, color: Colors.onSurface },
});
