# Onboarding Redesign — Design Spec

Date: 2026-09-16 · Status: draft, pending user review

## 0. Context

Raqm's onboarding (13 screens in `apps/raqm/src/screens/onboarding/`) predates
the current design system (RDL, `apps/raqm/DESIGN.md`) and never migrated.
Audit findings (full detail in session, summarized here):

- Every screen uses old MD3 tokens (`bg-primary-container`, `on-surface-variant`)
  instead of RDL tokens (`bg-surface-raised`, `ink-body`, ...).
- Emoji icons on 8 of 13 screens (`WelcomeScreen`, `SignUpScreen`,
  `OTPVerificationScreen`, `NameEntryScreen`, `AccountSelectionScreen`,
  `DateRangeScreen`, `PermissionScreen` + its 4 wrappers, `ScanningProgressScreen`,
  `ScanCompleteScreen`).
- Banned motion in production: `Animated.spring` on `ScanCompleteScreen`
  (DESIGN.md §7 bans spring/elastic/bounce), floating/bouncing badges on
  `PermissionScreen`.
- `SignUpScreen`, `OTPVerificationScreen`, `NameEntryScreen` use plain
  `KeyboardAvoidingView` + `ScrollView` instead of the required
  `KeyboardAwareScrollView` (CLAUDE.md hard rule).
- Amount/stat numbers on `ScanningProgressScreen` and `ScanCompleteScreen` use
  Inter, not JetBrains Mono (DESIGN.md §3 numeric rule).
- `ScanningProgressScreen` copy claims "Secure Sync — End-to-end encrypted" —
  factually false; Raqm has no sync or encryption pipeline (local SQLite only,
  per root CLAUDE.md). Must be corrected regardless of visual work.
- Current permission flow asks for SMS-read, Notification-access,
  Notifications, and Location as 4 back-to-back full-screen interruptions
  before any product value is shown — the "wall of permissions" anti-pattern.

New requirement introduced this session: **the app is being built for iPhone
as well**, which cannot read SMS at all (an OS-level restriction, not a Raqm
limitation). This spec designs both platforms' onboarding, sharing screens
where behavior is identical and branching only where the data source differs.

## 1. Research summary (informs decisions below)

Researched 15 apps praised for onboarding/UI: Copilot Money, Monarch, YNAB,
Cleo, Rocket Money, Jupiter, Lunch Money, PocketGuard, Simplifi, Wallet by
BudgetBakers, Revolut, N26, Wise, Cash App, Apple Card/Wallet, Robinhood,
Mint (legacy, contrast case), Chime, Buddy, Origin.

Key patterns adopted into this design:

- **Copilot Money is the closest match** to Raqm's target feel: typography-led
  welcome screen (no illustration/mascot), dark canvas for legibility, tight
  editorial type. Primary visual reference.
- **Defer friction.** Sign-up is placed after the user has already seen real
  value (their scanned transactions or set-up accounts), not before — matches
  Copilot/Cash App/Lunch Money.
- **Permissions should be contextual and benefit-first, not a wall** (Instagram,
  PayPal, Revolut patterns). Consolidate into one screen with per-permission
  rows instead of sequential full-screen interruptions (per user's explicit
  design direction).
- **Post-scan "immediate payoff."** Copilot and Simplifi surface categorized
  data / recurring transactions right after the linking wait — Raqm's
  scan-complete and budget-setup screens should do the same with real numbers.
- **Mint's lesson:** a fast, impressive first-run number is worthless if
  category accuracy doesn't hold up afterward — not an onboarding-screen
  change, but a reason to keep scan-complete copy honest and unhyped.
- **Apple Card's failure mode to avoid:** losing all progress if the user
  backs out mid-flow. Note for implementation: persist onboarding step state.
