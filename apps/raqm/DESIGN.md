---
name: Raqm
description: A calm, on-device expense tracker for the Indian market — precision-toned numbers on a near-black canvas, one accent used sparingly.
colors:
  bg-base: "#0B0C0E"
  bg-surface: "#15171A"
  bg-surface-raised: "#1C1F23"
  border-subtle: "rgba(255,255,255,0.12)"
  ink-headline: "#F2F1EC"
  ink-body: "#B7B6AE"
  ink-label: "#6B6A62"
  accent-primary: "#66CCAC"
  accent-deep: "#1F4A3B"
  notice: "#D9A85C"
  error-muted: "#E08672"
  onb-bg-base: "#F7F6F3"
  onb-bg-base-dark: "#0B0C0E"
  onb-bg-surface: "#FFFFFF"
  onb-bg-surface-dark: "#15171A"
  onb-bg-surface-raised: "#EFEDE8"
  onb-bg-surface-raised-dark: "#1C1F23"
  onb-border-subtle: "rgba(20,20,20,0.08)"
  onb-border-subtle-dark: "rgba(255,255,255,0.12)"
  onb-glass-bg: "rgba(255,255,255,0.55)"
  onb-glass-bg-dark: "rgba(255,255,255,0.06)"
  onb-glass-highlight: "rgba(255,255,255,0.6)"
  onb-glass-highlight-dark: "rgba(255,255,255,0.08)"
  onb-ink-headline: "#14140F"
  onb-ink-headline-dark: "#F2F1EC"
  onb-ink-body: "#4A4A45"
  onb-ink-body-dark: "#B7B6AE"
  onb-ink-label: "#8A8880"
  onb-ink-label-dark: "#6B6A62"
  onb-accent-primary: "#2E5D4E"
  onb-accent-primary-dark: "#66CCAC"
  onb-accent-deep: "#DCE9E3"
  onb-accent-deep-dark: "#1F4A3B"
  onb-notice: "#B8813C"
  onb-notice-dark: "#D9A85C"
  onb-error-muted: "#B4483A"
  onb-error-muted-dark: "#E08672"
  onb-on-accent: "#F7F6F3"
  onb-on-accent-dark: "#14140F"
  onb-dot-inactive: "rgba(20,20,20,0.12)"
  onb-dot-inactive-dark: "rgba(255,255,255,0.14)"
typography:
  display-hero:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "40px"
    fontWeight: 400
    fontStyle: italic
  display-screen-title:
    fontFamily: "Newsreader, Georgia, serif"
    fontSize: "26px-30px"
    fontWeight: 400
    fontStyle: italic
  body-supporting:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "15px-16px"
    fontWeight: 400
  body-card-label:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "12px-14px"
    fontWeight: 600
  caption:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "11px-12px"
    fontWeight: 400
  metric-numeric-hero:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "44px"
    fontWeight: 600
  numeric-list-row:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "16px"
    fontWeight: 600
  numeric-subtotal:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "22px"
    fontWeight: 600
  numeric-screen-total:
    fontFamily: "JetBrains Mono, monospace"
    fontSize: "34px"
    fontWeight: 600
  section:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    letterSpacing: "uppercase"
  label:
    fontFamily: "Instrument Sans, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "uppercase"
rounded:
  radius-outer: "6px"
  radius-inner: "4px"
  radius-cta: "3px"
  radius-dot: "1px"
  radius-sm: "4px"
  radius-xl: "16px"
  radius-2xl: "24px"
  radius-3xl: "32px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
  xxl: "40px"
  container-margin: "24px"
  gutter: "16px"
  section-gap: "40px"
components:
  button-primary:
    backgroundColor: "{colors.accent-primary}"
    textColor: "{colors.onb-on-accent-dark}"
    typography: "{typography.body-card-label}"
    rounded: "{rounded.radius-cta}"
    padding: "16px 24px"
  button-primary-hover:
    backgroundColor: "{colors.accent-deep}"
    textColor: "{colors.onb-on-accent-dark}"
    typography: "{typography.body-card-label}"
    rounded: "{rounded.radius-cta}"
    padding: "16px 24px"
---

# Design System: Raqm

Version 4.0 · Living document · Restructured 2026-09-24
Optimized for AI-agent consumption — every screen must comply with these rules without re-explanation.
In code, all values below come from `src/theme` tokens (`Colors.*`, `Typography.*`, `Spacing.*`, `Radius.*`) and, for onboarding, `src/theme/onboardingColors.ts`'s `OnbColors.light`/`OnbColors.dark` — never hardcoded.

