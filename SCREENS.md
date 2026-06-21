# LifeOS — Screen List

Navigation pattern: **Bottom tab bar** (4 tabs) + stack navigators per tab + modals for actions.

---

## Onboarding Flow
> Shown once on first launch. Cannot be accessed again except via Settings > Reset.

| # | Screen | Description |
|---|---|---|
| O-1 | **Welcome** | App intro, value proposition, "Get Started" CTA |
| O-2 | **Permissions** | Request `READ_SMS`, `RECEIVE_SMS`, `POST_NOTIFICATIONS` with plain-language explanations. Optional: `ACCESS_FINE_LOCATION` |
| O-3 | **Initial Scan — Date Range** | Choose how far back to scan *before* scan starts: Last 3 months / Last 1 year / Custom date range / All time |
| O-4 | **Scanning Progress** | Progress bar while bulk SMS scan runs. Shows count of transactions found in real time. |
| O-5 | **Account Selection** | After scan: list of all detected bank accounts (bank name + last4 + transaction count). User selects which accounts to include. At least one required. |
| O-6 | **Scan Complete** | Summary — X transactions imported from Y selected accounts. "Go to Dashboard" CTA |
| O-7 | **Sign Up / Log In** | Email + password via Supabase Auth. Skip option (local-only mode) |

---

## Tab 1 — Home (Dashboard)

| # | Screen | Description |
|---|---|---|
| H-1 | **Dashboard** | Income vs Expense summary card for current month. Donut chart (category split). Recent transactions list (last 5). Quick-add FAB. Shortcuts to Spending, Budgets, Subscriptions. |

---

## Tab 2 — Transactions

| # | Screen | Description |
|---|---|---|
| T-1 | **Transaction List** | Chronological list with date headers. Filter bar: All / Income / Expense / Transfer. Time range selector (Daily / Weekly / Monthly / Custom). Pull-to-refresh triggers rescan. |
| T-2 | **Transaction Detail** | Full detail: amount, type, merchant, category, account, date. Tabs: Info / Other Info (raw SMS, UPI ref no, location map). Actions: Edit, Split, Link, Group, Delete. Notes + Tags section. |
| T-3 | **Add Transaction** (modal) | Manual entry form: amount, type, merchant, category, date, account, notes, tags. |
| T-4 | **Edit Transaction** (modal) | Same form as Add, pre-filled. |
| T-5 | **Split Transaction** (modal) | Split amount across 2+ categories. Each row: category picker + amount. Must sum to original total. |
| T-6 | **Link Transaction** (modal) | Two entry points: (1) Auto-suggestion — shown when self-transfer or refund detected, confirm or dismiss. (2) Manual — user picks any transaction to link to; set link type (Refund / Friend payback / Other). Settled toggle available on manual links. |
| T-7 | **Group Transactions** (modal) | Select multiple transactions to group. Enter group label. |
| T-8 | **Search & Filter** | Full-text search across merchant, notes, tags. Filters: date range, category, account, amount range, type. |

---

## Tab 3 — Analytics

| # | Screen | Description |
|---|---|---|
| A-1 | **Spending Overview** | Time range selector (Daily / Weekly / Monthly / Custom). Bar chart of spend over period. Income vs Expense summary. Top categories ranked by spend. |
| A-2 | **Category Drill-down** | Tap a category from A-1. Shows all transactions in that category for the period. Trend chart (this month vs last month). |
| A-3 | **Merchant Drill-down** | All transactions for a specific merchant. Total spend, frequency, avg transaction. |
| A-4 | **Account Drill-down** | All transactions for a specific account. Balance history if available. |
| A-5 | **Income Breakdown** | Salary vs other Income split. Month-over-month income trend. |
| A-6 | **Today vs Yesterday** | Side-by-side spend comparison. Opened by tapping the daily summary notification or from Dashboard. Total, per-category breakdown, and transaction list for each day. |
| A-7 | **This Week vs Last Week** | Same comparison layout at weekly granularity. Day-by-day bar chart for both weeks overlaid. |
| A-8 | **This Month vs Last Month** | Same comparison layout at monthly granularity. Week-by-week bar chart for both months overlaid. |

---

## Tab 4 — More

| # | Screen | Description |
|---|---|---|
| M-1 | **More Menu** | Entry point to: Accounts, Budgets, Subscriptions, Categories, Reports, Settings, Coming Soon section. |

---

## Accounts

