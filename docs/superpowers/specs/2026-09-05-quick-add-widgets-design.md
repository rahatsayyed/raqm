# Quick Add: Shortcut, Quick Settings Tile, and Home-Screen Widgets — Design

## Problem

Raqm currently requires opening the app and navigating to `AddTransactionScreen` to log a manual cash spend. Competing app PennywiseAI Tracker offers faster entry points — an app shortcut, and four home-screen widgets (Add, Budget, Category Pie, Recent Transactions) — plus glanceable spend data on the home screen. Raqm has none of these.

## Goals

- Let the user log a cash transaction faster than opening the app and navigating to Add Transaction.
- Offer glanceable spend/budget/category information on the home screen without opening the app.
- Match PennywiseAI Tracker's widget set, but be meaningfully better: per-row deep links (not just whole-widget tap), a lock-screen widget size, and totals that respect Raqm's custom month-start-day setting (Pennywise assumes calendar months).

## Non-goals

- A native, no-app-launch quick-add dialog (system bottom sheet/dialog). The app opens for quick-add; a fully native trampoline dialog is out of scope for this round.
- Editing a transaction from inside a widget (tapping a row opens the transaction detail screen in-app instead).
- Any new "Cash" account entity, ledger, or balance tracking — cash entries continue to use the existing manual-transaction convention (`bankName: 'Cash'`, no `accountLast4`).
- Auto-adding the Quick Settings tile — Android does not allow an app to add its own tile to the active set; the user must add it via the system's "Edit tiles" panel.
- Lock-screen widget interactivity (Android's keyguard widgets are display-only by platform constraint).

## Scope

Three independent entry points, one shared quick-add screen:

1. **App shortcut** — long-press Raqm's launcher icon → "Add Cash Spend" (with a dedicated icon).
2. **Quick Settings tile** — a tile in the notification shade's second panel; static "Add Transaction" label, tap collapses the shade and opens the app to quick-add.
3. **Four home-screen widgets** (Jetpack Glance) — Add Transaction, Budget, Category Pie, Recent Transactions — each with a lock-screen-size variant, and Recent Transactions rows deep-linking to the specific transaction.

All three funnel into one shared screen and one shared native refresh signal; none of them talk to each other directly.

## Shared quick-add flow

**New screen**: `apps/raqm/src/screens/main/QuickAddCashScreen.tsx`, registered on `MainStackParamList` as `QuickAddCash: undefined`.

**Fields**: Amount (required, numeric, same validation as `AddTransactionScreen`), Merchant (optional text), Note (optional text), Category (optional, via the existing `CategoryPickerScreen` push/`popTo` round-trip — the same pattern `AddTransactionScreen` already uses). No date/time picker (always "now"), no bank/type toggle (always `EXPENSE` / `bankName: 'Cash'`).

**Save**: builds a `NewTxInput` shaped exactly like `AddTransactionScreen`'s manual-entry path — `{ amount, type: EXPENSE, merchant, bankName: 'Cash', timestamp: Date.now(), categoryId, subcategoryId: null, notes, tags: [], isManual: true }` — via `useTxStore.getState().add(input)`. No new `NewTxInput` fields, no new aggregation logic: `countsTowardTotals`, budgets, and dashboard totals already treat any `isManual` expense identically regardless of `bankName`.

**Deep link**: a new native intent extra, `openQuickAdd: true` (boolean), read by `MainActivity`'s launch intent (or a subsequent `onNewIntent` if the app is already running). `navigationRef.ts` (which already handles notification deep links per the existing pattern) gains a check for this extra: on cold start, navigate to `QuickAddCash` once the navigator is ready; on warm start (app already in foreground/background), navigate immediately.

**After save**: pop back to whatever screen was active before the deep link (or Dashboard, if there was none — i.e. cold start), show a brief confirmation toast.

## App shortcut

- Added via `ShortcutManagerCompat.pushDynamicShortcut(...)` at app startup, from `modules/sms-reader`'s native module (Raqm's existing native glue point) — a dynamic shortcut rather than a static XML declaration, so it needs no build-time manifest entry and could later be hidden behind a setting without a rebuild.
- Label: "Add Cash Spend". Icon: a new adaptive-icon drawable (a "+₹" glyph), added under `modules/sms-reader/android/src/main/res/drawable`.
- Intent: launches `MainActivity` with `openQuickAdd: true` — same trampoline as the tile.
- One-time registration on every app start (idempotent — `pushDynamicShortcut` replaces by ID); no ongoing state.

## Quick Settings tile

