# Raqm Plan 3: Transaction Intelligence — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Goal

Add transaction-intelligence features on top of Plan 2's transaction core: self-transfer/refund/subscription
auto-detection, duplicate-SMS suppression, GPS tagging, split/merge/group/link operations, and the canonical
totals filter that every screen must use. This plan does not touch design tokens, notifications, budgets,
grocery, or accounts — those are Plans 4–7.

## Architecture

- **`src/services/txIntelligenceCore.ts`** (new) — pure, dependency-free matching/decision functions
  (`pairSelfTransfers`, `pairRefunds`, `computeRecurringIds`, `isDuplicateSms`, `countsTowardTotals`). No
  SQLite import, so it can run under plain `tsx`/Node for the sanity-check script.
- **`src/services/txIntelligence.ts`** (contract file) — re-exports the pure functions from `txIntelligenceCore`
  and adds the async DB-touching wrappers (`detectSelfTransfers`, `detectRefunds`, `detectSubscriptions`,
  `runDetectionJobs`). This split is an internal implementation detail; every name the contract requires is
  still importable from `txIntelligence.ts`.
- **`src/services/location.ts`** (new) — `getCurrentCoords()`, wraps `expo-location`, never throws.
- **`src/db/database.ts`** — Plan 3 appends `splitTx`, `mergeTxs`, `groupTxs`, `ungroupTx`, `linkTxs`,
  `unlinkTxs`, `setLinkSettled`. All multi-row writes wrapped in explicit `BEGIN`/`COMMIT`/`ROLLBACK` via
  `runAsync`, matching the existing migration-runner pattern in the same file.
- **`src/store/txStore.ts`** (Plan 2 output) — Plan 3 adds one contract addition: `addParsedWithLocation`.
- UI: `ScanningProgressScreen` (S5 sender filter + post-scan detection run), `DashboardScreen` (T13 dedupe +
  L1 GPS tagging in the live listener, totals filter), `TransactionsScreen` (multi-select → merge/group,
  grouped-row rendering), `TransactionDetailScreen` (split/link/settled/unlink/recurring actions), `AnalyticsScreen`
  (R2 subscriptions section, totals filter).

## Tech Stack

Expo SDK 56, RN 0.85, TypeScript, expo-sqlite (async API only), zustand, `expo-location` (installed in Task 2
if absent — confirmed **absent** from `apps/raqm/package.json` at spec time), `tsx` (installed as a devDependency
in Task 1, used only for the throwaway sanity-check script).

## Global Constraints

- **expo-sqlite async only.** Never `withTransactionAsync`. Every multi-row write is explicit
  `runAsync('BEGIN')` → work → `runAsync('COMMIT')`, with `runAsync('ROLLBACK')` in a `catch`.
- **Dark theme tokens only.** No hardcoded hex/rgba colors in any new or edited screen code — use
  `Colors`/`Typography`/`Spacing`/`Radius` from `src/theme`.
- **`npx tsc --noEmit` clean** (run from `apps/raqm/`) at the end of every task.
- **No `git commit`** unless the session controller explicitly states the user approved commits for this
  session. Otherwise leave changes in the working tree and say so.
- **Contract signatures verbatim.** Copy names/shapes from
  `docs/superpowers/plans/2026-07-02-raqm-shared-interfaces.md` §2 and §3 exactly. Do not rename.
- **Consume only Plan 2.** This plan may read/import anything Plan 2 produces (`TxRecord`, `NewTxInput`,
  `TxPatch`, `useTxStore`, `loadTxRecords`, `getTxById`, `insertTx`, `insertParsedTx`, `updateTx`,
  `softDeleteTx`, `restoreTx`, `getCategories`, etc.). It must not reference anything from Plans 4–7
  (notifications, budgets, grocery, accounts, export).
- **Plan 2 is assumed fully implemented** before this plan starts. Wherever a step below touches a file that
  Plan 2 also modifies (`AppNavigator.tsx`, `DashboardScreen.tsx`, `TransactionsScreen.tsx`,
  `AnalyticsScreen.tsx`, `TransactionDetailScreen.tsx`, `src/store/txStore.ts`), the step gives the anchor to
  locate (an import or a contract-mandated call) plus the exact code to add — because Plan 2's literal diff
  doesn't exist yet at plan-authoring time. Where a file is **not** touched by Plan 2 (`ScanningProgressScreen.tsx`,
  `src/db/database.ts`), the step gives an exact find/replace against the current working tree.

---

## Task 1: Detection services — pure functions + sanity check

**Files:**
- `apps/raqm/src/services/txIntelligenceCore.ts` (new)
- `apps/raqm/scripts/check-intelligence.ts` (new, temporary)
- `apps/raqm/package.json` (add `tsx` devDependency)

**Interfaces produced (contract §3, pure subset):**
```ts
export function pairSelfTransfers(txs: TxRecord[]): [number, number][];
export function pairRefunds(txs: TxRecord[]): [number, number][];
export function computeRecurringIds(txs: TxRecord[]): number[];
export function isDuplicateSms(prev: {amount:number; sender:string; timestamp:number} | null, next: {amount:number; sender:string; timestamp:number}): boolean;
export function countsTowardTotals(tx: TxRecord): boolean;
```

- [ ] Install `tsx`:
  ```bash
  cd apps/raqm && npm install -D tsx
  ```

