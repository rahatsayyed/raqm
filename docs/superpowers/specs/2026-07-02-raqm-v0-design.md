# Raqm v0 — Full Design Spec

**Date:** 2026-07-02  
**Branch:** build/v0-mvp  
**Scope:** Complete v0 internal build — design system migration + all core feature areas

---

## 1. Goals

1. Migrate the visual layer to the "Precision and Silence" dark design system.
2. Add every feature area listed in FEATURE.md up to and including v0.9 (everything except Phase 2 AI/PDF features).
3. 25 screens total: 16 existing (rethemed) + 9 new (functional, no polish required).

---

## 2. Design System Migration

### 2.1 Theme Approach

**Option chosen:** Value swap + extend (C).  
Keep all existing token names so no screen `StyleSheet` references break. Replace values with dark spec equivalents. Append 8 new custom tokens and 9 new typography tokens. Keep existing fonts loaded; add Fraunces + Inter alongside.

### 2.2 Color Tokens

All existing `Colors.*` values replaced with dark-mode equivalents from the design spec:

| Token | Old (light) | New (dark) |
|---|---|---|
| `background` | `#f8faf9` | `#0e1512` |
| `surface` | `#f8faf9` | `#0e1512` |
| `surfaceContainerLowest` | `#ffffff` | `#09100d` |
| `surfaceContainerLow` | `#f2f4f3` | `#161d1a` |
| `surfaceContainer` | `#eceeed` | `#1a211e` |
| `surfaceContainerHigh` | `#e6e9e8` | `#242c28` |
| `surfaceContainerHighest` | `#e1e3e2` | `#2f3633` |
| `surfaceVariant` | `#e1e3e2` | `#2f3633` |
| `onSurface` | `#191c1c` | `#dde4df` |
| `onSurfaceVariant` | `#3e4942` | `#bdcac0` |
| `primary` | `#006c48` | `#75daa8` |
| `onPrimary` | `#ffffff` | `#003823` |
| `primaryContainer` | `#52b788` | `#52b788` |
| `onPrimaryContainer` | `#00442c` | `#00442c` |
| `inversePrimary` | `#75daa8` | `#006c48` |
| `secondary` | `#116c4a` | `#f2bc8f` |
| `onSecondary` | `#ffffff` | `#492908` |
| `secondaryContainer` | `#a1f4c8` | `#633e1c` |
| `onSecondaryContainer` | `#1b724f` | `#dfab80` |
| `outline` | `#6e7a72` | `#88948b` |
| `outlineVariant` | `#bdcac0` | `#3e4942` |
| `error` | `#ba1a1a` | `#ffb4ab` |
| `onError` | `#ffffff` | `#690005` |
| `errorContainer` | `#ffdad6` | `#93000a` |
| `onErrorContainer` | `#93000a` | `#ffdad6` |

New custom tokens appended:

```ts
bgSurface: '#121A17',          // primary card/sheet
bgSurfaceRaised: '#182420',    // nested cards, modals
borderSubtle: '#243128',       // card outlines (replaces shadows)
inkHeadline: '#F4F1EA',        // hero headings
inkBody: '#A9B3AC',            // body copy
inkLabel: '#5C665F',           // timestamps, receding labels
errorMuted: '#C1666B',         // debit amounts (softer than full error)
mossStructure: '#7C9885',      // selected states, chart fills
```

### 2.3 Typography Tokens

Existing 14 tokens kept (Manrope/WorkSans/DMMono still loaded, old screens unchanged). 9 new tokens appended using Fraunces + Inter:

| Token | Font | Size/Weight | Use |
|---|---|---|---|
| `statementLg` | Fraunces_500Medium | 32/40, -0.02em | Screen-level statements |
| `statementMobile` | Fraunces_500Medium | 28/34 | Mobile statement variant |
| `metricHero` | Fraunces_500Medium | 48/56 | Hero net cash flow number |
| `sectionHeader` | Inter_600SemiBold | 13/16, +0.08em | Section labels in caps |
| `insightReading` | Inter_500Medium | 17/24 | AI insight cards (v2) |
| `bodyStandard` | Inter_400Regular | 15/22 | Body copy on new screens |
| `supportingText` | Inter_400Regular | 13/18 | Supporting/secondary text |
| `annotation` | Inter_400Regular | 12/16 | Footnotes, timestamps |
| `labelCaps` | Inter_600SemiBold | 11/14, +0.05em | Tag labels, badges |