- New `TileService` subclass, `AddTransactionTileService.kt`, in `modules/sms-reader/android/src/main/java/expo/modules/smsreader/`.
- Declared in `modules/sms-reader/android/src/main/AndroidManifest.xml` with `android.permission.BIND_QUICK_SETTINGS_TILE` and the `android.service.quicksettings.action.QS_TILE` intent filter.
- Static label "Add Transaction", a plus-style icon (reuses the shortcut's drawable).
- `onClick()` calls `startActivityAndCollapse(...)` (the modern non-deprecated form, taking a `PendingIntent`) launching `MainActivity` with `openQuickAdd: true`.
- `onTileAdded()`/`onStartListenerAdded()` set the tile's initial state (`Tile.STATE_ACTIVE`) — no ongoing polling, since the tile has no live content per the earlier design decision.

## Widgets

Four Jetpack Glance widgets, mirroring Pennywise's set:

1. **Add Transaction** — small, resizable horizontally, single tappable card, "+" icon, launches quick-add (same trampoline as shortcut/tile). No data.
2. **Budget** — spend vs. limit, progress bar; larger size adds remaining amount and daily allowance. Ported from `budgets.ts`'s `getBudgetStatuses` logic into a Kotlin equivalent operating directly on SQLite (see Data access below) — same math, no JS involved at render time.
3. **Category Pie** — donut (drawn to an off-screen `Bitmap`, as Glance cannot draw arcs natively) + text legend, same category-total logic as `CategoryDetailScreen`.
4. **Recent Transactions** — header with a summary line + embedded "+" button (same trampoline), then a scrollable list of the most recent transactions. **Each row's tap target deep-links to that specific transaction's detail screen** (`openTransaction: <id>` intent extra, handled by the same `navigationRef.ts` deep-link mechanism as quick-add) — this is the concrete improvement over Pennywise, whose rows are inert (only the whole widget surface opens the app, generically).

All four widgets additionally declare a lock-screen-category variant (`widgetCategory="home_screen|keyguard"`) — Pennywise declares `home_screen` only. Lock-screen rendering is necessarily display-only (no taps) per Android platform constraints; this is a strict display addition, not a new interaction surface.

### Data access

Widgets run in a Glance/`AppWidgetProvider` process with no guarantee the RN/JS engine is running, so — matching the existing precedent set by `CategoryPickerActivity`/`NotificationActionReceiver`, which already read/write SQLite directly with no JS involved — all four widgets query the `transactions`, `categories`, and `budgets` tables directly from Kotlin, read-only.

`month_start_day` (currently JS-only, written via `setSetting`/`getSetting` into the `app_settings` SQLite table) needs a cheap native-readable source so widgets don't have to open a second SQLite connection just to read one setting on every refresh. This extends the existing `MonitoredApps`-style pattern (a JS setting mirrored into native `SharedPreferences` on write): `setSetting('month_start_day', ...)` gains a corresponding native mirror write, and widget code reads the `SharedPreferences` copy (falling back to day 1 if absent, matching `budgets.ts`'s own fallback).

### Refresh

- **Periodic**: `updatePeriodMillis` ≈ 30 minutes, matching Pennywise's baseline — the Android-mandated minimum meaningful interval for this mechanism.
- **Event-driven**: `txStore.ts`'s `refresh()` (called after every insert/update/delete path) fires a new fire-and-forget native call, `SmsReader.refreshWidgets()` — an `AsyncFunction` that never throws (same invariant as every other notification-listener-adjacent native call) and triggers `AppWidgetManager.notifyAppWidgetViewDataChanged`/`updateAppWidget` for all four widget types. This mirrors Pennywise's WorkManager-based event refresh, but reuses Raqm's already-central `refresh()` chokepoint instead of instrumenting every individual mutation call site.

## Error handling

- `refreshWidgets()` never throws (widget refresh failing must never crash or disrupt the calling JS flow — same invariant as `attachTxActions`).
- A widget with no transactions/no budgets renders an empty state (mirroring Pennywise's own empty-state handling), not a blank/crashed view.
- The quick-add deep link is defensive: if `MainStackParamList`'s navigator isn't ready yet when the intent arrives (cold start race), it queues the navigation the same way the existing notification deep-link handling in `navigationRef.ts` already does — no new queuing mechanism needed.
- Widget SQLite reads are wrapped so a locked/mid-migration database (e.g. widget refresh firing during a rare concurrent app-side write) fails silently into a "last known good" render rather than crashing the widget host process.

## Testing

No automated test runner exists for `apps/raqm` (per project convention) — verified via `npx tsc --noEmit` for JS, `./gradlew :app:compileDebugKotlin` for Kotlin compilation, and manual device verification:

- Long-press the launcher icon → "Add Cash Spend" appears with its icon → tapping it opens the app directly to the quick-add screen.
- Add the Quick Settings tile via "Edit tiles" → tapping it collapses the shade and opens quick-add.
- Add each of the 4 widgets to the home screen at multiple sizes → each renders correctly, resizes correctly, and its tap targets (whole-widget and, for Recent Transactions, per-row) navigate correctly.
- Add a widget to the lock screen (where the launcher supports it) → renders read-only.
- Add a manual transaction via quick-add → confirm it appears in Dashboard/Analytics/Transactions totals identically to one added via `AddTransactionScreen`, and that all four widgets refresh within moments (event-driven) without requiring the 30-minute periodic tick.
- Change `month_start_day` in Settings → confirm the Budget widget's period boundary follows the new setting on its next refresh.
