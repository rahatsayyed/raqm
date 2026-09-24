---
name: device-verification-checklist
description: Walk through the relevant items of Raqm's manual device verification checklist (docs/superpowers/specs/2026-07-02-raqm-v0-design.md, "Verification Checklist") after a feature or fix, since apps/raqm has no automated UI test suite. Use after implementing or changing a feature, before calling work done, or when the user asks to verify/check a screen on-device.
---

# Device verification checklist

`apps/raqm` has no test runner (CLAUDE.md: "The app itself has no test runner").
`tsc --noEmit` catches type errors but not behavior — the actual regression net
is the manual checklist in
`docs/superpowers/specs/2026-07-02-raqm-v0-design.md`, section
"7. Verification Checklist". That file is the source of truth; do not copy its
items into this skill, since it will drift as features change — always read it
fresh.

The checklist is large (covers the full v0 feature set across Onboarding, SMS
Scanning, Transaction Management, Categories, Budgets, Analytics, and more).
Running the whole thing after a small change is noise — the point of this
skill is picking the right slice.

## Steps

1. Read the "Verification Checklist" section of
   `docs/superpowers/specs/2026-07-02-raqm-v0-design.md`.
2. Based on what was just changed (screens touched, invariants affected,
   feature area), identify the matching subsection(s) — e.g. a change to
   `TransactionDetailScreen.tsx` maps to "Transaction Management" items, a
   budgets change maps to "Budgets", etc. If the change doesn't map cleanly to
   any existing subsection (e.g. it's new functionality added after this spec
   was written), say so and propose the 2-4 manual checks that make sense
   instead of forcing a match.
3. Present only the relevant items to the user as a short list, and ask them
   to verify on their physical Android device (per the doc's own instruction:
   "manually verify... on a physical Android device" — an emulator does not
   count for SMS/notification-dependent features).
4. Go item by item conversationally — don't dump the list and wait silently.
   For each, wait for the user's pass/fail before moving to the next.
5. If an item fails, stop and help diagnose/fix before continuing down the
   list — don't collect a pile of failures to address later.
6. When items pass, ask whether to check them off in the spec file
   (`- [ ]` → `- [x]`) so the checklist stays accurate for next time. Only
   edit the checkboxes the user confirmed in this session — never mark items
   verified that weren't actually walked through.

## Scope

This is about the feature-behavior checklist in that specific doc, not a
general "test everything" pass, and not a substitute for `tsc --noEmit` (run
that separately/automatically via the project's typecheck hook).