**v3.0 note (kept for history):** color (§2), typography (§3), shape (§5), and elevation (§6) were replaced with the values locked during the 2026-09 onboarding claude-design exploration (`docs/superpowers/specs/2026-09-17-onboarding-claude-design-decisions.md`). That exploration also designed a light mode; this app stays dark-only outside onboarding — adding a light mode app-wide is a separate product decision this rewrite does not make, so only the exploration's dark-mode values are adopted as the app-wide canonical scale. Some tokens (marked "derived") were not literally specified for a production app-wide scale by the exploration — it only fixed a handful of onboarding-screen values — so this doc extends them at the same ratios the old v2.0 scale used, rather than inventing new ones freely. Product/UX principles that were never in question (§0, §1, §11–§16) remained unchanged from v2.0.

**v4.0 note:** this pass restructures the file into the canonical DESIGN.md eight-section order (Overview, Colors, Typography, Layout, Elevation & Depth, Shapes, Components, Do's and Don'ts) with a machine-readable YAML frontmatter, and preserves every non-canonical Raqm-specific section (Product Context, Non-Negotiable Principles, Motion, Iconography, Charts, Copywriting Voice, AI Presentation Rules, Empty States, Accessibility, Hard Constraints, Screen → Question Map) unchanged in substance below the canonical eight. Two corrections against the actual shipped code, not the plan: (1) the stale "Personal CFO, not an expense tracker" positioning in Product Context is corrected to match `PRODUCT.md`'s ruling — Raqm **is** an expense tracker; (2) the v3.0 migration-status claim is corrected against what the code actually shows (see Overview) — adoption is broader than a single screen for fonts and a single screen for glass elevation, but still confined to the onboarding-v3 flow; the app-wide shared theme and every non-onboarding screen remain on v2.0 values.

## Overview

**Creative North Star: "Precision and Silence"**

Raqm's visual language exists to make a near-black canvas feel calm and exact, never busy. The reference feel — carried forward unchanged from the file's own established voice — is Copilot Money's typography-led editorial precision (dark canvas, no illustration or mascot, tight tracking), crossed with Apple's restraint (one accent, minimal shadow, no decoration) and Stripe's numeric precision (tabular figures, negative tracking on amounts as a "financial DNA" signal). The explicit anti-reference is Monarch's gamified, celebratory consumer style — Raqm never shames, never celebrates, never gamifies spending.

Typography carries the design rather than decorating it: a serif display face (Newsreader, italic) supplies the one signature element per screen, a neutral sans (Instrument Sans) carries everything else, and JetBrains Mono renders every number without exception — the same "one signature element, everything else quiet" discipline the file has always argued for. Color follows the same restraint: one accent, used identically everywhere it appears, never decoratively. Depth is conveyed by translucency and blur rather than a shadow drawn under an element — surfaces read as "how much of the background shows through," not as objects floating above a page.

