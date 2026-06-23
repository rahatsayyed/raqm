# LifeOS — Feature Specification

## Scope

- **V1**: Full personal finance tracking, SMS-first, Android only
- **V2**: PDF statements, Categorization fallback, AI insights (marked "Coming Soon" in V1 UI)
- **iOS**: no IOS support

---

## Core Data Pipeline

```
Android SMS received
  → BankParserFactory.parse()         ← @rahatsayyed/bank-sms-parser
  → Categorization engine             ← rules dict + Claude Haiku fallback(v2)
  → Duplicate detection
  → Self-transfer / refund linking
  → Store in WatermelonDB (local SQLite)
  → Sync to Supabase (on demand or auto)
```

---

## Feature Areas

### 1. SMS Scanning

- **Background monitoring** — catch new SMS even when app is closed (Android foreground service)
- **Initial bulk scan** — on first launch, user picks a date range first (last 3 months / last 1 year / custom / all time), then scan runs; after scan completes, detected bank accounts are shown and user selects which ones to include
- **Manual rescan** — pull-to-refresh or explicit button to re-run scan
- **Known sender filtering** — only process SMS from recognised bank senders (`isKnownBankSender()`)
- **SMS linked to transaction** — raw SMS body, UPI ref no, and location stored under "Other Info" on transaction detail

---

### 2. Transaction Management

#### Parsing & Display
- Auto-extract: amount, type (debit/credit/transfer), merchant, account last4, balance, bank name
- Income detection — transactions typed as `INCOME` shown separately from expenses

#### Manual Entry
- Add cash transactions manually (not captured by SMS)
- Fields: amount, type, merchant/description, category, date, account, notes, tags

#### Transaction Actions
- **Edit** — correct category, merchant name, amount, date
- **Notes & Tags** — free-text note + multiple tags per transaction
- **Split** — divide one transaction across multiple categories (e.g. ₹500 = ₹300 Food + ₹200 Household)
- **Merge** — collapse multiple transactions into one (shows single entry, no expand)
- **Group** — bundle transactions into a folder; shows summed amount with a chevron to expand individual items
- **Delete** — soft delete with undo

#### Linking

**Auto-linking**
- **Self-transfer detection** — debit + credit within ±24 hours, same amount, different accounts → suggest linking; both legs excluded from expense totals and shown as Transfer
- **Refund detection** — credit that matches a prior debit (same amount, same or related merchant, within 30 days) → suggest linking; original expense stays in totals, refund amount is netted against it; net shown on transaction detail and category breakdown
- **Duplicate detection** — same amount + same sender within 60 seconds → auto-suppress duplicate, notify user

**Manual linking**
- User can manually link any two transactions (e.g. gave ₹1,000 to a friend, got it back a week later)
- Linked pair is shown as related in both transaction details with a "Linked with →" indicator
- Linked transactions remain visible in expense totals by default
- User can tap **Mark as Settled** on the linked pair → both legs excluded from expense totals (treated like a self-transfer)
- Manual links can be unlinked at any time

**Link visibility rules summary**

| Link type | Shown in expense totals? |
|---|---|
| Self-transfer (auto) | No — excluded automatically |
| Refund (auto or manual) | Original expense shown; refund nets against it |
| Manual link (unsettled) | Both shown as normal expenses |
| Manual link (settled) | Both excluded from totals |

#### Notifications
- Push notification on new transaction detected → tapping opens transaction detail
- From notification: update category, add tag, add note inline without opening full app
- **End-of-day summary** — daily push notification showing total spend for the day vs previous day; tapping opens a Today vs Yesterday comparison view
- **End-of-week summary** — weekly push notification showing this week vs last week spend
- **End-of-month summary** — monthly push notification showing this month vs last month spend
- All summary notifications are opt-in and configurable in Settings

#### Notification Replacement
- When a bank SMS arrives, the app intercepts the raw SMS notification and replaces it with a styled app notification showing: merchant name, amount, category icon, and account
- Raw SMS notification is cancelled; only the app notification is shown (no duplicate)
- Requires **Notification Access** permission (`BIND_NOTIFICATION_LISTENER_SERVICE`) — user is prompted in onboarding with plain-language explanation; optional but strongly recommended
- If permission not granted, app notification shows alongside the raw SMS notification

---

### 3. Categories

- **Default categories** — Food & Dining, Transport, Shopping, Groceries, Utilities, Entertainment, Health, Education, Travel, EMI & Loans, Investments, Salary, Income, Transfer, Other
- **Salary vs Income** — `Salary` and `Income` are distinct categories. Salary auto-detection: SMS contains "SAL" / "salary" keyword, OR same-source large credit recurring on a monthly pattern → categorized as Salary. All other incoming credits → Income. User can always reclassify manually.
- **Sub-categories** — each category can have sub-categories for finer tracking. Default sub-categories shipped with the app:
  - Food & Dining → Restaurants, Snacks, Beverages, Bakery, Street Food
  - Shopping → Clothes & Fashion, Home & Kitchen, Electronics, Personal Care, Gifts
  - Transport → Fuel, Cab & Auto, Public Transport, Parking, Vehicle Service
  - Health → Pharmacy, Doctor, Lab Tests, Fitness, Insurance
  - Entertainment → OTT & Streaming, Movies, Games, Events
  - Travel → Flights, Hotels, Holidays
  - Utilities → Mobile Recharge, Electricity, Internet, Gas, Water