### 2.4 Fonts to Install

```
@expo-google-fonts/fraunces   (Fraunces_500Medium)
@expo-google-fonts/inter      (Inter_400Regular, Inter_500Medium, Inter_600SemiBold)
```

Added to `useFonts()` in `App.tsx` alongside existing fonts.

### 2.5 Hardcoded Colors to Patch

A grep for `#fff`, `rgba(255`, `white` in screen files will surface these known instances:

- `PermissionScreen.tsx` — trust-item chip `backgroundColor: 'rgba(255,255,255,0.85)'` → `Colors.bgSurfaceRaised`
- `WelcomeScreen.tsx` — `backgroundColor: 'rgba(255,255,255,0.85)'` on floating badges → `Colors.bgSurfaceRaised`
- `DashboardScreen.tsx` — hero card inner text `color: '#fff'` and `color: '#ffd5d5'` → `Colors.onPrimary` (the primary is now light so this reads correctly)
- `StatusBar` style → `light` (white icons on dark canvas)
- `NavigationBar` background → `Colors.background` (`#0e1512`)

---

## 3. Screen Inventory

### 3.1 Existing Screens (16) — retheme only

| Screen | Location | Change needed |
|---|---|---|
| WelcomeScreen | onboarding | Patch hardcoded badge whites |
| PermissionSMSReadScreen | onboarding | Patch via PermissionScreen |
| PermissionNotificationsScreen | onboarding | Patch via PermissionScreen |
| PermissionNotificationAccessScreen | onboarding | Patch via PermissionScreen |
| PermissionLocationScreen | onboarding | Patch via PermissionScreen |
| PermissionScreen (shared) | onboarding | Patch trust-item chip bg |
| DateRangeScreen | onboarding | Token values auto-update |
| ScanningProgressScreen | onboarding | Token values auto-update |
| AccountSelectionScreen | onboarding | Token values auto-update |
| ScanCompleteScreen | onboarding | Token values auto-update |
| NameEntryScreen | onboarding | Token values auto-update |
| SignUpScreen | onboarding | Token values auto-update |
| OTPVerificationScreen | onboarding | Token values auto-update |
| DashboardScreen | main | Hero text colors (see 2.5) |
| TransactionsScreen | main | Token values auto-update; add tap → detail |
| AnalyticsScreen | main | Token values auto-update |
| MoreScreen | main | Wire up stub rows |

### 3.2 New Screens (9) — functional, no polish

| Screen | Tab/Location | Purpose |
|---|---|---|
| `TransactionDetailScreen` | push from any tx row | Full detail: amount, type, merchant, bank, account, date, category, notes, raw SMS. Edit + delete actions. |
| `AddTransactionScreen` | FAB on Transactions tab | Manual cash entry form: amount, type, merchant, category, date, account, notes, tags |
| `EditTransactionScreen` | push from detail | Same form pre-filled; includes soft delete |
| `CategoryPickerScreen` | modal from Add/Edit | Scrollable list of default + custom categories and sub-categories |
| `AccountDetailScreen` | tap account chip on Dashboard | All transactions for account, last known balance at top |
| `GroceryScreen` | 5th tab or nested in More | List of all grocery lists with item count and estimated total |
| `GroceryListDetailScreen` | tap list → push | Items list, inline quick-add, check-off, running total, budget cap |
| `SettingsScreen` | push from More → Settings row | Month start day picker (1–28), notification toggles (daily/weekly/monthly summaries), theme toggle placeholder |
| `CategoryDetailScreen` | tap category in Analytics | All transactions in category for period, total, sub-category breakdown |

---

## 4. Feature Implementation by Area

### 4.1 SMS Scanning

| # | Feature | Screen(s) | Notes |
|---|---|---|---|
| S1 | Background monitoring (BroadcastReceiver) | — | Already done |
| S2 | Initial bulk scan with date range | DateRangeScreen, ScanningProgress | Already done |
| S3 | Earliest SMS detection | DateRangeScreen | Already done |
| S4 | Manual rescan button | MoreScreen → Re-scan row | Calls `SmsReader.readInbox`, re-runs parse + `setTransactions` |
| S5 | Known sender filtering (`isKnownBankSender`) | ScanningProgressScreen | Filter before parsing in scan loop |
| S6 | Raw SMS body stored on transaction | DB schema + TransactionDetailScreen | Add `rawSms TEXT` column to transactions table; populate in scan + live listener |

