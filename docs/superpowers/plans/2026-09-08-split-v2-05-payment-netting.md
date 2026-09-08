# Split with Friends v2 — Plan 5: Payment Confirmation + Netting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a linked split's payment is confirmed (auto-detected or manually settled), net the received credit against the original expense via the existing refund-linking mechanism, instead of letting it count as phantom income. Unlinked splits keep today's instant, purely informational settle toggle.

**Architecture:** Reuse `linkTxs(aId, bId, type)` (`src/db/database.ts:2208`) — the same function `detectRefunds()` already uses for refund netting — by extending its `type` union with `'split_payment'`. Add netting to the existing "Confirm paid" action (the `attention` → `settled` transition). Add a new bottom sheet (reusing the exported `BottomSheet` from `TransactionDetailScreen.tsx`) for the manual "Settled" toggle on linked splits, offering either an existing incoming transaction (adapted single-select version of `TransactionsScreen`'s select-mode pattern) or a new "Received as cash" manual transaction (reusing `QuickAddCashScreen`'s `useTxStore.add()` call shape with `TransactionType.CREDIT`).

**Tech Stack:** TypeScript, expo-sqlite (async API), React Native, NativeWind.

**Spec:** `docs/superpowers/specs/2026-09-08-split-with-friends-v2-design.md` (section 5: "Payment confirmation + netting"). This is the highest-risk plan — it touches Raqm's spend-math invariants (`countsTowardTotals()` + refund netting via `linkPartnerId`, documented in `apps/raqm/CLAUDE.md`'s parent `CLAUDE.md`). Depends on Plan 1 (nothing directly, but shares the branch).

## Global Constraints

- **Read `linkTxs` (`src/db/database.ts:2208-2251`) fully before touching it.** It mutates `transactions.link_type`/`link_partner_id`/`link_settled` on BOTH sides of a pair, inside one `BEGIN`/`COMMIT`/`ROLLBACK`, and clears any pre-existing different partner first. Reuse it verbatim with a new `type` value — do not write a parallel netting mechanism.
- Netting happens **per participant as each is confirmed**, not only once the whole split reaches `settled` (explicitly confirmed with the user during brainstorming).
- **Unlinked splits** (`split.sourceTxId === null`) get NO netting behavior changes — the manual "Settled" toggle stays exactly as it is today (instant, no bottom sheet, no DB side effect beyond the status write). This is deliberate, not an oversight: "for no transaction linked split we don't worry about income and expense changes."
- `'Cash'` already exists as a working `bankName` value (used by `QuickAddCashScreen.tsx` for manual EXPENSE rows) — "Received as cash" reuses the exact same `useTxStore.add()` path with `type: TransactionType.CREDIT` instead of `EXPENSE`. No new accounts table, no account-management UI.
- Async button handlers need in-flight guards.
- All SQL parameterized; every write via expo-sqlite's async API with explicit transactions.
- No test runner — verify with `cd apps/raqm && npx tsc --noEmit` plus manual device verification. Because this plan touches spend math, manual verification MUST include checking Dashboard/Analytics totals before and after confirming a linked split payment, to confirm the credit does NOT double-count as income and the original expense's net spend correctly drops by the settled share.

---

### Task 1: Extend `linkTxs`'s type union with `'split_payment'`