- Transactions can be assigned to a category + optional sub-category
- Sub-categories are optional — category alone is always sufficient
- **Custom sub-categories** — user can add sub-categories to any default or custom category
- **Custom categories** — user can create category with custom name and icon (emoji or icon picker)
- **Category rules** — user corrections saved as personal rules (merchant X → category + sub-category), applied before global dictionary on next parse

---

### 4. Subscriptions & Recurring

- **Auto-detection** — same merchant + same (or similar) amount recurring monthly/weekly → flagged as subscription
- **Subscription list** — dedicated view showing all detected subscriptions with next expected date and monthly cost
- **Mark as recurring** — user can manually mark any transaction as recurring

---

### 5. Accounts & Cards

- **Auto-discovery** — accounts inferred from SMS (bank name + account last4)
- **Account list** — all detected accounts with last known balance
- **Credit card view** — credit limit, current outstanding, available limit, due date (parsed from SMS where available)
- **Manual account** — add a cash wallet or account not covered by SMS

---

### 6. Spending Views

#### Time Ranges
- Daily, Weekly, Monthly, Custom date range

#### Granularity Levels
- Total spend (income vs expense)
- Per category breakdown
- Per merchant breakdown
- Per account breakdown

#### Visuals
- Bar chart — daily/weekly spend over selected period
- Donut chart — category split for the period
- Trend line — month-over-month comparison
- Income vs Expense summary card

---

### 7. Budgets

- Set monthly or weekly budget per category
- Budget vs actual progress bar on category view
- Alert when spending reaches 80% of budget (push notification)
- Alert when budget is exceeded
- Rollover option — unused budget carries to next weekly period(not monthly) (opt-in per category)

---

### 8. Location Tagging

- When a transaction is parsed, if location permission is granted, attach current GPS coordinates
- Show location on a map in transaction detail ("Other Info" section)
- Permission is optional — degrades gracefully if denied

---

### 9. Sync & Backup

- **Local-first** — all data lives in WatermelonDB (SQLite on device)
- **Supabase sync** — user-triggered ("Sync now") or configurable auto-sync interval
- **Multi-device** — same Supabase account → transactions available on second device
- **Synced**: processed transactions, user categories, merchant rules, budget settings, raw SMS bodies

---

### 10. Reporting & Export

- Monthly summary (total income, total expense, savings rate, top categories)
- Export to CSV
- Export to PDF (styled monthly statement)

---

## Phase 2 — Coming Soon

These appear in V1 UI as non-clickable cards with a "Coming Soon" badge.

| Feature | Description |
|---|---|
| PDF Statement Scan | Upload bank PDF statements; parse transactions via AI |
| AI Insights | Monthly spending analysis with natural language summary |
| AI Recommendations | Personalised tips based on spending patterns |
| Should I Buy? | AI-assisted purchase decision based on current budget and goals |
| Split Expenses | Split a bill with friends; track who owes what |
| Financial Goals | Set savings targets (e.g. save ₹50,000 by Dec 2026) |

---

## Permissions Required

| Permission | Required | Purpose |
|---|---|---|
| `READ_SMS` | Yes | Core SMS scanning |
| `RECEIVE_SMS` | Yes | Background monitoring of new SMS |
| `POST_NOTIFICATIONS` | Yes | Transaction notifications |
| `BIND_NOTIFICATION_LISTENER_SERVICE` | Optional (recommended) | Replace raw bank SMS notifications with styled app notifications |
| `ACCESS_FINE_LOCATION` | Optional | Location tagging on transactions |
| Internet | Yes | Supabase sync, Claude Haiku categorization fallback |

---

### 11. Appearance

- **Light / Dark theme** — system default or manual override in Settings
- **Color theme** *(phase 2)* — user picks from a preset palette of accent colors; applies app-wide to buttons, icons, charts, hero gradient, and highlights
- Default presets:
  - 🟢 Green (default — `#52B788`)
  - 🔵 Blue (`#3A86FF`)
  - 🟣 Purple (`#7C6FCD`)
  - 🟡 Amber (`#F7B731`)
  - 🌸 Rose (`#F472B6`)
  - ⚫ Monochrome (neutral grey)
- Theme change applies instantly with no restart required
- Hero section gradient uses two shades of the selected color
- **App icon updates** *(Phase 2)* — launcher icon changes to match selected color theme

---

## Out of Scope for V1

- iOS SMS reading (blocked by OS — iOS users get PDF/Gmail in V2)
- Shared expenses / Splitwise-style flows
- Tax categorization
- Investment portfolio tracking
- Loan management beyond EMI detection in categories