| # | Screen | Description |
|---|---|---|
| AC-1 | **Account List** | All auto-discovered and manual accounts. Each card: bank name, account last4, last known balance. |
| AC-2 | **Account Detail** | Transactions for this account. Credit card accounts show: credit limit, outstanding, available limit, due date. |
| AC-3 | **Add Account** (modal) | Manually add a cash wallet or account. Fields: name, type (savings / current / credit card / cash), balance. |

---

## Budgets

| # | Screen | Description |
|---|---|---|
| B-1 | **Budget Overview** | All category budgets for current period. Each row: category, progress bar (spent / budget), amount. Toggle: Monthly / Weekly. |
| B-2 | **Set Budget** (modal) | Pick category, enter amount, choose period (monthly / weekly), toggle rollover. |
| B-3 | **Budget Detail** | Transactions that contributed to this budget. Trend: last 3 periods vs budget. |

---

## Subscriptions

| # | Screen | Description |
|---|---|---|
| S-1 | **Subscription List** | Auto-detected + manually marked subscriptions. Each card: merchant, amount, frequency, next expected date. Total monthly cost summary at top. |
| S-2 | **Subscription Detail** | All past transactions for this subscription. Option to unmark as subscription. |

---

## Categories

| # | Screen | Description |
|---|---|---|
| C-1 | **Category List** | Default + custom categories. Each row: icon, name, transaction count. |
| C-2 | **Category Detail** | Transactions in this category. Option to edit name/icon or delete (reassign transactions). |
| C-3 | **Add / Edit Category** (modal) | Name field + icon picker (emoji or preset icons). |
| C-4 | **Category Rules** | List of saved merchant → category rules. Tap to edit or delete a rule. |

---

## Reports

| # | Screen | Description |
|---|---|---|
| R-1 | **Monthly Report** | Select month. Summary: total income, total expense, savings rate, top 5 categories, top 5 merchants. |
| R-2 | **Export** | Choose format (CSV / PDF), date range, then share via system share sheet. |

---

## Settings

| # | Screen | Description |
|---|---|---|
| SE-1 | **Settings Home** | Account, Sync, Notifications, Permissions, Privacy, About. |
| SE-2 | **Account** | Logged-in email, sign out, delete account. |
| SE-3 | **Sync** | Last synced time, "Sync Now" button, auto-sync interval picker. |
| SE-4 | **Notifications** | Toggle: new transaction alerts, budget alerts, end-of-day summary, end-of-week summary, end-of-month summary. |
| SE-5 | **Permissions** | Current permission status. Deep link to Android settings to change. |
| SE-6 | **About** | App version, open-source licences, GitHub link. |

---

## Coming Soon Section (Phase 2 — locked in V1)

Shown as a section in the More tab. Each item is a non-clickable card with a "Coming Soon" badge.

| # | Screen | Description |
|---|---|---|
| CS-1 | **PDF Statement Scan** | Upload bank PDF → AI parses transactions |
| CS-2 | **AI Insights** | Natural language monthly spending summary |
| CS-3 | **AI Recommendations** | Personalised tips based on patterns |
| CS-4 | **Should I Buy?** | AI purchase decision assistant |
| CS-5 | **Split Expenses** | Split bills with friends |
| CS-6 | **Financial Goals** | Savings targets with progress tracking |

---

## Modals & Overlays (not full screens)

| # | Component | Triggered from |
|---|---|---|
| MOD-1 | **Category Picker** | Any transaction form |
| MOD-2 | **Account Picker** | Any transaction form |
| MOD-3 | **Date Range Picker** | Spending views, Export, Scan |
| MOD-4 | **Tag Input** | Transaction detail / Add transaction |
| MOD-5 | **Linked Transaction Suggestion** | Auto-shown after self-transfer or refund detected |
| MOD-6 | **Duplicate Alert** | Auto-shown when duplicate detected |
| MOD-7 | **Notification Tray Action** | Tap on push notification — inline category/tag/note update |

---

## Screen Count Summary

| Area | Screens |
|---|---|
| Onboarding | 7 |
| Dashboard | 1 |
| Transactions | 8 |
| Analytics | 8 |
| Accounts | 3 |
| Budgets | 3 |
| Subscriptions | 2 |
| Categories | 4 |
| Reports | 2 |
| Settings | 6 |
| Coming Soon | 6 (UI shells only) |
| Modals | 7 |
| **Total** | **57** |
