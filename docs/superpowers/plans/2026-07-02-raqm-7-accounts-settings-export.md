# Raqm Plan 7: Accounts, Settings & Export — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Goal

Finish the last v0 feature area: a real Accounts system (per-bank/card view with balance, credit
limit, due date), settings polish (re-scan, export, about, location permissions) in `MoreScreen`,
and monthly/CSV/PDF export. This plan is purely additive on top of Plans 2–6 — it does not touch
categories, budgets, grocery, or notifications logic.

## Architecture

- **Accounts** are a first-class table (`accounts`, already created by the Plan 2/Foundation v2
  migration) surfaced through `getAccounts`/`addAccount`/`updateAccount` plus a new
  `syncDiscoveredAccounts()` that keeps the table in sync with whatever banks/cards show up in
  scanned transactions.
- **AccountDetailScreen** replaces its stub with a real screen: header (bank + masked account +
  last known balance), conditional card panel (limit/outstanding/due date, editable), and the
  filtered transaction list (same row look as `TransactionsScreen`).
- **Re-scan** becomes a real operation (`src/services/rescan.ts`) that reads the SMS inbox again
  over the onboarding-configured date range, drops previously-scanned rows, reinserts freshly
  parsed ones, and reruns Plan 3's detection jobs. Manual (`is_manual = 1`) rows are never touched.
- **Export** (`src/services/export.ts`) builds a `MonthlySummary` from Plan 5's period utilities
  and Plan 3's totals filter, and offers CSV (all transactions, `expo-file-system` + `expo-sharing`)
  and PDF (`expo-print` HTML statement + `expo-sharing`) export paths.
- **MoreScreen** gets its dead rows wired up: Re-scan, Export, Add account, About, Location
  permissions.
- **TransactionDetailScreen** gains a small "Other Info" addition: an "Open in Maps" link when
  `lat`/`lng` are present (L2), nothing when absent (L3) — no map library, just `Linking`.

## Tech Stack

- Expo SDK 56, RN 0.85, Android-only, New Architecture, CNG (`android/` gitignored).
- `expo-sqlite` v15 async API (`runAsync`/`getFirstAsync`/`getAllAsync`), explicit
  `BEGIN`/`COMMIT`/`ROLLBACK` transactions — never `withTransactionAsync`.
- `expo-file-system` **new class-based API** (`File`, `Directory`, `Paths` from `'expo-file-system'`)
  — the old `FileSystem.writeAsStringAsync` style is deprecated in SDK 56 and throws at runtime.
  Legacy API is only reachable via `expo-file-system/legacy` and is **not** used in this plan.
- `expo-print` (`Print.printToFileAsync`) and `expo-sharing` (`Sharing.shareAsync`) — verified
  against `https://docs.expo.dev/versions/v56.0.0/sdk/print/` and `/sdk/sharing/` on 2026-07-02.
- `expo-file-system` is already present in the resolved dependency tree (transitive, hoisted at
  the monorepo root) but is **not** declared in `apps/raqm/package.json` — Task 4 declares it
  explicitly. `expo-print` and `expo-sharing` are not installed at all — Task 4 installs both.

## Global Constraints

- All DB access goes through `expo-sqlite`'s async API exactly as used elsewhere in the codebase
  (`getDb()`, `runAsync`, `getAllAsync`, `getFirstAsync`). Never introduce `withTransactionAsync`.
- Verify SDK 56 API shape before writing file/print/share code — this plan already did that via
  WebFetch against the versioned docs (see Tech Stack). If you're implementing this plan much
  later than 2026-07-02, re-check `https://docs.expo.dev/versions/v56.0.0/sdk/filesystem/`,
  `/sdk/print/`, `/sdk/sharing/` before trusting the code blocks below.
- Dark theme tokens (`Colors`, `Typography`, `Spacing`, `Radius` from `src/theme`) are mandatory
  for every in-app screen edited in this plan. The **PDF HTML template is the one exception** —
  it renders as a light, print-style statement (dark-on-white) since that's what people expect
  from a financial statement PDF; do not try to force the app's dark palette into the PDF.
  Everything else (MoreScreen rows, AccountDetailScreen, the add-account modal, the location row)
  must use the theme tokens.
- Run `npx tsc --noEmit` from `apps/raqm/` after every task. Expected: no errors.
- No behavioral test runner exists (no jest/vitest) — verification is manual on a physical Android
  device (`npx expo run:android`); each task lists exact spec IDs to check.
- Copy every contract signature from `docs/superpowers/plans/2026-07-02-raqm-shared-interfaces.md`
  §7 **verbatim** — do not rename fields or change return types.
- This plan **consumes** Plans 2–6 only (`TxRecord`, `useTxStore`, `getCategories`,
  `getSubcategories`, `countsTowardTotals`, `runDetectionJobs` from `src/services/txIntelligence.ts`,
  `getMonthBounds`/`month_start_day` from `src/utils/period.ts` and Plan 5's settings row,
  `dateRangeToTimestamps` from `src/store/onboardingStore.ts`). It must not reference anything
  from a higher-numbered plan (there is none — this is the last plan).
- Do **not** run `git commit` unless the session controller explicitly states the user has
  approved commits. Otherwise leave changes in the working tree and say so.

---

## Task 1: Accounts DB + discovery sync + AppNavigator hook

### Files
- `apps/raqm/src/db/database.ts` (edit — append)
- `apps/raqm/src/navigation/AppNavigator.tsx` (edit)

### Interfaces
```ts
// src/db/database.ts additions — contract §7, verbatim
export interface Account {
  id: number; bankName: string; last4: string | null; isCard: boolean; isManual: boolean;
  nickname: string | null; creditLimit: number | null; dueDate: string | null;
}
export async function getAccounts(): Promise<Account[]>;
export async function addAccount(input: {
  bankName: string; last4?: string | null; isCard?: boolean;
  nickname?: string | null; creditLimit?: number | null; dueDate?: string | null;
}): Promise<number>; // is_manual = 1
export async function updateAccount(id: number, patch: Partial<Omit<Account, 'id' | 'isManual'>>): Promise<void>;

// New in this plan — not in the contract table, defined here because Plan 7 owns it
export async function syncDiscoveredAccounts(): Promise<void>;
```

