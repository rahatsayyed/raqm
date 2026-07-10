# DESIGN.md — Raqm Design Language (RDL)

Version 1.1 · Living document · Last updated July 2026
Optimized for AI-agent consumption — every screen must comply with these rules without re-explanation.
In code, all values below come from `src/theme` tokens (`Colors.*`, `Typography.*`, `Spacing.*`, `Radius.*`) — never hardcoded.

## 0. Product Context

Raqm is an SMS-based personal finance app for the Indian market (Android). It reads bank SMS, extracts transactions automatically, and presents financial understanding — not transaction lists. It is positioned as a Personal CFO, not an expense tracker.

Target user: earns money, rarely reviews finances, doesn't enjoy budgeting, wants clarity without effort, values privacy.

Reference feel: Apple Health (calm presentation of personal data) + Stripe (precision) + Mercury (editorial whitespace) + a premium leather financial journal — never a fintech dashboard, never a budgeting spreadsheet.

## 1. Non-Negotiable Principles

Apply these to every screen, in priority order:

1. **Silence is a feature.** If nothing important happened, show nothing. No filler UI, no "you're all caught up!" noise.
2. **Explain before visualizing.** A one-line insight ("Dining increased ₹3,400 this month, mostly Friday evenings") outranks a chart. Charts are last resort, not default.
3. **One screen, one question.** Home = what matters today / Timeline = what happened / Insights (Briefing) = why / Forecast = what's next / Recommendations = what should I do / Settings = what can I control. If a screen can't state its question in one sentence, cut it.
4. **Never shame, never guilt, never celebrate overspending.** Neutral, advisor-toned observations only.
5. **Density: minimal by default.** When in doubt, remove an element rather than add one.

## 2. Color System

Dark mode is primary (the app is dark-only). Neutral surfaces dominate; color carries meaning, never decoration.

### Core palette (dark theme — default)

| Token | Hex | Use |
|---|---|---|
| bg-base | `#0B120F` | App background |
| bg-surface | `#121A17` | Cards, sheets |
| bg-surface-raised | `#182420` | Nested cards, modals |
| border-subtle | `#243128` | Card borders, dividers (borders replace shadows) |
| text-primary (ink-headline) | `#F4F1EA` | Headings, key numbers |
| text-secondary (ink-body) | `#A9B3AC` | Body copy |
| text-tertiary (ink-label) | `#5C665F` | Timestamps, annotations |

### Accent / semantic roles

| Token | Hex | Emotion | Use |
|---|---|---|---|
| accent-primary (Spring Green) | `#52B788` | Trust / confidence | Primary actions, positive metrics, brand mark |
| accent-deep (Deep Evergreen) | `#1B4332` | Structure | Selected states, secondary containers |
| notice (Oxidized Copper) | `#B08159` | Awareness (not danger) | Flag something worth attention — never alarm-red |
| error (desaturated) | `#C1666B` | Honesty | Failed transactions, hard errors only |
| moss | `#7C9885` | Secondary structure | Tags, muted badges |

Rules:

- Green is never used for excitement or celebration — only confidence/positive-direction.
- notice (copper), not red, is the default "pay attention" color. Red is reserved for actual failures (declined payment, parsing error), not "you spent more than usual."
- No gradients except a single subtle radial glow behind hero numbers on Home — nothing else.

## 3. Typography

Typography carries the design — treat it as the primary visual element, not decoration around it.

**Font stack (FINAL — locked in):**

- **Inter** — the workhorse. Titles, body copy, section headers, labels, buttons: everything not listed below.
- **Fraunces** — headlines only. The editorial serif voice for Statement roles ("You spent more on dining this month.") and the wordmark.
- **JetBrains Mono** — every number and amount. Balances, transaction amounts, counters, OTP, stats. Mono guarantees column alignment; no tabular-figure workaround needed.
- **Material Symbols Outlined** — the icon reference set (see §8). In-app, icons are implemented as equivalent rounded-outline SVGs (`react-native-svg`), matching Material Symbols Outlined geometry.

