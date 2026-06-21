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
- **Self-transfer detection** — debit + credit within ±4 hours, same amount, different accounts → suggest linking, exclude from expense totals
- **Refund linking** — credit that matches a prior debit (same amount, same merchant within 30 days) → suggest linking, net both to zero in reports
- **Duplicate detection** — same amount + same sender + same timestamp within 60 seconds → auto-suppress duplicate, notify user

#### Notifications
- Push notification on new transaction detected → tapping opens transaction detail
- From notification: update category, add tag, add note inline without opening full app
- **End-of-day summary** — daily push notification showing total spend for the day vs previous day; tapping opens a Today vs Yesterday comparison view
- **End-of-week summary** — weekly push notification showing this week vs last week spend
- **End-of-month summary** — monthly push notification showing this month vs last month spend
- All summary notifications are opt-in and configurable in Settings

---

### 3. Categories

- **Default categories** — Food & Dining, Transport, Shopping, Groceries, Utilities, Entertainment, Health, Education, Travel, EMI & Loans, Investments, Salary, Income, Transfer, Other
- **Salary vs Income** — `Salary` and `Income` are distinct categories. Salary auto-detection: SMS contains "SAL" / "salary" keyword, OR same-source large credit recurring on a monthly pattern → categorized as Salary. All other incoming credits → Income. User can always reclassify manually.
- **Custom categories** — user can create category with custom name and icon (emoji or icon picker)
- **Category rules** — user corrections saved as personal rules (merchant X → category Y), applied before global dictionary on next parse

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
| `ACCESS_FINE_LOCATION` | Optional | Location tagging on transactions |
| Internet | Yes | Supabase sync, Claude Haiku categorization fallback |

---

## Out of Scope for V1

- iOS SMS reading (blocked by OS — iOS users get PDF/Gmail in V2)
- Shared expenses / Splitwise-style flows
- Tax categorization
- Investment portfolio tracking
- Loan management beyond EMI detection in categories
