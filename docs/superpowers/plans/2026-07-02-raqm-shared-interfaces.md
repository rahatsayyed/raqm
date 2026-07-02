# Raqm v0 — Shared Interface Contract (Plans 2–7)

This document is the single source of truth for every type, function signature, and
setting key that crosses plan boundaries. Each plan defines some of these and consumes
others. **Plan authors and implementers: copy these signatures verbatim. Do not rename.**

Spec: `docs/superpowers/specs/2026-07-02-raqm-v0-design.md`
App root: `apps/raqm` (Expo SDK 56, RN 0.85, Android-only, New Architecture, CNG — `android/` is gitignored).

---

## 1. Current state (post-Foundation, already merged into working tree)

### Database (`src/db/database.ts`)
- Versioned migration runner (`schema_migrations` table). v1 = transactions table; v2 = 16 extra
  columns on transactions + 9 tables: `categories`, `subcategories`, `category_rules`,
  `transaction_groups`, `accounts`, `budgets`, `grocery_lists`, `grocery_items`, `app_settings`.
- Transactions columns: `id, amount, type, merchant, bankName, accountLast4, timestamp, balance,
  currency, isFromCard, category_id, subcategory_id, notes, tags, raw_sms, lat, lng, deleted_at,
  recurring, is_manual, link_type, link_partner_id, link_settled, is_split_child, split_parent_id, group_id`.
  NOTE: linking is column-based on the transactions row (NOT a `transaction_links` table — the spec §5
  sketch is superseded by this actual schema).
- Existing exports: `getDb()`, `loadTransactions(): Promise<ParsedTransaction[]>`,
  `insertTransaction(tx)`, `insertTransactions(txs)`, `clearTransactions()`,
  `getTransactionCount()`, `getSetting(key): Promise<string | null>`, `setSetting(key, value)`.
- All SQL via expo-sqlite v15 async API (`runAsync`/`getFirstAsync`/`getAllAsync`).
  Transactions via explicit `runAsync('BEGIN')`/`COMMIT`/`ROLLBACK` — **never** `withTransactionAsync`.

### Parser (`@rahatsayyed/bank-sms-parser`)
```ts
enum TransactionType { INCOME, EXPENSE, CREDIT, TRANSFER, INVESTMENT, BALANCE_UPDATE } // string enum
interface ParsedTransaction {
  amount: number; type: TransactionType; merchant: string | null; reference: string | null;
  accountLast4: string | null; balance: number | null; smsBody: string; sender: string;
  timestamp: number; bankName: string; creditLimit?: number | null; transactionHash?: string | null;
  isFromCard?: boolean; currency?: string; fromAccount?: string | null; toAccount?: string | null;
}
BankParserFactory.parse(smsBody, sender, timestamp): ParsedTransaction | null
BankParserFactory.isKnownBankSender(sender: string): boolean
```
`smsBody`, `sender`, `creditLimit` exist on the parsed object but are NOT yet persisted (Plan 2 fixes raw SMS; Plan 7 uses creditLimit).

### Native module (`src/native/SmsReader.ts`)
```ts
SmsReader.readInbox(fromTs, toTs): Promise<SmsMessage[]>   // { body, sender, timestamp }
SmsReader.getEarliestMessageDate(): Promise<number>
SmsReader.openNotificationListenerSettings(): void
SmsReader.addNewSmsListener(cb): EventSubscription          // live SMS while app running
```
Kotlin source: `apps/raqm/modules/sms-reader/android/src/main/java/expo/modules/smsreader/`.

### Stores
- `src/store/appStore.ts` — zustand + persist (AsyncStorage): `{ isOnboardingComplete, userName, setOnboardingComplete }`.
- `src/store/onboardingStore.ts` — `{ dateRange, customFrom/To, transactions: ParsedTransaction[], dbReady, initDb(), setTransactions(txs), addTransaction(tx) }` + `dateRangeToTimestamps()`. Used by onboarding scan AND (until Plan 2) by Dashboard/Transactions/Analytics.