**Type roles** (not H1/H2/Body — every style has a job). Token names are the `Typography.*` keys in `src/theme/typography.ts`:

| Role | Token | Font | Size / weight | Example |
|---|---|---|---|---|
| Statement | `statementLg` / `statementMobile` | Fraunces | 32/28px · 500 | "You spent more on dining this month." |
| Metric | `metricHero` | JetBrains Mono | 44px · 500 | "₹28,430" (Home hero) |
| Numeric | `numericXl/Lg/Md/Sm` | JetBrains Mono | 48/32/20/14px | All other amounts and stats |
| Section | `sectionHeader` | Inter | 13px uppercase · 600 · +letterspacing | "RECENT ACTIVITY" |
| Insight | `insightReading` | Inter | 17px · 500 | "Weekend dining increased 28%." |
| Reading | `bodyStandard` | Inter | 15px · 400 | Body copy |
| Supporting | `supportingText` | Inter | 13px · 400 | Secondary line under a Reading block |
| Annotation | `annotation` | Inter | 12px · 400, ink-label | "Updated 2 hours ago" |
| Label | `labelCaps` | Inter | 11px uppercase · 600 | Form field labels, badges |
| Mono label | `labelLg` / `labelSm` | JetBrains Mono | 14/12px | Data-adjacent labels: codes, tickers |

Legacy tokens (`displayLg`, `headlineMd/Sm`, `titleLg`, `bodyLg/Md/Sm`) remain for older screens and now resolve to Inter; prefer the RDL roles above for new work.

## 4. Layout & Grid

- 8pt base grid. Minimum screen margin: 20px (mobile).
- Whitespace should exceed the minimum comfortable amount — model after Apple, not Material Design density.
- Every screen has exactly one focal point above the fold.
- Cards summarize; they never contain everything. Design for "tap to expand," not "cram it in."

## 5. Shape

- Rounded rectangles only. Radius: 12px (cards), 8px (buttons/inputs), 20px (sheets/modals).
- Circles reserved exclusively for: avatars, profile images, chart nodes. Never for buttons or containers.
- Radius should read as engineered precision, not friendly/bubbly.

## 6. Elevation

- No drop shadows as the default elevation method. Layer hierarchy through spacing, border-subtle, and contrast between bg-surface levels instead.
- If a shadow is unavoidable (modals over content), keep it a soft, architectural, low-opacity shadow (`0 8px 24px rgba(0,0,0,0.24)`) — never a "floating card" look.

## 7. Motion

- Durations: 150–250ms for micro-interactions, 300–400ms for screen transitions.
- Easing: ease-out for entrances, ease-in for exits. No spring/elastic/bounce curves — ever.
- Motion vocabulary: Appear, Fade, Reveal, Lift, Focus, Transition, Collapse. Don't invent new motion patterns outside this set without updating this doc.
- Motion exists only to explain a state change (a number updating, a card expanding). Never decorative.

## 8. Iconography

- Reference set: **Material Symbols Outlined** — rounded outline, ~2px stroke weight.
- In-app implementation: SVG equivalents in `src/components/TabIcon.tsx` (`react-native-svg`), drawn to match Material Symbols Outlined geometry. No icon font is bundled.
- Filled variant reserved for active/selected states only.
- No emoji-style icons. No multi-color icons. Icons support text labels — never replace them on primary actions.

## 9. Charts & Data Visualization

Priority order when representing data: Insight → Comparison → Narrative → Chart. A chart is the fallback when a sentence can't carry the information, not the default.

- Prefer: "Dining increased ₹3,400 this month, mostly Friday evenings" + small trend sparkline.
- Avoid: pie charts, multi-series bar charts, dashboards with 4+ simultaneous charts on one screen.
- When a chart is used, it supports a stated insight directly above it — never stands alone.

## 10. Component Behavior Rules

State each component's job, not just its appearance:

- **Cards** — summarize and invite exploration. Never the full data dump.
- **Buttons** — commit an action.
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

Rules: never shame, never celebrate overspending, never manufacture urgency. Prefer simple language over technically precise language when both communicate equally.

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