- [ ] Create `apps/raqm/src/services/txIntelligenceCore.ts`:
  ```ts
  import { TransactionType } from '@rahatsayyed/bank-sms-parser';
  import type { TxRecord } from '../db/database';

  const DAY_MS = 24 * 60 * 60 * 1000;

  function isDebitType(t: TransactionType): boolean {
    return t === TransactionType.EXPENSE || t === TransactionType.TRANSFER || t === TransactionType.INVESTMENT;
  }

  function isCreditType(t: TransactionType): boolean {
    return t === TransactionType.INCOME || t === TransactionType.CREDIT;
  }

  function accountKey(tx: TxRecord): string {
    return `${tx.bankName}|${tx.accountLast4 ?? ''}`;
  }

  function isLinked(tx: TxRecord): boolean {
    return tx.linkType !== null;
  }

  /** T11: pairs [debitId, creditId] — same amount, different account, within 24h, neither already linked. */
  export function pairSelfTransfers(txs: TxRecord[]): [number, number][] {
    const pairs: [number, number][] = [];
    const usedCredit = new Set<number>();
    const debits = txs.filter(t => isDebitType(t.type) && !isLinked(t) && !t.isSplitChild);
    const credits = txs.filter(t => isCreditType(t.type) && !isLinked(t) && !t.isSplitChild);
    for (const debit of debits) {
      for (const credit of credits) {
        if (usedCredit.has(credit.id)) continue;
        if (credit.amount !== debit.amount) continue;
        if (accountKey(credit) === accountKey(debit)) continue; // must be a different account
        if (Math.abs(credit.timestamp - debit.timestamp) > DAY_MS) continue;
        pairs.push([debit.id, credit.id]);
        usedCredit.add(credit.id);
        break;
      }
    }
    return pairs;
  }

  /** T12: pairs [debitId, creditId] — same amount + same merchant (case-insensitive), credit within 0–30 days after debit. */
  export function pairRefunds(txs: TxRecord[]): [number, number][] {
    const pairs: [number, number][] = [];
    const usedDebit = new Set<number>();
    const debits = txs.filter(t => isDebitType(t.type) && !isLinked(t) && !t.isSplitChild);
    const credits = txs.filter(t => isCreditType(t.type) && !isLinked(t) && !t.isSplitChild);
    for (const credit of credits) {
      let best: TxRecord | null = null;
      for (const debit of debits) {
        if (usedDebit.has(debit.id)) continue;
        if (debit.amount !== credit.amount) continue;
        if (!debit.merchant || !credit.merchant) continue;
        if (debit.merchant.toLowerCase() !== credit.merchant.toLowerCase()) continue;
        const gap = credit.timestamp - debit.timestamp;
        if (gap < 0 || gap > 30 * DAY_MS) continue;
        if (!best || debit.timestamp > best.timestamp) best = debit;
      }
      if (best) {
        pairs.push([best.id, credit.id]);
        usedDebit.add(best.id);
      }
    }
    return pairs;
  }

  /**
   * R1: ids that should be flagged recurring=1. Groups debit-type transactions by merchant
   * (case-insensitive, trimmed). Within a merchant group, any adjacent pair (sorted by timestamp)
   * with amount within ±5% and a 25–35 day gap marks BOTH members of that pair as recurring.
   */
  export function computeRecurringIds(txs: TxRecord[]): number[] {
    const groups = new Map<string, TxRecord[]>();
    for (const tx of txs) {
      if (!tx.merchant || tx.isSplitChild || !isDebitType(tx.type)) continue;
      const key = tx.merchant.trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    }
    const result = new Set<number>();
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const sorted = [...group].sort((a, b) => a.timestamp - b.timestamp);
      for (let i = 1; i < sorted.length; i++) {
        const prev = sorted[i - 1];
        const cur = sorted[i];
        const amountDiff = Math.abs(cur.amount - prev.amount) / prev.amount;
        const gapDays = (cur.timestamp - prev.timestamp) / DAY_MS;
        if (amountDiff <= 0.05 && gapDays >= 25 && gapDays <= 35) {
          result.add(prev.id);
          result.add(cur.id);
        }
      }
    }
    return Array.from(result);
  }

  /** T13: same amount + same SMS sender within 60 seconds → duplicate. */
  export function isDuplicateSms(
    prev: { amount: number; sender: string; timestamp: number } | null,
    next: { amount: number; sender: string; timestamp: number },
  ): boolean {
    if (!prev) return false;
    if (prev.amount !== next.amount) return false;
    if (prev.sender !== next.sender) return false;
    return Math.abs(next.timestamp - prev.timestamp) <= 60_000;
  }

  /**
   * THE canonical totals filter (contract §3). Excludes settled links and self-transfers.
   * Refund credits are NOT excluded here — the caller nets them against expense (see Task 6).
   */
  export function countsTowardTotals(tx: TxRecord): boolean {
    if (tx.linkSettled) return false;
    if (tx.linkType === 'self_transfer') return false;
    return true;
  }
  ```

- [ ] Create `apps/raqm/scripts/check-intelligence.ts`:
  ```ts
  import { TransactionType } from '@rahatsayyed/bank-sms-parser';
  import type { TxRecord } from '../src/db/database';
  import {
    pairSelfTransfers,
    pairRefunds,
    computeRecurringIds,
    isDuplicateSms,
  } from '../src/services/txIntelligenceCore';

  let nextId = 1;
  function mk(overrides: Partial<TxRecord>): TxRecord {
    return {
      id: nextId++,
      amount: 100,
      type: TransactionType.EXPENSE,
      merchant: 'Test Merchant',
      bankName: 'HDFC',
      accountLast4: '1234',
      timestamp: Date.now(),
      balance: null,
      currency: '₹',
      isFromCard: false,
      categoryId: null,
      subcategoryId: null,
      notes: null,
      tags: [],
      rawSms: null,
      lat: null,
      lng: null,
      deletedAt: null,
      recurring: false,
      isManual: false,
      linkType: null,
      linkPartnerId: null,
      linkSettled: false,
      isSplitChild: false,
      splitParentId: null,
      groupId: null,
      ...overrides,
    };
  }

  function assert(cond: boolean, label: string) {
    if (!cond) throw new Error(`FAIL: ${label}`);
    console.log(`PASS: ${label}`);
  }

  const DAY_MS = 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Case 1: self-transfer — same amount, different bank, 2h apart → paired.
  {
    const debit = mk({ amount: 5000, type: TransactionType.EXPENSE, bankName: 'HDFC', accountLast4: '1111', timestamp: now, merchant: null });
    const credit = mk({ amount: 5000, type: TransactionType.CREDIT, bankName: 'ICICI', accountLast4: '2222', timestamp: now + 2 * 60 * 60 * 1000, merchant: null });
    const other = mk({ amount: 5000, type: TransactionType.EXPENSE, bankName: 'HDFC', accountLast4: '1111', timestamp: now + 3 * DAY_MS, merchant: null });
    const pairs = pairSelfTransfers([debit, credit, other]);
    assert(pairs.length === 1 && pairs[0][0] === debit.id && pairs[0][1] === credit.id, 'self-transfer pairs matching debit+credit within 24h');
  }

  // Case 2: refund — same merchant/amount, 5 days later → paired; 40 days later → NOT paired.
  {
    const debit = mk({ amount: 1200, type: TransactionType.EXPENSE, merchant: 'Amazon', timestamp: now });
    const refund = mk({ amount: 1200, type: TransactionType.CREDIT, merchant: 'Amazon', timestamp: now + 5 * DAY_MS });
    const tooLate = mk({ amount: 1200, type: TransactionType.CREDIT, merchant: 'Amazon', timestamp: now + 40 * DAY_MS });
    const pairsOk = pairRefunds([debit, refund]);
    assert(pairsOk.length === 1 && pairsOk[0][0] === debit.id && pairsOk[0][1] === refund.id, 'refund paired within 30 days');
    const pairsLate = pairRefunds([debit, tooLate]);
    assert(pairsLate.length === 0, 'refund NOT paired beyond 30 days');
  }

  // Case 3: subscription — Netflix 649 then 651 ~30 days later → both recurring; single occurrence not recurring.
  {
    const a = mk({ amount: 649, type: TransactionType.EXPENSE, merchant: 'Netflix', timestamp: now });
    const b = mk({ amount: 651, type: TransactionType.EXPENSE, merchant: 'Netflix', timestamp: now + 30 * DAY_MS });
    const single = mk({ amount: 200, type: TransactionType.EXPENSE, merchant: 'OneOffShop', timestamp: now });
    const ids = computeRecurringIds([a, b, single]);
    assert(ids.includes(a.id) && ids.includes(b.id), 'subscription pair flagged recurring');
    assert(!ids.includes(single.id), 'single occurrence NOT flagged recurring');
  }

  // Case 4: duplicate SMS — same amount+sender within 60s → true; different sender or >60s → false.
  {
    const prev = { amount: 500, sender: 'AX-HDFCBK', timestamp: now };
    assert(isDuplicateSms(prev, { amount: 500, sender: 'AX-HDFCBK', timestamp: now + 30_000 }) === true, 'duplicate within 60s same sender');
    assert(isDuplicateSms(prev, { amount: 500, sender: 'VM-ICICIB', timestamp: now + 1000 }) === false, 'not duplicate — different sender');
    assert(isDuplicateSms(prev, { amount: 500, sender: 'AX-HDFCBK', timestamp: now + 61_000 }) === false, 'not duplicate — beyond 60s');
  }

  console.log('\nAll checks passed.');
  ```