**Note on `isManual` semantics:** the contract hardcodes `addAccount` to always insert
`is_manual = 1` — there is no lower-level insert path in the contract. `syncDiscoveredAccounts`
therefore calls `addAccount` too, meaning even auto-discovered accounts end up with
`isManual: true` in the row. This is accepted as-is per the verbatim contract; `isManual` in
practice distinguishes "has an accounts row" from "no accounts row yet," not "user typed this in
by hand." Do not add a second insert path to work around it — that would violate the contract.

### Steps

- [ ] 1.1 Open `apps/raqm/src/db/database.ts`. Add the accounts section immediately after the
      settings helpers at the bottom of the file:

```ts
// ── Accounts ───────────────────────────────────────────────────────────────

export interface Account {
  id: number;
  bankName: string;
  last4: string | null;
  isCard: boolean;
  isManual: boolean;
  nickname: string | null;
  creditLimit: number | null;
  dueDate: string | null;
}

function rowToAccount(row: Record<string, unknown>): Account {
  return {
    id: row.id as number,
    bankName: row.bank_name as string,
    last4: (row.last4 as string | null) ?? null,
    isCard: (row.is_card as number) === 1,
    isManual: (row.is_manual as number) === 1,
    nickname: (row.nickname as string | null) ?? null,
    creditLimit: (row.credit_limit as number | null) ?? null,
    dueDate: (row.due_date as string | null) ?? null,
  };
}

export async function getAccounts(): Promise<Account[]> {
  const database = await getDb();
  const rows = await database.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM accounts ORDER BY bank_name ASC, last4 ASC`,
  );
  return rows.map(rowToAccount);
}

export async function addAccount(input: {
  bankName: string;
  last4?: string | null;
  isCard?: boolean;
  nickname?: string | null;
  creditLimit?: number | null;
  dueDate?: string | null;
}): Promise<number> {
  const database = await getDb();
  const result = await database.runAsync(
    `INSERT INTO accounts (bank_name, last4, is_card, is_manual, nickname, credit_limit, due_date)
     VALUES (?, ?, ?, 1, ?, ?, ?)`,
    input.bankName,
    input.last4 ?? null,
    input.isCard ? 1 : 0,
    input.nickname ?? null,
    input.creditLimit ?? null,
    input.dueDate ?? null,
  );
  return result.lastInsertRowId;
}

