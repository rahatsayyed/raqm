# DESIGN.md — Raqm Design Language (RDL)

Version 2.0 · Living document · Rebuilt 2026-09-16
Optimized for AI-agent consumption — every screen must comply with these rules without re-explanation.
In code, all values below come from `src/theme` tokens (`Colors.*`, `Typography.*`, `Spacing.*`, `Radius.*`) — never hardcoded.

**v2.0 note:** v1.1's visual system (color, typography, shape, motion) was written
quickly and never checked against real reference systems. v2.0 rebuilds those
sections from studying 15 finance apps praised for onboarding/UI (Copilot
Money, Monarch, YNAB, Cleo, Revolut, N26, Wise, Apple Card/Wallet, and others)
and the actual concrete design systems Apple and Stripe publish, plus general
anti-slop UI critique. Nothing here was carried over by default — every value
below is a deliberate, re-justified choice, not inertia from v1.1. Product/UX
principles that were never in question (§0, §1, §11–§16) are unchanged.

## 0. Product Context

Raqm is an SMS-based personal finance app for the Indian market, expanding to
iPhone (manual entry / PDF import, since iOS cannot read SMS). It reads bank
SMS, extracts transactions automatically, and presents financial
understanding — not transaction lists. It is positioned as a Personal CFO,
not an expense tracker.

Target user: earns money, rarely reviews finances, doesn't enjoy budgeting,
wants clarity without effort, values privacy.

Reference feel: Copilot Money's typography-led editorial precision (the
closest real-world match — dark canvas, no illustration/mascot, tight
tracking) + Apple's restraint (one accent, one shadow, no decoration) +
Stripe's numeric precision (tabular figures, negative tracking as a
"financial DNA" signal) — never a fintech dashboard, never a budgeting
spreadsheet, never a bubbly consumer app (Monarch's gamified/celebratory
style is the explicit anti-reference).

## 1. Non-Negotiable Principles

Apply these to every screen, in priority order:

1. **Silence is a feature.** If nothing important happened, show nothing. No filler UI, no "you're all caught up!" noise.
2. **Explain before visualizing.** A one-line insight ("Dining increased ₹3,400 this month, mostly Friday evenings") outranks a chart. Charts are last resort, not default.
3. **One screen, one question.** Home = what matters today / Timeline = what happened / Insights (Briefing) = why / Forecast = what's next / Recommendations = what should I do / Settings = what can I control. If a screen can't state its question in one sentence, cut it.
4. **Never shame, never guilt, never celebrate overspending.** Neutral, advisor-toned observations only.
5. **Density: minimal by default.** When in doubt, remove an element rather than add one.

## 2. Color System (rebuilt)

Dark mode is the only mode. The palette is "Forest, refined" — deep green
structure with one precise accent, chosen deliberately because it already
matches a legitimate non-generic premium-consumer family (deep green + bone +
amber, as opposed to the AI-default beige/brass/oxblood palette common to
"premium" briefs) — not because it's what the app already had. Every value
below is freshly derived, not copied from v1.1.

Discipline borrowed directly from Apple and Stripe: **one accent color, used
sparingly, never decoratively.** No gradients anywhere except one radial glow
behind the Home hero number — this is the single sanctioned exception in the
entire app, and it exists nowhere else.

### Core palette

| Token | Hex | Use |
|---|---|---|
| bg-base | `#0A0E0C` | App background — warm near-black, never pure `#000000` |
| bg-surface | `#10140F` | Cards, sheets |
| bg-surface-raised | `#161C15` | Nested cards, modals |
| border-subtle | `#232B22` | Card borders, dividers (borders replace shadows) |
| ink-headline | `#F2F0E9` | Headings, key numbers — warm off-white, never pure `#FFFFFF` |
| ink-body | `#9FA89C` | Body copy |
| ink-label | `#5B635A` | Timestamps, annotations |

### Accent / semantic roles

| Token | Hex | Emotion | Use |
|---|---|---|---|
| accent-primary | `#3EBD7E` | Trust / confidence | Primary actions, positive metrics, brand mark — the ONE accent, used sparingly |
| accent-deep | `#173325` | Structure | Selected states, secondary containers |
| notice | `#C68B4D` | Awareness (not danger) | Flag something worth attention — never alarm-red |
| error-muted | `#C4707A` | Honesty | Failed transactions, hard errors only |

Note: `error` (`#ffb4ab`) is the legacy MD3 token, still in code for
back-compat — `error-muted` is the correct v2.0 token name for new work.

Rules:

- One accent color per screen, used identically everywhere it appears (the same green in a button is the same green in a positive metric — no per-screen accent drift).
- Green is never used for excitement or celebration — only confidence/positive-direction.
- notice (amber), not red, is the default "pay attention" color. Red is reserved for actual failures (declined payment, parsing error), not "you spent more than usual."
- No gradients except the single radial glow behind the Home hero number — nowhere else, no exceptions.
- The secondary "moss" tier from v1.1 is retired — fewer color tokens means fewer places accent discipline can leak.

## 3. Typography (rebuilt)

Typography carries the design — treat it as the primary visual element, not decoration around it.

**Font stack:**

