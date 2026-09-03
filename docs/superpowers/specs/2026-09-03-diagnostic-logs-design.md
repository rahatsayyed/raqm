# Diagnostic Logs — Design

## Problem

Users report intermittent issues — missing notification action buttons,
slow notification delivery, slow app startup, general instability — with no
way for the user or the developer to see what actually happened on their
device. Raqm has no logging system today: only 4 files use scattered
`console.error`/`console.warn` calls (JS side), and the native Kotlin
modules (`SmsBroadcastReceiver`, `SmsReaderModule`,
`NotificationActionReceiver`, `CategoryPickerActivity`) use Android's
`Log.*`, which is not persisted and is not readable by a production app
(`READ_LOGS` is a signature-level permission Android restricts to system
apps; the logcat ring buffer is also small and rotates within minutes, so it
cannot answer "what happened in the last day" even if it were readable).

The fix: Raqm writes its own persistent log as things happen, and a button
in More lets the user export a time-scoped slice of it via the system share
sheet.

## Goals

- Capture enough detail to diagnose: (1) notification pipeline timing/
  failures, (2) app cold-start timing, (3) uncaught JS crashes, (4)
  background job (rescan / detection jobs / budget alerts) failures.
- Work whether or not the JS engine is running (native services like
  `NotificationListenerService` can run standalone).
- Bounded storage — logging forever must never fill the user's device.
- A MoreScreen entry, visible in every build (not dev-gated), exporting a
  1 hour / 1 day / 7 day slice via the existing share-sheet pattern already
  used by CSV/PDF export (`src/services/export.ts`).

## Non-goals

- Remote log upload / crash reporting service (e.g. Sentry) — out of scope,
  Raqm is local-first and this feature does not change that; the log never
  leaves the device except via the user's own explicit share action.
- Structured querying/search UI over the log — export is a flat text file,
  read by the user or pasted into a bug report.
- Logging every screen navigation or every DB call — that is "verbose"
  tracing and was explicitly deferred; this spec covers the four areas
  above only.

## Storage

Two plain-text, append-only files in the app's private storage:

- `native.log` — written only by Kotlin code, via
  `FileWriter(file, true).use { it.appendLine(...) }`, at
  `context.filesDir/native.log`.
- `js.log` — written only by JS code, via `expo-file-system`'s `File` API
  (SDK 56 class-based API — `File`/`Paths`, not the old function API), at
  `Paths.document.uri + '/js.log'`. `Paths.document` on Android resolves to
  the same private app storage directory as `context.filesDir`.

Two files, not one shared file: `NotificationListenerService` and the SMS
broadcast receiver are native Android components that can run with the JS
engine not loaded. Two independent writers appending to one file risks
interleaved, corrupted lines with no locking. Separate files removes that
risk entirely — each file has exactly one writer. The two are merged and
sorted by timestamp only at export time, in JS.

**Line format:** `<ISO-8601 timestamp>\t<tag>\t<message>` — one line per
event, tab-separated, no JSON. Plain text keeps native-side writes trivial
and keeps the exported file human-readable without tooling. `tag` is a
short fixed string identifying the source area (e.g. `notif.received`,
`notif.posted`, `startup.loadTxs`, `rescan.start`, `error.uncaught`) — see
"What gets logged" below for the fixed tag list. `message` is free text,
single line (any embedded newlines/tabs in dynamic content — e.g. a bank
name — must be stripped/escaped before writing, so one write is always
exactly one line).

**Rotation:** each file is capped at 3 MB. On every write, if the file
already exceeds the cap, the writer trims the oldest half of the file
before appending (read file, drop lines before the file's midpoint by byte
offset, rewrite, append the new line). This is checked lazily on write, not
on a timer — a device that logs rarely never pays the rotation cost. 3 MB
per file comfortably holds well past 7 days of normal activity at the
logging volume this spec defines (order of magnitude: tens of lines per
transaction, a handful of startup lines per launch — not per-frame or
per-render logging).

## What gets logged

Fixed tag list — implementers must use exactly these tags, not invent
ad hoc ones, so a later reader can grep reliably:

**Notification pipeline** (native: `SmsBroadcastReceiver`,
`SmsReaderModule`; JS: `smsProcessing.ts`):
- `sms.received` — bank name, timestamp of the SMS itself (not receipt time)
- `sms.parsed` — success/failure, bank name, transaction type if parsed
- `tx.inserted` — transaction id
- `notif.posted` — notification id, transaction id
- `notif.actions_attached` — success/failure, transaction id
- `notif.action_tapped` — which action (`category` / `add_note` /
  `not_expense`), transaction id (from `NotificationActionReceiver.kt` /
  `CategoryPickerActivity.kt`)