export async function updateAccount(
  id: number,
  patch: Partial<Omit<Account, 'id' | 'isManual'>>,
): Promise<void> {
  const database = await getDb();
  const colByKey: Record<string, string> = {
    bankName: 'bank_name',
    last4: 'last4',
    isCard: 'is_card',
    nickname: 'nickname',
    creditLimit: 'credit_limit',
    dueDate: 'due_date',
  };
  const sets: string[] = [];
  const values: unknown[] = [];
  for (const [key, col] of Object.entries(colByKey)) {
    if (!(key in patch)) continue;
    const v = (patch as Record<string, unknown>)[key];
    sets.push(`${col} = ?`);
    values.push(key === 'isCard' ? (v ? 1 : 0) : v);
  }
  if (sets.length === 0) return;
  values.push(id);
  await database.runAsync(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?`, ...values as never[]);
}

/**
 * Upserts accounts rows from distinct (bankName, accountLast4, isFromCard) tuples seen in
 * transactions. Skips tuples that already have a matching accounts row (matched on
 * bankName + last4 — last4 null matches null). Idempotent; safe to call on every app start.
 * Credit-limit enrichment (A3) is intentionally NOT attempted here: ParsedTransaction.creditLimit
 * is not persisted on TxRecord (see contract §2), so newly-discovered card accounts get
 * `creditLimit: null` and rely on the manual edit fields in AccountDetailScreen (Task 2).
 */
export async function syncDiscoveredAccounts(): Promise<void> {
  const database = await getDb();
  const rows = await database.getAllAsync<{
    bankName: string;
    accountLast4: string | null;
    isFromCard: number;
  }>(
    `SELECT DISTINCT bankName, accountLast4, isFromCard
     FROM transactions
     WHERE deleted_at IS NULL`,
  );
  const existing = await getAccounts();
  const seen = new Set(existing.map(a => `${a.bankName}|${a.last4 ?? ''}`));
  for (const row of rows) {
    const key = `${row.bankName}|${row.accountLast4 ?? ''}`;
    if (seen.has(key)) continue;
    await addAccount({
      bankName: row.bankName,
      last4: row.accountLast4,
      isCard: row.isFromCard === 1,
    });
    seen.add(key);
  }
}
```

- [ ] 1.2 Open `apps/raqm/src/navigation/AppNavigator.tsx`. By this point in the build (post
      Plan 2/4), the init effect calls `await useTxStore.getState().load();` and sets up
      `navigationRef` (Plan 4). Import `syncDiscoveredAccounts` from `'../db/database'` and call it
      immediately after the store load, before the ready flag flips to `true`. Example shape (adapt
      to whatever the actual post-Plan-4 file looks like — the load-then-sync ordering is what
      matters, not the exact surrounding code):

```ts
import { syncDiscoveredAccounts } from '../db/database';
// ...
useEffect(() => {
  let cancelled = false;
  const init = async () => {
    await useTxStore.getState().load();
    await syncDiscoveredAccounts();
    if (!cancelled) setReady(true);
  };
  // ... existing hydration-gated call to init() ...
}, []);
```

      If the file still has the pre-Plan-2 shape you're reading right now (calling
      `useOnboardingStore`'s `initDb()`), that means Plans 2–6 have not actually landed yet —
      stop and flag this to the controller; do not proceed on the old store.

- [ ] 1.3 Verify: `cd apps/raqm && npx tsc --noEmit` → no errors.
- [ ] 1.4 Commit — skip if the user has not approved commits. Suggested message: `feat(raqm): add accounts table CRUD and discovery sync`.

---

## Task 2: AccountDetailScreen, Dashboard chip navigation, manual add (A2–A4, V6)

### Files
- `apps/raqm/src/screens/main/AccountDetailScreen.tsx` (replace stub)
- `apps/raqm/src/components/AddAccountModal.tsx` (new)
- `apps/raqm/src/screens/main/DashboardScreen.tsx` (edit — wrap account chip)

### Interfaces
Consumes `Account`/`getAccounts`/`updateAccount`/`addAccount` from Task 1, `TxRecord`/`useTxStore`
from Plan 2, `MainStackScreenProps<'AccountDetail'>` / `MainStackParamList` from
`src/navigation/types.ts` (unchanged — already has `AccountDetail: { bankName: string; last4?: string }`).

### Steps

- [ ] 2.1 Replace `apps/raqm/src/screens/main/AccountDetailScreen.tsx` in full:

```tsx
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../../theme';
import { MainStackScreenProps } from '../../navigation/types';
import { useTxStore } from '../../store/txStore';
import { getAccounts, updateAccount, Account } from '../../db/database';
import { TransactionType, type ParsedTransaction } from '@rahatsayyed/bank-sms-parser';
import type { TxRecord } from '../../db/database';

function formatAmount(n: number, currency = '₹'): string {
  return `${currency}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function isDebit(type: TransactionType): boolean {
  return type === TransactionType.EXPENSE || type === TransactionType.TRANSFER || type === TransactionType.INVESTMENT;
}

function txColor(type: TransactionType): string {
  switch (type) {
    case TransactionType.INCOME:
    case TransactionType.CREDIT: return Colors.primary;
    case TransactionType.EXPENSE: return Colors.error;
    default: return Colors.onSurfaceVariant;
  }
}

export function AccountDetailScreen({ route, navigation }: MainStackScreenProps<'AccountDetail'>) {
  const { bankName, last4 } = route.params;
  const txs = useTxStore(s => s.txs);
  const [account, setAccount] = useState<Account | null>(null);
  const [nickname, setNickname] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const accountTxs = useMemo(
    () => txs.filter(t => t.bankName === bankName && (t.accountLast4 ?? '') === (last4 ?? '')),
    [txs, bankName, last4],
  );

  const isCard = account?.isCard ?? accountTxs.some(t => t.isFromCard);
  const currency = accountTxs[0]?.currency ?? '₹';

  const lastBalanceTx = useMemo(
    () => accountTxs.find(t => t.balance != null),
    [accountTxs],
  );

  const outstanding = useMemo(() => {
    if (!account?.creditLimit || lastBalanceTx?.balance == null) return null;
    return account.creditLimit - lastBalanceTx.balance;
  }, [account, lastBalanceTx]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const accounts = await getAccounts();
      const match = accounts.find(a => a.bankName === bankName && (a.last4 ?? '') === (last4 ?? '')) ?? null;
      if (cancelled) return;
      setAccount(match);
      setNickname(match?.nickname ?? '');
      setCreditLimit(match?.creditLimit != null ? String(match.creditLimit) : '');
      setDueDate(match?.dueDate ?? '');
    })();
    return () => { cancelled = true; };
  }, [bankName, last4]);

  const handleSave = async () => {
    if (!account) return;
    setSaving(true);
    try {
      await updateAccount(account.id, {
        nickname: nickname.trim() || null,
        creditLimit: creditLimit.trim() ? Number(creditLimit) : null,
        dueDate: dueDate.trim() || null,
      });
      const accounts = await getAccounts();
      const refreshed = accounts.find(a => a.id === account.id) ?? null;
      setAccount(refreshed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <View style={styles.headerCard}>
          <Text style={styles.headerIcon}>{isCard ? '💳' : '🏦'}</Text>
          <Text style={styles.headerBank}>{account?.nickname || bankName}</Text>
          <Text style={styles.headerSub}>{last4 ? `•••• ${last4}` : 'Account'}</Text>
          <Text style={styles.balanceLabel}>Last known balance</Text>
          <Text style={styles.balanceValue}>
            {lastBalanceTx?.balance != null ? formatAmount(lastBalanceTx.balance, currency) : '—'}
          </Text>
          {lastBalanceTx && (
            <Text style={styles.balanceMeta}>as of {formatDate(lastBalanceTx.timestamp)}</Text>
          )}
        </View>

        {isCard && (
          <View style={styles.cardPanel}>
            <Text style={styles.sectionTitle}>Card details</Text>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Nickname</Text>
              <TextInput
                style={styles.cardInput}
                value={nickname}
                onChangeText={setNickname}
                placeholder="e.g. Everyday card"
                placeholderTextColor={Colors.outline}
              />
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Credit limit</Text>
              <TextInput
                style={styles.cardInput}
                value={creditLimit}
                onChangeText={setCreditLimit}
                keyboardType="numeric"
                placeholder="e.g. 100000"
                placeholderTextColor={Colors.outline}
              />
            </View>
            <View style={styles.cardRow}>
              <Text style={styles.cardLabel}>Due date</Text>
              <TextInput
                style={styles.cardInput}
                value={dueDate}
                onChangeText={setDueDate}
                placeholder="e.g. 5th of month"
                placeholderTextColor={Colors.outline}
              />
            </View>
            {outstanding != null && (
              <View style={styles.outstandingRow}>
                <Text style={styles.cardLabel}>Outstanding</Text>
                <Text style={styles.outstandingValue}>{formatAmount(outstanding, currency)}</Text>
              </View>
            )}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving || !account}>
              <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save card details'}</Text>
            </TouchableOpacity>
            {!account && (
              <Text style={styles.hint}>Account row not found yet — it appears after the next scan or app restart.</Text>
            )}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Transactions ({accountTxs.length})</Text>
          <View style={styles.txList}>
            {accountTxs.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>No transactions for this account</Text>
              </View>
            ) : (
              accountTxs.map((tx, i) => (
                <AccountTxRow
                  key={tx.id}
                  tx={tx}
                  currency={currency}
                  isLast={i === accountTxs.length - 1}
                  onPress={() => navigation.navigate('TransactionDetail', { transactionId: tx.id })}
                />
              ))
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function AccountTxRow({
  tx, currency, isLast, onPress,
}: { tx: TxRecord; currency: string; isLast: boolean; onPress: () => void }) {
  const debit = isDebit(tx.type);
  const color = txColor(tx.type);
  return (
    <TouchableOpacity style={[styles.txRow, !isLast && styles.txRowBorder]} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.txDot, { backgroundColor: `${color}20` }]}>
        <Text style={[styles.txDotText, { color }]}>{debit ? '↓' : '↑'}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txMerchant} numberOfLines={1}>{tx.merchant || tx.bankName}</Text>
        <Text style={styles.txMeta}>{formatDate(tx.timestamp)}</Text>
      </View>
      <Text style={[styles.txAmount, { color }]}>{debit ? '-' : '+'}{formatAmount(tx.amount, currency)}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.containerMargin, paddingBottom: 40 },
  back: { marginBottom: Spacing.md },
  backText: { ...Typography.bodyMd, color: Colors.primary },

  headerCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    padding: Spacing.lg, alignItems: 'center', gap: 4, marginBottom: Spacing.lg,
  },
  headerIcon: { fontSize: 32, marginBottom: 4 },
  headerBank: { ...Typography.headlineSm, color: Colors.onSurface },
  headerSub: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
  balanceLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginTop: Spacing.md },
  balanceValue: { ...Typography.numericXl, color: Colors.onSurface },
  balanceMeta: { ...Typography.labelSm, color: Colors.outline },

  cardPanel: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
    padding: Spacing.md, marginBottom: Spacing.lg, gap: Spacing.sm,
  },
  sectionTitle: { ...Typography.titleLg, color: Colors.onSurface, fontSize: 16, marginBottom: Spacing.sm },
  cardRow: { gap: 4 },
  cardLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant },
  cardInput: {
    ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 8,
  },
  outstandingRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.sm },
  outstandingValue: { ...Typography.numericMd, color: Colors.error, fontSize: 16 },
  saveBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 10, alignItems: 'center', marginTop: Spacing.sm,
  },
  saveBtnText: { ...Typography.bodyMd, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
  hint: { ...Typography.labelSm, color: Colors.outline, marginTop: 4 },

  section: {},
  txList: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant, overflow: 'hidden',
  },
  txRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingVertical: 14 },
  txRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  txDot: { width: 40, height: 40, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  txDotText: { fontSize: 16, fontWeight: '700' },
  txInfo: { flex: 1 },
  txMerchant: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
  txMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
  txAmount: { ...Typography.numericSm, fontSize: 15 },
  empty: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
});
```

  If `useTxStore`'s `TxRecord.type` import differs slightly from this sketch (e.g. no need for
  `ParsedTransaction` import at all), drop the unused import — this file only needs
  `TransactionType` and `TxRecord`.

- [ ] 2.2 Create `apps/raqm/src/components/AddAccountModal.tsx` (A4 — manual account add):

```tsx
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, TouchableOpacity, Switch } from 'react-native';
import { Colors, Typography, Spacing, Radius } from '../theme';
import { addAccount } from '../db/database';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export function AddAccountModal({ visible, onClose, onAdded }: Props) {
  const [bankName, setBankName] = useState('');
  const [last4, setLast4] = useState('');
  const [isCard, setIsCard] = useState(false);
  const [nickname, setNickname] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setBankName(''); setLast4(''); setIsCard(false); setNickname('');
  };

  const handleAdd = async () => {
    if (!bankName.trim()) return;
    setSaving(true);
    try {
      await addAccount({
        bankName: bankName.trim(),
        last4: last4.trim() || null,
        isCard,
        nickname: nickname.trim() || null,
      });
      reset();
      onAdded();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Add account</Text>

          <Text style={styles.label}>Bank name</Text>
          <TextInput
            style={styles.input} value={bankName} onChangeText={setBankName}
            placeholder="e.g. HDFC Bank" placeholderTextColor={Colors.outline}
          />

          <Text style={styles.label}>Last 4 digits (optional)</Text>
          <TextInput
            style={styles.input} value={last4} onChangeText={setLast4}
            placeholder="e.g. 4821" keyboardType="numeric" maxLength={4}
            placeholderTextColor={Colors.outline}
          />

          <Text style={styles.label}>Nickname (optional)</Text>
          <TextInput
            style={styles.input} value={nickname} onChangeText={setNickname}
            placeholder="e.g. Salary account" placeholderTextColor={Colors.outline}
          />

          <View style={styles.switchRow}>
            <Text style={styles.label}>This is a credit/debit card</Text>
            <Switch value={isCard} onValueChange={setIsCard} trackColor={{ true: Colors.primary }} />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => { reset(); onClose(); }}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addBtn, !bankName.trim() && styles.addBtnDisabled]}
              onPress={handleAdd}
              disabled={saving || !bankName.trim()}
            >
              <Text style={styles.addText}>{saving ? 'Adding…' : 'Add account'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: Colors.bgSurfaceRaised, borderTopLeftRadius: Radius.xxl, borderTopRightRadius: Radius.xxl,
    padding: Spacing.lg, gap: Spacing.sm,
  },
  title: { ...Typography.headlineSm, color: Colors.onSurface, marginBottom: Spacing.sm },
  label: { ...Typography.labelSm, color: Colors.onSurfaceVariant, marginTop: Spacing.sm },
  input: {
    ...Typography.bodyMd, color: Colors.onSurface,
    backgroundColor: Colors.surfaceVariant, borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm, paddingVertical: 10,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: Spacing.md },
  actions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.lg, backgroundColor: Colors.surfaceVariant },
  cancelText: { ...Typography.bodyMd, color: Colors.onSurface },
  addBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: Radius.lg, backgroundColor: Colors.primary },
  addBtnDisabled: { opacity: 0.5 },
  addText: { ...Typography.bodyMd, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
});
```

- [ ] 2.3 Open `apps/raqm/src/screens/main/DashboardScreen.tsx`. By Plan 2 this screen reads from
      `useTxStore` instead of `useOnboardingStore`, but the account-chip aggregation block is the
      same shape shown below (adjust variable names to whatever Plan 2 actually produced — the
      important part is wrapping the chip in a `TouchableOpacity` that navigates). Add the
      navigation import and wrap the chip:

```tsx
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../navigation/types';