**Files:**
- Modify: `apps/raqm/src/db/database.ts` (the `linkTxs` function signature at line 2208, plus its `link_type` column is `TEXT` so no schema change is needed — only the TS union changes)
- Search: grep `link_type` and `linkPartnerId`/`link_partner_id` across `apps/raqm/src` to confirm every reader of this column (e.g. Dashboard/Analytics/CategoryDetail spend-math code, per `CLAUDE.md`'s invariant) treats an unrecognized `link_type` value gracefully (most such code only checks `link_partner_id`'s presence to net a credit against its partner's category, not the specific `link_type` string — confirm this before proceeding, since a `link_type`-based branch that only special-cases `'refund'` would silently skip `'split_payment'` rows).

**Interfaces:**
- Consumes: `transactions.link_type`, `transactions.link_partner_id` columns (existing).
- Produces: `linkTxs(aId: number, bId: number, type: 'manual' | 'self_transfer' | 'refund' | 'split_payment'): Promise<void>` — same function, one new allowed value.

- [ ] **Step 1: Read `linkTxs` in full and grep every spend-math consumer of `link_type`**

Read `apps/raqm/src/db/database.ts` lines 2208-2280 (the full `linkTxs`/`unlinkTxs`/`setLinkSettled` block). Then run `grep -rn "link_type\|linkType" apps/raqm/src` and read every match's surrounding ~10 lines. Confirm: does any spend-math code (Dashboard, Analytics, CategoryDetail, budgets, export — per `CLAUDE.md`'s invariant list) branch on the specific string `'refund'` vs. treating any non-null `link_partner_id` as "this credit nets against its partner's category, regardless of link type"? Report the answer as part of this task's completion note — if a `'refund'`-specific branch exists that would exclude `'split_payment'` rows from netting, that code must ALSO be updated in this task (add `'split_payment'` to the same branch condition), not deferred.

- [ ] **Step 2: Widen the `type` parameter's union**

Change `linkTxs`'s signature (`database.ts:2208`) from:
```ts
export async function linkTxs(aId: number, bId: number, type: 'manual' | 'self_transfer' | 'refund'): Promise<void>
```
to:
```ts
export async function linkTxs(aId: number, bId: number, type: 'manual' | 'self_transfer' | 'refund' | 'split_payment'): Promise<void>
```
No other change to the function body — it already writes whatever `type` string it's given to `link_type` on both rows.

- [ ] **Step 3: Apply any spend-math fix found in Step 1**

