import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Modal,
  Pressable,
  FlatList,
  Linking,
  Switch,
  Keyboard,
  useWindowDimensions,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "../../components/KeyboardAwareScrollView";
import { Colors, Spacing } from "../../theme";
import { MainStackScreenProps } from "../../navigation/types";
import { useTxStore } from "../../store/txStore";
import {
  getCategories,
  getSubcategories,
  getTxById,
  splitTx,
  linkTxs,
  unlinkTxs,
  setLinkSettled,
  groupTxs,
  addCategory,
  addSubcategory,
  deleteSubcategory,
} from "../../db/database";
import type { Category, Subcategory, TxRecord } from "../../db/database";
import { TransactionType } from "@rahatsayyed/bank-sms-parser";
import { formatAmount } from "../../utils/format";
import {
  iconForCategoryName,
  FALLBACK_CATEGORY_ICON,
} from "../../constants/categories";
import {
  BackIcon,
  MoreVertIcon,
  BankIcon,
  RepeatIcon,
  SplitIcon,
  LinkIcon,
  GroupWorkIcon,
  TrashIcon,
  ChevronRightIcon,
  StorefrontIcon,
  AddIcon,
  SearchIcon,
  CloseIcon,
} from "../../components/TabIcon";

const DAY_MS = 86_400_000;