// inside DashboardScreen component:
const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
```

  and change the chip render from a bare `<View>` to:

```tsx
{accounts.map((acc, i) => (
  <TouchableOpacity
    key={i}
    style={styles.accountChip}
    activeOpacity={0.7}
    onPress={() => navigation.navigate('AccountDetail', { bankName: acc.bank, last4: acc.last4 ?? undefined })}
  >
    <Text style={styles.accountChipIcon}>{acc.isCard ? '💳' : '🏦'}</Text>
    <View>
      <Text style={styles.accountChipBank}>{acc.bank}</Text>
      <Text style={styles.accountChipMeta}>
        {acc.last4 ? `•••• ${acc.last4}` : 'Account'} · {acc.count} txns
      </Text>
    </View>
  </TouchableOpacity>
))}
```

  (`TouchableOpacity` is already imported in this file; add `useNavigation` and the param-list type.)

- [ ] 2.4 Verify: `cd apps/raqm && npx tsc --noEmit` → no errors.
- [ ] 2.5 Device checklist:
  - A2: open AccountDetailScreen for an account with balance-bearing SMS — last known balance shown, matches the most recent transaction with a non-null balance.
  - A3: open a card account — limit/outstanding/due-date panel renders; editing and saving nickname/limit/due-date persists across app restart.
  - A4: MoreScreen "Add account" (wired in Task 5) creates a manual account visible from Dashboard/AccountDetail.
  - V6: AccountDetailScreen transaction list only shows transactions for that bank+last4 pair; tapping a row opens `TransactionDetail`.
- [ ] 2.6 Commit — skip if the user has not approved commits. Suggested message: `feat(raqm): build AccountDetailScreen and manual account add`.

---

## Task 3: Re-scan (S4, S5) with a manual-row-safe delete

### Files
- `apps/raqm/src/db/database.ts` (edit — append)
- `apps/raqm/src/services/rescan.ts` (new)

### Interfaces
```ts
// src/db/database.ts addition
export async function clearScannedTransactions(): Promise<void>; // DELETE FROM transactions WHERE is_manual = 0