**App startup** (JS: `AppNavigator.tsx`):
- `startup.loadTxs`, `startup.syncAccounts`, `startup.detectionJobs`,
  `startup.initNotifications`, `startup.scheduleSummaries` — each logged
  twice, `<tag>.start` and `<tag>.done` with elapsed ms, so a slow step is
  visible directly from the exported log without needing to reproduce it
  live.

**Background jobs** (JS: `rescan.ts`, `txIntelligence.ts`'s
`runDetectionJobs`, `budgets.ts`'s `checkBudgetAlerts`):
- `rescan.start` / `rescan.done` / `rescan.failed` (with error message)
- `detection.start` / `detection.done` / `detection.failed`
- `budget_alert.start` / `budget_alert.done` / `budget_alert.failed`

**Errors:**
- `error.caught` — routed from existing `console.error`/`console.warn`
  call sites (4 files today) through the same logger, in addition to (not
  instead of) the console output.
- `error.uncaught` — a global handler
  (`ErrorUtils.setGlobalHandler` in React Native) logs the error message
  and stack before the app terminates. Best-effort: if the write itself
  cannot complete in time before the crash finishes, that is an accepted
  gap, not a regression to fix — this is strictly better than the current
  zero coverage, not a guarantee of catching every crash.

## JS logger interface

New `src/services/logger.ts`:

```ts
export function logEvent(tag: string, message?: string): void;
```

Fire-and-forget: internally appends asynchronously and never throws or
blocks the caller — a logging failure must never break the feature it is
observing (matching the existing invariant that
`NotificationListenerService` must never throw). Callers at timing sites
wrap start/done pairs themselves, e.g.:

```ts
const t0 = Date.now();
logEvent('startup.loadTxs.start');
await loadTxs();
logEvent('startup.loadTxs.done', `${Date.now() - t0}ms`);
```

## Native logger interface

New small Kotlin helper (e.g.
`modules/sms-reader/android/src/main/java/expo/modules/smsreader/DiagnosticLog.kt`)
exposing a single function, e.g. `DiagnosticLog.write(context, tag, message)`,
used from `SmsBroadcastReceiver`, `SmsReaderModule`,
`NotificationActionReceiver`, and `CategoryPickerActivity` at the tag points
listed above. Must never throw (wrap the file write in try/catch,
swallow-and-drop on failure) — the same invariant as the rest of this
notification code path.

## Export/share flow

New `src/services/diagnosticLogs.ts`, mirroring the existing
`exportCsv`/`exportPdf` pattern in `src/services/export.ts`:

```ts
export async function shareDiagnosticLogs(rangeHours: number): Promise<void>;
```

- Reads both `native.log` and `js.log` (missing file = treated as empty,
  not an error — a fresh install has no native log yet).
- Parses each line's leading ISO timestamp, keeps only lines within
  `now - rangeHours` to `now`.
- Merges both filtered sets, sorts by timestamp ascending.
- Writes the combined result to one file in `Paths.cache` (matching
  `exportCsv`'s pattern), named `raqm-diagnostics-<rangeHours>h-<Date.now()>.txt`.
- Shares via `Sharing.shareAsync(file.uri, { mimeType: 'text/plain',
  dialogTitle: 'Export diagnostic logs' })`.

## MoreScreen UI

A new row in `MoreScreen.tsx` (always visible, no dev-mode gate), opening a
small inline choice of **1 hour / 1 day / 7 days** (reuse whatever simple
selection UI pattern MoreScreen or a nearby screen already uses for a
similar small choice — a short bottom sheet or three inline buttons; exact
choice left to the implementation plan, not a new large UI component). On
selection, calls `shareDiagnosticLogs(1 | 24 | 168)`.

## Testing

No test runner exists for this app (per `CLAUDE.md`) — manual verification
is the norm. Verification checklist for the implementation plan:
1. Trigger a real SMS-derived transaction on device; confirm both
   `native.log` and `js.log` gained the expected tag lines in order.
2. Force a slow startup (e.g. a device with several thousand transactions)
   and confirm `startup.*` lines show real elapsed times.
3. Throw a deliberate uncaught error in a dev build; confirm
   `error.uncaught` was written before the crash.
4. Let a log file exceed 3 MB (or lower the cap temporarily for the test);
   confirm rotation trims instead of growing unbounded.
5. Export each of the three time ranges from MoreScreen; confirm the
   shared file only contains lines within that window and is chronologically
   merged across both sources.
