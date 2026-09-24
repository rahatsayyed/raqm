# Product

<!-- impeccable:product-schema 1 -->

## Platform

adaptive

## Users

Primary user: earns money, rarely reviews their finances, doesn't enjoy
budgeting, wants clarity without effort, and values privacy. On Android this
person gets transactions captured automatically from bank SMS with no data
entry; on iOS (no SMS access) they enter transactions manually or import a
PDF statement, so the iOS user is more willing to do some manual work in
exchange for the same categorized/clear picture of spending.

## Product Purpose

Raqm is an on-device personal expense tracker for the Indian market. On
Android it reads bank SMS, extracts and categorizes transactions
automatically, and requires no manual bookkeeping. On iOS, where SMS access
doesn't exist, the same tracking is done via manual entry and PDF statement
import. Success is the user trusting the categorization and effortlessly
understanding where their money went, without having to build the picture
themselves.

## Positioning

Raqm **is an expense tracker** — this corrects an earlier internal framing
("Personal CFO, not an expense tracker") that overstated the product.
Raqm doesn't yet have the transaction history or breadth of financial data
to make CFO-level calls (forecasting, advice, planning) — that positioning
gets earned later, not claimed now.

What differentiates it today: automatic, zero-effort capture (Android SMS
parsing) or low-friction manual/PDF capture (iOS), fully on-device
processing, and a calm, advisor-toned presentation of what already
happened — not a claim to already reason like a financial advisor.

**Design-doc note:** `DESIGN.md` §0 still states the old "Personal CFO, not
an expense tracker" positioning — that line is stale against this corrected
positioning and should be updated the next time DESIGN.md is touched
(`/impeccable document` or a redesign pass), not silently reinterpreted
mid-build.

## Operating Context

- **Android** (primary, full-featured): background SMS monitoring, bulk
  historical scan with date-range picker, live SMS capture, notification
  replacement for raw bank SMS, automatic categorization, self-transfer/
  refund/duplicate detection, budgets, analytics, grocery tracking, export,
  Split (bill-splitting with friends).
- **iOS** (secondary, in progress): manual transaction entry and PDF
  statement import in place of SMS capture — no background SMS pipeline is
  possible on iOS.
- **Split** (`docs/superpowers/specs/2026-09-07-split-with-friends-design.md`)
  is explicitly on-device only — no accounts, no server, no cross-device
  sync; settle-status only updates when a device sees local evidence (a
  matched SMS, or the user marking it manually).
- **Budgets shared with others** ("budget together") is a distinct,
  separate capability from Split, confirmed by the user during init: it
  intentionally shares some data across devices. This is a deliberate,
  scoped exception to the on-device/no-sync default, not a reversal of it —
  record any future design/build work on it as touching shared state, not
  as a variant of the single-device model everything else in the app
  assumes.

## Capabilities and Constraints

- Local-only storage (expo-sqlite on-device, no general cloud sync) is the
  default for the whole app; "budget together" (above) is the one named,
  confirmed exception.
- Android and iOS are **not** feature-parity reskins of one flow — the
  transaction-capture mechanism is genuinely different per platform (this
  is why Platform is recorded as `adaptive`, not `android`).
- Deletion is always soft-delete/restorable (product-level guarantee, not
  just an implementation detail — see root `CLAUDE.md` invariants).
- No general server-side sync exists; features that need cross-device
  awareness (Split's settle-status, budget-together) each have to solve
  that individually rather than relying on a shared backend.

## Brand Commitments

- Name: **Raqm**. Dark-only visual language app-wide (onboarding is the one
  screen set with both light/dark) — see `DESIGN.md`.
- Voice: calm, private-wealth-advisor tone; never shames or gamifies
  spending (`DESIGN.md` §11–§12) — confirmed durable, unaffected by the
  positioning correction above.

## Evidence on Hand

No user testimonials, press, or external evidence on hand. Do not fabricate
any for future design work.

## Product Principles

1. Automatic, zero-effort capture is the differentiator on Android; don't
   design flows that assume the user will manually log every transaction
   there.
2. Privacy/on-device-by-default is the rule; any data-sharing feature
   (budget-together) is a named, scoped exception design work must call out
   explicitly, never treat as license to loosen the default elsewhere.
3. Be an honest expense tracker first. Earn "financial advisor"-level
   framing (forecasts, proactive recommendations) only as confidence and
   data actually support it — don't let copy or UI imply insight the app
   doesn't have yet.
4. Design for two genuinely different capability sets (Android automatic /
   iOS manual+PDF), not one flow adapted with an if-statement.
5. Calm, non-judgmental tone everywhere; no shame, no celebration of
   overspending, no gamification.