### 4.2 Transaction Management

| # | Feature | Screen(s) | Notes |
|---|---|---|---|
| T1 | Auto-extract amount/type/merchant/account/balance/bank | ScanningProgress, live listener | Already done |
| T2 | Income detection | Dashboard, Transactions | Already done |
| T3 | Add cash transaction manually | AddTransactionScreen | New form; inserts to DB via `insertTransaction` |
| T4 | Edit transaction (category, merchant, amount, date) | EditTransactionScreen | `UPDATE transactions SET … WHERE id = ?` |
| T5 | Notes field per transaction | TransactionDetailScreen, Add/Edit | Add `notes TEXT` column |
| T6 | Tags per transaction | TransactionDetailScreen, Add/Edit | Add `tags TEXT` column (JSON array) |
| T7 | Split transaction | TransactionDetailScreen → Split modal | Creates N child rows linked to parent; parent marked as split |
| T8 | Merge transactions | Transactions multi-select → Merge | Creates single merged row; originals soft-deleted |
| T9 | Group transactions | Transactions multi-select → Group | Creates group record; originals linked; summed amount shown |
| T10 | Soft delete with undo snackbar | TransactionDetailScreen | `deleted_at` column; filter in queries; undo within 5s |
| T11 | Self-transfer auto-detection | Background job on scan complete | Match debit+credit ±24h same amount different accounts |
| T12 | Refund auto-detection | Background job on scan complete | Match credit to prior debit same amount/merchant ≤30 days |
| T13 | Duplicate detection | Live SMS listener + scan | Same amount + sender ≤60s → suppress second, notify |
| T14 | Manual link two transactions | TransactionDetailScreen → Link action | Creates `transaction_links` table |
| T15 | Mark linked pair as Settled | TransactionDetailScreen | `settled = 1` on link; both excluded from totals |
| T16 | Unlink | TransactionDetailScreen | Delete row from `transaction_links` |
| T17 | Tap notification → transaction detail | Android intent | Pass transaction id in notification extras; deep-link to detail |
| T18 | Inline note from notification | Android RemoteInput | Notification action button; saves note to DB without opening app |
| T19 | End-of-day summary notification | Scheduled via AlarmManager | Daily at 21:00; shows day total vs previous day |
| T20 | End-of-week summary notification | Scheduled via AlarmManager | Sunday 20:00; week total vs last week |
| T21 | End-of-month summary notification | Scheduled via AlarmManager | Last day of month start period at 20:00 |
| T22 | Summary notifications opt-in toggle | SettingsScreen | Stored in AsyncStorage/DB settings table |
| T23 | Notification replacement (styled over raw SMS) | Android NotificationListenerService | Cancel raw SMS notification; post styled one |

### 4.3 Categories

| # | Feature | Screen(s) | Notes |
|---|---|---|---|
| C1 | 15 default categories seeded | App first launch | Insert to `categories` table if empty |
| C2 | Salary vs Income auto-detection | Scan + live listener | Keyword "SAL"/"salary" or recurring large credit → Salary |
| C3 | Default sub-categories seeded | App first launch | Insert to `subcategories` table if empty |
| C4 | Assign category + sub-category | CategoryPickerScreen | `UPDATE transactions SET category_id, subcategory_id` |
| C5 | Custom sub-categories | CategoryPickerScreen → Add sub | Insert to `subcategories` with `custom = 1` |
| C6 | Custom categories | CategoryPickerScreen → Add | Insert to `categories` with emoji + name |
| C7 | Category rules (merchant → category) | Auto-applied on edit save | Insert to `category_rules`; applied before parse on next scan |

### 4.4 Subscriptions & Recurring

| # | Feature | Screen(s) | Notes |
|---|---|---|---|
| R1 | Auto-detection of subscriptions | Background job on scan | Same merchant + amount ±5% recurring → flag |
| R2 | Subscription list view | AnalyticsScreen or nested in More | Shows merchant, amount, next expected date |
| R3 | Mark transaction as recurring manually | TransactionDetailScreen | `recurring = 1` on transaction |

### 4.5 Accounts & Cards

| # | Feature | Screen(s) | Notes |
|---|---|---|---|
| A1 | Account auto-discovery | AccountSelectionScreen | Already done |
| A2 | Account list with last known balance | AccountDetailScreen | Query last transaction with balance field per account |
| A3 | Credit card view (limit, outstanding, due date) | AccountDetailScreen | Parse from SMS where available; manual entry fallback |
| A4 | Manual account add | MoreScreen → Accounts → Add | Insert to `accounts` table with `manual = 1` |