- [ ] Run the sanity check:
  ```bash
  cd apps/raqm && npx tsx scripts/check-intelligence.ts
  ```
  Expected: 8 `PASS:` lines and `All checks passed.` with exit code 0.

- [ ] Delete the temporary script once it passes (it is not part of the app bundle):
  ```bash
  cd apps/raqm && rm scripts/check-intelligence.ts
  ```

- [ ] Verify: `cd apps/raqm && npx tsc --noEmit` → no errors.
- [ ] Commit (skip if user has not approved commits): `git add apps/raqm/src/services/txIntelligenceCore.ts apps/raqm/package.json apps/raqm/package-lock.json && git commit -m "Add pure transaction-intelligence matching functions"`

---

## Task 2: DB multi-row ops + location service

**Files:**
- `apps/raqm/src/db/database.ts` (append)
- `apps/raqm/src/services/location.ts` (new)
- `apps/raqm/package.json` (install `expo-location` if absent)

**Interfaces produced (contract §3):**
```ts
export async function splitTx(parentId: number, parts: { amount: number; merchant?: string | null; categoryId?: number | null }[]): Promise<void>;
export async function mergeTxs(ids: number[], merchant: string): Promise<number>;
export async function groupTxs(ids: number[], name: string): Promise<number>;
export async function ungroupTx(id: number): Promise<void>;
export async function linkTxs(aId: number, bId: number, type: 'manual' | 'self_transfer' | 'refund'): Promise<void>;
export async function unlinkTxs(aId: number): Promise<void>;
export async function setLinkSettled(aId: number, settled: boolean): Promise<void>;
export async function getCurrentCoords(): Promise<{ lat: number; lng: number } | null>;
```

- [ ] Check whether `expo-location` is already a dependency:
  ```bash
  cd apps/raqm && grep -q '"expo-location"' package.json && echo PRESENT || echo ABSENT
  ```
  If `ABSENT`, install it:
  ```bash
  cd apps/raqm && npx expo install expo-location
  ```