### Navigation (`src/navigation/`)
- `types.ts`: `OnboardingStackParamList`, `MainTabParamList` (Home, Transactions, Analytics, Grocery, More), and
```ts
type MainStackParamList = {
  Tabs: undefined;
  TransactionDetail: { transactionId: number };
  AddTransaction: undefined;
  EditTransaction: { transactionId: number };
  CategoryPicker: { onSelect: (categoryId: number, subcategoryId?: number) => void };
  AccountDetail: { bankName: string; last4?: string };
  GroceryListDetail: { listId: number; listName: string };
  Settings: undefined;
  CategoryDetail: { categoryId: number; categoryName: string; period?: string };
};
type MainStackScreenProps<T> = NativeStackScreenProps<MainStackParamList, T>;
```
- `MainNavigator.tsx`: Stack wraps 5-tab TabNavigator; all 8 push screens registered, headerShown false.
- `AppNavigator.tsx`: hydrates appStore, calls `initDb()`, then Onboarding vs Main. No navigation ref yet (Plan 4 adds one).
- 9 screens exist as stubs: TransactionDetail, AddTransaction, EditTransaction, CategoryPicker, AccountDetail, GroceryListDetail, Settings, CategoryDetail, Grocery.

### Theme (`src/theme/`)
- `Colors` (dark): standard M3 tokens plus custom `bgSurface #121A17`, `bgSurfaceRaised #182420`,
  `borderSubtle #243128`, `inkHeadline #F4F1EA`, `inkBody #A9B3AC`, `inkLabel #5C665F`,
  `errorMuted #C1666B`, `mossStructure #7C9885`. `primary #75daa8`, `onPrimary #003823`.
- `Typography`: 14 legacy tokens (Manrope/WorkSans/DMMono) + 9 new: `statementLg`, `statementMobile`,
  `metricHero`, `sectionHeader`, `insightReading`, `bodyStandard`, `supportingText`, `annotation`, `labelCaps`.
- `Spacing`: xs 4, sm 8, md 16, lg 24, xl 32, xxl 40, containerMargin 24, gutter 16, sectionGap 40.
  `Radius`: sm 4, md 8, lg 12, xl 16, xxl 24, xxxl 32, full 9999.
- House card style: `backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.outlineVariant`.

### Testing conventions (no jest/vitest installed)
- Every task ends with `npx tsc --noEmit` (run from `apps/raqm/`) → expected: no errors.
- Behavioral verification is manual on a physical Android device (`npx expo run:android`); plans list exact things to check.
- **Git:** include commit steps, but implementers must NOT run `git commit` unless the session controller states the user approved commits. Otherwise leave changes in the working tree.

---

## 2. Plan 2 produces (Transaction Core) — everyone downstream consumes

### `src/db/database.ts` additions
```ts
import { TransactionType } from '@rahatsayyed/bank-sms-parser';

export interface TxRecord {
  id: number;
  amount: number;
  type: TransactionType;
  merchant: string | null;
  bankName: string;
  accountLast4: string | null;
  timestamp: number;
  balance: number | null;
  currency: string;
  isFromCard: boolean;
  categoryId: number | null;
  subcategoryId: number | null;
  notes: string | null;
  tags: string[];                 // stored as JSON text, parsed on read
  rawSms: string | null;
  lat: number | null;
  lng: number | null;
  deletedAt: number | null;
  recurring: boolean;
  isManual: boolean;
  linkType: 'manual' | 'self_transfer' | 'refund' | null;
  linkPartnerId: number | null;
  linkSettled: boolean;
  isSplitChild: boolean;
  splitParentId: number | null;
  groupId: number | null;
}

export interface NewTxInput {
  amount: number; type: TransactionType; merchant?: string | null; bankName: string;
  accountLast4?: string | null; timestamp: number; balance?: number | null;
  currency?: string; isFromCard?: boolean; categoryId?: number | null;
  subcategoryId?: number | null; notes?: string | null; tags?: string[];
  rawSms?: string | null; lat?: number | null; lng?: number | null; isManual?: boolean;
}

export interface TxPatch {   // all optional; only provided keys are updated
  amount?: number; type?: TransactionType; merchant?: string | null;
  timestamp?: number; categoryId?: number | null; subcategoryId?: number | null;
  notes?: string | null; tags?: string[]; recurring?: boolean;
  linkType?: TxRecord['linkType']; linkPartnerId?: number | null; linkSettled?: boolean;
  groupId?: number | null; isSplitChild?: boolean; splitParentId?: number | null;
  deletedAt?: number | null; lat?: number | null; lng?: number | null;
}

export interface Category { id: number; name: string; emoji: string; isCustom: boolean; }
export interface Subcategory { id: number; categoryId: number; name: string; isCustom: boolean; }

export async function loadTxRecords(): Promise<TxRecord[]>;           // deleted_at IS NULL, is_split_child parents included, timestamp DESC
export async function getTxById(id: number): Promise<TxRecord | null>;
export async function insertTx(input: NewTxInput): Promise<number>;   // returns new row id
export async function insertParsedTx(tx: ParsedTransaction): Promise<number>; // maps smsBody→raw_sms; used by scan + live listener
export async function updateTx(id: number, patch: TxPatch): Promise<void>;
export async function softDeleteTx(id: number): Promise<void>;        // sets deleted_at = Date.now()
export async function restoreTx(id: number): Promise<void>;           // sets deleted_at = NULL

export async function seedDefaults(): Promise<void>;                  // idempotent: 15 categories + subcategories + 4 grocery starter lists
export async function getCategories(): Promise<Category[]>;
export async function getSubcategories(categoryId: number): Promise<Subcategory[]>;
export async function addCategory(name: string, emoji: string): Promise<number>;
export async function addSubcategory(categoryId: number, name: string): Promise<number>;
export async function getCategoryRuleForMerchant(merchant: string): Promise<{ categoryId: number; subcategoryId: number | null } | null>; // case-insensitive exact match on merchant_pattern
export async function upsertCategoryRule(merchantPattern: string, categoryId: number, subcategoryId: number | null): Promise<void>;
```