### 4.6 Spending Views

| # | Feature | Screen(s) | Notes |
|---|---|---|---|
| V1 | Daily / Weekly / Monthly / Custom date range | AnalyticsScreen period picker | Date range state in store |
| V2 | Custom month start day | SettingsScreen; applied everywhere | Store setting in `app_settings`; `getMonthBounds(date, startDay)` utility |
| V3 | Total spend (income vs expense) | DashboardScreen | Already done |
| V4 | Per category breakdown | AnalyticsScreen + CategoryDetailScreen | Group by category_id |
| V5 | Per merchant breakdown | AnalyticsScreen | Already done (top merchants) |
| V6 | Per account breakdown | AccountDetailScreen | Filter transactions by account |
| V7 | Bar chart (daily/weekly spend) | AnalyticsScreen | Already done (monthly); extend for daily/weekly |
| V8 | Donut chart (category split) | AnalyticsScreen | New chart component using `react-native-svg` arcs |
| V9 | Trend line (MoM comparison) | AnalyticsScreen | Line chart using SVG polyline |
| V10 | Income vs Expense summary card | DashboardScreen | Already done |

### 4.7 Budgets

| # | Feature | Screen(s) | Notes |
|---|---|---|---|
| B1 | Set monthly/weekly budget per category | SettingsScreen → Budgets section | Insert to `budgets` table |
| B2 | Budgets follow custom month start day | All budget calculations | Uses `getMonthBounds` utility |
| B3 | Budget vs actual progress bar | AnalyticsScreen category rows, CategoryDetailScreen | Query spend vs budget |
| B4 | Alert at 80% spend | AlarmManager or transaction insert hook | Push notification when sum crosses 80% |
| B5 | Alert when budget exceeded | Same as B4 | Push notification |
| B6 | Rollover (weekly budgets only) | Budget calculation | Carry unused weekly amount to next week |

### 4.8 Location Tagging

| # | Feature | Screen(s) | Notes |
|---|---|---|---|
| L1 | Attach GPS on transaction parse | Live SMS listener | `getCurrentPosition` if permission granted; store lat/lng on transaction row |
| L2 | Show location on map in detail | TransactionDetailScreen | `react-native-maps` or WebView map stub |
| L3 | Degrade gracefully if no permission | Everywhere | lat/lng nullable; no map shown |

### 4.9 Grocery List

| # | Feature | Screen(s) | Notes |
|---|---|---|---|
| G1 | Multiple named lists | GroceryScreen | `grocery_lists` table |
| G2 | Default starter lists seeded | App first launch | 4 default lists inserted on first launch |
| G3 | Items with name + estimated price | GroceryListDetailScreen | `grocery_items` table |
| G4 | Inline quick-add (no modal) | GroceryListDetailScreen | TextInput pinned at bottom |
| G5 | Ghost price from last use | GroceryListDetailScreen add flow | Query last price for item name across all lists |
| G6 | Running total updates live | GroceryListDetailScreen | Sum unchecked item prices |
| G7 | Check off items while shopping | GroceryListDetailScreen | `checked_at` column; checked items move to bottom |
| G8 | Budget cap per list | GroceryListDetailScreen | `budget_cap` on `grocery_lists`; warning banner |
| G9 | Post-purchase linking (suggest link to active list) | DashboardScreen new-tx toast | When grocery tx parsed, show "Link to list?" prompt |
| G10 | Frequently bought suggestions | GroceryListDetailScreen add flow | Top 10 items by frequency across all lists |
| G11 | Share list as plain text | GroceryListDetailScreen share button | System share sheet |
| G12 | List history (completed lists) | GroceryScreen past lists section | `completed_at` on lists |
| G13 | Grocery analytics — monthly spend trend | GroceryScreen analytics section | Last 6 months bar chart (SVG) |
| G14 | Grocery analytics — Planned vs Actual per list | GroceryListDetailScreen history | Budget cap vs linked tx amount |
| G15 | Grocery analytics — top items by frequency | GroceryScreen analytics section | Count across all lists |
| G16 | Grocery analytics — avg monthly spend | GroceryScreen analytics section | Mean of last 6 months |

### 4.10 Reporting & Export