- **Buddy** (user's reference, "slightly good flow"): a step-by-step guided
  budget-setup wizard, not front-loaded account linking. Confirms placing
  budget setup as its own guided step (not folded into another screen).

## 2. DESIGN.md rebuilt to v2.0

`DESIGN.md` v1.1's visual system (color, typography, shape, motion) was
written quickly and never checked against real reference systems, and the
user explicitly asked that the past version not anchor this redesign's
colors, layout, or animation choices. Rather than patch v1.1 with deltas,
`apps/raqm/DESIGN.md` has been rewritten in place as **v2.0**, re-deriving
every visual value from the app research (§1) plus Apple's and Stripe's
actual published systems and general anti-slop UI critique. Product/UX
principles that were never in question (screen philosophy, AI presentation
rules, accessibility, hard constraints) are unchanged from v1.1.

Headline changes in v2.0 (full detail lives in `DESIGN.md` itself, not
duplicated here):

1. **Color, refined not replaced.** Confirmed with user: keep the "Forest"
   deep-green family (it's already a legitimate non-generic premium palette,
   not an AI-default), but re-derive every hex value fresh with Apple/Stripe's
   single-accent discipline — one precise green used identically everywhere,
   never decoratively, plus retiring the unused "moss" secondary tier.
2. **Drop Fraunces. Pure Inter + JetBrains Mono.** Confirmed with user. Apple
   and Stripe both achieve "editorial premium" through negative tracking and
   weight choice on a sans font, not a display serif — Fraunces was an
   unexamined default. `Statement` role now renders in Inter 300 with tight
   negative tracking.
3. **New tracking + weight discipline.** Negative letter-spacing scale added
   for large text (Apple/Stripe's actual precision mechanism); Inter locked
   to 300/400/600/700, weight 500 dropped.
4. **Radius as a real scale**, not two arbitrary values — pill radius reserved
   exclusively for primary CTAs, per Apple/Stripe's own scales.
5. **One shadow token, system-wide.** `0 8px 24px rgba(0,0,0,0.28)` is now the
   only shadow value permitted anywhere in the app — no per-screen custom
   shadow objects (`WelcomeScreen.tsx` currently has three different ones).
6. **Icons via `@expo/vector-icons` Material Symbols, not hand-rolled SVGs.**
   v1.1's instruction to hand-draw SVGs matching Material Symbols geometry is
   almost certainly why every onboarding screen fell back to emoji instead —
   hand-drawing icons is high-friction, so it got skipped.

This redesign's screens (§4 below) are built directly against v2.0. Since
`DESIGN.md` is app-wide, non-onboarding screens now technically diverge from
it until they're next touched — that migration debt already existed under
v1.1 (screens not yet migrated to NativeWind/RDL) and isn't new scope here.

## 2.5 PDF statement import as an onboarding data source

Raqm already has a working PDF import path outside onboarding:
`apps/raqm/src/screens/main/ImportScreen.tsx` lists source options (Axio CSV,
Google Pay PDF — both enabled; Bank statement PDF, Pennywise — both "coming
soon"), backed by `apps/raqm/src/services/imports/gpayPdf.ts` and the
Hermes-compatible `pdfjs-dist` setup already patched into the project.

This redesign surfaces that same capability inside onboarding as an
additional data source, not a replacement for SMS scan or manual entry:

- **Android:** Permissions screen gains a secondary action below the
  permission rows — "Or import a PDF statement instead / as well" — routing
  into the same import flow as `ImportScreen`, reusing `gpayPdf.ts`. Bank
  statement PDF parsing (beyond GPay) is "coming soon" per the existing
  `ImportScreen` state; onboarding respects the same enabled/disabled set and
  does not promise banks that aren't parseable yet.
- **iOS:** Manual account setup screen gains the same secondary action,
  promoted higher in priority since iOS has no scan step at all — PDF import
  is the closest thing iOS has to Android's automatic scan. Copy frames it as
  the recommended fast path, with manual entry as the fallback for accounts
  with no exportable statement.

Extending PDF parsing to more banks (beyond Google Pay) is separate,
non-onboarding work already tracked by the existing "coming soon" rows in
`ImportScreen` — this spec only wires the existing capability into the
onboarding flow, it does not add new bank parsers.

## 3. Flow

Both platforms share Welcome, Permissions (different content), Sign up, Name
entry, OTP. Only the middle "get data in" section differs, because iOS cannot
read SMS.

**Android:**
Welcome → Permissions → Date range → Scanning → Account selection → Scan
complete → Budget setup → Sign up → Name entry → OTP → Home

**iOS:**
Welcome → Permissions → Manual account setup → Setup complete → Budget setup
→ Sign up → Name entry → OTP → Home

Sign-up stays last on both platforms — value is shown before the account
creation ask.

Each screen shows a minimal step counter (`labelCaps`, e.g. "STEP 2 OF 4",
counting only the screens ahead in the *current* platform's flow) instead of
dots or a progress bar — matches DESIGN.md's "minimal by default" principle
better than a visual progress bar, while research confirms visible progress
correlates with completion.

## 4. Screen designs

### 4.1 Welcome (shared)

Rebuild typography-led, Copilot-style. Remove: floating emoji badges, the two
decorative circle rings, all custom shadow objects, the bottom gradient strip.
Keep: one radial glow behind the logo mark (the DESIGN.md-sanctioned single
gradient exception). Headline in Inter 300 with the new negative tracking,
using the `accent-primary` color for the emphasized clause. Single CTA
button ("Get started") using `radius-pill`. No circles except the logo mark
itself (avatars/marks are the one sanctioned circle use).

### 4.2 Permissions (branches by platform)

One screen, row-per-permission (per user's explicit direction): each row has
title + one-sentence reason on the left, a "Grant" button on the right that
fires the OS prompt on tap. A row already granted shows a plain "Granted"
label instead of the button — no re-request, no animation.

- **Android rows:** Read bank SMS ("So I can find your transactions
  automatically"), Manage bank notifications ("So I can hide duplicate bank
  alerts once I've read them"), Location ("So I can tag where a transaction
  happened when the SMS arrives"). All three are needed at this step —
  Location has no later in-app moment to request it contextually, since it's
  read passively when an SMS lands, not tied to any screen the user visits.
- **iOS rows:** Notifications only ("So I can alert you about spending
  patterns"). No SMS/location rows — not applicable on this OS.

Trust copy under the row list, literal to Raqm's real architecture: "Everything
is processed on your device. Nothing leaves your phone." (fixes the false
"encrypted sync" claim carried elsewhere in the current flow).

No floating badges, no rotation, no bounce. Rows use `Reveal` motion only
(fade + slight upward move on screen entry, staggered per row).

### 4.3 Android data-in: Date range → Scanning → Account selection → Scan complete

- **Date range:** reskin only — RDL v2.0 tokens, remove emoji, real icons via
  `@expo/vector-icons` Material Symbols, error text in the `error` token not
  a hardcoded hex.
- **Scanning:** narrate real steps ("Reading messages" → "Extracting
  transactions" → "Categorizing"), JetBrains Mono counter, remove the gradient
  stroke on the progress ring (plain single-color ring, since DESIGN.md
  reserves gradients for the one Home-screen glow), remove the false
  "encrypted sync" copy.
- **Account selection:** reskin only — RDL tokens, remove emoji bank/card
  icons, replace the ad hoc manual progress bar with the shared step counter.
- **Scan complete:** the "aha moment" — hero metric in `metricHero`/JetBrains
  Mono ("X transactions found, ₹Y tracked"), calm factual framing (no
  celebration language, per DESIGN.md §1 rule 4), no `Animated.spring`.

### 4.4 iOS data-in: Manual account setup → Setup complete

New screens (Android has no equivalent). Manual account setup: add one or
more accounts by name + starting balance, "add another" affordance, RDL
tokens and `KeyboardAwareScrollView` from the start (no legacy pattern to
migrate). Setup complete: same layout family as Android's Scan complete, but
the hero metric shows account count / total starting balance instead of scan
stats — keeps the two platforms visually consistent without pretending iOS
scanned anything.

### 4.5 Budget setup (new, both platforms)

Placed after the data-in section completes, before sign-up — matches the
"immediate payoff" and Buddy's "guided wizard, not blind guess" patterns.

- **Android:** shows real historical spend per category from the just-completed
  scan, pre-filled as suggested budget amounts the user can adjust.
- **iOS:** no history exists yet, so the user enters target amounts directly,
  one row per category.

Both variants reuse the existing `src/services/budgets` feature — this screen
surfaces it earlier in the funnel, it does not duplicate its logic. Amounts in
`numericMd`/JetBrains Mono.

### 4.6 Sign up / Name entry / OTP (shared)

Reskin only, no flow change: RDL tokens throughout, `KeyboardAwareScrollView`
instead of `KeyboardAvoidingView`, emoji icons replaced with Material Symbols
via `@expo/vector-icons`, OTP boxes in JetBrains Mono.

## 5. Shared rules across all touched screens

- Motion limited to Appear/Fade/Reveal only (DESIGN.md's existing vocabulary)
  — no spring, no float, no bounce, no rotation.
- Step counter (`labelCaps`, "STEP N OF M") replaces any progress bar/dots.
- Icons: `@expo/vector-icons` Material Symbols only, no emoji, no hand-rolled
  SVGs for new work on these screens.
- One shadow token only (DESIGN.md v2.0 §6, `0 8px 24px rgba(0,0,0,0.28)`);
  no per-screen custom shadow objects.
- All copy follows DESIGN.md §11 voice rules; permission and trust copy must
  be literal to Raqm's actual architecture (on-device only, no sync).
- **Animation implementation:** use `react-native-reanimated` (already in use,
  installed at v4.5.1 — New Architecture only, requires `react-native-worklets`).
  Follow the `creating-reanimated-animations` pattern set from
  `github.com/estevg/skills` (chosen over `terminalskills.io`'s equivalent
  because it is version-aware for v3 vs v4, where the other is not): shared
  value → `useAnimatedStyle` → trigger, `withTiming`/`withSpring` selection
  framework, `entering`/`exiting` props with `LinearTransition` for
  Reveal/Collapse motion roles. No `withSpring` on anything DESIGN.md's motion
  vocabulary marks ease-out-only (i.e. never for entrances that should read as
  Appear/Fade/Reveal, not bounce).

## 6. Out of scope for this spec

- Full iOS data-ingestion architecture beyond "manual entry" (e.g. bank
  statement import, Mail parsing) — manual entry is the whole iOS answer for
  now, by explicit user decision.
- Migrating non-onboarding screens to DESIGN.md v2.0 (§2 above) — separate future pass.
- Persisting onboarding progress across app kills (flagged as a real gap per
  the Apple Card research finding, worth a follow-up task, not blocking this
  spec).