Default categories to seed (id order fixed — C1):
`🍔 Food & Dining, 🛒 Groceries, 🚕 Transport, 🛍️ Shopping, 📱 Bills & Utilities, 🏠 Rent & Housing, 💊 Health, 🎬 Entertainment, ✈️ Travel, 📚 Education, 💰 Salary, 📈 Investments, 🎁 Gifts, 👤 Personal Care, 📦 Other`.
Default subcategories (C3), parent → children:
Food & Dining → Restaurants, Delivery, Coffee; Groceries → Supermarket, Vegetables, Meat;
Transport → Fuel, Cab, Public Transit; Bills & Utilities → Electricity, Internet, Mobile;
Entertainment → Streaming, Movies, Games.

### `src/store/txStore.ts` (new — main-app source of truth; onboardingStore remains for onboarding scan flow only)
```ts
interface TxStore {
  txs: TxRecord[];                    // live rows, deleted excluded, timestamp DESC
  ready: boolean;
  load: () => Promise<void>;          // seedDefaults() then loadTxRecords()
  refresh: () => Promise<void>;       // reload from DB (after multi-row ops)
  add: (input: NewTxInput) => Promise<number>;
  addParsed: (tx: ParsedTransaction) => Promise<void>;
  update: (id: number, patch: TxPatch) => Promise<void>;
  remove: (id: number) => Promise<void>;    // soft delete + drop from state
  restore: (id: number) => Promise<void>;
}
export const useTxStore: UseBoundStore<StoreApi<TxStore>>;
```
Plan 2 switches `AppNavigator` init and Dashboard/Transactions/Analytics reads to `useTxStore`.
The Dashboard live-SMS listener calls `useTxStore.getState().addParsed(tx)`.
Amount/date/type helpers stay local to screens (existing pattern).

### Settings keys registry (all via `getSetting`/`setSetting`)
| Key | Values | Default | Owner |
|---|---|---|---|
| `month_start_day` | '1'–'28' | '1' | Plan 5 |
| `notif_daily` / `notif_weekly` / `notif_monthly` | '1'/'0' | '1' | Plan 4 UI in Plan 5 Settings |
| `budget_alerts` | '1'/'0' | '1' | Plan 5 |

---

## 3. Plan 3 produces (Transaction Intelligence)