// src/services/rescan.ts
export interface RescanResult { found: number; }
export async function rescanTransactions(onProgress?: (count: number) => void): Promise<RescanResult>;
```

### Deviation from the naive S4 approach — documented per controller instruction

The spec's S4 note ("re-run the scan, calls `SmsReader.readInbox` … re-runs parse + `setTransactions`")
and a naive reading of "wipe and reinsert" would use the existing `clearTransactions()` (`DELETE FROM
transactions` — no filter). That would **delete every manually-added cash transaction** on every
re-scan, which is unacceptable. This plan instead:

1. Adds `clearScannedTransactions()` — deletes only `is_manual = 0` rows, preserving manual entries.
2. Re-scan reads the inbox over the range currently configured in `useOnboardingStore`
   (`dateRangeToTimestamps`), filters to known bank senders (S5), parses, deletes old scanned rows,
   and bulk-inserts the freshly parsed ones via `insertParsedTx` (Plan 2 — persists `raw_sms`).

**Known limitation, also documented here rather than silently shipped:** because
`clearScannedTransactions` + re-insert creates brand-new rows (new `id`s) for every previously-
scanned transaction, **any category assignment, note, tag, split/merge/group/link state, or manual
edit applied to an SMS-derived (`is_manual = 0`) transaction is lost on re-scan** — only raw
bank-parsed fields survive. This is acceptable for v0 (re-scan is a recovery/catch-up tool, not
expected to be run routinely) but must be called out to the user via the confirm dialog copy in
Task 5 ("Re-scanning will refresh SMS-derived transactions; categories and notes you added to
those will be reset. Manually added transactions are not affected."). A future improvement would
reconcile by `ParsedTransaction.transactionHash` instead of wipe-and-reinsert — out of scope here.

### Steps

- [ ] 3.1 Add to `apps/raqm/src/db/database.ts`, right after `clearTransactions`:

```ts
export async function clearScannedTransactions(): Promise<void> {
  const database = await getDb();
  await database.runAsync('DELETE FROM transactions WHERE is_manual = 0');
}
```

  (If Plan 2 has already renamed/removed `clearTransactions` in favor of something else, place
  this function anywhere in the transaction-queries section — the SQL is what matters.)

- [ ] 3.2 Create `apps/raqm/src/services/rescan.ts`:

```ts
import { SmsReader } from '../native/SmsReader';
import { BankParserFactory } from '@rahatsayyed/bank-sms-parser';
import type { ParsedTransaction } from '@rahatsayyed/bank-sms-parser';
import { clearScannedTransactions, insertParsedTx } from '../db/database';
import { useTxStore } from '../store/txStore';
import { runDetectionJobs } from './txIntelligence';
import { useOnboardingStore, dateRangeToTimestamps } from '../store/onboardingStore';

export interface RescanResult {
  found: number;
}

/**
 * Re-reads the SMS inbox over the currently-configured onboarding date range (S4), filters to
 * known bank senders (S5), parses, replaces all previously-scanned (is_manual = 0) transactions
 * with the fresh set, then reruns Plan 3's detection jobs. Manually added transactions are never
 * touched. See Task 3 notes in the Plan 7 doc for the category/notes-loss caveat.
 */
