# Raqm Plan 6: Grocery — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Goal

Build the full Grocery feature area (spec §4.9, G1–G16): multiple named lists with a starter-seeded
set, inline item management with running totals, budget caps, ghost pricing and frequency-based
suggestions, plain-text sharing, list history, and grocery-specific analytics (spend trend, top
items, average spend). Also wires the Dashboard's live-SMS toast so a detected grocery transaction
can be linked to an active list (G9), and renders Planned-vs-Actual for linked, completed lists
(G14). This plan does not touch onboarding, notifications, budgets (non-grocery), or accounts —
those are Plans 2–5 (already merged) and Plan 7.

## Architecture

- **`src/db/database.ts`** — Plan 6 owns schema migration **v3** (adds `grocery_lists.linked_tx_id`)
  and appends all grocery CRUD functions from contract §6, plus one small superset addition
  documented below (`GroceryList.linkedTxId`).
- **`src/screens/main/GroceryScreen.tsx`** (replace stub) — active lists, inline "+ New list" form,
  history section (completed lists, G12, with Planned-vs-Actual for linked lists, G14), and a
  grocery analytics section (G13 monthly spend bar chart, G15 top items, G16 average spend).
- **`src/screens/main/GroceryListDetailScreen.tsx`** (replace stub) — items list with check/uncheck,
  running total header, budget-cap warning banner, inline quick-add with debounced ghost price and
  frequent-item chips, long-press delete, share button, and "Complete" action.
- **`src/screens/main/DashboardScreen.tsx`** — edited (not replaced) to extend the existing live-SMS
  toast with a "Link to list?" action when the parsed transaction looks like groceries.
- No new navigation routes — `GroceryListDetail` already exists in `MainStackParamList` per the
  Foundation plan.

## Tech Stack

Expo SDK 56, RN 0.85, TypeScript, expo-sqlite (async API only), zustand (`useTxStore` from Plan 2),
React Navigation (`useFocusEffect`, `useNavigation`), `Share` from `react-native` (G11) — no new
packages required.

## Global Constraints

- **expo-sqlite async only.** Never `withTransactionAsync`. Every multi-statement migration step is
  explicit `runAsync('BEGIN')` → work → `runAsync('COMMIT')`, with `runAsync('ROLLBACK')` in a
  `catch`, matching the existing versioned-migration-runner pattern already in
  `apps/raqm/src/db/database.ts` (see `runMigrations`, `if (current < 1)` / `if (current < 2)`
  blocks). Each individual `ALTER TABLE ADD COLUMN` is additionally wrapped in its own try/catch
  (SQLite has no `ADD COLUMN IF NOT EXISTS`), exactly like the 16-column loop in the `current < 2`
  block.
- **Dark theme tokens only.** No hardcoded hex/rgba colors in any new or edited screen code — use
  `Colors` / `Typography` / `Spacing` / `Radius` from `src/theme` (`apps/raqm/src/theme/index.ts`
  re-exports `colors.ts`, `typography.ts`, `spacing.ts`). Use `Colors.errorMuted` for the
  over-budget banner tint per spec.
- **`npx tsc --noEmit` clean** (run from `apps/raqm/`) at the end of every task.
- **No `git commit`** unless the session controller explicitly states the user approved commits for
  this session. Otherwise leave changes in the working tree and say so. Every task's commit step is
  labeled "skip if user has not approved commits."
- **Contract signatures verbatim.** Copy names/shapes from
  `docs/superpowers/plans/2026-07-02-raqm-shared-interfaces.md` §6 exactly — do not rename
  `getGroceryLists`, `addGroceryList`, `updateGroceryList`, `getGroceryItems`, `addGroceryItem`,
  `updateGroceryItem`, `deleteGroceryItem`, `getLastPriceForItem`, `getFrequentItems`, or
  `linkTxToList`. The one deliberate addition beyond the contract text is documented in Task 1
  (`GroceryList.linkedTxId`) — it is an additive field, not a rename, needed to render G14.
- **Consumes only Plans 2–5.** This plan may read/import anything Plans 2–5 produce: `TxRecord`,
  `useTxStore`, `getCategories`, `getTxById`, `seedDefaults` (already seeds the 4 starter grocery
  lists — Plan 6 does not re-seed them), `getSetting`/`setSetting`, `getMonthBounds` from
  `src/utils/period.ts`, and the `month_start_day` setting key. It must not reference anything from
  Plan 7 (accounts, export).
- **Plans 2–5 are assumed fully implemented** before this plan starts. `DashboardScreen.tsx` is
  edited, not replaced, because Plan 2's migration of it to `useTxStore`/`addParsed` already exists
  in the working tree by the time this plan runs — but that literal diff doesn't exist yet at
  plan-authoring time. The Task 5 step for `DashboardScreen.tsx` gives the anchors to locate (the
  `SmsReader.addNewSmsListener` callback and the toast's `Animated.sequence` dismiss timer) plus the
  exact code to install; if Plan 2–4's actual naming inside that callback differs cosmetically from
  what's shown, preserve their logic (categorization, `addParsed`, duplicate/self-transfer/refund
  handling) and layer the grocery-link behavior on top without removing anything.

---

## Task 1: Migration v3 + grocery DB layer

**Files:**
- `apps/raqm/src/db/database.ts` (edit)

**Interfaces (contract §6, plus one additive field):**
```ts
export interface GroceryList {
  id: number;
  name: string;
  budgetCap: number | null;
  completedAt: number | null;
  createdAt: number;
  linkedTxId: number | null; // additive — backs G14 (Planned vs Actual); populated by linkTxToList
}
export interface GroceryItem { id: number; listId: number; name: string; price: number | null; checkedAt: number | null; sortOrder: number; }

export async function getGroceryLists(): Promise<GroceryList[]>;
export async function addGroceryList(name: string, budgetCap: number | null): Promise<number>;
export async function updateGroceryList(id: number, patch: { name?: string; budgetCap?: number | null; completedAt?: number | null }): Promise<void>;
export async function getGroceryItems(listId: number): Promise<GroceryItem[]>;
export async function addGroceryItem(listId: number, name: string, price: number | null): Promise<number>;
export async function updateGroceryItem(id: number, patch: { name?: string; price?: number | null; checkedAt?: number | null }): Promise<void>;
export async function deleteGroceryItem(id: number): Promise<void>;
export async function getLastPriceForItem(name: string): Promise<number | null>;
export async function getFrequentItems(limit: number): Promise<{ name: string; count: number }[]>;
export async function linkTxToList(listId: number, txId: number): Promise<void>;
```

- [ ] Open `apps/raqm/src/db/database.ts`. Find the `runMigrations` function's `if (current < 2) { ... }`
  block — it ends with:
  ```ts
      await database.runAsync(`INSERT INTO schema_migrations VALUES (2)`);
      await database.runAsync(`COMMIT`);
    } catch (e) {
      await database.runAsync(`ROLLBACK`);
      throw e;
    }
  }
  ```
  Immediately after that closing `}` (still inside `runMigrations`, before its own closing brace),
  insert:
  ```ts

    if (current < 3) {
      await database.runAsync(`BEGIN`);
      try {
        try {
          await database.runAsync(`ALTER TABLE grocery_lists ADD COLUMN linked_tx_id INTEGER`);
        } catch {
          // column already exists — safe to ignore
        }
        await database.runAsync(`INSERT INTO schema_migrations VALUES (3)`);
        await database.runAsync(`COMMIT`);
      } catch (e) {
        await database.runAsync(`ROLLBACK`);
        throw e;
      }
    }
  ```