- **Inter** — every role. Titles, body copy, statements, section headers, labels, buttons. No serif anywhere.
- **JetBrains Mono** — every number and amount. Balances, transaction amounts, counters, OTP, stats. Mono guarantees column alignment; no tabular-figure workaround needed.
- **Material Symbols Outlined**, implemented via `@expo/vector-icons`'s `MaterialCommunityIcons` — not hand-drawn SVGs (see §8).

**v1.1 used Fraunces (a serif) for headline "Statement" copy — retired in v2.0.**
Studying Raqm's own named references (Apple, Stripe) showed neither uses a
serif anywhere; both build "editorial premium" through negative tracking and
weight choice on a sans font alone. A display serif for a "creative/editorial"
brief is also a specifically flagged default pattern in UI-taste critique —
reaching for it here was inertia, not a considered choice. Dropped.

**Weight discipline:** Inter 300 / 400 / 600 / 700 only. Weight 500 is
deliberately omitted, the same way Apple's system omits an equivalent
mid-weight — a small precision device that keeps the type scale from feeling
generic.

**Tracking discipline (new):** large text gets negative letter-spacing,
tightening as size increases — the concrete mechanism Apple and Stripe both
use to signal precision instead of a serif:

| Size | Tracking |
|---|---|
| 44px+ (Metric hero) | -1.0px to -1.2px |
| 32px (Statement) | -0.6px to -0.8px |
| 20-24px | -0.3px |
| Below 20px | 0 (no tracking adjustment) |

**Type roles** (not H1/H2/Body — every style has a job). Token names are the `Typography.*` keys in `src/theme/typography.ts`:

| Role | Token | Font | Size / weight / tracking | Example |
|---|---|---|---|---|
| Statement | `statementLg` / `statementMobile` | Inter | 32/28px · 300 · -0.6px | "You spent more on dining this month." |
| Metric | `metricHero` | JetBrains Mono | 44px · 500 · -1.0px | "₹28,430" (Home hero) |
| Numeric | `numericXl/Lg/Md/Sm` | JetBrains Mono | 48/32/20/14px | All other amounts and stats |
| Section | `sectionHeader` | Inter | 13px uppercase · 600 · +letterspacing | "RECENT ACTIVITY" |
| Insight | `insightReading` | Inter | 17px · 600 | "Weekend dining increased 28%." |
| Reading | `bodyStandard` | Inter | 15px · 400 | Body copy |
| Supporting | `supportingText` | Inter | 13px · 400 | Secondary line under a Reading block |
| Annotation | `annotation` | Inter | 12px · 400, ink-label | "Updated 2 hours ago" |
| Label | `labelCaps` | Inter | 11px uppercase · 600 | Form field labels, badges, step counters |
| Mono label | `labelLg` / `labelSm` | JetBrains Mono | 14/12px | Data-adjacent labels: codes, tickers |

Legacy tokens (`displayLg`, `headlineMd/Sm`, `titleLg`, `bodyLg/Md/Sm`) remain
in active use by several reskinned screens (DateRange, AccountSelection,
ScanComplete, SignUp, OTPVerification, NameEntry) — prefer the RDL roles
above for new work, but this is not a "retired, do not use" list. `Fraunces`
(`font-fraunces`) is the one genuinely retired piece: it's fully removed
from the dependency tree and used nowhere in code.

## 4. Layout & Grid

- 8pt base grid. Minimum screen margin: 20px (mobile). Re-confirmed, not inherited by default — Apple and Stripe both use an 8px base independently, so this is correct baseline practice, not v1.1 residue.
- Whitespace should exceed the minimum comfortable amount — model after Apple, not Material Design density.
- Every screen has exactly one focal point above the fold.
- Cards summarize; they never contain everything. Design for "tap to expand," not "cram it in."

## 5. Shape (rebuilt)

A precise numeric scale, not an arbitrary pair of values — the Apple/Stripe pattern is a real scale from sharp to pill, with pill reserved exclusively for the most "transactional" elements (CTAs, chips):

Values below mirror `tailwind.config.js`'s actual `borderRadius` scale —
this table describes the real scale in code, not an aspirational one:

| Token | Radius | Use |
|---|---|---|
| `radius-sm` | 4px | Inline chips, small tags |
| `radius-md` | 8px | Buttons, inputs |
| `radius-lg` | 12px | Cards |
| `radius-xl` | 16px | Sheets, modals |
| `radius-2xl` | 24px | Larger sheets |
| `radius-3xl` | 32px | Rare, full-bleed containers |
| `radius-pill` (9999px, via `rounded-full`) | — | Primary CTA buttons only — never cards, never containers |

Circles reserved exclusively for: avatars, profile images, chart nodes. Never for buttons or containers. Radius should read as engineered precision, not friendly/bubbly.

## 6. Elevation (rebuilt: one shadow token, not several)

- No drop shadows as the default elevation method. Layer hierarchy through spacing, border-subtle, and contrast between bg-surface levels instead — matches Apple's "no shadows on cards/buttons/text/chrome" rule exactly.
- **Exactly one shadow value exists in this system:** `0 8px 24px rgba(0,0,0,0.28)`, used only where elevation is unavoidable (modals over content, the one exception image/hero treatment). No screen may define its own shadow color, opacity, or radius — if a screen currently has a custom shadow object, it is a bug to fix, not a variant to keep.