### `src/services/txIntelligence.ts`
```ts
export async function detectSelfTransfers(): Promise<number>;  // pairs debit+credit, same amount, ±24h, different account → linkType 'self_transfer'; returns pairs found
export async function detectRefunds(): Promise<number>;        // credit matching prior debit, same amount+merchant, ≤30d → 'refund'
export async function detectSubscriptions(): Promise<number>;  // same merchant, amount ±5%, ≥2 occurrences ~monthly → recurring=1
export function isDuplicateSms(prev: {amount:number; sender:string; timestamp:number} | null, next: {amount:number; sender:string; timestamp:number}): boolean; // same amount+sender within 60s
export async function runDetectionJobs(): Promise<void>;       // all three, called after scan/rescan and on app start
```
### Multi-select + split/merge/group/link ops (in `src/db/database.ts`, Plan 3 adds)
```ts
export async function splitTx(parentId: number, parts: { amount: number; merchant?: string | null; categoryId?: number | null }[]): Promise<void>; // children get is_split_child=1, split_parent_id; parent soft-deleted... NO — parent stays with deleted_at=NULL but excluded: parent gets deleted_at set? Contract: parent row gets `deleted_at = Date.now()` and children are fresh rows summing to parent amount, each carrying split_parent_id = parentId.
export async function mergeTxs(ids: number[], merchant: string): Promise<number>; // new row = sum, earliest timestamp, originals soft-deleted; returns new id
export async function groupTxs(ids: number[], name: string): Promise<number>;     // creates transaction_groups row, sets group_id on each; returns group id
export async function ungroupTx(id: number): Promise<void>;                        // clears group_id
export async function linkTxs(aId: number, bId: number, type: 'manual' | 'self_transfer' | 'refund'): Promise<void>; // sets link_type + link_partner_id on BOTH rows
export async function unlinkTxs(aId: number): Promise<void>;    // clears link fields on row and its partner
export async function setLinkSettled(aId: number, settled: boolean): Promise<void>; // both rows
```
**Totals rule (all plans):** Dashboard/Analytics expense+income totals EXCLUDE rows where
`linkSettled === true` OR `linkType === 'self_transfer'`. Refund credits net against expenses.
Plan 3 exports the canonical filter: `export function countsTowardTotals(tx: TxRecord): boolean` from `src/services/txIntelligence.ts`.

### Location (`src/services/location.ts`)
```ts
export async function getCurrentCoords(): Promise<{ lat: number; lng: number } | null>; // null if permission missing/off — never throws
```
Uses `expo-location` (already a dependency — verify in package.json; if absent the plan installs it).

---

## 4. Plan 4 produces (Notifications)

### `src/notifications/notifications.ts` (uses `expo-notifications`; plan installs it)
```ts
export async function initNotifications(): Promise<void>;   // Android channel 'raqm-tx', category 'tx' with text-input action 'add-note' (T18)
export async function postTxNotification(txId: number, title: string, body: string): Promise<void>; // data: { txId } (T17, T23)
export async function postBudgetAlert(title: string, body: string): Promise<void>;                  // Plan 5 consumes (B4/B5)
export async function scheduleSummaries(): Promise<void>;   // reads notif_* settings; daily 21:00, weekly Sun 20:00, monthly last-day-of-period 20:00 (T19–T22)
export function attachNotificationHandlers(navRef: NavigationContainerRef<MainStackParamList>): () => void; // tap → TransactionDetail; 'add-note' → updateTx(id,{notes})
```
Plan 4 also adds `navigationRef` (createNavigationContainerRef) exported from `src/navigation/navigationRef.ts`, wired into `NavigationContainer` in AppNavigator.
T23 (replace raw SMS notification) is Kotlin work in the sms-reader module's NotificationListenerService.

---

## 5. Plan 5 produces (Analytics & Budgets)

### `src/utils/period.ts`
```ts
export type PeriodType = 'daily' | 'weekly' | 'monthly' | 'custom';
export function getDayBounds(ref: Date): { from: number; to: number };
export function getWeekBounds(ref: Date): { from: number; to: number };        // Monday 00:00 → Sunday 23:59:59.999
export function getMonthBounds(ref: Date, startDay: number): { from: number; to: number }; // custom start day 1–28 (V2, B2)
```
### Budgets (`src/db/database.ts` additions)
```ts
export interface Budget { id: number; categoryId: number; amount: number; periodType: 'monthly' | 'weekly'; rollover: boolean; }
export async function getBudgets(): Promise<Budget[]>;
export async function upsertBudget(categoryId: number, amount: number, periodType: 'monthly' | 'weekly', rollover: boolean): Promise<void>;
export async function deleteBudget(id: number): Promise<void>;
```
### Budget engine (`src/services/budgets.ts`)
```ts
export interface BudgetStatus { budget: Budget; spent: number; limit: number; pct: number; } // limit = amount + rollover carry
export async function getBudgetStatuses(now?: Date): Promise<BudgetStatus[]>;
export async function checkBudgetAlerts(): Promise<void>; // fires postBudgetAlert at ≥80% and >100%, once per period per threshold (dedup via app_settings key `budget_alert_sent_<budgetId>_<periodFrom>_<threshold>`)
```
Plan 5 also builds SettingsScreen for real (month start day picker 1–28, notification toggles, budgets editor, theme row as **disabled placeholder** — AP1 per spec §3.2 "theme toggle placeholder"), CategoryDetailScreen, Analytics period picker + donut + trend line (react-native-svg, already installed).