**Migration status.** v3.0 (Newsreader + Instrument Sans typography, the `#66CCAC`-family color palette, the shrunk `radius-cta`/`radius-outer`/`radius-inner`/`radius-dot` shape scale, and the no-drop-shadow glass/blur elevation model) is the intended system for the whole app, being migrated screen-by-screen starting with onboarding. As of this pass, the build shows a broader adoption than a single-screen pilot: all onboarding-v3 screens (`WelcomeScreen`, `PermissionsScreen`, `DateRangeScreen`, `ScanningProgressScreen`, `ScanCompleteScreen`, `NameEntryScreen`, `BudgetSetupScreen`, `SetupCompleteScreen`, `ImportStatementScreen`) and their shared components (`GlassCard`, `RqButton`, `CalendarRangeSheet`, `PermissionRow`) consume Newsreader/Instrument Sans fonts, the `onb-*` color tokens, and the `radius-cta`/`radius-outer` shape scale. The glass/blur elevation model is implemented once, in the shared `GlassCard` component (`expo-blur`'s `BlurView` + a translucent tint layer + a 1px top-highlight layer), and every onboarding-v3 screen composes through it — it is not a single-screen exception. Outside onboarding, migration has not started: every other screen, and the shared `src/theme` tokens those screens read from (`colors.ts`, `typography.ts`, `spacing.ts`'s `Radius` export, `shadows.ts`) are still 100% on v2.0 values — `typography.ts`'s own header comment still says "v2.0" and contains zero Newsreader/Instrument Sans references; `colors.ts`'s app-wide tokens (`accentPrimary: '#3EBD7E'`, etc.) are still the old hexes; `Radius` still has no `outer/inner/cta/dot` keys and still exports `full: 9999` (a pill), which the app-wide `PrimaryButton` component still uses via `rounded-lg` (12px, not a pill, but also not v3.0's 3px `radius-cta`) with its own hand-rolled colored drop shadow — itself a defect against both the old and new elevation rules (see Elevation & Depth). This is migration debt, not a documentation error to silently "fix" by rewriting the code — the same pattern this codebase already uses for its NativeWind migration.

**Key Characteristics:**
- One accent color (`#66CCAC` dark / `#2E5D4E` onboarding-light), used identically everywhere it appears — never per-screen accent drift.
- Serif display (Newsreader, italic) as the one signature element; neutral sans (Instrument Sans) for everything else; JetBrains Mono for every number.
- Depth from translucency and blur, not drop shadows — one glass surface per screen, never stacked.
- A shrinking radius scale where the primary CTA is deliberately smaller-radius than the cards around it — color, not shape, signals the action.
- Warm near-black / warm off-white grounds, never pure black or white.

## Colors

The palette is a single precise accent on a near-black ground — one hue used sparingly and never decoratively — with a second, separately-named light/dark pair reserved for the onboarding flow only.

### Primary
- **Confidence Green** (`#66CCAC` dark / `#2E5D4E` onboarding-light — `accent-primary`): Trust and confidence. Primary actions, positive metrics, the brand mark — the ONE accent, used identically everywhere it appears. Never used for excitement or celebration, only confidence/positive-direction.

### Neutral
- **Warm Near-Black** (`#0B0C0E` — `bg-base`): App background — warm near-black, never pure black.
- **Card Ground** (`#15171A` — `bg-surface`): Cards, sheets.
- **Raised Ground** (`#1C1F23` — `bg-surface-raised`): Nested cards, modals.
- **Hairline Border** (`rgba(255,255,255,0.12)` — `border-subtle`): Card borders and dividers; borders replace shadows for ordinary card-to-card hierarchy.
- **Headline Ink** (`#F2F1EC` — `ink-headline`): Headings, key numbers — warm off-white, never pure white.
- **Body Ink** (`#B7B6AE` — `ink-body`): Body copy.
- **Label Ink** (`#6B6A62` — `ink-label`): Timestamps, annotations.
- **Structural Deep** (`#1F4A3B` — `accent-deep`): Selected states, secondary containers.

### Semantic
- **Amber Notice** (`#D9A85C` — `notice`): Awareness, not danger — flags something worth attention. The default "pay attention" color; never red.
- **Muted Error** (`#E08672` — `error-muted`): Honesty — failed transactions, hard errors only. Reserved for actual failures, never for "you spent more than usual."

### Named Rules
**The One Voice Rule.** One accent color per screen, used identically everywhere it appears — the same green in a button is the same green in a positive metric, with no per-screen accent drift.
**The No-Alarm Rule.** Amber (`notice`), not red, is the default "pay attention" color. Red (`error-muted`) is reserved for actual failures — a declined payment, a parsing error — never for routine overspending.

## Typography

**Display Font:** Newsreader (italic only, headline/hero roles)
**Body Font:** Instrument Sans (body, labels, buttons, section headers)
**Numeric/Mono Font:** JetBrains Mono (every number and amount, unchanged since v2.0)

**Character:** A serif display face carries the one signature element per screen; a neutral sans carries everything else; a monospace face carries every number without exception — the same "distinctive display + neutral workhorse" split Copilot Money and Apple both use, with the serif itself standing in as the signature element rather than a weight or tracking trick on a sans face.

### Hierarchy
- **Display / Hero** (400, italic, 40px): the one screen that earns the largest size — first impression (Welcome).
- **Display / Screen title** (400, italic, 26–30px): every other screen's headline.
- **Body / Supporting text** (400, 15–16px): comfortably above the 11pt legibility floor.
- **Body / Card label** (600, 12–14px): weight compensates for size near the small end.
- **Caption / Secondary line** (400, 11–12px): smallest text in the system, never smaller.
- **Metric / Numeric hero** (600, 44px, JetBrains Mono): e.g. "₹28,430" — the Home hero, scan count-up.
- **Numeric / List-row amount** (600, 16px, JetBrains Mono): per-transaction/per-category amount in a row.
- **Numeric / Subtotal** (600, 22px, JetBrains Mono): a category or section subtotal.
- **Numeric / Screen total** (600, 34px, JetBrains Mono): the one large total on a screen, distinct from the 44px hero which appears once.
- **Section** (600, 13px uppercase, Instrument Sans): "RECENT ACTIVITY".
- **Label** (600, 11px uppercase, Instrument Sans): form field labels, badges, step counters.

### Named Rules
**The Named-Step Rule.** A list-row amount, a subtotal, and a screen-level total are three distinct named sizes, not "somewhere between 16 and 38px." A new numeric role names which of the three it is rather than picking an in-between size.
**The Weight-Floor Rule.** Avoid weights lighter than 400 at any text size — light/thin weights are a legibility risk, especially small.

## Layout

- 8pt base grid. Minimum screen margin: 20px (mobile).
- Whitespace exceeds the minimum comfortable amount — modeled after Apple, not Material Design density.
- Every screen has exactly one focal point above the fold.
- Cards summarize; they never contain everything. Design for "tap to expand," not "cram it in."
- Spacing scale (`src/theme/spacing.ts`, unchanged between v2 and v3): `xs` 4px, `sm` 8px, `md` 16px, `lg` 24px, `xl` 32px, `xxl` 40px, plus named layout constants `container-margin` 24px, `gutter` 16px, `section-gap` 40px.

## Elevation & Depth

The system uses blur and translucency for depth, not drop shadows — how much of the background shows through an element, not a shadow drawn under it. This is the v3.0 model, implemented today only inside the shared `GlassCard` component consumed by every onboarding-v3 screen. Ordinary card-to-card hierarchy still comes from spacing, `border-subtle`, and contrast between surface levels — not blur — matching the v2.0 model that remains in force everywhere outside onboarding.

### Shadow Vocabulary
- **Onboarding glass surface** (`expo-blur` `BlurView` intensity 40 + `background: rgba(255,255,255,0.06)` dark / `rgba(255,255,255,0.55)` light + `border-subtle` + a 1px top-highlight layer at `rgba(255,255,255,0.08)` dark / `rgba(255,255,255,0.6)` light): one glass surface per screen, never stacked — the elevated container in onboarding (a decision card, a sheet). Never for ordinary content cards, which stay flat with no blur.
- **Legacy card shadow** (`shadowOffset: 0/8, shadowOpacity: 0.28, shadowRadius: 24, elevation: 8` — `src/theme/shadows.ts`'s `Shadows.card`): the one shadow token the pre-v3.0 system defines app-wide, still in force outside onboarding.

### Named Rules
**The One Glass Surface Rule.** At most one glass/blur surface per screen, never stacked — for the single elevated container (modal, sheet, decision card), never for ordinary content cards.

## Shapes

The radius scale shrinks under v3.0, and the primary CTA is deliberately given a *smaller* radius than the cards around it — a "nothing shouts, color alone signals the action" trade-off, not an accident. Circles are reserved exclusively for avatars, profile images, and chart nodes — never for buttons or containers. Radius should read as engineered precision, not friendly/bubbly.

- `radius-outer` (6px): outer container / glass card.
- `radius-inner` (4px): inner cell, button, input.
- `radius-cta` (3px): primary CTA — smaller than `radius-inner` on purpose.
- `radius-dot` (1px): progress dots, tiny indicators.
- Legacy carryover, still valid for any role not covered by the four above: `radius-sm` 4px, `radius-xl` 16px, `radius-2xl` 24px, `radius-3xl` 32px. `Radius.full` (9999px, a pill) also remains in code and in active use by the app-wide `PrimaryButton` — this is the old CTA shape the v3.0 scale supersedes, not a second valid CTA shape; see the Overview migration-status note.

## Components

### Buttons
- **Onboarding primary (`RqButton`, v3.0-migrated):** `radius-cta` (3px), `padding: 16px 24px` (`px-lg py-md`), `accent-primary` background, Instrument Sans 500/600 label, press feedback is a plain 0.97 scale via `withTiming` — never a spring. This is the target shape for the whole app once migrated.
- **App-wide primary (`PrimaryButton`, still v2.0):** `rounded-lg` (12px, not a pill despite the old spec's pill description, and not yet `radius-cta`), fixed 56px height, `px-lg` padding, plus a hand-rolled colored drop shadow (`shadowColor: Colors.primary`, offset 0/8, opacity 0.25, radius 16, elevation 8) that matches neither the legacy single-shadow-token rule nor v3.0's no-drop-shadow rule — flagged as a defect, not documented as a system rule (see Do's and Don'ts).
- **Ghost (`GhostButton`):** no background or shadow, Inter medium label in `on-surface-variant` — navigates/dismisses rather than commits.

### Cards / Containers
- **Onboarding glass card (`GlassCard`):** `radius-outer` (6px), `border-subtle`, blur + translucent tint + 1px top-highlight (see Elevation & Depth). Used for the one elevated container per onboarding screen.
- **Ordinary content card (app-wide):** flat `bg-surface`, `border-subtle` hairline, no blur — summarizes, never contains a full data dump; design for "tap to expand."

### Inputs / Fields
- **Style (`EditFieldSheet`):** `bg-surface`, `rounded-lg` (8px), `border-subtle` 1px border, Inter body text, placeholder in `ink-label`.
- **Confirm action:** a filled `accent-primary` button directly below the field, not a separate modal footer.

### Navigation
- Shared `TopHeader` carries the screen title and the avatar entry point to More; tab bar icons come from `MaterialCommunityIcons` (see Iconography below), filled variant reserved for the active tab only.

## Do's and Don'ts

### Do:
- **Do** use one accent color (`accent-primary`) per screen, identically wherever it appears.
- **Do** render every number — balances, amounts, counters — in JetBrains Mono.
- **Do** use amber (`notice`) as the default "pay attention" color; reserve red (`error-muted`) for actual failures only.
- **Do** convey depth via translucency/blur for the one elevated surface per screen; use flat `bg-surface` with a hairline border for ordinary cards.
- **Do** give the primary CTA a smaller radius (`radius-cta`, 3px) than the cards around it once a screen migrates to v3.0 — color, not shape, signals the action.

### Don't:
- **Don't** use gradients anywhere except the single sanctioned radial glow behind the Home hero number.
- **Don't** stack more than one glass/blur surface on a single screen.
- **Don't** treat `PrimaryButton`'s hand-rolled colored drop shadow as a system pattern — it is unmigrated v2.0 debt inconsistent with both the old one-shadow-token rule and the new no-drop-shadow rule, not a second sanctioned shadow style.
- **Don't** use emoji icons, hand-rolled decorative SVGs, or per-screen custom shadows anywhere in the app — except the bounded category-row illustration exception in §8 Iconography, which applies to category rows only.
- **Don't** reintroduce bouncy/springy/elastic motion curves — press feedback and all transitions are ease-out/ease-in only.

## 0. Product Context

Raqm is an on-device personal expense tracker for the Indian market. On Android it reads bank SMS, extracts and categorizes transactions automatically, and requires no manual bookkeeping; on iOS (no SMS access) the same tracking happens via manual entry and PDF statement import. **Raqm is an expense tracker** — not a Personal CFO. It doesn't yet have the transaction history or breadth of financial data to make CFO-level calls (forecasting, advice, planning); that positioning gets earned later, not claimed now (per `PRODUCT.md`'s Positioning section, which corrects this file's earlier "Personal CFO, not an expense tracker" framing).

Target user: earns money, rarely reviews finances, doesn't enjoy budgeting, wants clarity without effort, values privacy.

Reference feel: Copilot Money's typography-led editorial precision (the closest real-world match — dark canvas, no illustration/mascot, tight tracking) + Apple's restraint (one accent, one shadow, no decoration) + Stripe's numeric precision (tabular figures, negative tracking as a "financial DNA" signal) — never a fintech dashboard, never a budgeting spreadsheet, never a bubbly consumer app (Monarch's gamified/celebratory style is the explicit anti-reference).

## 7. Motion

- Durations: 150–250ms for micro-interactions, 300–400ms for screen transitions.
- Easing: ease-out for entrances, ease-in for exits. No spring/elastic/bounce curves — ever. (Apple's own system documents exactly one motion device system-wide — a 0.95 press-scale — reinforcing that restraint, not variety, reads as premium.)
- Motion vocabulary: Appear, Fade, Reveal, Lift, Focus, Transition, Collapse. Don't invent new motion patterns outside this set without updating this doc.
- Motion exists only to explain a state change (a number updating, a card expanding). Never decorative. Every animation must be justifiable in one sentence (hierarchy, storytelling, feedback, or state transition) — "it looked nice" is not a reason.
- Implementation: `react-native-reanimated` v4, per the `creating-reanimated-animations` skill in `.claude/skills/` — see that skill's "Project notes (Raqm)" section for the exact mapping from this vocabulary to Reanimated APIs.

## 8. Iconography

- Reference set: **Material Symbols Outlined** — rounded outline, ~2px stroke weight.
- **In-app implementation: `MaterialCommunityIcons` via `@expo/vector-icons`, standing in for Material Symbols Outlined** (see `src/components/Icon.tsx`'s Task 2 note for why). v1.1 asked engineers to hand-draw SVGs matching Material Symbols geometry — high friction, and the direct cause of every onboarding screen falling back to emoji instead. A real, maintained icon library removes that friction entirely.
- Filled variant reserved for active/selected states only.

### Category-row illustration exception (added 2026-09-24, dashboard redesign)

Category rows (Home dashboard's Categories section, and any category list/budget screen) may carry one soft, translucent, single-tone illustration of the category's real-world object — a bowl for Food, a bag for Shopping, a leaf for Groceries — bleeding from the row's trailing edge as a background texture. This is a narrow, named exception to the Overview's "no illustration or mascot" reference feel and to the Don'ts "no hand-rolled decorative SVGs" rule below — it does **not** reopen either rule anywhere else in the app (not the hero, not transactions, not accounts, not obligations, not onboarding).

Mandatory constraints:
- **One hue per category**, distinct from `accent-primary` — category color is identity, not a positive/confidence signal, so it must never read as the app's one accent.
- **Texture, not artwork.** Opacity capped low enough that the row's amount and progress bar stay fully legible over it at a glance — if a user has to look twice to read the number, the illustration is too loud.
- **Category rows only.** No illustration anywhere else in the app.
- **Flat, single-tone, line-art character.** No shading, no perspective, no gradient fill inside the illustration itself — a tinted silhouette or line drawing, not a rendered object.
- Exact per-category hues are an implementation decision, sampled from the approved reference comp when this pattern is built — not invented ahead of that.

## 9. Charts & Data Visualization

Priority order when representing data: Insight → Comparison → Narrative → Chart. A chart is the fallback when a sentence can't carry the information, not the default.

- Prefer: "Dining increased ₹3,400 this month, mostly Friday evenings" + small trend sparkline.
- Avoid: dashboards with 4+ simultaneous charts on one screen.

## 12. Empty States

Never "No data." Always frame as early-stage learning:
"We're still learning your financial patterns. Insights will appear as your timeline grows."

## 13. Accessibility (hard requirements, not optional polish)

- Minimum contrast: WCAG AA for all text against its background token.
- Full keyboard/screen-reader navigation support.
- Respect reduced-motion OS setting — fall back to instant Fade only.
- Touch targets: 44×44px minimum.
- Typography must scale with system font-size settings without breaking layout.

**Checked-and-confirmed rules from the 2026-09 onboarding claude-design exploration** (`docs/superpowers/specs/2026-09-17-onboarding-claude-design-decisions.md`) — these three items do not conflict with anything above:

- **CTA tap-target math**: a primary CTA using `padding:16px 24px` around 16px/600-weight label text renders at 16 + ~19 + 16 ≈ 51px tall. That clears the 44×44px minimum above with margin. Any future CTA padding change must be re-checked against 44px before shipping — do not assume it still clears just because the old one did.
- **Screen top padding is safe-area-relative, never a fixed number.** Use `useSafeAreaInsets().top + 16` (from `react-native-safe-area-context`), not a hardcoded px value — a fixed number only looks right on the one device it was eyeballed against (notch vs. Dynamic Island vs. none vary the real inset).
- **Numeric amount sizes are named steps, not one wide range**: a list-row amount, a subtotal, and a screen-level total are three distinct sizes, not "somewhere between 16 and 38px." When adding a new numeric role, name which of the three it is rather than picking an in-between size.

## 14. Hard Constraints — Never Generate

- Ad placements or sponsored content of any kind
- Cashback/rewards gamification (points, streaks, badges for spending)
- Gamified progress bars for financial goals (no confetti, no "level up")
- Social/sharing features (leaderboards, comparing spend with friends)
- Chart-heavy dashboards (3+ charts visible simultaneously)
- Red/alarm styling for routine spending patterns
- Chatbot-first AI interface
- Bouncy/springy/playful motion
