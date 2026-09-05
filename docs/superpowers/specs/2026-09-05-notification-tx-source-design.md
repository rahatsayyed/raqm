# Bank/UPI App Notifications as a Transaction Source — Design

## Problem

Raqm captures transactions only from SMS. Some UPI apps and banks post an
app notification for a transaction and send no SMS at all — Raqm misses
these entirely today. The user wants an optional second ingestion source:
reading transaction notifications from bank/UPI apps directly, the way the
open-source app PennywiseAI Tracker does (with a hardcoded 3-package
allowlist and no user picker, per its actual source).

## Goals

- Catch transactions that arrive only as an app notification, never an SMS.
- Fully opt-in — off by default, no behavior change for a user who never
  enables it.
- Ship with ready-made parsing for common Indian UPI/bank apps (GPay,
  PhonePe, Paytm, and similarly common ones), and let the user add any
  other installed app manually.
- An app with no matching parser produces no transaction; instead its raw
  notification text is queued for a "report unsupported app" flow, mirroring
  the existing "Report Undetected SMS" pattern (`SmsInbox` screen).
- When the same real-world transaction arrives via both an SMS and an app
  notification, store it once, not twice.

## Non-goals

- No rework of Raqm's SMS delivery speed/background-scheduling
  architecture (a separate topic raised earlier and explicitly deferred by
  the user this round).
- No "listen to all apps and heuristically detect transactions" mode —
  scope is limited to apps the user has explicitly enabled (built-in or
  manually added).
- No remote/cloud reporting of unsupported-app notification text — the
  existing "Report Undetected SMS" flow's own storage/sharing mechanism is
  reused as-is; this spec does not change how that report is submitted.

## App scope & toggle

New setting, default off: **"Read app notifications for transactions"**,
placed in MoreScreen's Permissions & Security section alongside the
existing Permissions row. Turning it on:

1. Prompts Android's `ACTION_NOTIFICATION_LISTENER_SETTINGS` if Raqm's
   existing `NotificationListenerService` doesn't already have listener
   access (it may already, since Raqm uses this service today to cancel
   raw bank-SMS notifications).
2. Opens an app-picker screen listing installed apps. A built-in set (GPay,
   PhonePe, Paytm, and other common Indian UPI/bank apps with a matching
   parser — exact list finalized in the implementation plan) is pre-checked
   when installed. The user can check any other installed app manually.
3. Persists the monitored package list as a setting (new `settings` key,
   JSON array of package names — following the existing `getSetting`/
   `setSetting` string-value convention, serialized/deserialized at the
   call site).

## Native capture

Raqm's existing Kotlin `NotificationListenerService`
(`modules/sms-reader/android/.../`) gains an `onNotificationPosted` check:
if `sbn.packageName` is in the monitored-package setting, extract the
notification's title + text (`sbn.notification.extras`), and pass it to JS
through a **new** bridge event (not the existing SMS event, since payload
shape and dedup handling differ) — e.g. `onTransactionNotification` with
`{ packageName, title, text, postTime }`.

Must never throw — same invariant as the rest of this native pipeline
(mirrors `NotificationListenerService`'s "never throw" rule already
codified in this repo).

## Parsing

Notification text is fed through the **same** `BankParserFactory.parse()`
used for SMS, in `packages/bank-sms-parser` — matching PennywiseAI's actual
approach (it feeds notification text into its single SMS transaction
processor too). Today `BankParserFactory` selects a parser by matching the
SMS sender ID (e.g. `HDFCBK`) against each parser's pattern. It gains new
parser entries keyed by **app package name** instead of sender ID, each
knowing that app's own (much shorter) notification text shape — e.g. GPay's
"₹500 paid to Swiggy" vs. a bank SMS's "Rs.500.00 debited from A/c
XX1234...". Output is the same parsed-transaction shape either way, so
categorization, storage, and the totals math downstream are unchanged.

`BankParserFactory.parse(body, sender, timestamp)`'s `sender` argument is
overloaded for this: notification calls pass the package name where SMS
calls pass the SMS sender ID. Each new parser's pattern-match keys off
`sender === '<package.name>'` exactly, so there's no ambiguity with real
SMS sender IDs.

An app package with no matching parser entry (the user added it manually,
or a built-in app's format didn't match) produces no transaction. Its raw
notification text + package name is queued for the existing "Report
Undetected SMS" flow's underlying storage, generalized to also accept a
"notification" origin (small change to whatever the current `SmsInbox`
"undetected" list keys on — finalized in the implementation plan after
reading that screen's actual current storage shape).

## Storage & dedup

`TxRecord` gains a `source: 'sms' | 'notification'` column (migration v12,
default `'sms'` for all existing rows via `DEFAULT 'sms'` in the
`ALTER TABLE`, so no backfill pass is needed).

On inserting a transaction from either source, check for an existing
transaction from the **other** source within a ±2 minute window of the new
transaction's timestamp, matching on: same `bankName`/`accountLast4`
identity + same amount + same merchant name (case-insensitive). This
mirrors PennywiseAI's own window (±2 minutes, bank+merchant+amount) — but
unlike PennywiseAI's implementation (which only checks from the
notification-insert path, so an SMS arriving *after* a matching
notification is not caught), Raqm checks **symmetrically from both insert
paths** — `insertParsedTx` (SMS) and the new notification-insert path each
run this check against the other source.

On a match:

- Keep the **SMS-derived** row's parsed content (merchant/amount/category)
  when both exist — SMS parsing is Raqm's more mature, longer-lived path.
- Use whichever of the two arrived first for the transaction's timestamp.
- Do not insert a second row for the same transaction.

If the SMS side arrives first and the notification arrives second (already
matched and dropped) — no special handling needed, the notification insert
path's own check catches this, matching the common case. If the
notification arrives first and is inserted, then a matching SMS arrives
later, the SMS insert path's symmetric check finds the notification-sourced
row, and **updates it in place** (overwrites merchant/amount/category from
the now-authoritative SMS parse, sets `source` to stay whatever it already
was reported as — no `source` column semantics change needed since the row
already exists) rather than inserting a duplicate.

## Testing

No test runner exists for this app (per `CLAUDE.md`) — manual verification
is the norm, matching the diagnostic-logs feature's precedent. Verification
checklist for the implementation plan:

1. Enable the setting, grant notification-listener access, add GPay as a
   monitored app; trigger a real GPay transaction notification with no
   corresponding SMS; confirm a transaction is created with
   `source = 'notification'`.
2. Trigger a transaction that sends both an SMS and a GPay notification
   within a few seconds of each other, in each arrival order (SMS-first,
   notification-first); confirm exactly one transaction is stored either
   way, with SMS-derived content.
3. Add an installed app with no built-in parser; trigger one of its
   transaction notifications; confirm no transaction is created and the
   raw text appears in the "unsupported" report flow.
4. Turn the setting off; confirm no further notifications are captured and
   no existing behavior (SMS pipeline, notification-cancel-and-repost) is
   affected.