If Step 1 found a `'refund'`-specific branch, widen its condition to also match `'split_payment'`. If no such branch exists (i.e. spend-math code already keys off `link_partner_id`'s presence alone), skip this step and note "no spend-math change needed" in the commit message body.

- [ ] **Step 4: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/raqm/src/db/database.ts
git commit -m "feat(raqm): allow linkTxs to tag split-payment netting links"
```

---

### Task 2: Net the auto-detected "Confirm paid" (attention → settled) action

**Files:**
- Modify: `apps/raqm/src/screens/main/SplitDetailScreen.tsx`

**Interfaces:**
- Consumes: `linkTxs` (Task 1), `split.sourceTxId` (existing `Split` field), `item.matchedTxId` (existing `SplitParticipant` field, set by `matchSplitPayments()`).

- [ ] **Step 1: Update the "Confirm paid" button's `onPress`**

The existing block (inside `{item.status === 'attention' && (...)}`):
```tsx
onPress={async () => {
  await setSplitParticipantStatus(item.id, 'settled', item.matchedTxId);
  load();
}}
```
becomes:
```tsx
onPress={async () => {
  await setSplitParticipantStatus(item.id, 'settled', item.matchedTxId);
  if (split.sourceTxId != null && item.matchedTxId != null) {
    await linkTxs(split.sourceTxId, item.matchedTxId, 'split_payment');
  }
  load();
}}
```
Add `linkTxs` to this file's existing `../../db/database` import line.

- [ ] **Step 2: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual verification**

Create a split from an existing expense transaction (so `sourceTxId` is set), let `matchSplitPayments()` (runs as part of `runDetectionJobs`, per `CLAUDE.md`) put a participant into `attention` status by matching an incoming credit, tap "Confirm paid", then check the original expense transaction in `TransactionDetailScreen` — it should now show as linked (the existing "linked transaction" UI in that screen, used today for refunds) to the credit, and Dashboard/Analytics totals should reflect the net (not double-count the credit as separate income).

- [ ] **Step 4: Commit**

```bash
git add apps/raqm/src/screens/main/SplitDetailScreen.tsx
git commit -m "feat(raqm): net auto-matched split payments against the original expense on confirm"
```

---

### Task 3: Manual settle bottom sheet for linked splits (pick transaction or receive as cash)

**Files:**
- Modify: `apps/raqm/src/screens/main/SplitDetailScreen.tsx`

**Interfaces:**
- Consumes: `BottomSheet` (exported from `apps/raqm/src/screens/main/TransactionDetailScreen.tsx`, props `{ visible, onClose, children }`), `useTxStore` (`src/store/txStore.ts`, `.add` method — `NewTxInput` shape confirmed by `QuickAddCashScreen.tsx`'s existing call), `isCreditType` (grep `export function isCreditType` in `src/services/txIntelligenceCore.ts` to confirm the exact import path — it is exported there and used by `matchSplitPayments`), `linkTxs` (Task 1), `setSplitParticipantStatus` (existing).

- [ ] **Step 1: Read `BottomSheet`'s exact export and `TxRecord`'s shape**

Read `apps/raqm/src/screens/main/TransactionDetailScreen.tsx` around lines 975-1070 (confirmed in prior research: `export function BottomSheet({ visible, onClose, children })`) to confirm the import path is exactly `import { BottomSheet } from './TransactionDetailScreen';` (same directory). Also read `src/store/txStore.ts`'s `TxRecord` type (grep `interface TxRecord` or `type TxRecord`) to know which fields are available for rendering a transaction row (at minimum: `id`, `amount`, `merchant`, `timestamp`, `bankName`).

- [ ] **Step 2: Add settle-sheet state and the transaction list**

Add to `SplitDetailScreen.tsx`:
```ts
const [settleSheetParticipant, setSettleSheetParticipant] = useState<SplitParticipant | null>(null);
const [selectedTxId, setSelectedTxId] = useState<number | null>(null);
const [settling, setSettling] = useState(false);
const allTxs = useTxStore((s) => s.txs);
```
Add imports: `import { useTxStore } from '../../store/txStore';`, `import { isCreditType } from '../../services/txIntelligenceCore';`, `import { BottomSheet } from './TransactionDetailScreen';`, `import { TransactionType } from '@rahatsayyed/bank-sms-parser';` (confirm this is the correct import path by grepping an existing `TransactionType` import elsewhere in the app, e.g. `QuickAddCashScreen.tsx`).

Compute the candidate list (recent incoming transactions, newest first, capped at 20 to keep the sheet short):
```ts
const incomingCandidates = allTxs
  .filter((t) => isCreditType(t.type))
  .sort((a, b) => b.timestamp - a.timestamp)
  .slice(0, 20);
```

- [ ] **Step 3: Change the manual "Settled" toggle to open the sheet only for linked splits**

Replace `toggleSettled`:
```ts
const toggleSettled = async (p: SplitParticipant) => {
  if (p.status === 'settled') {
    // Unmarking stays instant in both linked and unlinked splits — netting
    // reversal (unlinking the transaction pair) is out of scope for this
    // plan; the transaction-level link, if any, simply stays as-is.
    await setSplitParticipantStatus(p.id, 'unpaid', null);
    load();
    return;
  }
  if (split!.sourceTxId == null) {
    // Unlinked split: purely informational, no netting, unchanged from v1.
    await setSplitParticipantStatus(p.id, 'settled', null);
    load();
    return;
  }
  setSelectedTxId(null);
  setSettleSheetParticipant(p);
};
```

- [ ] **Step 4: Render the settle bottom sheet**

Add near the bottom of the component's JSX (as a sibling to the `FlatList`, same pattern as any other modal in this screen):
```tsx
<BottomSheet visible={settleSheetParticipant != null} onClose={() => setSettleSheetParticipant(null)}>
  <View className="px-container-margin pb-lg">
    <Text className="font-inter-bold text-title-md text-on-surface mb-md">Mark as settled</Text>
    <Text className="font-mono text-label-sm text-on-surface-variant mb-sm">Pick the incoming payment</Text>
    {incomingCandidates.map((t) => (
      <TouchableOpacity
        key={t.id}
        className={`flex-row items-center justify-between py-[10px] px-sm rounded-lg ${selectedTxId === t.id ? 'bg-primary/10' : ''}`}
        onPress={() => setSelectedTxId(t.id)}
      >
        <View>
          <Text className="font-inter text-body-sm text-on-surface">{t.merchant ?? t.bankName}</Text>
          <Text className="font-inter text-body-sm text-on-surface-variant">{new Date(t.timestamp).toLocaleDateString()}</Text>
        </View>
        <Text className="font-mono text-body-sm text-on-surface">{formatAmount(t.amount)}</Text>
      </TouchableOpacity>
    ))}
    <TouchableOpacity
      className={`mt-md py-md items-center bg-primary rounded-xl ${selectedTxId == null || settling ? 'opacity-40' : ''}`}
      disabled={selectedTxId == null || settling}
      onPress={async () => {
        if (!settleSheetParticipant || selectedTxId == null || settling) return;
        setSettling(true);
        try {
          await setSplitParticipantStatus(settleSheetParticipant.id, 'settled', selectedTxId);
          if (split!.sourceTxId != null) {
            await linkTxs(split!.sourceTxId, selectedTxId, 'split_payment');
          }
          setSettleSheetParticipant(null);
          load();
        } finally {
          setSettling(false);
        }
      }}
    >
      <Text className="font-inter-medium text-body-md text-on-primary">Use this transaction</Text>
    </TouchableOpacity>

    <Text className="font-mono text-label-sm text-on-surface-variant mt-lg mb-sm">Or</Text>
    <TouchableOpacity
      className={`py-md items-center bg-surface rounded-xl border border-outline-variant ${settling ? 'opacity-40' : ''}`}
      disabled={settling}
      onPress={async () => {
        if (!settleSheetParticipant || settling) return;
        setSettling(true);
        try {
          const cashTxId = await addTx({
            amount: settleSheetParticipant.shareAmount,
            type: TransactionType.CREDIT,
            merchant: split!.title,
            bankName: 'Cash',
            timestamp: Date.now(),
            categoryId: null,
            subcategoryId: null,
            notes: null,
            tags: [],
            isManual: true,
          });
          await setSplitParticipantStatus(settleSheetParticipant.id, 'settled', cashTxId);
          if (split!.sourceTxId != null) {
            await linkTxs(split!.sourceTxId, cashTxId, 'split_payment');
          }
          setSettleSheetParticipant(null);
          load();
        } finally {
          setSettling(false);
        }
      }}
    >
      <Text className="font-inter-medium text-body-md text-on-surface">Received as cash</Text>
    </TouchableOpacity>
  </View>
</BottomSheet>
```
Bind `addTx` near the top of the component: `const addTx = useTxStore((s) => s.add);` — confirm the exact field names in the object literal above (`categoryId`, `subcategoryId`, `notes`, `tags`, `isManual`) against `NewTxInput`'s real type from Step 1 before finalizing; adjust names/optionality if the type differs from what `QuickAddCashScreen.tsx` showed (e.g. if `categoryId`/`subcategoryId` aren't nullable but optional-undefined, use `undefined` instead of `null`).

- [ ] **Step 5: Typecheck**

Run: `cd apps/raqm && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Manual verification**

For a split created from an existing transaction (`sourceTxId` set): tap "Settled" on an unpaid participant, confirm the bottom sheet opens (not an instant toggle), pick an existing incoming transaction, confirm it settles and links (check `TransactionDetailScreen` on the original expense). Repeat via "Received as cash" instead, and confirm a new Cash credit transaction appears in the transaction list and is linked. For a split with NO `sourceTxId`, confirm tapping "Settled" still toggles instantly with no sheet, matching current behavior.

- [ ] **Step 7: Commit**

```bash
git add apps/raqm/src/screens/main/SplitDetailScreen.tsx
git commit -m "feat(raqm): add manual settle bottom sheet with transaction picker and receive-as-cash for linked splits"
```