---

## 6. Plan 6 produces (Grocery)

### `src/db/database.ts` additions
```ts
export interface GroceryList { id: number; name: string; budgetCap: number | null; completedAt: number | null; createdAt: number; }
export interface GroceryItem { id: number; listId: number; name: string; price: number | null; checkedAt: number | null; sortOrder: number; }
export async function getGroceryLists(): Promise<GroceryList[]>;              // newest first, active before completed
export async function addGroceryList(name: string, budgetCap: number | null): Promise<number>;
export async function updateGroceryList(id: number, patch: { name?: string; budgetCap?: number | null; completedAt?: number | null }): Promise<void>;
export async function getGroceryItems(listId: number): Promise<GroceryItem[]>; // unchecked (sort_order) then checked (checked_at DESC)
export async function addGroceryItem(listId: number, name: string, price: number | null): Promise<number>;
export async function updateGroceryItem(id: number, patch: { name?: string; price?: number | null; checkedAt?: number | null }): Promise<void>;
export async function deleteGroceryItem(id: number): Promise<void>;
export async function getLastPriceForItem(name: string): Promise<number | null>; // case-insensitive, most recent (G5)
export async function getFrequentItems(limit: number): Promise<{ name: string; count: number }[]>; // (G10, G15)
```
Default starter lists (seeded by Plan 2's `seedDefaults`): `Weekly Groceries`, `Monthly Staples`, `Household`, `Personal Care`.
G9 (link prompt): Dashboard's live-SMS toast gains a "Link to list?" action when the parsed tx's categoryId resolves to Groceries or merchant matches a grocery keyword list; links by storing tx id in app_settings key `grocery_link_<listId>` — simplest: `updateGroceryList` gets `linkedTxId`? **Contract:** add column via migration v3 `grocery_lists.linked_tx_id INTEGER` (Plan 6 owns migration v3) and `linkTxToList(listId: number, txId: number): Promise<void>`; G14 Planned-vs-Actual compares `budget_cap` to the linked tx amount.

---

## 7. Plan 7 produces (Accounts, Settings polish & Export)

### Accounts (`src/db/database.ts` additions)
```ts
export interface Account { id: number; bankName: string; last4: string | null; isCard: boolean; isManual: boolean; nickname: string | null; creditLimit: number | null; dueDate: string | null; }
export async function getAccounts(): Promise<Account[]>;
export async function addAccount(input: { bankName: string; last4?: string | null; isCard?: boolean; nickname?: string | null; creditLimit?: number | null; dueDate?: string | null }): Promise<number>; // is_manual = 1
export async function updateAccount(id: number, patch: Partial<Omit<Account, 'id' | 'isManual'>>): Promise<void>;
```
### Export (`src/services/export.ts`) — uses `expo-file-system`, `expo-sharing`, `expo-print` (plan installs missing ones)
```ts
export interface MonthlySummary { from: number; to: number; income: number; expense: number; savingsRate: number; topCategories: { name: string; emoji: string; total: number }[]; }
export async function buildMonthlySummary(ref: Date): Promise<MonthlySummary>;  // uses getMonthBounds + month_start_day (E1)
export async function exportCsv(): Promise<void>;   // all non-deleted txs → CSV file → share sheet (E2)
export async function exportPdf(ref: Date): Promise<void>; // HTML statement → expo-print → share (E3)
```
Plan 7 also: AccountDetailScreen for real (A2/A3/V6), Dashboard account chip → AccountDetail navigation, manual account add (A4), MoreScreen wiring (Re-scan S4/S5, Export row, About), L2 map stub in TransactionDetail (static "Open in Maps" via `Linking.openURL('geo:lat,lng')` — no react-native-maps).

---

## 8. Plan execution order & dependency rule

2 → 3 → 4 → 5 → 6 → 7. A plan may consume anything from lower-numbered plans; it must not
reference anything from higher-numbered plans. Grocery starter-list seeding lives in Plan 2's
`seedDefaults` (data only); Grocery UI is Plan 6.