| # | Feature | Screen(s) | Notes |
|---|---|---|---|
| E1 | Monthly summary (income, expense, savings rate, top categories) | MoreScreen → Export | Respects custom month start day |
| E2 | Export to CSV | MoreScreen → Export | `FileSystem` write + share sheet |
| E3 | Export to PDF (styled statement) | MoreScreen → Export | HTML template → WebView print API |

### 4.11 Appearance

| # | Feature | Screen(s) | Notes |
|---|---|---|---|
| AP1 | Light / Dark theme toggle | SettingsScreen | Toggle `colorScheme` in `appStore`; reloads theme tokens |

---

## 5. Database Schema Additions

Current schema has one table: `transactions`. New tables needed:

```sql
-- new columns on transactions
ALTER TABLE transactions ADD COLUMN category_id INTEGER;
ALTER TABLE transactions ADD COLUMN subcategory_id INTEGER;
ALTER TABLE transactions ADD COLUMN notes TEXT;
ALTER TABLE transactions ADD COLUMN tags TEXT;          -- JSON array
ALTER TABLE transactions ADD COLUMN raw_sms TEXT;
ALTER TABLE transactions ADD COLUMN lat REAL;
ALTER TABLE transactions ADD COLUMN lng REAL;
ALTER TABLE transactions ADD COLUMN deleted_at INTEGER; -- soft delete
ALTER TABLE transactions ADD COLUMN recurring INTEGER DEFAULT 0;
ALTER TABLE transactions ADD COLUMN is_manual INTEGER DEFAULT 0;

-- new tables
CREATE TABLE categories (id, name, emoji, is_custom, created_at);
CREATE TABLE subcategories (id, category_id, name, is_custom, created_at);
CREATE TABLE category_rules (id, merchant_pattern, category_id, subcategory_id);
CREATE TABLE transaction_links (id, tx_a_id, tx_b_id, link_type, settled, created_at);
CREATE TABLE accounts (id, bank_name, last4, is_card, is_manual, nickname, credit_limit, due_date);
CREATE TABLE budgets (id, category_id, amount, period_type, rollover, created_at);
CREATE TABLE grocery_lists (id, name, budget_cap, completed_at, created_at);
CREATE TABLE grocery_items (id, list_id, name, price, checked_at, sort_order);
CREATE TABLE app_settings (key TEXT PRIMARY KEY, value TEXT);
```