## 7. Motion

- Durations: 150–250ms for micro-interactions, 300–400ms for screen transitions.
- Easing: ease-out for entrances, ease-in for exits. No spring/elastic/bounce curves — ever. (Apple's own system documents exactly one motion device system-wide — a 0.95 press-scale — reinforcing that restraint, not variety, reads as premium.)
- Motion vocabulary: Appear, Fade, Reveal, Lift, Focus, Transition, Collapse. Don't invent new motion patterns outside this set without updating this doc.
- Motion exists only to explain a state change (a number updating, a card expanding). Never decorative. Every animation must be justifiable in one sentence (hierarchy, storytelling, feedback, or state transition) — "it looked nice" is not a reason.
- Implementation: `react-native-reanimated` v4, per the `creating-reanimated-animations` skill in `.claude/skills/` — see that skill's "Project notes (Raqm)" section for the exact mapping from this vocabulary to Reanimated APIs.

## 8. Iconography (rebuilt)

- Reference set: **Material Symbols Outlined** — rounded outline, ~2px stroke weight.
- **In-app implementation: `MaterialCommunityIcons` via `@expo/vector-icons`, standing in for Material Symbols Outlined** (see `src/components/Icon.tsx`'s Task 2 note for why). v1.1 asked engineers to hand-draw SVGs matching Material Symbols geometry — high friction, and the direct cause of every onboarding screen falling back to emoji instead. A real, maintained icon library removes that friction entirely.
- Filled variant reserved for active/selected states only.
- No emoji-style icons, anywhere, ever. No multi-color icons. Icons support text labels — never replace them on primary actions.

## 9. Charts & Data Visualization

Priority order when representing data: Insight → Comparison → Narrative → Chart. A chart is the fallback when a sentence can't carry the information, not the default.

- Prefer: "Dining increased ₹3,400 this month, mostly Friday evenings" + small trend sparkline.
- Avoid: pie charts, multi-series bar charts, dashboards with 4+ simultaneous charts on one screen.
- When a chart is used, it supports a stated insight directly above it — never stands alone.

## 10. Component Behavior Rules

State each component's job, not just its appearance:

- **Cards** — summarize and invite exploration. Never the full data dump.
- **Buttons** — commit an action. Primary CTAs use `radius-pill`; nothing else does.
- **Links** — navigate.
- **Badges** — classify (never used for CTAs).
- **Inputs** — ask for one thing at a time.
- **AI cards** — recommend or surface an insight; always show confidence level or source when possible (see §12).

## 11. Copywriting Voice

Write like a calm private wealth advisor. Never like marketing.

| Instead of | Say |
|---|---|
| "Expense Breakdown" | "Where your money went" |
| "Analytics" | "What changed" |
| "No data" | "We're still learning your financial patterns" |

Rules: never shame, never celebrate overspending, never manufacture urgency. Prefer simple language over technically precise language when both communicate equally. Avoid filler verbs ("Elevate", "Unleash", "Revolutionize") — use concrete verbs.

## 12. AI Presentation Rules

- AI should feel invisible — the user's reaction should be "of course it knows that," never "whoa, AI did that."
- Tone: calm, professional, first-person-observational. Not "Hey 👋" — instead: "I noticed something worth your attention."
- Always infer before asking. Only prompt the user when inference genuinely isn't possible.
- When confidence is low, say so plainly ("This looks like a subscription, but I'm not fully sure") — never present a guess as fact.
- No AI chatbot UI searching for problems to surface. Insights are pushed contextually, not via open-ended chat-first UX.

## 13. Empty States

Never "No data." Always frame as early-stage learning:
"We're still learning your financial patterns. Insights will appear as your timeline grows."

## 14. Accessibility (hard requirements, not optional polish)

- Minimum contrast: WCAG AA for all text against its background token.
- Full keyboard/screen-reader navigation support.
- Respect reduced-motion OS setting — fall back to instant Fade only.
- Touch targets: 44×44px minimum.
- Typography must scale with system font-size settings without breaking layout.

## 15. Hard Constraints — Never Generate

- Ad placements or sponsored content of any kind
- Cashback/rewards gamification (points, streaks, badges for spending)
- Gamified progress bars for financial goals (no confetti, no "level up")
- Social/sharing features (leaderboards, comparing spend with friends)
- Chart-heavy dashboards (3+ charts visible simultaneously)
- Red/alarm styling for routine spending patterns
- Chatbot-first AI interface
- Bouncy/springy/playful motion
- Emoji icons, hand-rolled decorative SVGs, gradients outside the one sanctioned Home glow, per-screen custom shadows

## 16. Screen → Question Map

| Screen | Must answer |
|---|---|
| Home | What matters today? |
| Timeline | What happened? |
| Insights (Briefing) | Why did it happen? |
| Forecast | What happens next? |
| Recommendations | What should I do? |
| Settings | What can I control? |

Any screen that can't be mapped to one of these questions should not exist.