export async function rescanTransactions(
  onProgress?: (count: number) => void,
): Promise<RescanResult> {
  const { dateRange, customFrom, customTo } = useOnboardingStore.getState();
  const { from, to } = dateRangeToTimestamps(dateRange, customFrom, customTo);

  const messages = await SmsReader.readInbox(from, to);
  const knownSenderMessages = messages.filter(m => BankParserFactory.isKnownBankSender(m.sender));

  const parsed: ParsedTransaction[] = [];
  for (const msg of knownSenderMessages) {
    const tx = BankParserFactory.parse(msg.body, msg.sender, msg.timestamp);
    if (tx) parsed.push(tx);
  }

  await clearScannedTransactions();

  let count = 0;
  for (const tx of parsed) {
    await insertParsedTx(tx);
    count += 1;
    onProgress?.(count);
  }

  await useTxStore.getState().refresh();
  await runDetectionJobs();

  return { found: parsed.length };
}
```

- [ ] 3.3 Verify: `cd apps/raqm && npx tsc --noEmit` → no errors.
- [ ] 3.4 Device checklist (this task only exercises the service — MoreScreen wiring is Task 5):
  - S5: temporarily log `knownSenderMessages.length` vs `messages.length` during a manual test run to confirm non-bank SMS are filtered out.
  - Manual transactions added via `AddTransactionScreen` survive a call to `rescanTransactions()`.
- [ ] 3.5 Commit — skip if the user has not approved commits. Suggested message: `feat(raqm): add manual-row-safe SMS rescan service`.

---

## Task 4: Export service — CSV + PDF + monthly summary (E1–E3)

### Files
- `apps/raqm/package.json` (edit — add deps)
- `apps/raqm/src/services/export.ts` (new)

### Interfaces
```ts
// contract §7, verbatim
export interface MonthlySummary {
  from: number; to: number; income: number; expense: number; savingsRate: number;
  topCategories: { name: string; emoji: string; total: number }[];
}
export async function buildMonthlySummary(ref: Date): Promise<MonthlySummary>;
export async function exportCsv(): Promise<void>;
export async function exportPdf(ref: Date): Promise<void>;
```

### SDK 56 API notes (verified against docs.expo.dev/versions/v56.0.0 on 2026-07-02)
- `expo-file-system`: SDK 56 uses the **new class-based API** — `import { File, Paths } from 'expo-file-system'`.
  `new File(Paths.cache, 'name.csv')` then `file.write(content)` (synchronous, UTF-8 by default);
  `file.uri` gives the URI to hand to `expo-sharing`. The old `FileSystem.writeAsStringAsync(...)`
  style throws in SDK 56 unless imported from `expo-file-system/legacy` — do not use the legacy
  path in this plan.
- `expo-print`: `import * as Print from 'expo-print'`; `Print.printToFileAsync({ html })` returns
  `Promise<{ uri: string; numberOfPages: number; base64?: string }>`.
- `expo-sharing`: `import * as Sharing from 'expo-sharing'`; guard with
  `await Sharing.isAvailableAsync()` before `await Sharing.shareAsync(uri, { mimeType, dialogTitle })`.

### Steps

- [ ] 4.1 Check what's already resolvable, then install what's missing:

```bash
cd apps/raqm
ls ../../node_modules | grep -E "^expo-file-system$|^expo-print$|^expo-sharing$" || true
npx expo install expo-file-system expo-print expo-sharing
```

  `expo-file-system` is already present transitively in the monorepo's hoisted `node_modules` but
  is not declared in `apps/raqm/package.json` — running `expo install` for all three ensures the
  correct SDK-56-compatible versions get pinned in `package.json` regardless of what's already on
  disk.

- [ ] 4.2 Create `apps/raqm/src/services/export.ts`:

```ts
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import {
  loadTxRecords,
  getCategories,
  getSubcategories,
  getSetting,
} from '../db/database';
import { countsTowardTotals } from './txIntelligence';
import { getMonthBounds } from '../utils/period';

export interface MonthlySummary {
  from: number;
  to: number;
  income: number;
  expense: number;
  savingsRate: number;
  topCategories: { name: string; emoji: string; total: number }[];
}

/** E1 — respects the custom month start day (Plan 5 setting `month_start_day`). */
export async function buildMonthlySummary(ref: Date): Promise<MonthlySummary> {
  const startDayRaw = await getSetting('month_start_day');
  const startDay = startDayRaw ? parseInt(startDayRaw, 10) : 1;
  const { from, to } = getMonthBounds(ref, startDay);

  const txs = await loadTxRecords();
  const categories = await getCategories();
  const categoryById = new Map(categories.map(c => [c.id, c]));

  let income = 0;
  let expense = 0;
  const categoryTotals = new Map<number, number>();

  for (const tx of txs) {
    if (tx.timestamp < from || tx.timestamp > to) continue;
    if (!countsTowardTotals(tx)) continue;
    if (tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT) {
      income += tx.amount;
    } else if (tx.type === TransactionType.EXPENSE) {
      expense += tx.amount;
      if (tx.categoryId != null) {
        categoryTotals.set(tx.categoryId, (categoryTotals.get(tx.categoryId) ?? 0) + tx.amount);
      }
    }
  }

  const topCategories = Array.from(categoryTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([categoryId, total]) => {
      const cat = categoryById.get(categoryId);
      return { name: cat?.name ?? 'Other', emoji: cat?.emoji ?? '📦', total };
    });

  const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

  return { from, to, income, expense, savingsRate, topCategories };
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** E2 — all non-deleted transactions, columns per contract, written to cache then shared. */
export async function exportCsv(): Promise<void> {
  const txs = await loadTxRecords();
  const categories = await getCategories();
  const categoryById = new Map(categories.map(c => [c.id, c.name]));

  const categoryIds = Array.from(
    new Set(txs.map(t => t.categoryId).filter((id): id is number => id != null)),
  );
  const subcategoryById = new Map<number, string>();
  for (const categoryId of categoryIds) {
    const subs = await getSubcategories(categoryId);
    for (const sub of subs) subcategoryById.set(sub.id, sub.name);
  }

  const header = [
    'id', 'date', 'amount', 'type', 'merchant', 'bank', 'accountLast4',
    'category', 'subcategory', 'notes', 'tags', 'isManual',
  ].join(',');

  const rows = txs.map(tx => [
    String(tx.id),
    new Date(tx.timestamp).toISOString(),
    String(tx.amount),
    tx.type,
    tx.merchant ?? '',
    tx.bankName,
    tx.accountLast4 ?? '',
    tx.categoryId != null ? (categoryById.get(tx.categoryId) ?? '') : '',
    tx.subcategoryId != null ? (subcategoryById.get(tx.subcategoryId) ?? '') : '',
    tx.notes ?? '',
    tx.tags.join('|'),
    tx.isManual ? 'true' : 'false',
  ].map(v => csvEscape(String(v))).join(','));

  const csv = [header, ...rows].join('\n');

  const file = new File(Paths.cache, `raqm-transactions-${Date.now()}.csv`);
  file.write(csv);

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, { mimeType: 'text/csv', dialogTitle: 'Export transactions' });
  }
}