- [ ] Add the Android permission block Expo config plugin needs. Open `apps/raqm/app.json` and confirm/add
  under `expo.plugins` (append if the array exists but doesn't have this entry; create the array if absent):
  ```json
  [
    "expo-location",
    {
      "locationAlwaysAndWhenInUsePermission": "Raqm uses your location to tag where a transaction happened."
    }
  ]
  ```

- [ ] Create `apps/raqm/src/services/location.ts`:
  ```ts
  import * as Location from 'expo-location';

  /** L1/L3: returns null on any failure or denial — never throws. */
  export async function getCurrentCoords(): Promise<{ lat: number; lng: number } | null> {
    try {
      const current = await Location.getForegroundPermissionsAsync();
      let status = current.status;
      if (status !== Location.PermissionStatus.GRANTED) {
        const requested = await Location.requestForegroundPermissionsAsync();
        status = requested.status;
      }
      if (status !== Location.PermissionStatus.GRANTED) return null;

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      return { lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      return null;
    }
  }
  ```

- [ ] Append to `apps/raqm/src/db/database.ts` (end of file, after `setSetting`). This assumes Plan 2 has
  already added `TxRecord`, `getTxById`, and the `transactions` table columns listed in contract §2 — all of
  which this code reads by name:
  ```ts
  // ── Multi-row transaction ops (Plan 3) ─────────────────────────────────────────

  export async function splitTx(
    parentId: number,
    parts: { amount: number; merchant?: string | null; categoryId?: number | null }[],
  ): Promise<void> {
    const parent = await getTxById(parentId);
    if (!parent) throw new Error(`splitTx: parent ${parentId} not found`);
    const partsSum = parts.reduce((s, p) => s + p.amount, 0);
    if (Math.abs(partsSum - parent.amount) > 0.01) {
      throw new Error(`splitTx: parts sum ${partsSum} does not match parent amount ${parent.amount}`);
    }
    const database = await getDb();
    await database.runAsync('BEGIN');
    try {
      await database.runAsync(`UPDATE transactions SET deleted_at = ? WHERE id = ?`, Date.now(), parentId);
      for (const part of parts) {
        await database.runAsync(
          `INSERT INTO transactions
             (amount, type, merchant, bankName, accountLast4, timestamp, balance, currency,
              isFromCard, category_id, raw_sms, is_manual, is_split_child, split_parent_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?)`,
          part.amount,
          parent.type,
          part.merchant ?? parent.merchant,
          parent.bankName,
          parent.accountLast4,
          parent.timestamp,
          null,
          parent.currency,
          parent.isFromCard ? 1 : 0,
          part.categoryId ?? null,
          parent.rawSms,
          parentId,
        );
      }
      await database.runAsync('COMMIT');
    } catch (e) {
      await database.runAsync('ROLLBACK');
      throw e;
    }
  }

  export async function mergeTxs(ids: number[], merchant: string): Promise<number> {
    if (ids.length < 2) throw new Error('mergeTxs: need at least 2 ids');
    const rows = await Promise.all(ids.map(id => getTxById(id)));
    const txs = rows.filter((t): t is NonNullable<typeof t> => t !== null);
    if (txs.length !== ids.length) throw new Error('mergeTxs: some ids not found');
    const sum = txs.reduce((s, t) => s + t.amount, 0);
    const earliest = txs.reduce((min, t) => Math.min(min, t.timestamp), txs[0].timestamp);
    const first = txs[0];

    const database = await getDb();
    let newId = 0;
    await database.runAsync('BEGIN');
    try {
      const result = await database.runAsync(
        `INSERT INTO transactions
           (amount, type, merchant, bankName, accountLast4, timestamp, balance, currency, isFromCard, is_manual)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        sum,
        first.type,
        merchant,
        first.bankName,
        first.accountLast4,
        earliest,
        null,
        first.currency,
        first.isFromCard ? 1 : 0,
      );
      newId = result.lastInsertRowId;
      const placeholders = ids.map(() => '?').join(',');
      await database.runAsync(
        `UPDATE transactions SET deleted_at = ? WHERE id IN (${placeholders})`,
        Date.now(),
        ...ids,
      );
      await database.runAsync('COMMIT');
    } catch (e) {
      await database.runAsync('ROLLBACK');
      throw e;
    }
    return newId;
  }

  export async function groupTxs(ids: number[], name: string): Promise<number> {
    if (ids.length < 2) throw new Error('groupTxs: need at least 2 ids');
    const database = await getDb();
    let groupId = 0;
    await database.runAsync('BEGIN');
    try {
      const result = await database.runAsync(`INSERT INTO transaction_groups (name) VALUES (?)`, name);
      groupId = result.lastInsertRowId;
      const placeholders = ids.map(() => '?').join(',');
      await database.runAsync(
        `UPDATE transactions SET group_id = ? WHERE id IN (${placeholders})`,
        groupId,
        ...ids,
      );
      await database.runAsync('COMMIT');
    } catch (e) {
      await database.runAsync('ROLLBACK');
      throw e;
    }
    return groupId;
  }

  export async function ungroupTx(id: number): Promise<void> {
    const database = await getDb();
    await database.runAsync(`UPDATE transactions SET group_id = NULL WHERE id = ?`, id);
  }

  export async function linkTxs(
    aId: number,
    bId: number,
    type: 'manual' | 'self_transfer' | 'refund',
  ): Promise<void> {
    const database = await getDb();
    await database.runAsync('BEGIN');
    try {
      await database.runAsync(
        `UPDATE transactions SET link_type = ?, link_partner_id = ? WHERE id = ?`,
        type, bId, aId,
      );
      await database.runAsync(
        `UPDATE transactions SET link_type = ?, link_partner_id = ? WHERE id = ?`,
        type, aId, bId,
      );
      await database.runAsync('COMMIT');
    } catch (e) {
      await database.runAsync('ROLLBACK');
      throw e;
    }
  }

  export async function unlinkTxs(aId: number): Promise<void> {
    const a = await getTxById(aId);
    if (!a) return;
    const database = await getDb();
    await database.runAsync('BEGIN');
    try {
      await database.runAsync(
        `UPDATE transactions SET link_type = NULL, link_partner_id = NULL, link_settled = 0 WHERE id = ?`,
        aId,
      );
      if (a.linkPartnerId != null) {
        await database.runAsync(
          `UPDATE transactions SET link_type = NULL, link_partner_id = NULL, link_settled = 0 WHERE id = ?`,
          a.linkPartnerId,
        );
      }
      await database.runAsync('COMMIT');
    } catch (e) {
      await database.runAsync('ROLLBACK');
      throw e;
    }
  }

  export async function setLinkSettled(aId: number, settled: boolean): Promise<void> {
    const a = await getTxById(aId);
    if (!a) return;
    const database = await getDb();
    await database.runAsync('BEGIN');
    try {
      await database.runAsync(`UPDATE transactions SET link_settled = ? WHERE id = ?`, settled ? 1 : 0, aId);
      if (a.linkPartnerId != null) {
        await database.runAsync(`UPDATE transactions SET link_settled = ? WHERE id = ?`, settled ? 1 : 0, a.linkPartnerId);
      }
      await database.runAsync('COMMIT');
    } catch (e) {
      await database.runAsync('ROLLBACK');
      throw e;
    }
  }
  ```

- [ ] Verify: `cd apps/raqm && npx tsc --noEmit` → no errors. If `getTxById`/`TxRecord` are missing, Plan 2 has
  not actually landed in this working tree — stop and flag it rather than stubbing them out.
- [ ] Device check: none yet (pure DB layer — covered end-to-end in Tasks 4–5). Confirm `npx expo run:android`
  still builds (native config changed via `app.json` plugin).
- [ ] Commit (skip if user has not approved commits): `git add apps/raqm/src/db/database.ts apps/raqm/src/services/location.ts apps/raqm/app.json apps/raqm/package.json apps/raqm/package-lock.json && git commit -m "Add split/merge/group/link DB ops and location service"`

---

## Task 3: Detection wrappers + store/nav wiring + S5 filter + T13/L1 live listener

**Files:**
- `apps/raqm/src/services/txIntelligence.ts` (new)
- `apps/raqm/src/screens/onboarding/ScanningProgressScreen.tsx` (edit)
- `apps/raqm/src/navigation/AppNavigator.tsx` (edit — locate Plan 2's `useTxStore` init)
- `apps/raqm/src/store/txStore.ts` (edit — add `addParsedWithLocation`, contract addition)
- `apps/raqm/src/screens/main/DashboardScreen.tsx` (edit — locate Plan 2's live listener)

**Interfaces produced (contract §3):**
```ts
export async function detectSelfTransfers(): Promise<number>;
export async function detectRefunds(): Promise<number>;
export async function detectSubscriptions(): Promise<number>;
export async function runDetectionJobs(): Promise<void>;
```
**Contract addition** (not in original §2, needed to satisfy L1 without changing `addParsed`'s fixed
signature): `TxStore.addParsedWithLocation(tx: ParsedTransaction): Promise<void>` — awaits
`getCurrentCoords()`, inserts via `insertParsedTx`, patches `lat`/`lng` via `updateTx` using the returned id,
then prepends the reloaded row to `txs`.

- [ ] Create `apps/raqm/src/services/txIntelligence.ts`:
  ```ts
  import { loadTxRecords, linkTxs, updateTx } from '../db/database';
  import { pairSelfTransfers, pairRefunds, computeRecurringIds } from './txIntelligenceCore';

  export {
    pairSelfTransfers,
    pairRefunds,
    computeRecurringIds,
    isDuplicateSms,
    countsTowardTotals,
  } from './txIntelligenceCore';

  /** T11 */
  export async function detectSelfTransfers(): Promise<number> {
    const txs = await loadTxRecords();
    const pairs = pairSelfTransfers(txs);
    for (const [a, b] of pairs) {
      await linkTxs(a, b, 'self_transfer');
    }
    return pairs.length;
  }

  /** T12 */
  export async function detectRefunds(): Promise<number> {
    const txs = await loadTxRecords();
    const pairs = pairRefunds(txs);
    for (const [a, b] of pairs) {
      await linkTxs(a, b, 'refund');
    }
    return pairs.length;
  }

  /** R1 */
  export async function detectSubscriptions(): Promise<number> {
    const txs = await loadTxRecords();
    const ids = computeRecurringIds(txs);
    for (const id of ids) {
      await updateTx(id, { recurring: true });
    }
    return ids.length;
  }

  /** Runs all three jobs. Called after scan/rescan and once on app start (contract §3). */
  export async function runDetectionJobs(): Promise<void> {
    await detectSelfTransfers();
    await detectRefunds();
    await detectSubscriptions();
  }
  ```

- [ ] Edit `apps/raqm/src/screens/onboarding/ScanningProgressScreen.tsx`. This file is untouched by Plan 2,
  so this is an exact find/replace against the current working tree.

  Add the import (after the existing `useOnboardingStore` import line):
  ```
  old_string:
  import { useOnboardingStore, dateRangeToTimestamps } from '../../store/onboardingStore';

  new_string:
  import { useOnboardingStore, dateRangeToTimestamps } from '../../store/onboardingStore';
  import { runDetectionJobs } from '../../services/txIntelligence';
  ```

  Add the S5 filter and post-scan detection run:
  ```
  old_string:
        const parsed = [];
        for (const msg of messages) {
          const tx = BankParserFactory.parse(msg.body, msg.sender, msg.timestamp);
          if (tx) {
            parsed.push(tx);
            setTxCount(parsed.length);
          }
        }

        setTransactions(parsed);
        setStatus(`Found ${parsed.length} transactions`);

        setTimeout(() => navigation.replace('AccountSelection'), 1200);

  new_string:
        const parsed = [];
        for (const msg of messages) {
          if (!BankParserFactory.isKnownBankSender(msg.sender)) continue; // S5
          const tx = BankParserFactory.parse(msg.body, msg.sender, msg.timestamp);
          if (tx) {
            parsed.push(tx);
            setTxCount(parsed.length);
          }
        }

        setTransactions(parsed);
        setStatus(`Found ${parsed.length} transactions`);
        await runDetectionJobs();

        setTimeout(() => navigation.replace('AccountSelection'), 1200);
  ```

- [ ] Edit `apps/raqm/src/navigation/AppNavigator.tsx`. Plan 2 replaces the current
  `useOnboardingStore(s => s.initDb)` / `initDb()` calls with `useTxStore`'s `load()` (contract §2:
  `TxStore.load()` — "seedDefaults() then loadTxRecords()"). **Locate** the line that awaits the store's load
  function inside the `useEffect` (it will read as `await useTxStore.getState().load()` or equivalent, wherever
  Plan 2 put it), and add the detection call immediately after it, before `setReady(true)`:
  ```ts
  await useTxStore.getState().load();
  await runDetectionJobs();
  useTxStore.getState().refresh();
  ```
  Add the import at the top of the file:
  ```ts
  import { runDetectionJobs } from '../services/txIntelligence';
  import { useTxStore } from '../store/txStore'; // only if Plan 2 hasn't already imported it here
  ```
  If Plan 2's `AppNavigator.tsx` still shows the current working-tree content verbatim (i.e. Plan 2 has not
  actually landed), stop this step and flag it — do not fabricate the Plan 2 diff.

- [ ] Edit `apps/raqm/src/store/txStore.ts`. Locate the `addParsed` method (contract §2) and add
  `addParsedWithLocation` next to it, following the exact same `set`/`get` pattern the store already uses for
  `addParsed`. Add to the `TxStore` interface:
  ```ts
  addParsedWithLocation: (tx: ParsedTransaction) => Promise<void>;
  ```
  Add to the store implementation (adjust `set`/`get` destructuring to match the existing file's style):
  ```ts
  addParsedWithLocation: async (tx: ParsedTransaction) => {
    const coords = await getCurrentCoords();
    const id = await insertParsedTx(tx);
    if (coords) {
      await updateTx(id, { lat: coords.lat, lng: coords.lng });
    }
    const row = await getTxById(id);
    if (row) {
      set(state => ({ txs: [row, ...state.txs] }));
    }
  },
  ```
  Add imports at the top:
  ```ts
  import { getCurrentCoords } from '../services/location';
  ```
  (`getTxById`, `insertParsedTx`, `updateTx` should already be imported from `../db/database` by Plan 2's
  `addParsed`/`update`/`add` implementations — add only what's missing.)

- [ ] Edit `apps/raqm/src/screens/main/DashboardScreen.tsx`. Plan 2's live listener calls
  `useTxStore.getState().addParsed(tx)` (contract §2, line 188). **Replace that listener's callback body**
  with T13 dedupe + L1 location tagging + a "Duplicate SMS ignored" toast on suppression. The block below is
  self-contained — locate the `SmsReader.addNewSmsListener(...)` call (wherever Plan 2 placed it) and replace
  its callback and the surrounding `useEffect` with:
  ```ts
  const lastInsertedRef = useRef<{ amount: number; sender: string; timestamp: number } | null>(null);

  useEffect(() => {
    const sub = SmsReader.addNewSmsListener(({ body, sender, timestamp }) => {
      const tx = BankParserFactory.parse(body, sender, timestamp);
      if (!tx) return;

      if (isDuplicateSms(lastInsertedRef.current, { amount: tx.amount, sender, timestamp })) {
        setNewTxLabel('Duplicate SMS ignored');
        Animated.sequence([
          Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.delay(2000),
          Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start(() => setNewTxLabel(null));
        return;
      }

      lastInsertedRef.current = { amount: tx.amount, sender, timestamp };
      useTxStore.getState().addParsedWithLocation(tx);

      const label = tx.merchant
        ? `${tx.type === TransactionType.EXPENSE ? '-' : '+'}₹${tx.amount.toLocaleString('en-IN')} · ${tx.merchant}`
        : `New transaction from ${tx.bankName}`;
      setNewTxLabel(label);
      Animated.sequence([
        Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.delay(3000),
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start(() => setNewTxLabel(null));
    });
    return () => sub.remove();
  }, []);
  ```
  Add the import:
  ```ts
  import { isDuplicateSms } from '../../services/txIntelligence';
  import { useTxStore } from '../../store/txStore';
  ```

- [ ] Verify: `cd apps/raqm && npx tsc --noEmit` → no errors.
- [ ] Device checks:
  - S5: send a non-bank SMS during onboarding scan → not turned into a transaction.
  - T13: trigger two identical bank SMS within 60s (or replay via ADB) → only one transaction row created,
    second shows "Duplicate SMS ignored" toast.
  - L1: grant location permission, receive a live bank SMS → new row has non-null `lat`/`lng` (check via
    TransactionDetailScreen once Task 5 lands, or a temporary log).
  - L3: deny location permission → transaction still inserts normally with null `lat`/`lng`, no crash.
- [ ] Commit (skip if user has not approved commits): `git add apps/raqm/src/services/txIntelligence.ts apps/raqm/src/screens/onboarding/ScanningProgressScreen.tsx apps/raqm/src/navigation/AppNavigator.tsx apps/raqm/src/store/txStore.ts apps/raqm/src/screens/main/DashboardScreen.tsx && git commit -m "Wire detection jobs, S5 sender filter, T13 dedupe, L1 GPS tagging"`

---

## Task 4: Transactions multi-select — merge, group, grouped-row rendering

**Files:** `apps/raqm/src/screens/main/TransactionsScreen.tsx` (full replacement)

**Interfaces consumed:** `useTxStore` (contract §2), `mergeTxs`, `groupTxs` (contract §3, Task 2).

- [ ] Replace `apps/raqm/src/screens/main/TransactionsScreen.tsx` in full. This subsumes Plan 2's expected
  `useTxStore`-based rewrite of this screen (search + list) and adds T8/T9 on top. If Plan 2's actual version
  added other functionality (e.g. FAB → AddTransaction), re-add it after pasting this in — the important
  contract-relevant parts are the `useTxStore` read, the multi-select mode, and the grouped-row collapse:
  ```tsx
  import React, { useMemo, useState } from 'react';
  import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, Modal, Pressable } from 'react-native';
  import { Colors, Typography, Spacing, Radius } from '../../theme';
  import { useTxStore } from '../../store/txStore';
  import { mergeTxs, groupTxs, type TxRecord } from '../../db/database';
  import { TransactionType } from '@rahatsayyed/bank-sms-parser';
  import { MainStackScreenProps } from '../../navigation/types';

  function formatAmount(n: number, currency = '₹'): string {
    return `${currency}${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  }

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

  type Row =
    | { kind: 'single'; tx: TxRecord }
    | { kind: 'group'; groupId: number; members: TxRecord[] };

  export function TransactionsScreen({ navigation }: MainStackScreenProps<'Tabs'>) {
    const txs = useTxStore(s => s.txs);
    const refresh = useTxStore(s => s.refresh);
    const [query, setQuery] = useState('');
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
    const [modal, setModal] = useState<null | 'merge' | 'group'>(null);
    const [modalName, setModalName] = useState('');

    const currency = txs[0]?.currency ?? '₹';

    const filtered = useMemo(() => {
      if (!query.trim()) return txs;
      const q = query.toLowerCase();
      return txs.filter(tx => (tx.merchant ?? '').toLowerCase().includes(q) || tx.bankName.toLowerCase().includes(q));
    }, [txs, query]);

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

    async function confirmMerge() {
      if (!modalName.trim() || selected.size < 2) return;
      await mergeTxs(Array.from(selected), modalName.trim());
      await refresh();
      setModal(null);
      setModalName('');
      exitSelectMode();
    }

    async function confirmGroup() {
      if (!modalName.trim() || selected.size < 2) return;
      await groupTxs(Array.from(selected), modalName.trim());
      await refresh();
      setModal(null);
      setModalName('');
      exitSelectMode();
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
          keyExtractor={(r, i) => (r.kind === 'group' ? `g${r.groupId}` : `t${r.tx.id}`)}
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
            <TouchableOpacity style={styles.actionBtn} onPress={() => setModal('merge')}>
              <Text style={styles.actionBtnText}>Merge ({selected.size})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => setModal('group')}>
              <Text style={styles.actionBtnText}>Group ({selected.size})</Text>
            </TouchableOpacity>
          </View>
        )}

        <Modal visible={modal !== null} transparent animationType="fade" onRequestClose={() => setModal(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setModal(null)}>
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
      <TouchableOpacity style={[styles.item, indent && styles.itemIndent]} onPress={onPress} onLongPress={onLongPress}>
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
            {tx.bankName}{tx.accountLast4 ? ` ···${tx.accountLast4}` : ''} · {formatDate(tx.timestamp)}
          </Text>
        </View>
        <Text style={[styles.itemAmount, { color }]}>{debit ? '-' : '+'}{formatAmount(tx.amount, currency)}</Text>
      </TouchableOpacity>
    );
  }

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    header: {
      paddingHorizontal: Spacing.containerMargin, paddingTop: Spacing.lg, paddingBottom: Spacing.sm,
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
    item: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm },
    itemIndent: { paddingLeft: Spacing.lg, backgroundColor: Colors.surfaceContainerLow },
    checkbox: {
      width: 22, height: 22, borderRadius: Radius.full, borderWidth: 2, borderColor: Colors.outline,
      alignItems: 'center', justifyContent: 'center',
    },
    checkboxOn: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    checkboxMark: { color: Colors.onPrimary, fontSize: 12, fontWeight: '700' },
    dot: { width: 40, height: 40, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
    dotText: { fontSize: 16, fontWeight: '700' },
    itemInfo: { flex: 1 },
    itemMerchant: { ...Typography.bodySm, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
    itemMeta: { ...Typography.labelSm, color: Colors.onSurfaceVariant, letterSpacing: 0, marginTop: 2 },
    itemAmount: { ...Typography.numericSm, fontSize: 15 },
    sep: { height: 1, backgroundColor: Colors.outlineVariant, marginLeft: 56 },
    empty: { paddingTop: 80, alignItems: 'center' },
    emptyText: { ...Typography.bodyMd, color: Colors.onSurfaceVariant },
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
    actionBtnText: { ...Typography.bodyMd, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    modalCard: {
      width: '85%', backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.xl,
      borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.lg, gap: Spacing.md,
    },
    modalTitle: { ...Typography.titleLg, color: Colors.onSurface, fontSize: 16 },
    modalInput: {
      backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.outlineVariant, paddingHorizontal: Spacing.md, paddingVertical: 10,
      ...Typography.bodyMd, color: Colors.onSurface,
    },
    modalConfirm: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.sm, alignItems: 'center' },
    modalConfirmText: { ...Typography.bodyMd, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
  });
  ```

- [ ] Verify: `cd apps/raqm && npx tsc --noEmit` → no errors. If Plan 2's real screen exported different
  navigation prop typing, adjust the `MainStackScreenProps<'Tabs'>` destructure to match how the tab screen
  actually receives `navigation` (it may come through the tab navigator instead of the stack — check
  `MainNavigator.tsx`).
- [ ] Device checks:
  - T8: long-press a row → selection mode with checkbox circles; select 2+; tap Merge; enter merchant name →
    single merged row appears, originals gone.
  - T9: same flow with Group → row collapses into one expandable "Group · N transactions" row with summed
    amount and a chevron; tapping expands to show members.

---

## Task 5: TransactionDetailScreen — split, link, settled, unlink, recurring

**Files:** `apps/raqm/src/screens/main/TransactionDetailScreen.tsx` (full replacement)

**Interfaces consumed:** `getTxById`, `updateTx`, `splitTx`, `linkTxs`, `unlinkTxs`, `setLinkSettled`
(contract §3), `useTxStore` (for `refresh` + recent-tx picker list).

- [ ] Replace `apps/raqm/src/screens/main/TransactionDetailScreen.tsx` in full. If Plan 2's real version
  already has notes/tags/edit/delete UI (T4/T5/T6/T10) built out, merge that screen's base sections (amount,
  merchant, bank, notes editor, raw SMS, edit/delete buttons) with the Split/Link/Recurring block below rather
  than discarding Plan 2's work — the important contract-relevant parts are the actions this task adds:
  ```tsx
  import React, { useEffect, useState, useCallback } from 'react';
  import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Pressable, TextInput, FlatList } from 'react-native';
  import { Colors, Typography, Spacing, Radius } from '../../theme';
  import { MainStackScreenProps } from '../../navigation/types';
  import { useTxStore } from '../../store/txStore';
  import {
    getTxById, updateTx, splitTx, linkTxs, unlinkTxs, setLinkSettled, type TxRecord,
  } from '../../db/database';

  function formatAmount(n: number, currency = '₹'): string {
    return `${currency}${Math.abs(n).toLocaleString('en-IN')}`;
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  export function TransactionDetailScreen({ route, navigation }: MainStackScreenProps<'TransactionDetail'>) {
    const { transactionId } = route.params;
    const [tx, setTx] = useState<TxRecord | null>(null);
    const [partner, setPartner] = useState<TxRecord | null>(null);
    const [splitVisible, setSplitVisible] = useState(false);
    const [linkVisible, setLinkVisible] = useState(false);
    const txs = useTxStore(s => s.txs);
    const refreshStore = useTxStore(s => s.refresh);

    const load = useCallback(async () => {
      const row = await getTxById(transactionId);
      setTx(row);
      if (row?.linkPartnerId != null) {
        setPartner(await getTxById(row.linkPartnerId));
      } else {
        setPartner(null);
      }
    }, [transactionId]);

    useEffect(() => { load(); }, [load]);

    if (!tx) {
      return (
        <View style={styles.root}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
            <Text style={styles.backText}>← Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    async function toggleRecurring() {
      await updateTx(tx!.id, { recurring: !tx!.recurring });
      await load();
      await refreshStore();
    }

    async function handleUnlink() {
      await unlinkTxs(tx!.id);
      await load();
      await refreshStore();
    }

    async function toggleSettled() {
      await setLinkSettled(tx!.id, !tx!.linkSettled);
      await load();
      await refreshStore();
    }

    return (
      <ScrollView style={styles.root} contentContainerStyle={styles.content}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.amount}>{formatAmount(tx.amount, tx.currency)}</Text>
        <Text style={styles.merchant}>{tx.merchant || tx.bankName}</Text>
        <Text style={styles.meta}>{tx.bankName}{tx.accountLast4 ? ` ···${tx.accountLast4}` : ''} · {formatDate(tx.timestamp)}</Text>

        {tx.recurring && <Text style={styles.badge}>↻ Recurring</Text>}

        {/* Link section (T14–T16) */}
        {tx.linkType && partner ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Linked with → {partner.merchant || partner.bankName}</Text>
            <Text style={styles.cardSub}>Type: {tx.linkType}</Text>
            <View style={styles.row}>
              <TouchableOpacity style={styles.pillBtn} onPress={toggleSettled}>
                <Text style={styles.pillBtnText}>{tx.linkSettled ? '✓ Settled' : 'Mark Settled'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.pillBtn, styles.pillBtnDanger]} onPress={handleUnlink}>
                <Text style={styles.pillBtnText}>Unlink</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity style={styles.actionRow} onPress={() => setLinkVisible(true)}>
            <Text style={styles.actionRowText}>🔗 Link to another transaction</Text>
          </TouchableOpacity>
        )}

        {/* Split action (T7) */}
        {!tx.isSplitChild && (
          <TouchableOpacity style={styles.actionRow} onPress={() => setSplitVisible(true)}>
            <Text style={styles.actionRowText}>✂️ Split transaction</Text>
          </TouchableOpacity>
        )}

        {/* Recurring toggle (R3) */}
        <TouchableOpacity style={styles.actionRow} onPress={toggleRecurring}>
          <Text style={styles.actionRowText}>{tx.recurring ? '↻ Unmark as recurring' : '↻ Mark as recurring'}</Text>
        </TouchableOpacity>

        {tx.rawSms && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Other Info</Text>
            <Text style={styles.rawSms}>{tx.rawSms}</Text>
          </View>
        )}

        <SplitModal
          visible={splitVisible}
          onClose={() => setSplitVisible(false)}
          tx={tx}
          onDone={async () => { setSplitVisible(false); await refreshStore(); navigation.goBack(); }}
        />
        <LinkPicker
          visible={linkVisible}
          onClose={() => setLinkVisible(false)}
          currentId={tx.id}
          candidates={txs.filter(t => t.id !== tx.id && !t.deletedAt).slice(0, 50)}
          onPick={async (partnerId) => {
            await linkTxs(tx.id, partnerId, 'manual');
            setLinkVisible(false);
            await load();
            await refreshStore();
          }}
        />
      </ScrollView>
    );
  }

  function SplitModal({
    visible, onClose, tx, onDone,
  }: { visible: boolean; onClose: () => void; tx: TxRecord; onDone: () => void }) {
    const [count, setCount] = useState(2);
    const [amounts, setAmounts] = useState<string[]>(['', '']);
    const [error, setError] = useState<string | null>(null);

    function setAmountAt(i: number, v: string) {
      setAmounts(prev => prev.map((a, idx) => (idx === i ? v : a)));
    }

    function addRow() {
      setCount(c => c + 1);
      setAmounts(prev => [...prev, '']);
    }

    async function confirm() {
      const parsed = amounts.map(a => Number(a));
      if (parsed.some(n => !Number.isFinite(n) || n <= 0)) {
        setError('Enter valid positive amounts');
        return;
      }
      const sum = parsed.reduce((s, n) => s + n, 0);
      if (Math.abs(sum - tx.amount) > 0.01) {
        setError(`Amounts must sum to ${tx.amount}`);
        return;
      }
      await splitTx(tx.id, parsed.map(amount => ({ amount })));
      onDone();
    }

    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <Pressable style={styles.modalBackdrop} onPress={onClose}>
          <Pressable style={styles.modalCard} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Split {formatAmount(tx.amount, tx.currency)} into {count} parts</Text>
            {amounts.map((a, i) => (
              <TextInput
                key={i}
                style={styles.modalInput}
                placeholder={`Part ${i + 1} amount`}
                placeholderTextColor={Colors.outline}
                keyboardType="numeric"
                value={a}
                onChangeText={v => setAmountAt(i, v)}
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
  }: { visible: boolean; onClose: () => void; currentId: number; candidates: TxRecord[]; onPick: (id: number) => void }) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <Pressable style={styles.modalBackdrop} onPress={onClose}>
          <Pressable style={[styles.modalCard, { maxHeight: '70%' }]} onPress={e => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Link to…</Text>
            <FlatList
              data={candidates}
              keyExtractor={t => String(t.id)}
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.pickerRow} onPress={() => onPick(item.id)}>
                  <Text style={styles.pickerRowText} numberOfLines={1}>
                    {item.merchant || item.bankName} · {formatAmount(item.amount, item.currency)}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </Pressable>
        </Pressable>
      </Modal>
    );
  }

  const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: Colors.background },
    content: { padding: Spacing.containerMargin, paddingBottom: 48, gap: Spacing.md },
    back: { marginTop: Spacing.lg },
    backText: { ...Typography.bodyMd, color: Colors.primary },
    amount: { ...Typography.metricHero, color: Colors.onSurface, marginTop: Spacing.md },
    merchant: { ...Typography.titleLg, color: Colors.onSurface, fontSize: 18 },
    meta: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
    badge: {
      alignSelf: 'flex-start', ...Typography.labelCaps, color: Colors.mossStructure,
      backgroundColor: `${Colors.mossStructure}20`, paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full,
    },
    card: {
      backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.xl,
      borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.md, gap: Spacing.sm,
    },
    cardTitle: { ...Typography.bodyMd, color: Colors.onSurface, fontFamily: 'WorkSans_500Medium' },
    cardSub: { ...Typography.bodySm, color: Colors.onSurfaceVariant },
    rawSms: { ...Typography.supportingText, color: Colors.inkBody },
    row: { flexDirection: 'row', gap: Spacing.sm },
    actionRow: {
      backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.outlineVariant, padding: Spacing.md,
    },
    actionRowText: { ...Typography.bodyMd, color: Colors.onSurface },
    pillBtn: {
      backgroundColor: Colors.surfaceVariant, borderRadius: Radius.full,
      paddingHorizontal: Spacing.md, paddingVertical: 8, alignSelf: 'flex-start',
    },
    pillBtnDanger: { backgroundColor: `${Colors.errorMuted}30` },
    pillBtnText: { ...Typography.labelSm, color: Colors.onSurface, letterSpacing: 0 },
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
    modalCard: {
      width: '85%', backgroundColor: Colors.bgSurfaceRaised, borderRadius: Radius.xl,
      borderWidth: 1, borderColor: Colors.borderSubtle, padding: Spacing.lg, gap: Spacing.md,
    },
    modalTitle: { ...Typography.titleLg, color: Colors.onSurface, fontSize: 16 },
    modalInput: {
      backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.lg,
      borderWidth: 1, borderColor: Colors.outlineVariant, paddingHorizontal: Spacing.md, paddingVertical: 10,
      ...Typography.bodyMd, color: Colors.onSurface,
    },
    modalConfirm: { backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: Spacing.sm, alignItems: 'center' },
    modalConfirmText: { ...Typography.bodyMd, color: Colors.onPrimary, fontFamily: 'WorkSans_500Medium' },
    errorText: { ...Typography.bodySm, color: Colors.errorMuted },
    pickerRow: { paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
    pickerRowText: { ...Typography.bodyMd, color: Colors.onSurface },
  });
  ```

- [ ] Verify: `cd apps/raqm && npx tsc --noEmit` → no errors.
- [ ] Device checks:
  - T7: Split → enter N amounts summing correctly → parent disappears, N new rows appear; entering amounts
    that don't sum shows the error and blocks submission.
  - T14: Link → pick a transaction from the list → both rows now show "Linked with → <merchant/bank>".
  - T15: Mark Settled → toggle reflects immediately; verify (Task 6) both excluded from totals.
  - T16: Unlink → link section disappears on both transactions.
  - R3: Mark as recurring toggle flips and persists across screen reopen.

---

## Task 6: Subscriptions section (R1/R2) + totals filter rollout

**Files:**
- `apps/raqm/src/screens/main/AnalyticsScreen.tsx` (edit/extend)
- `apps/raqm/src/screens/main/DashboardScreen.tsx` (edit — totals reducer)

**Interfaces consumed:** `countsTowardTotals` (contract §3), `useTxStore`, `TxRecord`.

- [ ] Edit `apps/raqm/src/screens/main/DashboardScreen.tsx`. Locate the totals `useMemo` (Plan 2's version
  reads from `useTxStore` instead of `useOnboardingStore`, per contract §2). Replace its body with a version
  that filters via `countsTowardTotals` and nets refund credits against expenses:
  ```ts
  const stats = useMemo(() => {
    let income = 0;
    let expenses = 0;
    for (const tx of txs) {
      if (tx.deletedAt) continue;
      if (!countsTowardTotals(tx)) continue;
      const isCredit = tx.type === TransactionType.INCOME || tx.type === TransactionType.CREDIT;
      if (isCredit && tx.linkType === 'refund') {
        expenses -= tx.amount; // refund nets against expense, not counted as income
      } else if (isCredit) {
        income += tx.amount;
      } else if (tx.type === TransactionType.EXPENSE || tx.type === TransactionType.TRANSFER || tx.type === TransactionType.INVESTMENT) {
        expenses += tx.amount;
      }
    }
    return { income, expenses, net: income - expenses };
  }, [txs]);
  ```
  Add the import:
  ```ts
  import { countsTowardTotals } from '../../services/txIntelligence';
  ```
  (`txs` here refers to whatever Plan 2 named the `useTxStore(s => s.txs)` binding in this file — reuse that
  variable name, don't introduce a second one.)

- [ ] Edit `apps/raqm/src/screens/main/AnalyticsScreen.tsx`. Apply the same `countsTowardTotals` + refund-net
  filter to the `byMonth` and `topMerchants` reducers (wrap the existing loop body's condition), then append a
  Subscriptions section (R2). Add the import:
  ```ts
  import { countsTowardTotals } from '../../services/txIntelligence';
  ```
  In the `byMonth` reducer, guard each iteration with `if (!countsTowardTotals(tx)) continue;` before the
  existing income/expense branching, and net refunds the same way as Dashboard above. In `topMerchants`, add
  the same `countsTowardTotals` guard.

  Add a subscriptions computation and section. Insert this `useMemo` alongside the existing ones:
  ```ts
  const subscriptions = useMemo(() => {
    const groups = new Map<string, TxRecord[]>();
    for (const tx of txs) {
      if (!tx.recurring || !tx.merchant || tx.deletedAt) continue;
      const key = tx.merchant.trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(tx);
    }
    return Array.from(groups.entries()).map(([key, group]) => {
      const sorted = [...group].sort((a, b) => a.timestamp - b.timestamp);
      const last = sorted[sorted.length - 1];
      const gaps: number[] = [];
      for (let i = 1; i < sorted.length; i++) {
        gaps.push((sorted[i].timestamp - sorted[i - 1].timestamp) / (24 * 60 * 60 * 1000));
      }
      gaps.sort((a, b) => a - b);
      const medianGap = gaps.length ? gaps[Math.floor(gaps.length / 2)] : 30;
      const nextExpected = last.timestamp + medianGap * 24 * 60 * 60 * 1000;
      return {
        merchant: last.merchant || key,
        amount: last.amount,
        nextExpected,
      };
    });
  }, [txs]);
  ```
  Add the JSX section (append after the existing "Top merchants" `<View style={styles.section}>` block, before
  the closing `</ScrollView>`):
  ```tsx
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Subscriptions</Text>
    <View style={styles.merchantList}>
      {subscriptions.length === 0 ? (
        <Text style={styles.emptyText}>No recurring subscriptions detected yet</Text>
      ) : (
        subscriptions.map(sub => (
          <View key={sub.merchant} style={styles.merchantRow}>
            <View style={styles.merchantInfo}>
              <View style={styles.merchantTopRow}>
                <Text style={styles.merchantName} numberOfLines={1}>{sub.merchant}</Text>
                <Text style={styles.merchantAmount}>{formatAmount(sub.amount, currency)}</Text>
              </View>
              <Text style={styles.emptyText}>
                Next expected {new Date(sub.nextExpected).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              </Text>
            </View>
          </View>
        ))
      )}
    </View>
  </View>
  ```
  Add `import type { TxRecord } from '../../db/database';` if not already present, and reuse whatever local
  variable Plan 2 bound `useTxStore(s => s.txs)` to (referred to as `txs` above).

- [ ] Verify: `cd apps/raqm && npx tsc --noEmit` → no errors.
- [ ] Device checks:
  - T11: two self-transfer legs excluded from Dashboard expense/income totals.
  - T12: a refund reduces the expense total instead of adding to income.
  - T15: a settled linked pair excluded from totals.
  - R1/R2: recurring merchant appears in Analytics → Subscriptions with a plausible "Next expected" date.
- [ ] Commit (skip if user has not approved commits): `git add apps/raqm/src/screens/main/TransactionDetailScreen.tsx apps/raqm/src/screens/main/TransactionsScreen.tsx apps/raqm/src/screens/main/AnalyticsScreen.tsx apps/raqm/src/screens/main/DashboardScreen.tsx && git commit -m "Add split/link/settled UI, subscriptions section, canonical totals filter"`

---

## Verification Checklist

From `docs/superpowers/specs/2026-07-02-raqm-v0-design.md` §7 — tick on a physical Android device:

### SMS Scanning
- [ ] S5: Only bank SMS are processed (random SMS filtered out)

### Transaction Management
- [ ] T7: Split transaction creates N rows summing to original amount
- [ ] T8: Merge combines selected transactions into one row
- [ ] T9: Group shows summed amount with expandable chevron
- [ ] T11: Self-transfers auto-detected and excluded from expense totals
- [ ] T12: Refunds auto-detected and netted against original expense
- [ ] T13: Duplicate SMS within 60s suppressed (only one transaction created)
- [ ] T14: Two transactions can be manually linked; both show "Linked with →"
- [ ] T15: Marking linked pair as Settled excludes both from expense totals
- [ ] T16: Unlink removes the relationship

### Subscriptions
- [ ] R1: Recurring merchant detected and shown in subscription list
- [ ] R2: Subscription list shows next expected date
- [ ] R3: Manual "mark as recurring" toggle works on any transaction

### Location
- [ ] L1: GPS coordinates attached to transaction when permission granted
- [ ] L3: No crash or UI issue if location permission denied