- [ ] At the end of `apps/raqm/src/db/database.ts` (after the existing `setSetting` export), append:
  ```ts

  // ── Grocery ───────────────────────────────────────────────────────────────────

  export interface GroceryList {
    id: number;
    name: string;
    budgetCap: number | null;
    completedAt: number | null;
    createdAt: number;
    linkedTxId: number | null;
  }

  export interface GroceryItem {
    id: number;
    listId: number;
    name: string;
    price: number | null;
    checkedAt: number | null;
    sortOrder: number;
  }

  function rowToGroceryList(row: Record<string, unknown>): GroceryList {
    return {
      id: row.id as number,
      name: row.name as string,
      budgetCap: (row.budget_cap as number | null) ?? null,
      completedAt: (row.completed_at as number | null) ?? null,
      createdAt: row.created_at as number,
      linkedTxId: (row.linked_tx_id as number | null) ?? null,
    };
  }

  function rowToGroceryItem(row: Record<string, unknown>): GroceryItem {
    return {
      id: row.id as number,
      listId: row.list_id as number,
      name: row.name as string,
      price: (row.price as number | null) ?? null,
      checkedAt: (row.checked_at as number | null) ?? null,
      sortOrder: row.sort_order as number,
    };
  }

  export async function getGroceryLists(): Promise<GroceryList[]> {
    const database = await getDb();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM grocery_lists
       ORDER BY (completed_at IS NOT NULL) ASC, created_at DESC`,
    );
    return rows.map(rowToGroceryList);
  }

  export async function addGroceryList(name: string, budgetCap: number | null): Promise<number> {
    const database = await getDb();
    const result = await database.runAsync(
      `INSERT INTO grocery_lists (name, budget_cap) VALUES (?, ?)`,
      name,
      budgetCap,
    );
    return result.lastInsertRowId;
  }

  export async function updateGroceryList(
    id: number,
    patch: { name?: string; budgetCap?: number | null; completedAt?: number | null },
  ): Promise<void> {
    const database = await getDb();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name); }
    if (patch.budgetCap !== undefined) { fields.push('budget_cap = ?'); values.push(patch.budgetCap); }
    if (patch.completedAt !== undefined) { fields.push('completed_at = ?'); values.push(patch.completedAt); }
    if (fields.length === 0) return;
    values.push(id);
    await database.runAsync(`UPDATE grocery_lists SET ${fields.join(', ')} WHERE id = ?`, ...values);
  }

  export async function getGroceryItems(listId: number): Promise<GroceryItem[]> {
    const database = await getDb();
    const rows = await database.getAllAsync<Record<string, unknown>>(
      `SELECT * FROM grocery_items WHERE list_id = ?
       ORDER BY (checked_at IS NOT NULL) ASC, sort_order ASC, checked_at DESC`,
      listId,
    );
    return rows.map(rowToGroceryItem);
  }

  export async function addGroceryItem(listId: number, name: string, price: number | null): Promise<number> {
    const database = await getDb();
    const maxRow = await database.getFirstAsync<{ m: number | null }>(
      `SELECT MAX(sort_order) as m FROM grocery_items WHERE list_id = ?`,
      listId,
    );
    const nextOrder = (maxRow?.m ?? -1) + 1;
    const result = await database.runAsync(
      `INSERT INTO grocery_items (list_id, name, price, sort_order) VALUES (?, ?, ?, ?)`,
      listId,
      name,
      price,
      nextOrder,
    );
    return result.lastInsertRowId;
  }

  export async function updateGroceryItem(
    id: number,
    patch: { name?: string; price?: number | null; checkedAt?: number | null },
  ): Promise<void> {
    const database = await getDb();
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    if (patch.name !== undefined) { fields.push('name = ?'); values.push(patch.name); }
    if (patch.price !== undefined) { fields.push('price = ?'); values.push(patch.price); }
    if (patch.checkedAt !== undefined) { fields.push('checked_at = ?'); values.push(patch.checkedAt); }
    if (fields.length === 0) return;
    values.push(id);
    await database.runAsync(`UPDATE grocery_items SET ${fields.join(', ')} WHERE id = ?`, ...values);
  }

  export async function deleteGroceryItem(id: number): Promise<void> {
    const database = await getDb();
    await database.runAsync(`DELETE FROM grocery_items WHERE id = ?`, id);
  }

  export async function getLastPriceForItem(name: string): Promise<number | null> {
    const database = await getDb();
    const row = await database.getFirstAsync<{ price: number | null }>(
      `SELECT price FROM grocery_items
       WHERE LOWER(name) = LOWER(?) AND price IS NOT NULL
       ORDER BY created_at DESC LIMIT 1`,
      name,
    );
    return row?.price ?? null;
  }

  export async function getFrequentItems(limit: number): Promise<{ name: string; count: number }[]> {
    const database = await getDb();
    const rows = await database.getAllAsync<{ name: string; count: number }>(
      `SELECT name, COUNT(*) as count FROM grocery_items
       GROUP BY LOWER(name)
       ORDER BY count DESC, MAX(created_at) DESC
       LIMIT ?`,
      limit,
    );
    return rows;
  }

  export async function linkTxToList(listId: number, txId: number): Promise<void> {
    const database = await getDb();
    await database.runAsync(`UPDATE grocery_lists SET linked_tx_id = ? WHERE id = ?`, txId, listId);
  }
  ```

- [ ] Verify: `cd apps/raqm && npx tsc --noEmit` → no errors.
- [ ] Device check: delete the app's data (or uninstall/reinstall) so the DB rebuilds from scratch,
  launch the app through onboarding, then open a SQLite inspector (or add a temporary log of
  `getSetting`) to confirm `schema_migrations` contains rows `1, 2, 3` and `grocery_lists` has a
  `linked_tx_id` column. If reinstalling isn't practical, confirm no migration error is thrown on a
  warm launch against an existing v2 database (the try/catch on `ALTER TABLE` makes re-running safe).
- [ ] Commit — skip if user has not approved commits:
  ```bash
  git add apps/raqm/src/db/database.ts
  git commit -m "feat(grocery): add migration v3 and grocery DB layer"
  ```

---

## Task 2: GroceryScreen — lists, create form, history (G1, G2, G12)

**Files:**
- `apps/raqm/src/screens/main/GroceryScreen.tsx` (replace stub)

**Interfaces consumed:** `GroceryList`, `getGroceryLists`, `addGroceryList`, `getGroceryItems` from
`../../db/database`; `MainStackParamList` from `../../navigation/types`.

- [ ] Replace the full contents of `apps/raqm/src/screens/main/GroceryScreen.tsx`:
  ```tsx
  import React, { useCallback, useMemo, useState } from 'react';
  import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
  import { useNavigation, useFocusEffect } from '@react-navigation/native';
  import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
  import { Colors, Typography, Spacing, Radius } from '../../theme';
  import type { MainStackParamList } from '../../navigation/types';
  import { GroceryList, getGroceryLists, addGroceryList, getGroceryItems } from '../../db/database';

  function formatAmount(n: number): string {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  interface ListSummary {
    list: GroceryList;
    uncheckedCount: number;
    estimatedTotal: number;
  }

  export function GroceryScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
    const [summaries, setSummaries] = useState<ListSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewForm, setShowNewForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newBudget, setNewBudget] = useState('');

    const load = useCallback(async () => {
      const lists = await getGroceryLists();
      const withItems = await Promise.all(
        lists.map(async (list) => {
          const items = await getGroceryItems(list.id);
          const unchecked = items.filter((it) => it.checkedAt === null);
          const estimatedTotal = unchecked.reduce((sum, it) => sum + (it.price ?? 0), 0);
          return { list, uncheckedCount: unchecked.length, estimatedTotal };
        }),
      );
      setSummaries(withItems);
      setLoading(false);
    }, []);

    useFocusEffect(
      useCallback(() => {
        load();
      }, [load]),
    );

    const activeLists = useMemo(() => summaries.filter((s) => s.list.completedAt === null), [summaries]);
    const historyLists = useMemo(
      () =>
        summaries
          .filter((s) => s.list.completedAt !== null)
          .sort((a, b) => (b.list.completedAt ?? 0) - (a.list.completedAt ?? 0)),
      [summaries],
    );

    const handleCreate = async () => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      const parsedBudget = newBudget.trim() ? Number(newBudget.trim()) : null;
      const budgetCap = parsedBudget !== null && Number.isFinite(parsedBudget) ? parsedBudget : null;
      await addGroceryList(trimmed, budgetCap);
      setNewName('');
      setNewBudget('');
      setShowNewForm(false);
      load();
    };

    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Grocery</Text>
          <TouchableOpacity onPress={() => setShowNewForm((v) => !v)} style={styles.newBtn} activeOpacity={0.8}>
            <Text style={styles.newBtnText}>{showNewForm ? 'Cancel' : '+ New list'}</Text>
          </TouchableOpacity>
        </View>

        {showNewForm && (
          <View style={styles.newForm}>
            <TextInput
              style={styles.input}
              placeholder="List name"
              placeholderTextColor={Colors.outline}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={styles.input}
              placeholder="Budget cap (optional)"
              placeholderTextColor={Colors.outline}
              value={newBudget}
              onChangeText={setNewBudget}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleCreate} activeOpacity={0.8}>
              <Text style={styles.addBtnText}>Add list</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active lists */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active lists</Text>
          {!loading && activeLists.length === 0 && (
            <Text style={styles.emptyText}>No active lists. Create one above.</Text>
          )}
          {activeLists.length > 0 && (
            <View style={styles.listCard}>
              {activeLists.map((s, i) => (
                <TouchableOpacity
                  key={s.list.id}
                  style={[styles.listRow, i !== activeLists.length - 1 && styles.listRowBorder]}
                  onPress={() => navigation.navigate('GroceryListDetail', { listId: s.list.id, listName: s.list.name })}
                  activeOpacity={0.7}
                >
                  <View style={styles.listRowInfo}>
                    <Text style={styles.listName}>{s.list.name}</Text>
                    <Text style={styles.listMeta}>{s.uncheckedCount} item{s.uncheckedCount !== 1 ? 's' : ''} left</Text>
                  </View>
                  <Text style={styles.listTotal}>{formatAmount(s.estimatedTotal)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          {historyLists.length === 0 ? (
            <Text style={styles.emptyText}>No completed lists yet.</Text>
          ) : (
            <View style={styles.listCard}>
              {historyLists.map((s, i) => (
                <View key={s.list.id} style={[styles.historyRow, i !== historyLists.length - 1 && styles.listRowBorder]}>
                  <View style={styles.listRowInfo}>
                    <Text style={styles.listName}>{s.list.name}</Text>
                    <Text style={styles.listMeta}>Completed {formatDate(s.list.completedAt!)}</Text>
                  </View>
                  <Text style={styles.listTotal}>{formatAmount(s.estimatedTotal)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    );
  }

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    content: { paddingBottom: 32 },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
    },
    pageTitle: { ...Typography.headlineSm, color: Colors.onSurface },
    newBtn: {
      backgroundColor: Colors.primary, borderRadius: Radius.full,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    },
    newBtnText: { ...Typography.labelLg, color: Colors.onPrimary, letterSpacing: 0 },

    newForm: {
      marginHorizontal: Spacing.containerMargin, marginBottom: Spacing.lg,
      backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
      borderWidth: 1, borderColor: Colors.outlineVariant, padding: Spacing.md, gap: Spacing.sm,
    },
    input: {
      backgroundColor: Colors.surfaceContainer, borderRadius: Radius.md,
      borderWidth: 1, borderColor: Colors.outlineVariant,
      paddingHorizontal: Spacing.md, paddingVertical: 10,
      ...Typography.bodyMd, color: Colors.onSurface,
    },
    addBtn: {
      backgroundColor: Colors.primary, borderRadius: Radius.md,
      paddingVertical: 10, alignItems: 'center',
    },
    addBtnText: { ...Typography.bodySm, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },

    section: { paddingHorizontal: Spacing.containerMargin, marginBottom: Spacing.xl },
    sectionTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.md, fontSize: 16 },
    emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },

    listCard: {
      backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
      borderWidth: 1, borderColor: Colors.outlineVariant, overflow: 'hidden',
    },
    listRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.md, paddingVertical: 14,
    },
    historyRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.md, paddingVertical: 14,
    },
    listRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
    listRowInfo: { flex: 1 },
    listName: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
    listMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
    listTotal: { ...Typography.numericSm, color: Colors.onSurface, fontSize: 15 },
  });
  ```
- [ ] Verify: `cd apps/raqm && npx tsc --noEmit` → no errors.
- [ ] Device check:
  - G1: tap "+ New list", type a name, submit — list appears under Active lists; tapping it navigates
    to `GroceryListDetail` with the correct name in the header.
  - G2: on a fresh install, "Weekly Groceries", "Monthly Staples", "Household", "Personal Care" are
    all visible under Active lists (seeded by Plan 2's `seedDefaults`).
  - G12: (will show empty until Task 3 lets you complete a list) — confirmed properly once Task 3 is done.
- [ ] Commit — skip if user has not approved commits:
  ```bash
  git add apps/raqm/src/screens/main/GroceryScreen.tsx
  git commit -m "feat(grocery): build GroceryScreen with active lists, create form, history"
  ```

---

## Task 3: GroceryListDetailScreen core — items, check-off, running total, quick-add (G3, G4, G6, G7, G12)

**Files:**
- `apps/raqm/src/screens/main/GroceryListDetailScreen.tsx` (replace stub)

**Interfaces consumed:** `GroceryItem`, `getGroceryItems`, `addGroceryItem`, `updateGroceryItem`,
`deleteGroceryItem`, `updateGroceryList` from `../../db/database`; `MainStackScreenProps` from
`../../navigation/types`.

- [ ] Replace the full contents of `apps/raqm/src/screens/main/GroceryListDetailScreen.tsx`:
  ```tsx
  import React, { useCallback, useMemo, useState } from 'react';
  import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert } from 'react-native';
  import { useFocusEffect } from '@react-navigation/native';
  import { Colors, Typography, Spacing, Radius } from '../../theme';
  import { MainStackScreenProps } from '../../navigation/types';
  import {
    GroceryItem,
    getGroceryItems,
    addGroceryItem,
    updateGroceryItem,
    deleteGroceryItem,
    updateGroceryList,
  } from '../../db/database';

  function formatAmount(n: number): string {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }

  export function GroceryListDetailScreen({ route, navigation }: MainStackScreenProps<'GroceryListDetail'>) {
    const { listId, listName } = route.params;
    const [items, setItems] = useState<GroceryItem[]>([]);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');

    const load = useCallback(async () => {
      const rows = await getGroceryItems(listId);
      setItems(rows);
    }, [listId]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    const runningTotal = useMemo(
      () => items.filter((it) => it.checkedAt === null).reduce((sum, it) => sum + (it.price ?? 0), 0),
      [items],
    );

    const toggleChecked = async (item: GroceryItem) => {
      await updateGroceryItem(item.id, { checkedAt: item.checkedAt === null ? Date.now() : null });
      load();
    };

    const handleDelete = (item: GroceryItem) => {
      Alert.alert('Delete item', `Remove "${item.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteGroceryItem(item.id); load(); } },
      ]);
    };

    const handleAdd = async () => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const parsedPrice = price.trim() ? Number(price.trim()) : null;
      const finalPrice = parsedPrice !== null && Number.isFinite(parsedPrice) ? parsedPrice : null;
      await addGroceryItem(listId, trimmed, finalPrice);
      setName('');
      setPrice('');
      load();
    };

    const handleComplete = async () => {
      await updateGroceryList(listId, { completedAt: Date.now() });
      navigation.goBack();
    };

    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleComplete}>
            <Text style={styles.completeText}>Complete</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>{listName}</Text>
          <Text style={styles.total}>{formatAmount(runningTotal)}</Text>
        </View>

        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.itemRow}
              onPress={() => toggleChecked(item)}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, item.checkedAt !== null && styles.checkboxChecked]}>
                {item.checkedAt !== null && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={[styles.itemName, item.checkedAt !== null && styles.itemNameChecked]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.price !== null && (
                <Text style={[styles.itemPrice, item.checkedAt !== null && styles.itemNameChecked]}>
                  {formatAmount(item.price)}
                </Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No items yet. Add one below.</Text>}
        />

        <View style={styles.quickAdd}>
          <TextInput
            style={[styles.input, styles.inputName]}
            placeholder="Item name"
            placeholderTextColor={Colors.outline}
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={[styles.input, styles.inputPrice]}
            placeholder="₹"
            placeholderTextColor={Colors.outline}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg,
    },
    backText: { ...Typography.bodyMd, color: Colors.primary },
    completeText: { ...Typography.bodyMd, color: Colors.primary, fontFamily: 'WorkSans_500Medium' },
    titleRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
      paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    },
    title: { ...Typography.headlineSm, color: Colors.onSurface, flex: 1 },
    total: { ...Typography.numericMd, color: Colors.onSurface, fontSize: 18 },
    list: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 16 },
    itemRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
    },
    checkbox: {
      width: 22, height: 22, borderRadius: Radius.sm, borderWidth: 2, borderColor: Colors.outline,
      alignItems: 'center', justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    checkMark: { color: Colors.onPrimary, fontSize: 13, fontWeight: '700' },
    itemName: { ...Typography.bodyMd, color: Colors.onSurface, flex: 1 },
    itemNameChecked: { color: Colors.onSurfaceVariant, textDecorationLine: 'line-through' },
    itemPrice: { ...Typography.numericSm, color: Colors.onSurfaceVariant },
    emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', paddingTop: 40 },
    quickAdd: {
      flexDirection: 'row', gap: Spacing.sm, alignItems: 'center',
      paddingHorizontal: Spacing.containerMargin, paddingVertical: Spacing.md,
      borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
      backgroundColor: Colors.surfaceContainerLowest,
    },
    input: {
      backgroundColor: Colors.surfaceContainer, borderRadius: Radius.md,
      borderWidth: 1, borderColor: Colors.outlineVariant,
      paddingHorizontal: Spacing.md, paddingVertical: 10,
      ...Typography.bodyMd, color: Colors.onSurface,
    },
    inputName: { flex: 2 },
    inputPrice: { flex: 1 },
    addBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 10 },
    addBtnText: { ...Typography.bodySm, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
  });
  ```
- [ ] Verify: `cd apps/raqm && npx tsc --noEmit` → no errors.
- [ ] Device check:
  - G3/G4: type an item name and price in the bottom bar, tap Add — item appears in the list
    immediately, inputs clear, no modal opened.
  - G6: add a few items with prices, confirm the header total equals the sum; check one off and
    confirm the header total decreases by that item's price.
  - G7: checked items move to the bottom with strikethrough; unchecking moves them back to the top
    in `sort_order`.
  - Long-press an item → confirm delete dialog → Delete removes it.
  - Tap "Complete" → returns to GroceryScreen and the list now appears under History (G12) with the
    correct completion date.
- [ ] Commit — skip if user has not approved commits:
  ```bash
  git add apps/raqm/src/screens/main/GroceryListDetailScreen.tsx
  git commit -m "feat(grocery): build GroceryListDetailScreen core item management"
  ```

---

## Task 4: Ghost price, frequent-item suggestions, share, budget-cap warning (G5, G8, G10, G11)

**Files:**
- `apps/raqm/src/screens/main/GroceryListDetailScreen.tsx` (full replace, supersedes Task 3's version)

**Interfaces consumed (new in this task):** `GroceryList`, `getGroceryLists`, `getLastPriceForItem`,
`getFrequentItems` from `../../db/database`; `Share` from `react-native`.

- [ ] Replace the full contents of `apps/raqm/src/screens/main/GroceryListDetailScreen.tsx`:
  ```tsx
  import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
  import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Alert, Share, ScrollView } from 'react-native';
  import { useFocusEffect } from '@react-navigation/native';
  import { Colors, Typography, Spacing, Radius } from '../../theme';
  import { MainStackScreenProps } from '../../navigation/types';
  import {
    GroceryList,
    GroceryItem,
    getGroceryLists,
    getGroceryItems,
    addGroceryItem,
    updateGroceryItem,
    deleteGroceryItem,
    updateGroceryList,
    getLastPriceForItem,
    getFrequentItems,
  } from '../../db/database';

  function formatAmount(n: number): string {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }

  export function GroceryListDetailScreen({ route, navigation }: MainStackScreenProps<'GroceryListDetail'>) {
    const { listId, listName } = route.params;
    const [list, setList] = useState<GroceryList | null>(null);
    const [items, setItems] = useState<GroceryItem[]>([]);
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [ghostPrice, setGhostPrice] = useState<number | null>(null);
    const [nameFocused, setNameFocused] = useState(false);
    const [frequentItems, setFrequentItems] = useState<{ name: string; count: number }[]>([]);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const load = useCallback(async () => {
      const [rows, lists] = await Promise.all([getGroceryItems(listId), getGroceryLists()]);
      setItems(rows);
      setList(lists.find((l) => l.id === listId) ?? null);
    }, [listId]);

    useFocusEffect(useCallback(() => { load(); }, [load]));

    useEffect(() => {
      getFrequentItems(10).then(setFrequentItems);
    }, []);

    // G5: debounced ghost price lookup on name change (300ms)
    useEffect(() => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      const trimmed = name.trim();
      if (!trimmed) {
        setGhostPrice(null);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        const last = await getLastPriceForItem(trimmed);
        setGhostPrice(last);
      }, 300);
      return () => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
      };
    }, [name]);

    const runningTotal = useMemo(
      () => items.filter((it) => it.checkedAt === null).reduce((sum, it) => sum + (it.price ?? 0), 0),
      [items],
    );

    const overBudget = list?.budgetCap != null && runningTotal > list.budgetCap;

    const toggleChecked = async (item: GroceryItem) => {
      await updateGroceryItem(item.id, { checkedAt: item.checkedAt === null ? Date.now() : null });
      load();
    };

    const handleDelete = (item: GroceryItem) => {
      Alert.alert('Delete item', `Remove "${item.name}"?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await deleteGroceryItem(item.id); load(); } },
      ]);
    };

    const handleAdd = async () => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const parsedPrice = price.trim() ? Number(price.trim()) : ghostPrice;
      const finalPrice = parsedPrice !== null && Number.isFinite(parsedPrice) ? parsedPrice : null;
      await addGroceryItem(listId, trimmed, finalPrice);
      setName('');
      setPrice('');
      setGhostPrice(null);
      load();
    };

    const handlePickFrequent = (itemName: string) => {
      setName(itemName);
      getLastPriceForItem(itemName).then(setGhostPrice);
    };

    const handleComplete = async () => {
      await updateGroceryList(listId, { completedAt: Date.now() });
      navigation.goBack();
    };

    const handleShare = async () => {
      const lines = items.map(
        (it) => `${it.checkedAt !== null ? '☑' : '☐'} ${it.name}${it.price !== null ? ` — ${formatAmount(it.price)}` : ''}`,
      );
      const message = `${listName}\n${lines.join('\n')}`;
      try {
        await Share.share({ message });
      } catch {
        // user cancelled or share failed — no-op
      }
    };

    const showSuggestions = nameFocused && name.trim().length === 0 && frequentItems.length > 0;

    return (
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleShare} style={styles.headerBtn}>
              <Text style={styles.headerBtnText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleComplete} style={styles.headerBtn}>
              <Text style={styles.completeText}>Complete</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.titleRow}>
          <Text style={styles.title}>{listName}</Text>
          <Text style={styles.total}>{formatAmount(runningTotal)}</Text>
        </View>

        {list?.budgetCap != null && (
          <View style={[styles.capBanner, overBudget && styles.capBannerOver]}>
            <Text style={[styles.capBannerText, overBudget && styles.capBannerTextOver]}>
              {overBudget
                ? `Over budget by ${formatAmount(runningTotal - list.budgetCap)}`
                : `Budget cap ${formatAmount(list.budgetCap)}`}
            </Text>
          </View>
        )}

        <FlatList
          data={items}
          keyExtractor={(it) => String(it.id)}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.itemRow}
              onPress={() => toggleChecked(item)}
              onLongPress={() => handleDelete(item)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, item.checkedAt !== null && styles.checkboxChecked]}>
                {item.checkedAt !== null && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={[styles.itemName, item.checkedAt !== null && styles.itemNameChecked]} numberOfLines={1}>
                {item.name}
              </Text>
              {item.price !== null && (
                <Text style={[styles.itemPrice, item.checkedAt !== null && styles.itemNameChecked]}>
                  {formatAmount(item.price)}
                </Text>
              )}
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No items yet. Add one below.</Text>}
        />

        {showSuggestions && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsRow}
            contentContainerStyle={styles.chipsContent}
          >
            {frequentItems.map((f) => (
              <TouchableOpacity key={f.name} style={styles.chip} onPress={() => handlePickFrequent(f.name)} activeOpacity={0.7}>
                <Text style={styles.chipText}>{f.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.quickAdd}>
          <TextInput
            style={[styles.input, styles.inputName]}
            placeholder="Item name"
            placeholderTextColor={Colors.outline}
            value={name}
            onChangeText={setName}
            onFocus={() => setNameFocused(true)}
            onBlur={() => setNameFocused(false)}
          />
          <TextInput
            style={[styles.input, styles.inputPrice]}
            placeholder={ghostPrice !== null ? formatAmount(ghostPrice) : '₹'}
            placeholderTextColor={Colors.outline}
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAdd} activeOpacity={0.8}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg,
    },
    headerActions: { flexDirection: 'row', gap: Spacing.md },
    headerBtn: { paddingVertical: 4 },
    headerBtnText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
    backText: { ...Typography.bodyMd, color: Colors.primary },
    completeText: { ...Typography.bodyMd, color: Colors.primary, fontFamily: 'WorkSans_500Medium' },
    titleRow: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline',
      paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
    },
    title: { ...Typography.headlineSm, color: Colors.onSurface, flex: 1 },
    total: { ...Typography.numericMd, color: Colors.onSurface, fontSize: 18 },

    capBanner: {
      marginHorizontal: Spacing.containerMargin, marginBottom: Spacing.sm,
      borderRadius: Radius.md, paddingVertical: 8, paddingHorizontal: Spacing.md,
      backgroundColor: Colors.surfaceContainer,
    },
    capBannerOver: { backgroundColor: `${Colors.errorMuted}30` },
    capBannerText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0 },
    capBannerTextOver: { color: Colors.errorMuted },

    list: { paddingHorizontal: Spacing.containerMargin, paddingBottom: 16 },
    itemRow: {
      flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
      paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant,
    },
    checkbox: {
      width: 22, height: 22, borderRadius: Radius.sm, borderWidth: 2, borderColor: Colors.outline,
      alignItems: 'center', justifyContent: 'center',
    },
    checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    checkMark: { color: Colors.onPrimary, fontSize: 13, fontWeight: '700' },
    itemName: { ...Typography.bodyMd, color: Colors.onSurface, flex: 1 },
    itemNameChecked: { color: Colors.onSurfaceVariant, textDecorationLine: 'line-through' },
    itemPrice: { ...Typography.numericSm, color: Colors.onSurfaceVariant },
    emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', paddingTop: 40 },

    chipsRow: { maxHeight: 44, borderTopWidth: 1, borderTopColor: Colors.outlineVariant, backgroundColor: Colors.surfaceContainerLowest },
    chipsContent: { paddingHorizontal: Spacing.containerMargin, paddingVertical: Spacing.sm, gap: Spacing.sm },
    chip: {
      backgroundColor: Colors.surfaceContainer, borderRadius: Radius.full,
      borderWidth: 1, borderColor: Colors.outlineVariant,
      paddingHorizontal: Spacing.md, paddingVertical: 6,
    },
    chipText: { ...Typography.labelSm, color: Colors.onSurface, letterSpacing: 0 },

    quickAdd: {
      flexDirection: 'row', gap: Spacing.sm, alignItems: 'center',
      paddingHorizontal: Spacing.containerMargin, paddingVertical: Spacing.md,
      borderTopWidth: 1, borderTopColor: Colors.outlineVariant,
      backgroundColor: Colors.surfaceContainerLowest,
    },
    input: {
      backgroundColor: Colors.surfaceContainer, borderRadius: Radius.md,
      borderWidth: 1, borderColor: Colors.outlineVariant,
      paddingHorizontal: Spacing.md, paddingVertical: 10,
      ...Typography.bodyMd, color: Colors.onSurface,
    },
    inputName: { flex: 2 },
    inputPrice: { flex: 1 },
    addBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 10 },
    addBtnText: { ...Typography.bodySm, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
  });
  ```
- [ ] Verify: `cd apps/raqm && npx tsc --noEmit` → no errors.
- [ ] Device check:
  - G5: add an item named "Milk" with a price, check it or leave it, then type "Milk" again in the
    name field — after ~300ms the price field's placeholder shows the last price as a ghost value
    (not filled text). Adding without typing a price uses the ghost value.
  - G8: create/edit a list with a budget cap (Task 2's form), add items until the unchecked total
    exceeds the cap — banner switches to the `errorMuted`-tinted over-budget message.
  - G10: tap the name field while empty — a horizontal row of up to 10 frequent-item chips appears
    above the quick-add bar; tapping one fills the name field and ghost price.
  - G11: tap "Share" — the Android share sheet opens with a plain-text list matching
    `ListName\n☐ item — ₹price\n☑ item`.
- [ ] Commit — skip if user has not approved commits:
  ```bash
  git add apps/raqm/src/screens/main/GroceryListDetailScreen.tsx
  git commit -m "feat(grocery): add ghost price, frequent suggestions, share, budget warning"
  ```

---

## Task 5: Dashboard link prompt (G9) + Grocery analytics + Planned vs Actual (G13–G16, G14)

**Files:**
- `apps/raqm/src/screens/main/GroceryScreen.tsx` (full replace, supersedes Task 2's version — adds
  analytics section + G14 Planned-vs-Actual on history rows)
- `apps/raqm/src/screens/main/DashboardScreen.tsx` (edit — anchors + exact code, see Global
  Constraints for why this is an edit against Plan 2–4's not-yet-authored diff, not a literal
  find/replace against the pre-Plan-2 stub read at plan-authoring time)

**Interfaces consumed:** `getCategories`, `getGroceryLists`, `getTxById`, `linkTxToList`,
`GroceryList` from `../../db/database`; `useTxStore` from `../../store/txStore`; `getMonthBounds`
from `../../utils/period`; `getSetting` from `../../db/database`.

### 5a — GroceryScreen: analytics + Planned vs Actual

- [ ] Replace the full contents of `apps/raqm/src/screens/main/GroceryScreen.tsx`:
  ```tsx
  import React, { useCallback, useMemo, useState } from 'react';
  import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity } from 'react-native';
  import { useNavigation, useFocusEffect } from '@react-navigation/native';
  import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
  import { Colors, Typography, Spacing, Radius } from '../../theme';
  import type { MainStackParamList } from '../../navigation/types';
  import {
    GroceryList,
    getGroceryLists,
    addGroceryList,
    getGroceryItems,
    getFrequentItems,
    getCategories,
    getTxById,
    getSetting,
  } from '../../db/database';
  import { useTxStore } from '../../store/txStore';
  import { getMonthBounds } from '../../utils/period';

  function formatAmount(n: number): string {
    return `₹${Math.round(n).toLocaleString('en-IN')}`;
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  function monthLabel(d: Date): string {
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  }

  interface ListSummary {
    list: GroceryList;
    uncheckedCount: number;
    estimatedTotal: number;
  }

  interface MonthBucket {
    label: string;
    total: number;
  }

  export function GroceryScreen() {
    const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
    const [summaries, setSummaries] = useState<ListSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewForm, setShowNewForm] = useState(false);
    const [newName, setNewName] = useState('');
    const [newBudget, setNewBudget] = useState('');
    const [linkedAmounts, setLinkedAmounts] = useState<Record<number, number>>({});
    const [buckets, setBuckets] = useState<MonthBucket[]>([]);
    const [topItems, setTopItems] = useState<{ name: string; count: number }[]>([]);

    const load = useCallback(async () => {
      const lists = await getGroceryLists();
      const withItems = await Promise.all(
        lists.map(async (list) => {
          const items = await getGroceryItems(list.id);
          const unchecked = items.filter((it) => it.checkedAt === null);
          const estimatedTotal = unchecked.reduce((sum, it) => sum + (it.price ?? 0), 0);
          return { list, uncheckedCount: unchecked.length, estimatedTotal };
        }),
      );
      setSummaries(withItems);

      // G14: fetch linked tx amounts for completed lists with a linked_tx_id
      const amounts: Record<number, number> = {};
      await Promise.all(
        lists
          .filter((l) => l.linkedTxId !== null)
          .map(async (l) => {
            const tx = await getTxById(l.linkedTxId!);
            if (tx) amounts[l.id] = tx.amount;
          }),
      );
      setLinkedAmounts(amounts);
      setLoading(false);
    }, []);

    useFocusEffect(
      useCallback(() => {
        load();
      }, [load]),
    );

    // G13/G15/G16: grocery analytics — last 6 months, top items, average
    useFocusEffect(
      useCallback(() => {
        (async () => {
          const [categories, startDayStr, freq] = await Promise.all([
            getCategories(),
            getSetting('month_start_day'),
            getFrequentItems(10),
          ]);
          setTopItems(freq);
          const groceriesCategoryId = categories.find((c) => c.name === 'Groceries')?.id ?? null;
          const startDay = Number(startDayStr ?? '1') || 1;
          const txs = useTxStore.getState().txs;
          const now = new Date();
          const next: MonthBucket[] = [];
          for (let i = 5; i >= 0; i--) {
            const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const { from, to } = getMonthBounds(ref, startDay);
            const total = txs
              .filter((tx) => tx.categoryId !== null && tx.categoryId === groceriesCategoryId && tx.timestamp >= from && tx.timestamp <= to)
              .reduce((sum, tx) => sum + tx.amount, 0);
            next.push({ label: monthLabel(ref), total });
          }
          setBuckets(next);
        })();
      }, []),
    );

    const activeLists = useMemo(() => summaries.filter((s) => s.list.completedAt === null), [summaries]);
    const historyLists = useMemo(
      () =>
        summaries
          .filter((s) => s.list.completedAt !== null)
          .sort((a, b) => (b.list.completedAt ?? 0) - (a.list.completedAt ?? 0)),
      [summaries],
    );

    const maxBucket = Math.max(...buckets.map((b) => b.total), 1);
    const avgMonthly = buckets.length ? buckets.reduce((s, b) => s + b.total, 0) / buckets.length : 0;

    const handleCreate = async () => {
      const trimmed = newName.trim();
      if (!trimmed) return;
      const parsedBudget = newBudget.trim() ? Number(newBudget.trim()) : null;
      const budgetCap = parsedBudget !== null && Number.isFinite(parsedBudget) ? parsedBudget : null;
      await addGroceryList(trimmed, budgetCap);
      setNewName('');
      setNewBudget('');
      setShowNewForm(false);
      load();
    };

    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.pageTitle}>Grocery</Text>
          <TouchableOpacity onPress={() => setShowNewForm((v) => !v)} style={styles.newBtn} activeOpacity={0.8}>
            <Text style={styles.newBtnText}>{showNewForm ? 'Cancel' : '+ New list'}</Text>
          </TouchableOpacity>
        </View>

        {showNewForm && (
          <View style={styles.newForm}>
            <TextInput
              style={styles.input}
              placeholder="List name"
              placeholderTextColor={Colors.outline}
              value={newName}
              onChangeText={setNewName}
            />
            <TextInput
              style={styles.input}
              placeholder="Budget cap (optional)"
              placeholderTextColor={Colors.outline}
              value={newBudget}
              onChangeText={setNewBudget}
              keyboardType="decimal-pad"
            />
            <TouchableOpacity style={styles.addBtn} onPress={handleCreate} activeOpacity={0.8}>
              <Text style={styles.addBtnText}>Add list</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Active lists */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active lists</Text>
          {!loading && activeLists.length === 0 && (
            <Text style={styles.emptyText}>No active lists. Create one above.</Text>
          )}
          {activeLists.length > 0 && (
            <View style={styles.listCard}>
              {activeLists.map((s, i) => (
                <TouchableOpacity
                  key={s.list.id}
                  style={[styles.listRow, i !== activeLists.length - 1 && styles.listRowBorder]}
                  onPress={() => navigation.navigate('GroceryListDetail', { listId: s.list.id, listName: s.list.name })}
                  activeOpacity={0.7}
                >
                  <View style={styles.listRowInfo}>
                    <Text style={styles.listName}>{s.list.name}</Text>
                    <Text style={styles.listMeta}>{s.uncheckedCount} item{s.uncheckedCount !== 1 ? 's' : ''} left</Text>
                  </View>
                  <Text style={styles.listTotal}>{formatAmount(s.estimatedTotal)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          {historyLists.length === 0 ? (
            <Text style={styles.emptyText}>No completed lists yet.</Text>
          ) : (
            <View style={styles.listCard}>
              {historyLists.map((s, i) => {
                const linkedAmount = linkedAmounts[s.list.id];
                const showPlannedActual = s.list.linkedTxId !== null && s.list.budgetCap !== null && linkedAmount !== undefined;
                return (
                  <View key={s.list.id} style={[styles.historyRow, i !== historyLists.length - 1 && styles.listRowBorder]}>
                    <View style={styles.historyTop}>
                      <View style={styles.listRowInfo}>
                        <Text style={styles.listName}>{s.list.name}</Text>
                        <Text style={styles.listMeta}>Completed {formatDate(s.list.completedAt!)}</Text>
                      </View>
                      <Text style={styles.listTotal}>{formatAmount(s.estimatedTotal)}</Text>
                    </View>
                    {showPlannedActual && (
                      <View style={styles.plannedActual}>
                        <View style={styles.paRow}>
                          <Text style={styles.paLabel}>Planned</Text>
                          <View style={styles.paTrack}>
                            <View style={[styles.paFillPlanned, { flex: 1 }]} />
                          </View>
                          <Text style={styles.paValue}>{formatAmount(s.list.budgetCap!)}</Text>
                        </View>
                        <View style={styles.paRow}>
                          <Text style={styles.paLabel}>Actual</Text>
                          <View style={styles.paTrack}>
                            <View style={[styles.paFillActual, { flex: Math.min(linkedAmount / s.list.budgetCap!, 1.5) }]} />
                          </View>
                          <Text style={styles.paValue}>{formatAmount(linkedAmount)}</Text>
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Analytics */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Grocery spend trend</Text>
          <View style={styles.chartCard}>
            <View style={styles.bars}>
              {buckets.map((b, i) => {
                const pct = b.total / maxBucket;
                return (
                  <View key={i} style={styles.barCol}>
                    <Text style={styles.barAmount}>{formatAmount(b.total)}</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { flex: pct }]} />
                      <View style={{ flex: 1 - pct }} />
                    </View>
                    <Text style={styles.barLabel}>{b.label}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.avgText}>Average monthly spend: {formatAmount(avgMonthly)}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently bought</Text>
          <View style={styles.listCard}>
            {topItems.map((it, i) => (
              <View key={it.name} style={[styles.freqRow, i !== topItems.length - 1 && styles.listRowBorder]}>
                <Text style={styles.listName}>{it.name}</Text>
                <Text style={styles.listMeta}>{it.count}x</Text>
              </View>
            ))}
            {topItems.length === 0 && <Text style={styles.emptyText}>No items tracked yet.</Text>}
          </View>
        </View>
      </ScrollView>
    );
  }

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    content: { paddingBottom: 32 },
    header: {
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.md,
    },
    pageTitle: { ...Typography.headlineSm, color: Colors.onSurface },
    newBtn: {
      backgroundColor: Colors.primary, borderRadius: Radius.full,
      paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm,
    },
    newBtnText: { ...Typography.labelLg, color: Colors.onPrimary, letterSpacing: 0 },

    newForm: {
      marginHorizontal: Spacing.containerMargin, marginBottom: Spacing.lg,
      backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
      borderWidth: 1, borderColor: Colors.outlineVariant, padding: Spacing.md, gap: Spacing.sm,
    },
    input: {
      backgroundColor: Colors.surfaceContainer, borderRadius: Radius.md,
      borderWidth: 1, borderColor: Colors.outlineVariant,
      paddingHorizontal: Spacing.md, paddingVertical: 10,
      ...Typography.bodyMd, color: Colors.onSurface,
    },
    addBtn: {
      backgroundColor: Colors.primary, borderRadius: Radius.md,
      paddingVertical: 10, alignItems: 'center',
    },
    addBtnText: { ...Typography.bodySm, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },

    section: { paddingHorizontal: Spacing.containerMargin, marginBottom: Spacing.xl },
    sectionTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.md, fontSize: 16 },
    emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },

    listCard: {
      backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
      borderWidth: 1, borderColor: Colors.outlineVariant, overflow: 'hidden',
    },
    listRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.md, paddingVertical: 14,
    },
    historyRow: { paddingHorizontal: Spacing.md, paddingVertical: 14, gap: Spacing.sm },
    historyTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    freqRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingHorizontal: Spacing.md, paddingVertical: 12,
    },
    listRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
    listRowInfo: { flex: 1 },
    listName: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
    listMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
    listTotal: { ...Typography.numericSm, color: Colors.onSurface, fontSize: 15 },

    plannedActual: { gap: 6 },
    paRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
    paLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, width: 52 },
    paTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.surfaceVariant, overflow: 'hidden', flexDirection: 'row' },
    paFillPlanned: { backgroundColor: Colors.mossStructure, borderRadius: 3 },
    paFillActual: { backgroundColor: Colors.primary, borderRadius: 3 },
    paValue: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, width: 64, textAlign: 'right' },

    chartCard: {
      backgroundColor: Colors.surfaceContainerLowest,
      borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant,
      padding: Spacing.md, paddingTop: Spacing.lg,
    },
    bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 160 },
    barCol: { flex: 1, alignItems: 'center', gap: 6 },
    barAmount: { ...Typography.labelSm, color: Colors.onSurfaceVariant, fontSize: 9, letterSpacing: 0, textAlign: 'center' },
    barTrack: { flex: 1, width: '100%', flexDirection: 'column-reverse' },
    barFill: { backgroundColor: Colors.primary, borderRadius: 4, minHeight: 4 },
    barLabel: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, fontSize: 10, textAlign: 'center' },
    avgText: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, textAlign: 'center', marginTop: Spacing.md },
  });
  ```

### 5b — DashboardScreen: G9 link prompt

- [ ] Open `apps/raqm/src/screens/main/DashboardScreen.tsx`. Confirm the file imports `useTxStore`
  from `../../store/txStore` and its live-SMS `useEffect` calls
  `useTxStore.getState().addParsed(tx)` inside the `SmsReader.addNewSmsListener` callback (per Plan
  2's contract). If the actual import/call names differ, adapt the anchors below accordingly — the
  goal is only to add the grocery-link behavior without disturbing Plan 2–4's categorization,
  duplicate-suppression, or GPS-tagging logic already in that callback.

- [ ] Add these imports near the top of the file (alongside the existing `react-native` and
  `../../db/database` imports):
  ```ts
  import { Modal, Pressable } from 'react-native';
  import { getCategories, getGroceryLists, linkTxToList, type GroceryList } from '../../db/database';
  ```

- [ ] Inside the `DashboardScreen` component, add new state and a one-time category lookup near the
  existing `newTxLabel`/`toastAnim` state:
  ```ts
  const [linkPromptTxId, setLinkPromptTxId] = useState<number | null>(null);
  const [showListPicker, setShowListPicker] = useState(false);
  const [activeGroceryLists, setActiveGroceryLists] = useState<GroceryList[]>([]);
  const [groceriesCategoryId, setGroceriesCategoryId] = useState<number | null>(null);

  useEffect(() => {
    getCategories().then((cats) => {
      setGroceriesCategoryId(cats.find((c) => c.name === 'Groceries')?.id ?? null);
    });
  }, []);

  const GROCERY_KEYWORDS = /grocer|bigbasket|blinkit|zepto|dmart|instamart/i;
  ```

- [ ] In the `SmsReader.addNewSmsListener` callback, after the existing call to
  `useTxStore.getState().addParsed(tx)` and the existing toast-label logic, extend the dismiss timer
  and detect a grocery transaction. The callback should end up structured like this (merge with
  whatever categorization/dedup logic Plan 2–4 already inserted — do not remove it):
  ```ts
  const sub = SmsReader.addNewSmsListener(async ({ body, sender, timestamp }) => {
    const tx = BankParserFactory.parse(body, sender, timestamp);
    if (tx) {
      await useTxStore.getState().addParsed(tx);
      const newTx = useTxStore.getState().txs[0]; // newest row after addParsed's refresh

      const label = tx.merchant
        ? `${tx.type === TransactionType.EXPENSE ? '-' : '+'}₹${tx.amount.toLocaleString('en-IN')} · ${tx.merchant}`
        : `New transaction from ${tx.bankName}`;
      setNewTxLabel(label);

      const isGrocery =
        (newTx?.categoryId !== null && newTx?.categoryId === groceriesCategoryId) ||
        (tx.merchant ? GROCERY_KEYWORDS.test(tx.merchant) : false);

      if (isGrocery && newTx) {
        setLinkPromptTxId(newTx.id);
        const lists = await getGroceryLists();
        setActiveGroceryLists(lists.filter((l) => l.completedAt === null));
      } else {
        setLinkPromptTxId(null);
      }

      const dismissDelay = isGrocery ? 6000 : 3000;
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(dismissDelay),
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => {
        setNewTxLabel(null);
        setLinkPromptTxId(null);
      });
    }
  });
  ```
  Update the effect's dependency array to `[groceriesCategoryId]` so the closure sees the latest
  category id.

- [ ] Locate the toast render block (the `{newTxLabel && (<Animated.View ...>` JSX near the top of
  the returned tree) and replace it with:
  ```tsx
  {newTxLabel && (
    <Animated.View
      style={[
        styles.toast,
        { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] },
      ]}
    >
      <Text style={styles.toastText}>⚡ {newTxLabel}</Text>
      {linkPromptTxId !== null && (
        <TouchableOpacity onPress={() => setShowListPicker(true)} style={styles.toastLinkBtn}>
          <Text style={styles.toastLinkText}>Link to list?</Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  )}

  <Modal visible={showListPicker} transparent animationType="fade" onRequestClose={() => setShowListPicker(false)}>
    <Pressable style={styles.modalBackdrop} onPress={() => setShowListPicker(false)}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>Link to which list?</Text>
        {activeGroceryLists.map((l) => (
          <TouchableOpacity
            key={l.id}
            style={styles.modalRow}
            onPress={async () => {
              if (linkPromptTxId !== null) await linkTxToList(l.id, linkPromptTxId);
              setShowListPicker(false);
              setLinkPromptTxId(null);
            }}
          >
            <Text style={styles.modalRowText}>{l.name}</Text>
          </TouchableOpacity>
        ))}
        {activeGroceryLists.length === 0 && <Text style={styles.modalEmpty}>No active lists</Text>}
      </View>
    </Pressable>
  </Modal>
  ```
  Ensure `TouchableOpacity` is imported from `react-native` alongside the existing `View, Text,
  StyleSheet, ScrollView, Animated` import (add it to that import list if Plan 2–4 hasn't already).

- [ ] Add these styles to the `StyleSheet.create` call at the bottom of the file (alongside the
  existing `toast`/`toastText` entries):
  ```ts
  toastLinkBtn: { marginTop: Spacing.sm, alignSelf: 'flex-start' },
  toastLinkText: { ...Typography.labelLg, color: Colors.onPrimaryContainer, textDecorationLine: 'underline' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: Spacing.xl },
  modalCard: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant, padding: Spacing.lg, gap: Spacing.sm,
  },
  modalTitle: { ...Typography.titleLg, color: Colors.onSurface, marginBottom: Spacing.sm },
  modalRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  modalRowText: { ...Typography.bodyMd, color: Colors.onSurface },
  modalEmpty: { ...Typography.bodyMd, color: Colors.onSurfaceVariant, textAlign: 'center', paddingVertical: 12 },
  ```
  (Note: `rgba(0,0,0,0.5)` here is a modal scrim, not a themed surface color — matches how other
  screens dim backgrounds; it is not one of the "hardcoded colors to patch" from spec §2.5, which
  only lists opaque white chip backgrounds.)

- [ ] Verify: `cd apps/raqm && npx tsc --noEmit` → no errors.
- [ ] Device check:
  - G9: trigger (or simulate) an incoming SMS that parses to a merchant matching the grocery keyword
    regex, or one that a category rule resolves to "Groceries" — the toast shows a "Link to list?"
    button and stays visible ~6s instead of 3s. Tapping it opens a modal listing active grocery
    lists; picking one calls `linkTxToList` and dismisses the modal. A non-grocery transaction shows
    the normal 3s toast with no link button.
  - G13: GroceryScreen's "Grocery spend trend" bar chart shows up to 6 bars, one per month, summing
    only transactions categorized as Groceries.
  - G14: after linking a transaction to a list (G9) and later completing that list (Task 3's
    "Complete" button, after setting a budget cap on it in Task 2's create form), the History row
    for that list shows Planned vs Actual bars comparing the budget cap to the linked transaction's
    amount.
  - G15: "Frequently bought" section lists up to 10 items sorted by how often they appear across all
    lists.
  - G16: "Average monthly spend" caption under the bar chart equals the mean of the 6 displayed
    bucket totals.
- [ ] Commit — skip if user has not approved commits:
  ```bash
  git add apps/raqm/src/screens/main/GroceryScreen.tsx apps/raqm/src/screens/main/DashboardScreen.tsx
  git commit -m "feat(grocery): add G9 link-to-list prompt and grocery analytics (G13-G16)"
  ```

---

## Verification Checklist

Use this list to manually verify each feature after implementation. Tick `[x]` when confirmed
working on a physical Android device. (Verbatim from spec §7, Grocery section.)

- [ ] G1: New grocery list can be created with custom name
- [ ] G2: Default starter lists visible on first launch
- [ ] G3: Items can be added with estimated price
- [ ] G4: Quick-add input at bottom of list works without opening modal
- [ ] G5: Ghost price from last use shown when typing a known item name
- [ ] G6: Running total updates as items added/removed/checked
- [ ] G7: Checked items move to bottom; unchecked re-sort to top
- [ ] G8: Over-budget warning shown when running total exceeds cap
- [ ] G9: "Link to list?" prompt appears when grocery transaction detected
- [ ] G10: Frequently bought suggestions appear in add flow
- [ ] G11: Share button exports list as plain text via system share
- [ ] G12: Completed lists visible in history section
- [ ] G13: Monthly grocery spend bar chart shows last 6 months
- [ ] G14: Planned vs Actual chart correct per linked list
- [ ] G15: Top items by frequency list correct
- [ ] G16: Average monthly grocery spend calculation correct