/** E3 — HTML statement for the given month → PDF via expo-print → share sheet. */
export async function exportPdf(ref: Date): Promise<void> {
  const summary = await buildMonthlySummary(ref);
  const txs = await loadTxRecords();
  const monthTxs = txs
    .filter(t => t.timestamp >= summary.from && t.timestamp <= summary.to)
    .sort((a, b) => a.timestamp - b.timestamp);

  const monthLabel = ref.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  const categoryRowsHtml = summary.topCategories
    .map(c => `<tr><td>${c.emoji} ${c.name}</td><td style="text-align:right">₹${c.total.toFixed(2)}</td></tr>`)
    .join('');

  const txRowsHtml = monthTxs
    .map(tx => `
      <tr>
        <td>${new Date(tx.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
        <td>${tx.merchant ?? tx.bankName}</td>
        <td>${tx.type}</td>
        <td style="text-align:right">₹${tx.amount.toFixed(2)}</td>
      </tr>
    `)
    .join('');

  // NOTE: this HTML intentionally uses a light, print-style palette (dark text on white) — the
  // in-app dark theme tokens do not apply to the exported PDF; see Global Constraints.
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1a1a1a; padding: 24px; }
          h1 { font-size: 20px; margin: 0 0 4px; }
          h3 { font-size: 13px; text-transform: uppercase; color: #666; margin: 24px 0 8px; }
          .meta { color: #666; font-size: 12px; margin-bottom: 24px; }
          .summary { display: flex; gap: 24px; margin-bottom: 8px; }
          .summary div { flex: 1; }
          .summary .label { font-size: 11px; color: #888; text-transform: uppercase; }
          .summary .value { font-size: 18px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 6px 8px; border-bottom: 1px solid #e0e0e0; font-size: 12px; text-align: left; }
          th { color: #888; font-weight: 600; text-transform: uppercase; font-size: 10px; }
        </style>
      </head>
      <body>
        <h1>Raqm Monthly Statement</h1>
        <div class="meta">${monthLabel}</div>
        <div class="summary">
          <div><div class="label">Income</div><div class="value">₹${summary.income.toFixed(2)}</div></div>
          <div><div class="label">Expense</div><div class="value">₹${summary.expense.toFixed(2)}</div></div>
          <div><div class="label">Savings rate</div><div class="value">${summary.savingsRate.toFixed(1)}%</div></div>
        </div>
        <h3>Top categories</h3>
        <table><tbody>${categoryRowsHtml || '<tr><td>No categorized spend this month</td></tr>'}</tbody></table>
        <h3>Transactions</h3>
        <table>
          <thead><tr><th>Date</th><th>Merchant</th><th>Type</th><th>Amount</th></tr></thead>
          <tbody>${txRowsHtml || '<tr><td colspan="4">No transactions this month</td></tr>'}</tbody>
        </table>
      </body>
    </html>
  `;

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Export statement' });
  }
}
```

- [ ] 4.3 Verify: `cd apps/raqm && npx tsc --noEmit` → no errors.
- [ ] 4.4 Device checklist:
  - E1: call `buildMonthlySummary(new Date())` (via Task 5's MoreScreen row) and confirm income/expense/savings-rate/top-categories match manual arithmetic over the currently configured month-start-day period.
  - E2: CSV export produces a share-sheet prompt; opening the file shows all non-deleted transactions with the 12 documented columns.
  - E3: PDF export produces a share-sheet prompt; the PDF renders a readable statement (summary header, category table, transaction table) for the selected month.
- [ ] 4.5 Commit — skip if the user has not approved commits. Suggested message: `feat(raqm): add monthly summary, CSV and PDF export`.

---

## Task 5: MoreScreen wiring + L2 map stub (S4/S5 UI, A4 UI, E1–E3 UI, L2/L3)

### Files
- `apps/raqm/src/screens/main/MoreScreen.tsx` (edit)
- `apps/raqm/src/screens/main/TransactionDetailScreen.tsx` (edit — append to "Other Info")

### Interfaces
Consumes `rescanTransactions` (Task 3), `buildMonthlySummary`/`exportCsv`/`exportPdf` (Task 4),
`AddAccountModal` (Task 2), `getAccounts`/`syncDiscoveredAccounts` (Task 1).

### Steps

- [ ] 5.1 Open `apps/raqm/src/screens/main/MoreScreen.tsx`. Add imports:

```tsx
import { Alert, Linking } from 'react-native';
import { rescanTransactions } from '../../services/rescan';
import { buildMonthlySummary, exportCsv, exportPdf } from '../../services/export';
import { AddAccountModal } from '../../components/AddAccountModal';
import { syncDiscoveredAccounts } from '../../db/database';
```

  (`Alert` may already be imported alongside `View`/`Text` — merge into the existing
  `react-native` import line instead of duplicating it. Same for `Linking`.)

- [ ] 5.2 Inside the `MoreScreen` function, add state and handlers above the `return`:

```tsx
const [rescanStatus, setRescanStatus] = useState<'idle' | 'scanning' | 'done'>('idle');
const [rescanCount, setRescanCount] = useState(0);
const [addAccountVisible, setAddAccountVisible] = useState(false);

const handleRescan = () => {
  Alert.alert(
    'Re-scan SMS',
    'Re-scanning will refresh SMS-derived transactions; categories and notes you added to those will be reset. Manually added transactions are not affected.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Re-scan',
        onPress: async () => {
          setRescanStatus('scanning');
          setRescanCount(0);
          try {
            const { found } = await rescanTransactions(count => setRescanCount(count));
            await syncDiscoveredAccounts();
            setRescanStatus('done');
            Alert.alert('Re-scan complete', `${found} transaction${found === 1 ? '' : 's'} found.`);
          } catch (e) {
            setRescanStatus('idle');
            Alert.alert('Re-scan failed', e instanceof Error ? e.message : 'Unknown error');
          }
        },
      },
    ],
  );
};

const handleExport = async () => {
  const summary = await buildMonthlySummary(new Date());
  Alert.alert(
    'Export transactions',
    `This month: income ₹${summary.income.toFixed(0)} · spent ₹${summary.expense.toFixed(0)} · savings ${summary.savingsRate.toFixed(0)}%`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Export CSV', onPress: () => exportCsv() },
      { text: 'Export PDF (this month)', onPress: () => exportPdf(new Date()) },
    ],
  );
};

const handleAbout = () => {
  const version = require('../../../app.json').expo.version as string;
  Alert.alert('About Raqm', `Raqm v${version}\nA private, on-device finance tracker.`);
};

const handleLocationPermissions = () => {
  Linking.openSettings();
};

const rescanLabel =
  rescanStatus === 'scanning' ? `Re-scanning… ${rescanCount} found` : 'Re-scan SMS';
```

  Add `useState` to the existing `react` import if not already present.

- [ ] 5.3 Wire the rows. Replace the DATA section body:

```tsx
<View style={styles.card}>
  <Row icon="🔄" label={rescanLabel} onPress={rescanStatus === 'scanning' ? undefined : handleRescan} />
  <View style={styles.sep} />
  <Row icon="📤" label="Export transactions" onPress={handleExport} />
  <View style={styles.sep} />
  <Row icon="🏦" label="Add account" onPress={() => setAddAccountVisible(true)} />
</View>
```

  and the APP section body:

```tsx
<View style={styles.card}>
  <Row icon="⚙️" label="Settings" onPress={() => navigation.navigate('Settings')} />
  <View style={styles.sep} />
  <Row icon="📍" label="Location permissions" onPress={handleLocationPermissions} />
  <View style={styles.sep} />
  <Row icon="ℹ️" label="About Raqm" onPress={handleAbout} />
</View>
```

  and add the modal just before the closing `</View>` of the root:

```tsx
<AddAccountModal
  visible={addAccountVisible}
  onClose={() => setAddAccountVisible(false)}
  onAdded={() => { /* AccountDetail/Dashboard re-read accounts on their own effects */ }}
/>
```

- [ ] 5.4 Verify `app.json` has a top-level `expo.version` field matching the require path used in
      `handleAbout` (`apps/raqm/app.json` → `{ "expo": { "version": "0.0.1", ... } }`). If the repo's
      `app.json` doesn't nest under `expo` (check the file — some Expo configs are flat), adjust
      the require path accordingly (`require('../../../app.json').version`).

- [ ] 5.5 Open `apps/raqm/src/screens/main/TransactionDetailScreen.tsx`. Locate the "Other Info"
      section built by Plan 2/3 (it contains the raw SMS body per S6). Add `Linking` to the
      `react-native` import, then insert the following immediately after the raw-SMS row/block,
      still inside the "Other Info" card, guarded on the transaction's `lat`/`lng`:

```tsx
{tx.lat != null && tx.lng != null && (
  <View style={styles.otherInfoRow}>
    <Text style={styles.otherInfoLabel}>📍 Location captured</Text>
    <TouchableOpacity
      onPress={() => Linking.openURL(`geo:${tx.lat},${tx.lng}?q=${tx.lat},${tx.lng}`)}
    >
      <Text style={styles.mapLink}>Open in Maps</Text>
    </TouchableOpacity>
  </View>
)}
```

  Add matching styles to the file's `StyleSheet.create` call if `otherInfoRow`/`otherInfoLabel`
  don't already exist from Plan 2/3's layout (reuse existing row styles where the naming already
  matches instead of introducing duplicates):

```ts
otherInfoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
otherInfoLabel: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
mapLink: { ...Typography.bodyMd, color: Colors.primary, fontFamily: 'WorkSans_500Medium' },
```

  When `lat`/`lng` are null (L3), this block renders nothing — no crash, no empty space beyond
  what conditional rendering naturally collapses.

- [ ] 5.6 Verify: `cd apps/raqm && npx tsc --noEmit` → no errors.
- [ ] 5.7 Device checklist:
  - S4: "Re-scan SMS" row shows the confirm dialog, then "Re-scanning… n found" while running, then a completion alert.
  - S5: confirm (via the Task 3 manual check) that non-bank SMS never produce transactions during re-scan.
  - A4: "Add account" opens the modal; submitting adds a row visible in `getAccounts()` / on the Dashboard chip row after the next `syncDiscoveredAccounts()` or re-scan.
  - E1/E2/E3: "Export transactions" shows the correct monthly summary alert, then CSV/PDF export each succeed via the share sheet.
  - "About Raqm" shows the version from `app.json`; "Location permissions" opens Android's app settings screen.
  - L2: a transaction with `lat`/`lng` set shows "📍 Location captured" + "Open in Maps", which opens the device's maps app centered on the coordinates.
  - L3: a transaction without `lat`/`lng` shows nothing extra in Other Info — no crash.
- [ ] 5.8 Commit — skip if the user has not approved commits. Suggested message: `feat(raqm): wire re-scan, export, add-account and location rows into MoreScreen`.

---

## Verification Checklist

(Spec items verbatim, from `docs/superpowers/specs/2026-07-02-raqm-v0-design.md` §7 — this plan
covers exactly these.)

### SMS Scanning
- [ ] S4: Re-scan button in More triggers full re-scan
- [ ] S5: Only bank SMS are processed (random SMS filtered out)

### Accounts
- [ ] A1: Accounts detected from SMS visible after scan
- [ ] A2: AccountDetailScreen shows transactions for account + last balance
- [ ] A3: Credit card accounts show limit/outstanding if parseable from SMS
- [ ] A4: Manual account can be added and appears in account list

### Spending Views
- [ ] V6: AccountDetailScreen shows filtered transactions for that account

### Location
- [ ] L2: Map shown in TransactionDetailScreen "Other Info" section
- [ ] L3: No crash or UI issue if location permission denied

### Reporting & Export
- [ ] E1: Monthly summary shows correct income/expense/savings rate/top categories
- [ ] E2: CSV export contains all transactions and downloads via share sheet
- [ ] E3: PDF export generates styled monthly statement