Migration strategy: `getDb()` runs `ALTER TABLE` and `CREATE TABLE IF NOT EXISTS` statements on every launch; SQLite ignores already-existing columns/tables safely (will need `IF NOT EXISTS` guards on `ALTER`; SQLite doesn't support this natively so wrap each `ALTER` in a try/catch).

---

## 6. Navigation Changes

- `MainNavigator` adds a 5th tab: **Grocery** (between Analytics and More)
- `types.ts` adds `MainTabParamList.Grocery`
- Stack navigators added:
  - `TransactionDetailScreen` (push from Dashboard, Transactions)
  - `AddTransactionScreen`, `EditTransactionScreen`, `CategoryPickerScreen` (modal stack)
  - `AccountDetailScreen` (push from Dashboard accounts row)
  - `GroceryListDetailScreen` (push from GroceryScreen)
  - `SettingsScreen` (push from More)
  - `CategoryDetailScreen` (push from Analytics)

---

## 7. Verification Checklist

Use this list to manually verify each feature after implementation. Tick `[x]` when confirmed working on a physical Android device.

### Design System
- [ ] App background is dark (`#0e1512`) on all screens
- [ ] Tab bar background is dark (`#09100d`)
- [ ] Status bar shows white icons
- [ ] Navigation bar background matches app canvas
- [ ] Primary accent is `#75daa8` (light green) not the old dark green
- [ ] Cards use `borderSubtle` outline instead of drop shadows
- [ ] Fraunces font renders on hero metric in DashboardScreen
- [ ] Inter font renders on new screens

### Onboarding
- [ ] Welcome screen floating badges show dark surface (no white chips)
- [ ] Permission screens trust chips use dark surface
- [ ] All onboarding screens visible on dark background
- [ ] Date range picker works and persists selection
- [ ] Scanning progress ring animates during scan
- [ ] Account selection shows detected accounts
- [ ] Name entry persists across app restarts (onboarding not re-shown)

### SMS Scanning
- [ ] S4: Re-scan button in More triggers full re-scan
- [ ] S5: Only bank SMS are processed (random SMS filtered out)
- [ ] S6: Raw SMS body visible in TransactionDetailScreen under "Other Info"

### Transaction Management
- [ ] T1: Transactions appear after scan with correct amount/type/merchant
- [ ] T2: Income transactions shown separately from expenses in Dashboard
- [ ] T3: Add cash transaction form submits and appears in Transactions list
- [ ] T4: Edit transaction saves changes to amount, category, merchant, date
- [ ] T5: Notes can be added to a transaction and persist
- [ ] T6: Tags can be added and displayed on detail screen
- [ ] T7: Split transaction creates N rows summing to original amount
- [ ] T8: Merge combines selected transactions into one row
- [ ] T9: Group shows summed amount with expandable chevron
- [ ] T10: Delete shows undo snackbar; transaction gone after 5s
- [ ] T11: Self-transfers auto-detected and excluded from expense totals
- [ ] T12: Refunds auto-detected and netted against original expense
- [ ] T13: Duplicate SMS within 60s suppressed (only one transaction created)
- [ ] T14: Two transactions can be manually linked; both show "Linked with →"
- [ ] T15: Marking linked pair as Settled excludes both from expense totals
- [ ] T16: Unlink removes the relationship
- [ ] T17: Tapping transaction notification opens TransactionDetailScreen
- [ ] T18: "Add Note" notification action saves note without opening app
- [ ] T19: End-of-day summary notification fires at 21:00
- [ ] T20: End-of-week summary fires Sunday 20:00
- [ ] T21: End-of-month summary fires on correct day (respects month start)
- [ ] T22: Notification toggles in Settings disable/enable summaries
- [ ] T23: Bank SMS notification replaced by styled Raqm notification

### Categories
- [ ] C1: 15 default categories visible in CategoryPickerScreen
- [ ] C2: SMS with "salary" keyword auto-categorized as Salary
- [ ] C3: Default sub-categories visible under parent categories
- [ ] C4: Assigning category to transaction persists and shows on detail
- [ ] C5: Custom sub-category can be created and assigned
- [ ] C6: Custom category with emoji can be created
- [ ] C7: Category rule applied on next edit of same merchant

### Subscriptions
- [ ] R1: Recurring merchant detected and shown in subscription list
- [ ] R2: Subscription list shows next expected date
- [ ] R3: Manual "mark as recurring" toggle works on any transaction

### Accounts
- [ ] A1: Accounts detected from SMS visible after scan
- [ ] A2: AccountDetailScreen shows transactions for account + last balance
- [ ] A3: Credit card accounts show limit/outstanding if parseable from SMS
- [ ] A4: Manual account can be added and appears in account list

### Spending Views
- [ ] V1: Period picker (Daily/Weekly/Monthly/Custom) filters Analytics correctly
- [ ] V2: Changing month start day in Settings shifts monthly period correctly
- [ ] V3: Dashboard hero shows correct net cash flow
- [ ] V4: Category breakdown shows spend per category for period
- [ ] V5: Top merchants list correct
- [ ] V6: AccountDetailScreen shows filtered transactions for that account
- [ ] V7: Bar chart renders monthly and daily/weekly variants
- [ ] V8: Donut chart shows category split proportionally
- [ ] V9: Trend line shows correct month-over-month change
- [ ] V10: Income vs Expense summary card totals correct

### Budgets
- [ ] B1: Budget can be set per category in Settings
- [ ] B2: Monthly budget period follows custom month start day
- [ ] B3: Progress bar shows budget utilization in Analytics category row
- [ ] B4: Push notification fires when 80% of budget spent
- [ ] B5: Push notification fires when budget exceeded
- [ ] B6: Unused weekly budget carries to next week when rollover enabled

### Location
- [ ] L1: GPS coordinates attached to transaction when permission granted
- [ ] L2: Map shown in TransactionDetailScreen "Other Info" section
- [ ] L3: No crash or UI issue if location permission denied

### Grocery
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

### Reporting & Export
- [ ] E1: Monthly summary shows correct income/expense/savings rate/top categories
- [ ] E2: CSV export contains all transactions and downloads via share sheet
- [ ] E3: PDF export generates styled monthly statement

### Appearance
- [ ] AP1: Dark/light toggle in Settings switches theme without restart

---

## 8. Out of Scope (Phase 2)

- PDF statement scan
- AI insights / recommendations
- "Should I Buy?" 
- Split expenses (Splitwise-style)
- Financial goals
- Color theme presets / app icon theming
- Supabase sync
- iOS support