function shortDate(ts: number): string {
  return new Date(ts).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function shortTime(ts: number): string {
  return new Date(ts)
    .toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .toUpperCase();
}

function monthYearLabel(ts: number): string {
  const d = new Date(ts);
  const opts: Intl.DateTimeFormatOptions = { month: "long" };
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = "numeric";
  return d.toLocaleDateString("en-IN", opts);
}

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

export function TransactionDetailScreen({
  route,
  navigation,
}: MainStackScreenProps<"TransactionDetail">) {
  const { transactionId } = route.params;
  const storeTx = useTxStore((s) => s.txs.find((t) => t.id === transactionId));
  const allTxs = useTxStore((s) => s.txs);
  const removeTx = useTxStore((s) => s.remove);
  const restoreTx = useTxStore((s) => s.restore);
  const updateTx = useTxStore((s) => s.update);
  const refreshStore = useTxStore((s) => s.refresh);

  const [categories, setCategories] = useState<Category[]>([]);
  const [notesDraft, setNotesDraft] = useState("");
  const [tagsDraft, setTagsDraft] = useState<string[]>([]);
  const [addingTag, setAddingTag] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [partner, setPartner] = useState<TxRecord | null>(null);
  const newTagInputRef = useRef<TextInput>(null);
  const mainScrollRef = useRef<React.ElementRef<typeof KeyboardAwareScrollView>>(null);

  // TextInput's native `autoFocus` fires before KeyboardAwareScrollView has
  // measured the freshly-mounted field, so its scroll-into-view lands short —
  // focusing a beat after mount lets the measurement land on the real layout.
  // The library's own keyboard-show auto-scroll still under-shoots for a field
  // this close to the end of a long screen, so force a second, larger-margin
  // scroll explicitly once the keyboard has had time to open.
  useEffect(() => {
    if (!addingTag) return;
    const focusTimer = setTimeout(() => newTagInputRef.current?.focus(), 80);
    const scrollTimer = setTimeout(() => {
      if (newTagInputRef.current) {
        mainScrollRef.current?.scrollToFocusedInput(newTagInputRef.current, 200);
      }
    }, 350);
    return () => {
      clearTimeout(focusTimer);
      clearTimeout(scrollTimer);
    };
  }, [addingTag]);

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
  const notesDraftRef = useRef("");
  const savedNotesRef = useRef<string | null>(null);
  const updateTxRef = useRef(updateTx);
  updateTxRef.current = updateTx;

  const tx = snapshot ?? storeTx ?? fallbackTx;

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  useEffect(() => {
    setNotesDraft(tx?.notes ?? "");
    setTagsDraft(tx?.tags ?? []);
    savedNotesRef.current = tx?.notes ?? "";
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
      if (
        currentId != null &&
        notesDraftRef.current !== (savedNotesRef.current ?? "")
      ) {
        updateTxRef.current(currentId, { notes: notesDraftRef.current });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tx?.id]);

  const category = useMemo(
    () => categories.find((c) => c.id === tx?.categoryId) ?? null,
    [categories, tx?.categoryId],
  );

  const CategoryIcon = category
    ? (iconForCategoryName(category.name) ?? FALLBACK_CATEGORY_ICON)
    : FALLBACK_CATEGORY_ICON;

  // Merchant history: real transactions only — omitted entirely (silence is a
  // feature) when this is the merchant's first recorded transaction.
  const merchantInsight = useMemo(() => {
    if (!tx?.merchant) return null;
    const name = tx.merchant.toLowerCase();
    const relevant = allTxs.filter(
      (t) =>
        !t.deletedAt &&
        t.merchant &&
        t.merchant.toLowerCase() === name &&
        isDebit(t.type),
    );
    if (relevant.length < 2) return null;
    const total = relevant.reduce((s, t) => s + t.amount, 0);
    const since = monthYearLabel(Math.min(...relevant.map((t) => t.timestamp)));
    const others = relevant
      .filter((t) => t.id !== tx.id)
      .sort((a, b) => b.timestamp - a.timestamp);
    const last = others[0] ?? null;
    return {
      total,
      count: relevant.length,
      since,
      lastAmount: last?.amount ?? null,
      daysAgo: last
        ? Math.max(0, Math.round((tx.timestamp - last.timestamp) / DAY_MS))
        : null,
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
      <View className="flex-1 bg-background">
        <View className="flex-row justify-between items-center px-container-margin pt-sm pb-sm">
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
            <BackIcon color={Colors.onSurface} size={22} />
          </TouchableOpacity>
        </View>
        <View className="absolute left-container-margin right-container-margin bottom-xl flex-row justify-between items-center bg-bg-surface-raised rounded-xl px-md py-md border border-border-subtle">
          <Text className="font-inter text-body-standard text-ink-headline">
            Transaction deleted
          </Text>
          <TouchableOpacity onPress={() => handleUndo(snapshot.id)}>
            <Text className="font-inter-medium text-body-standard text-primary">
              UNDO
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!tx) {
    if (!fallbackChecked) {
      return <View className="flex-1 bg-background" />;
    }
    return (
      <View className="flex-1 bg-background">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          className="flex-row justify-between items-center px-container-margin pt-sm pb-sm"
          hitSlop={8}
        >
          <BackIcon color={Colors.onSurface} size={22} />
        </TouchableOpacity>
        <Text className="font-inter-bold text-headline-sm text-on-surface mt-md mx-container-margin">
          Transaction not found
        </Text>
      </View>
    );
  }

  const credit = isCredit(tx.type);
  const countsToward = tx.type !== TransactionType.BALANCE_UPDATE;

  const saveNotes = () => {
    if (notesDraft !== (tx.notes ?? "")) {
      savedNotesRef.current = notesDraft;
      updateTx(tx.id, { notes: notesDraft });
    }
  };

  const commitTag = () => {
    const trimmed = newTag.trim();
    setAddingTag(false);
    // Case-insensitive dedupe: "Business" and "business" are the same tag.
    if (
      !trimmed ||
      tagsDraft.some((t) => t.toLowerCase() === trimmed.toLowerCase())
    ) {
      setNewTag("");
      return;
    }
    const next = [...tagsDraft, trimmed];
    setTagsDraft(next);
    setNewTag("");
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
      updateTx(tx.id, {
        type: tx.originalType ?? TransactionType.EXPENSE,
        originalType: null,
      });
    } else {
      updateTx(tx.id, {
        type: TransactionType.BALANCE_UPDATE,
        originalType: tx.type,
      });
    }
  };

  const handleSplitDone = async () => {
    setSplitVisible(false);
    await refreshStore();
    navigation.goBack();
  };

  const handleLinkPick = async (partnerId: number) => {
    await linkTxs(tx.id, partnerId, "manual");
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
    merged.setFullYear(
      selected.getFullYear(),
      selected.getMonth(),
      selected.getDate(),
    );
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
    <View className="flex-1 bg-background">
      <View className="flex-row justify-between items-center px-container-margin pt-sm pb-sm">
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={8}>
          <BackIcon color={Colors.onSurface} size={22} />
        </TouchableOpacity>
        <Text className="font-inter-semibold text-section-header text-on-surface uppercase">
          Transaction
        </Text>
        <TouchableOpacity onPress={() => setActionsVisible(true)} hitSlop={8}>
          <MoreVertIcon color={Colors.onSurface} size={22} />
        </TouchableOpacity>
      </View>

      <KeyboardAwareScrollView
        ref={mainScrollRef}
        contentContainerClassName="px-container-margin pt-md pb-[48px]"
        showsVerticalScrollIndicator={false}
        enableOnAndroid
        extraScrollHeight={Spacing.lg}
        keyboardShouldPersistTaps="handled"
      >
        {/* Hero */}
        <Text className="font-inter-semibold text-label-caps text-primary mb-lg">
          TRANSACTION STORY
        </Text>
        
        <TouchableOpacity
          onPress={() => setMerchantSheetVisible(true)}
          activeOpacity={0.7}
        >
          <Text className="font-Inter text-xl text-on-surface mt-xs">
            {tx.merchant || tx.bankName}
          </Text>
        </TouchableOpacity>
<TouchableOpacity
          onPress={() => setAmountSheetVisible(true)}
          activeOpacity={0.7}
        >
          <Text
            className={`font-mono-medium text-metric-hero ${credit ? "text-primary" : "text-on-surface"}`}
          >
            {formatAmount(tx.amount, tx.currency)}
          </Text>
        </TouchableOpacity>
        <View className="flex-row items-center gap-sm flex-wrap">
          <TouchableOpacity
            className="flex-row items-center gap-[6px]"
            onPress={() => setCategorySheetVisible(true)}
            hitSlop={4}
          >
            <CategoryIcon color={Colors.onSurfaceVariant} size={16} />
            <Text className="font-inter text-supporting-text text-on-surface-variant">
              {category?.name ?? "Uncategorized"}
            </Text>
          </TouchableOpacity>
          {/* <View className="w-[4px] h-[4px] rounded-sm bg-outline-variant" /> */}
          <Text className="font-inter text-supporting-text text-on-surface-variant">
            •
          </Text>
          <TouchableOpacity onPress={openDateEdit} hitSlop={4} className="flex-row gap-sm">
            <Text className="font-inter text-supporting-text text-on-surface-variant">
              {shortDate(tx.timestamp)}{" "}
            </Text>
            <Text className="font-inter text-supporting-text text-on-surface-variant">
              •
            </Text>
            <Text className="font-inter text-supporting-text text-on-surface-variant">
              {shortTime(tx.timestamp)}
            </Text>
          </TouchableOpacity>
        </View>

        {tx.recurring && (
          <View className="flex-row items-center gap-[6px] self-start bg-[#7C988520] rounded-full px-sm py-[4px] mt-lg">
            <RepeatIcon color={Colors.mossStructure} size={13} />
            <Text className="font-inter text-annotation text-moss-structure">
              Recurring
            </Text>
          </View>
        )}

        {/* Paid from */}
        <View className="flex-row items-center justify-between bg-surface-container-low rounded-sm border border-border-subtle p-md mt-[60px] mb-[48px]">
          <View className="flex-row items-center gap-md flex-1 min-w-0">
            <View className="w-10 h-10 rounded-sm bg-ink-headline items-center justify-center shrink-0">
              <BankIcon color={Colors.background} size={22} />
            </View>
            <View className="flex-1 min-w-0">
              <View className="flex-row items-baseline gap-sm">
                <Text
                  className="font-inter-medium text-insight-reading text-on-surface shrink"
                  numberOfLines={1}
                >
                  {tx.bankName}
                </Text>
                {tx.accountLast4 && (
                  <Text className="font-mono text-[13px] leading-[20px] text-on-surface-variant">
                    {tx.accountLast4}
                  </Text>
                )}
              </View>
              <View className="flex-row items-center gap-[6px] mt-[2px]">
                <Text className="font-inter text-annotation text-[#bdcac0B3]">
                  {shortDate(tx.timestamp)}
                </Text>
                <View className="w-[3px] h-[3px] rounded-[1.5px] bg-outline-variant" />
                <Text className="font-inter text-annotation text-[#bdcac0B3]">
                  {shortTime(tx.timestamp)}
                </Text>
              </View>
            </View>
          </View>
          <View className="flex-row items-center gap-sm shrink-0 ml-md">
            <Text className="font-inter text-annotation text-on-surface-variant">
              Expense
            </Text>
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
          <View className="bg-surface-container-low rounded-sm border border-border-subtle p-lg mb-[24px] overflow-hidden">
            <View className="absolute top-xl right-xl opacity-5">
              <StorefrontIcon color={Colors.onSurface} size={80} />
            </View>
            <Text className="font-inter-semibold text-section-header text-primary mb-md">
              MERCHANT HISTORY
            </Text>
            <Text className="font-inter-medium text-insight-reading text-on-surface leading-[26px]">
              You've spent{" "}
              <Text className="text-secondary">
                {formatAmount(merchantInsight.total, tx.currency)}
              </Text>{" "}
              across {merchantInsight.count} transactions since{" "}
              {merchantInsight.since}.
            </Text>
            {merchantInsight.lastAmount != null && (
              <Text className="font-inter text-supporting-text text-on-surface-variant mt-sm">
                Last visit was {merchantInsight.daysAgo} day
                {merchantInsight.daysAgo === 1 ? "" : "s"} ago for{" "}
                {formatAmount(merchantInsight.lastAmount, tx.currency)}.
              </Text>
            )}
            {tx.merchant && (
              <TouchableOpacity
                className="flex-row items-center gap-[2px] self-start mt-md"
                onPress={() =>
                  navigation.navigate("Tabs", {
                    screen: "Transactions",
                    params: { initialQuery: tx.merchant! },
                  })
                }
                hitSlop={4}
              >
                <Text className="font-inter-semibold text-[11px] leading-[14px] tracking-[0.55px] text-primary">
                  VIEW MERCHANT
                </Text>
                <ChevronRightIcon color={Colors.primary} size={16} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Notes */}
        <View className="mb-[24px]">
          <Text className="font-inter-semibold text-section-header text-on-surface-variant mb-md">
            NOTES
          </Text>
          {/* minHeight here (not just on the TextInput) guarantees the border matches
              the input's height even in the empty/placeholder-only state — RN Android
              doesn't always respect a multiline TextInput's own minHeight until it has
              real wrapped text, but a plain View's minHeight always holds. */}
          <View className="border-l-2 border-outline-variant pl-md min-h-[40px] justify-center">
            <TextInput
              className="font-inter italic text-body-standard text-on-surface-variant py-xs px-0 min-h-[40px]"
              style={{ textAlignVertical: "top" }}
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
        <View className="mb-[48px]">
          <View className="flex-row justify-between items-center mb-md">
            <Text className="font-inter-semibold text-section-header text-on-surface-variant">
              TAGS
            </Text>
            <TouchableOpacity onPress={() => setAddingTag(true)} hitSlop={8}>
              <AddIcon color={Colors.onSurface} size={22} />
            </TouchableOpacity>
          </View>
          <View className="flex-row flex-wrap gap-sm pl-sm">
            {tagsDraft.length === 0 && !addingTag && (
              <Text className="font-inter text-supporting-text text-ink-label">
                No tags yet
              </Text>
            )}
            {tagsDraft.map((tag) => (
              <View
                key={tag}
                className="flex-row items-center gap-[6px] bg-surface-container-highest rounded-xs px-3 py-xs"
              >
                <Text className="font-inter text-annotation text-on-surface leading-[20px]">
                  #{tag}
                </Text>
                <TouchableOpacity onPress={() => removeTag(tag)} hitSlop={4}>
                  <Text className="font-inter text-annotation text-ink-label">
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
          {addingTag && (
            <View className="mt-md pl-sm">
              <TextInput
                ref={newTagInputRef}
                className="font-inter text-body-standard text-on-surface bg-surface-container-highest rounded-xs px-3 py-xs"
                placeholder="Tag name…"
                placeholderTextColor={Colors.inkLabel}
                value={newTag}
                onChangeText={setNewTag}
                onSubmitEditing={commitTag}
                onBlur={commitTag}
                autoCapitalize="none"
              />
            </View>
          )}
        </View>

        {/* Other info */}
        <View className="mb-[64px]">
          <Text className="font-inter-semibold text-section-header text-on-surface-variant mb-md">
            OTHER INFO
          </Text>
          <View className="px-md">
            <Text className="font-inter-semibold text-[10px] leading-[14px] tracking-[0.55px] text-[#bdcac099] mb-xs">
              ORIGINAL SMS
            </Text>
            <Text className="font-inter text-[15px] leading-[24px] text-on-surface-variant">
              {tx.rawSms ?? "No raw SMS stored (manual entry)."}
            </Text>
            {tx.reference && (
              <>
                <View className="h-px bg-border-subtle my-lg" />
                <Text className="font-inter-semibold text-[10px] leading-[14px] tracking-[0.55px] text-[#bdcac099] mb-xs">
                  REFERENCE NO.
                </Text>
                <Text className="font-mono text-numeric-sm tracking-[0.5px] text-on-surface">
                  {tx.reference}
                </Text>
              </>
            )}
            {tx.lat != null && tx.lng != null && (
              <>
                <View className="h-px bg-border-subtle my-lg" />
                <Text className="font-inter-semibold text-[10px] leading-[14px] tracking-[0.55px] text-[#bdcac099] mb-xs">
                  LOCATION
                </Text>
                <View className="flex-row justify-between items-center">
                  <Text className="font-mono text-[13px] leading-[20px] text-on-surface-variant">
                    {tx.lat.toFixed(4)}, {tx.lng.toFixed(4)}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        `geo:${tx.lat},${tx.lng}?q=${tx.lat},${tx.lng}`,
                      )
                    }
                  >
                    <Text className="font-inter text-supporting-text text-primary">
                      Open in Maps
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Linked partner (contextual state, not an action-sheet item) */}
        {tx.linkType && partner && (
          <>
            <Text className="font-inter-semibold text-section-header text-on-surface-variant mb-md">
              LINKED WITH
            </Text>
            <View className="bg-surface-container-low rounded-md border border-border-subtle mb-lg overflow-hidden">
              <View className="p-md gap-sm">
                <Text className="font-inter-medium text-insight-reading text-ink-headline">
                  {partner.merchant || partner.bankName}
                </Text>
                <Text className="font-inter text-supporting-text text-ink-body">
                  Type: {tx.linkType}
                </Text>
                <View className="flex-row gap-sm">
                  <TouchableOpacity
                    className="bg-bg-surface-raised rounded-full px-md py-2 self-start"
                    onPress={toggleSettled}
                  >
                    <Text className="font-inter text-annotation text-on-surface">
                      {tx.linkSettled ? "✓ Settled" : "Mark Settled"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className="bg-[#C1666B30] rounded-full px-md py-2 self-start"
                    onPress={handleUnlink}
                  >
                    <Text className="font-inter text-annotation text-on-surface">
                      Unlink
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </>
        )}
      </KeyboardAwareScrollView>

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
        onSplit={() => {
          setActionsVisible(false);
          setSplitVisible(true);
        }}
        onLink={() => {
          setActionsVisible(false);
          setLinkVisible(true);
        }}
        onGroup={() => {
          setActionsVisible(false);
          setGroupVisible(true);
        }}
        onToggleRecurring={toggleRecurring}
        onDelete={handleDelete}
      />

      <CategorySheet
        visible={categorySheetVisible}
        onClose={() => setCategorySheetVisible(false)}
        categories={categories}
        currentCategoryId={tx.categoryId}
        currentSubcategoryId={tx.subcategoryId}
        onSelect={(categoryId, subcategoryId) => {
          updateTx(tx.id, { categoryId, subcategoryId: subcategoryId ?? null });
          setCategorySheetVisible(false);
        }}
        onCategoryCreated={(cat) => setCategories((prev) => [...prev, cat])}
        onSubcategoryDeleted={(subcategoryId) => {
          if (tx.subcategoryId === subcategoryId) refreshStore();
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
        initialValue={tx.merchant ?? ""}
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
        candidates={allTxs.filter(
          (t) => t.id !== tx.id && !t.deletedAt && !t.isSplitChild,
        )}
        onPick={handleLinkPick}
      />
      <GroupPicker
        visible={groupVisible}
        onClose={() => setGroupVisible(false)}
        candidates={allTxs.filter(
          (t) =>
            t.id !== tx.id &&
            !t.deletedAt &&
            !t.isSplitChild &&
            t.groupId == null,
        )}
        onConfirm={handleGroupConfirm}
      />
    </View>
  );
}

// ── Bottom sheet shell ───────────────────────────────────────────────────────

function BottomSheet({
  visible,
  onClose,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    if (visible) Keyboard.dismiss();
  }, [visible]);

  // RN's Modal renders in its own Dialog window, which is edge-to-edge on
  // Expo SDK 56 — Android's adjustResize does NOT shrink it when the keyboard
  // opens, so scroll-into-view math alone can't clear the keyboard. Instead,
  // track the keyboard height ourselves and lift the whole sheet card above
  // it (and shrink its max height so it still fits on screen).
  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", (e) =>
      setKeyboardHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener("keyboardDidHide", () =>
      setKeyboardHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const maxSheetHeight =
    keyboardHeight > 0
      ? windowHeight - keyboardHeight - insets.top - Spacing.lg
      : windowHeight * 0.8;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-[#0e151299] justify-end"
        onPress={onClose}
      >
        <Pressable
          className="bg-surface-container-low rounded-t-2xl border-t border-border-subtle"
          style={{ maxHeight: maxSheetHeight, marginBottom: keyboardHeight }}
          onPress={(e) => e.stopPropagation()}
        >
          <View className="items-center py-3">
            <View className="w-12 h-1.5 rounded-full bg-surface-variant" />
          </View>
          <KeyboardAwareScrollView
            enableOnAndroid
            extraScrollHeight={Spacing.lg}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              // The keyboard covers the system nav bar while open, so the
              // safe-area pad is only needed when it's closed — keeping it
              // would leave a doubled gap above the keyboard.
              paddingBottom:
                (keyboardHeight > 0 ? 0 : insets.bottom) + Spacing.sm,
            }}
          >
            {children}
          </KeyboardAwareScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Actions overflow sheet ───────────────────────────────────────────────────

function ActionsSheet({
  visible,
  onClose,
  canSplit,
  canLink,
  canGroup,
  recurring,
  onSplit,
  onLink,
  onGroup,
  onToggleRecurring,
  onDelete,
}: {
  visible: boolean;
  onClose: () => void;
  canSplit: boolean;
  canLink: boolean;
  canGroup: boolean;
  recurring: boolean;
  onSplit: () => void;
  onLink: () => void;
  onGroup: () => void;
  onToggleRecurring: () => void;
  onDelete: () => void;
}) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="px-lg pt-sm">
        {canSplit && (
          <TouchableOpacity
            className="flex-row items-center gap-md py-md border-b border-[#24312880]"
            onPress={onSplit}
          >
            <SplitIcon color={Colors.onSurfaceVariant} size={24} />
            <Text className="font-inter-medium text-insight-reading text-on-surface">
              Split Transaction
            </Text>
          </TouchableOpacity>
        )}
        {canLink && (
          <TouchableOpacity
            className="flex-row items-center gap-md py-md border-b border-[#24312880]"
            onPress={onLink}
          >
            <LinkIcon color={Colors.onSurfaceVariant} size={24} />
            <Text className="font-inter-medium text-insight-reading text-on-surface">
              Link to Original
            </Text>
          </TouchableOpacity>
        )}
        {canGroup && (
          <TouchableOpacity
            className="flex-row items-center gap-md py-md border-b border-[#24312880]"
            onPress={onGroup}
          >
            <GroupWorkIcon color={Colors.onSurfaceVariant} size={24} />
            <Text className="font-inter-medium text-insight-reading text-on-surface">
              Group with...
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          className="flex-row items-center gap-md py-md border-b border-[#24312880]"
          onPress={onToggleRecurring}
        >
          <RepeatIcon color={Colors.onSurfaceVariant} size={24} />
          <Text className="font-inter-medium text-insight-reading text-on-surface">
            {recurring ? "Unmark Recurring" : "Mark as Recurring"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center gap-md py-md"
          onPress={onDelete}
        >
          <TrashIcon color={`${Colors.error}CC`} size={24} />
          <Text className="font-inter-medium text-insight-reading text-error">
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// ── Category + subcategory sheet ────────────────────────────────────────────

function CategorySheet({
  visible,
  onClose,
  categories,
  currentCategoryId,
  currentSubcategoryId,
  onSelect,
  onCategoryCreated,
  onSubcategoryDeleted,
}: {
  visible: boolean;
  onClose: () => void;
  categories: Category[];
  currentCategoryId: number | null;
  currentSubcategoryId?: number | null;
  onSelect: (categoryId: number, subcategoryId?: number) => void;
  onCategoryCreated: (category: Category) => void;
  onSubcategoryDeleted: (subcategoryId: number) => void;
}) {
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [newSubName, setNewSubName] = useState("");
  const [addingSub, setAddingSub] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [deletingSubId, setDeletingSubId] = useState<number | null>(null);

  useEffect(() => {
    if (visible) {
      setActiveCategory(null);
      setSubcategories([]);
      setNewSubName("");
      setNewCategoryName("");
    }
  }, [visible]);

  const handleCategoryTap = async (cat: Category) => {
    if (activeCategory?.id === cat.id) {
      setActiveCategory(null);
      setSubcategories([]);
      return;
    }
    setActiveCategory(cat);
    setNewSubName("");
    const subs = await getSubcategories(cat.id);
    setSubcategories(subs);
  };

  const handleAddSubcategory = async () => {
    const name = newSubName.trim();
    if (!name || !activeCategory || addingSub) return;
    setAddingSub(true);
    try {
      const id = await addSubcategory(activeCategory.id, name);
      setSubcategories((prev) => [
        ...prev,
        { id, categoryId: activeCategory.id, name, isCustom: true },
      ]);
      setNewSubName("");
    } finally {
      setAddingSub(false);
    }
  };

  const handleDeleteSubcategory = async (sub: Subcategory) => {
    if (deletingSubId != null) return;
    setDeletingSubId(sub.id);
    try {
      await deleteSubcategory(sub.id);
      setSubcategories((prev) => prev.filter((s) => s.id !== sub.id));
      onSubcategoryDeleted(sub.id);
    } finally {
      setDeletingSubId(null);
    }
  };

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name || addingCategory) return;
    setAddingCategory(true);
    try {
      const id = await addCategory(name, "🏷");
      const category: Category = { id, name, emoji: "🏷", isCustom: true };
      onCategoryCreated(category);
      setNewCategoryName("");
      setActiveCategory(category);
      setSubcategories([]);
    } finally {
      setAddingCategory(false);
    }
  };

  const rows: Category[][] = [];
  for (let i = 0; i < categories.length; i += 3) {
    rows.push(categories.slice(i, i + 3));
  }

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="px-lg pt-sm">
        {rows.map((row, rowIndex) => (
          <View key={rowIndex}>
            <View className="flex-row gap-sm mb-sm">
              {row.map((cat) => {
                const Icon =
                  iconForCategoryName(cat.name) ?? FALLBACK_CATEGORY_ICON;
                const selected = activeCategory
                  ? activeCategory.id === cat.id
                  : cat.id === currentCategoryId;
                return (
                  <TouchableOpacity
                    key={cat.id}
                    className={`flex-1 items-center gap-xs py-sm px-sm rounded-sm border ${
                      selected
                        ? "border-primary bg-primary/10"
                        : "border-transparent"
                    }`}
                    onPress={() => handleCategoryTap(cat)}
                  >
                    <View className="w-12 h-12 rounded-sm items-center justify-center bg-surface-container-high">
                      <Icon
                        color={selected ? Colors.primary : Colors.onSurfaceVariant}
                        size={22}
                      />
                    </View>
                    <Text
                      className={`font-inter-semibold text-label-caps text-center tracking-wider ${
                        selected ? "text-on-surface" : "text-on-surface-variant"
                      }`}
                    >
                      {cat.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {row.length < 3 &&
                Array.from({ length: 3 - row.length }).map((_, i) => (
                  <View key={`pad-${i}`} className="flex-1" />
                ))}
            </View>
            {activeCategory && row.some((c) => c.id === activeCategory.id) && (
              <View className="bg-surface-container-low rounded-lg p-md mb-md gap-md">
                <View className="flex-row flex-wrap gap-sm">
                  <TouchableOpacity
                    className={`px-md py-xs rounded-xs ${
                      currentSubcategoryId == null &&
                      currentCategoryId === activeCategory.id
                        ? "bg-primary/20"
                        : "bg-on-tertiary-container/10"
                    }`}
                    onPress={() => onSelect(activeCategory.id, undefined)}
                  >
                    <Text className="font-inter text-supporting-text text-on-surface-variant">
                      No sub-category
                    </Text>
                  </TouchableOpacity>
                  {subcategories.map((sub) => (
                    <View
                      key={sub.id}
                      className={`flex-row items-center rounded-xs ${
                        currentSubcategoryId === sub.id
                          ? "bg-primary/20"
                          : "bg-on-tertiary-container/10"
                      }`}
                    >
                      <TouchableOpacity
                        className="pl-md pr-xs py-xs"
                        onPress={() => onSelect(activeCategory.id, sub.id)}
                      >
                        <Text className="font-inter text-supporting-text text-on-surface-variant">
                          {sub.name}
                        </Text>
                      </TouchableOpacity>
                      {sub.isCustom && (
                        <TouchableOpacity
                          className="pl-xs pr-sm py-xs"
                          disabled={deletingSubId === sub.id}
                          onPress={() => handleDeleteSubcategory(sub)}
                        >
                          <CloseIcon
                            color={`${Colors.onSurfaceVariant}99`}
                            size={12}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  ))}
                  <View className="flex-row items-center gap-xs bg-surface-container-high rounded-xs px-sm py-xs min-w-[100px]">
                    <TextInput
                      className="flex-1 font-inter text-supporting-text text-on-surface p-0"
                      placeholder="Add…"
                      placeholderTextColor={`${Colors.onSurfaceVariant}66`}
                      value={newSubName}
                      onChangeText={setNewSubName}
                      onSubmitEditing={handleAddSubcategory}
                      returnKeyType="done"
                    />
                    <AddIcon color={Colors.onSurfaceVariant} size={13} />
                  </View>
                </View>
              </View>
            )}
          </View>
        ))}

        <View className="border-t border-border-subtle pt-lg mt-sm">
          <View className="flex-row items-center gap-sm bg-surface-container-high rounded-sm px-sm">
            <SearchIcon color={`${Colors.onSurfaceVariant}99`} size={18} />
            <TextInput
              className="flex-1 font-inter text-body-standard text-on-surface py-sm"
              placeholder="Add new category"
              placeholderTextColor={`${Colors.onSurfaceVariant}66`}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              onSubmitEditing={handleAddCategory}
              returnKeyType="done"
            />
            <TouchableOpacity onPress={handleAddCategory}>
              <AddIcon color={Colors.primary} size={22} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </BottomSheet>
  );
}

// ── Amount edit sheet (with optional foreign-currency conversion helper) ────

function AmountSheet({
  visible,
  onClose,
  tx,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  tx: TxRecord;
  onConfirm: (amount: number) => void;
}) {
  const [amountText, setAmountText] = useState("");
  const [showConversion, setShowConversion] = useState(false);
  const [foreignAmount, setForeignAmount] = useState("");
  const [rate, setRate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const amountInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setAmountText(String(tx.amount));
      setShowConversion(false);
      setForeignAmount("");
      setRate("");
      setError(null);
      const t = setTimeout(() => amountInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [visible, tx.amount]);

  const converted = useMemo(() => {
    const f = Number(foreignAmount);
    const r = Number(rate);
    if (!foreignAmount || !rate || !Number.isFinite(f) || !Number.isFinite(r))
      return null;
    return f * r;
  }, [foreignAmount, rate]);

  const applyConverted = () => {
    if (converted != null) setAmountText(converted.toFixed(2));
  };

  const confirm = () => {
    const parsed = Number(amountText);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError("Enter a valid amount");
      return;
    }
    onConfirm(parsed);
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="px-lg">
        <Text className="font-inter-medium text-insight-reading text-ink-headline mb-md">
          Edit amount
        </Text>
        <View className="flex-row items-center gap-sm bg-bg-surface rounded-lg border border-border-subtle px-md">
          <Text className="font-mono-medium text-numeric-md text-ink-label">
            {tx.currency}
          </Text>
          <TextInput
            ref={amountInputRef}
            className="flex-1 font-mono-medium text-numeric-lg text-on-surface py-[12px]"
            keyboardType="decimal-pad"
            value={amountText}
            onChangeText={setAmountText}
          />
        </View>
        {error && (
          <Text className="font-inter text-supporting-text text-error-muted mt-xs">
            {error}
          </Text>
        )}

        <TouchableOpacity
          className="flex-row justify-between items-center py-md"
          onPress={() => setShowConversion((v) => !v)}
        >
          <Text className="font-inter text-supporting-text text-primary">
            Convert from another currency
          </Text>
          <Text className="text-primary">{showConversion ? "︿" : "﹀"}</Text>
        </TouchableOpacity>

        {showConversion && (
          <View className="gap-sm mb-sm">
            <View className="flex-row gap-sm">
              <TextInput
                className="flex-1 font-inter text-body-standard text-on-surface bg-bg-surface rounded-lg border border-border-subtle px-sm py-[10px]"
                placeholder="Foreign amount"
                placeholderTextColor={Colors.inkLabel}
                keyboardType="decimal-pad"
                value={foreignAmount}
                onChangeText={setForeignAmount}
              />
              <TextInput
                className="flex-1 font-inter text-body-standard text-on-surface bg-bg-surface rounded-lg border border-border-subtle px-sm py-[10px]"
                placeholder={`Rate (× 1 = ${tx.currency})`}
                placeholderTextColor={Colors.inkLabel}
                keyboardType="decimal-pad"
                value={rate}
                onChangeText={setRate}
              />
            </View>
            {converted != null && (
              <TouchableOpacity
                className="bg-bg-surface rounded-lg border border-border-subtle py-sm items-center"
                onPress={applyConverted}
              >
                <Text className="font-inter text-supporting-text text-primary">
                  = {formatAmount(converted, tx.currency)} · Use this amount
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        <TouchableOpacity
          className="bg-primary rounded-lg py-[10px] items-center mt-md"
          onPress={confirm}
        >
          <Text className="font-inter-medium text-body-standard text-on-primary">
            Save
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// ── Merchant name edit sheet ─────────────────────────────────────────────────

function MerchantSheet({
  visible,
  onClose,
  initialValue,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  initialValue: string;
  onConfirm: (value: string) => void;
}) {
  const [name, setName] = useState("");
  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setName(initialValue);
      const t = setTimeout(() => nameInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [visible, initialValue]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View className="px-lg">
        <Text className="font-inter-medium text-insight-reading text-ink-headline mb-md">
          Edit merchant name
        </Text>
        <TextInput
          ref={nameInputRef}
          className="font-inter text-body-standard text-on-surface bg-bg-surface rounded-lg border border-border-subtle px-md py-3 mb-md"
          placeholder="Merchant name"
          placeholderTextColor={Colors.inkLabel}
          value={name}
          onChangeText={setName}
        />
        <TouchableOpacity
          className="bg-primary rounded-lg py-[10px] items-center mt-md"
          onPress={() => onConfirm(name.trim())}
        >
          <Text className="font-inter-medium text-body-standard text-on-primary">
            Save
          </Text>
        </TouchableOpacity>
      </View>
    </BottomSheet>
  );
}

// ── Split (center modal, unchanged pattern) ─────────────────────────────────

function SplitModal({
  visible,
  onClose,
  tx,
  onDone,
}: {
  visible: boolean;
  onClose: () => void;
  tx: TxRecord;
  onDone: () => void;
}) {
  const [amounts, setAmounts] = useState<string[]>(["", ""]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setAmounts(["", ""]);
      setError(null);
    }
  }, [visible]);

  function setAmountAt(i: number, v: string) {
    setAmounts((prev) => prev.map((a, idx) => (idx === i ? v : a)));
  }

  function addRow() {
    setAmounts((prev) => [...prev, ""]);
  }

  async function confirm() {
    const parsed = amounts.map((a) => Number(a));
    if (parsed.some((n) => !Number.isFinite(n) || n <= 0)) {
      setError("Enter valid positive amounts");
      return;
    }
    const sum = parsed.reduce((s, n) => s + n, 0);
    if (Math.abs(sum - tx.amount) > 0.01) {
      setError(`Amounts must sum to ${formatAmount(tx.amount, tx.currency)}`);
      return;
    }
    try {
      await splitTx(
        tx.id,
        parsed.map((amount) => ({ amount })),
      );
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Split failed");
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/50 items-center justify-center"
        onPress={onClose}
      >
        <Pressable
          className="w-[85%] bg-bg-surface-raised rounded-xl border border-border-subtle p-lg gap-md"
          onPress={(e) => e.stopPropagation()}
        >
          <Text className="font-inter-medium text-insight-reading text-ink-headline">
            Split {formatAmount(tx.amount, tx.currency)} into {amounts.length}{" "}
            parts
          </Text>
          {amounts.map((a, i) => (
            <TextInput
              key={i}
              className="font-inter text-body-standard text-on-surface bg-bg-surface rounded-lg border border-border-subtle px-md py-[10px]"
              placeholder={`Part ${i + 1} amount`}
              placeholderTextColor={Colors.inkLabel}
              keyboardType="numeric"
              value={a}
              onChangeText={(v) => setAmountAt(i, v)}
            />
          ))}
          {error && (
            <Text className="font-inter text-supporting-text text-error-muted">
              {error}
            </Text>
          )}
          <TouchableOpacity
            className="bg-bg-surface-raised rounded-full px-md py-2 self-start"
            onPress={addRow}
          >
            <Text className="font-inter text-annotation text-on-surface">
              + Add part
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className="bg-primary rounded-lg py-sm items-center"
            onPress={confirm}
          >
            <Text className="font-inter-medium text-body-standard text-on-primary">
              Split
            </Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function LinkPicker({
  visible,
  onClose,
  candidates,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  candidates: TxRecord[];
  onPick: (id: number) => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/50 items-center justify-center"
        onPress={onClose}
      >
        <Pressable
          className="w-[85%] max-h-[70%] bg-bg-surface-raised rounded-xl border border-border-subtle p-lg gap-md"
          onPress={(e) => e.stopPropagation()}
        >
          <Text className="font-inter-medium text-insight-reading text-ink-headline">
            Link to…
          </Text>
          <FlatList
            data={candidates}
            keyExtractor={(t) => String(t.id)}
            renderItem={({ item }) => (
              <TouchableOpacity
                className="py-sm border-b border-border-subtle"
                onPress={() => onPick(item.id)}
              >
                <Text
                  className="font-inter text-body-standard text-on-surface"
                  numberOfLines={1}
                >
                  {item.merchant || item.bankName} ·{" "}
                  {formatAmount(item.amount, item.currency)}
                </Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text className="font-inter text-body-standard text-on-surface">
                No other transactions available.
              </Text>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function GroupPicker({
  visible,
  onClose,
  candidates,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  candidates: TxRecord[];
  onConfirm: (partnerId: number, name: string) => void;
}) {
  const [step, setStep] = useState<"pick" | "name">("pick");
  const [pickedId, setPickedId] = useState<number | null>(null);
  const [name, setName] = useState("");

  useEffect(() => {
    if (visible) {
      setStep("pick");
      setPickedId(null);
      setName("");
    }
  }, [visible]);

  const pick = (id: number) => {
    setPickedId(id);
    setStep("name");
  };

  const confirm = () => {
    const trimmed = name.trim();
    if (!trimmed || pickedId == null) return;
    onConfirm(pickedId, trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 bg-black/50 items-center justify-center"
        onPress={onClose}
      >
        <Pressable
          className={`w-[85%] bg-bg-surface-raised rounded-xl border border-border-subtle p-lg gap-md ${step === "pick" ? "max-h-[70%]" : ""}`}
          onPress={(e) => e.stopPropagation()}
        >
          {step === "pick" ? (
            <>
              <Text className="font-inter-medium text-insight-reading text-ink-headline">
                Group with…
              </Text>
              <FlatList
                data={candidates}
                keyExtractor={(t) => String(t.id)}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    className="py-sm border-b border-border-subtle"
                    onPress={() => pick(item.id)}
                  >
                    <Text
                      className="font-inter text-body-standard text-on-surface"
                      numberOfLines={1}
                    >
                      {item.merchant || item.bankName} ·{" "}
                      {formatAmount(item.amount, item.currency)}
                    </Text>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <Text className="font-inter text-body-standard text-on-surface">
                    No other transactions available.
                  </Text>
                }
              />
            </>
          ) : (
            <>
              <Text className="font-inter-medium text-insight-reading text-ink-headline">
                Group name
              </Text>
              <TextInput
                className="font-inter text-body-standard text-on-surface bg-bg-surface rounded-lg border border-border-subtle px-md py-[10px]"
                placeholder="e.g. Goa Trip"
                placeholderTextColor={Colors.inkLabel}
                value={name}
                onChangeText={setName}
                autoFocus
              />
              <TouchableOpacity
                className="bg-primary rounded-lg py-sm items-center"
                onPress={confirm}
              >
                <Text className="font-inter-medium text-body-standard text-on-primary">
                  Create group
                </Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
