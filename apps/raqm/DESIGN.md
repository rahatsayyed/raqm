# DESIGN.md — Raqm Design Language (RDL)

Version 3.0 · Living document · Rebuilt 2026-09-20
Optimized for AI-agent consumption — every screen must comply with these rules without re-explanation.
In code, all values below come from `src/theme` tokens (`Colors.*`, `Typography.*`, `Spacing.*`, `Radius.*`) — never hardcoded.

**v3.0 note:** color (§2), typography (§3), shape (§5), and elevation (§6)
are replaced with the values locked during the 2026-09 onboarding
claude-design exploration
(`docs/superpowers/specs/2026-09-17-onboarding-claude-design-decisions.md`).
That exploration also designed a light mode; **this app stays dark-only** —
adding a light mode is a separate product decision this rewrite does not
make, so only the exploration's dark-mode values are adopted here. Some
tokens below (marked "derived") were not literally specified for a
production app-wide scale by the exploration — it only fixed a handful of
onboarding-screen values — so this doc extends them at the same ratios the
old v2.0 scale used, rather than inventing new ones freely. Product/UX
principles that were never in question (§0, §1, §11–§16) remain unchanged
from v2.0.

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

## 2. Color System (v3.0 — from the onboarding claude-design exploration)

Dark mode is the only mode (app scope — the exploration also designed a
light mode, not adopted here; see the v3.0 note above). The palette keeps
the same "one precise accent on a near-black ground" family as v2.0's
Forest system, re-derived from the exploration's onboarding screens rather
than kept as v2.0 wrote it.

Discipline unchanged from v2.0: **one accent color, used sparingly, never
decoratively.** No gradients anywhere except one radial glow behind the
Home hero number — the single sanctioned exception in the entire app.

### Core palette

| Token | Hex | Use | Source |
|---|---|---|---|
| bg-base | `#0B0C0E` | App background — warm near-black, never pure `#000000` | Exploration §5.1, dark background |
| bg-surface | `#15171A` | Cards, sheets | Exploration §5.1, dark card surface |
| bg-surface-raised | `#1C1F23` | Nested cards, modals | Derived — one step lighter than bg-surface, same ratio v2.0 used |
| border-subtle | `rgba(255,255,255,0.12)` | Card borders, dividers (borders replace shadows) | Exploration §5.1, dark hairline token |
| ink-headline | `#F2F1EC` | Headings, key numbers — warm off-white, never pure `#FFFFFF` | Exploration §5.1, dark primary text |
| ink-body | `#B7B6AE` | Body copy | Exploration §5.1, dark secondary text |
| ink-label | `#6B6A62` | Timestamps, annotations | Derived — exploration didn't define a third text tier; kept v2.0's label-vs-body contrast ratio |

### Accent / semantic roles

| Token | Hex | Emotion | Use | Source |
|---|---|---|---|---|
| accent-primary | `#66CCAC` | Trust / confidence | Primary actions, positive metrics, brand mark — the ONE accent, used sparingly | Exploration's locked dark-mode CTA color, hue-locked to the light-mode brand green and verified at 9.5:1 contrast against `#14140F` text |
| accent-deep | `#1F4A3B` | Structure | Selected states, secondary containers | Derived — same hue (161°) as accent-primary at lower lightness, not a literal exploration value |
| notice | `#D9A85C` | Awareness (not danger) | Flag something worth attention — never alarm-red | Exploration's Permissions-screen location icon color |
| error-muted | `#E08672` | Honesty | Failed transactions, hard errors only | Exploration §12, borrowed dark-mode error tint |

Note: `error` (`#ffb4ab`) is the legacy MD3 token, still in code for
back-compat — `error-muted` is the correct token name for new work.

Rules (unchanged from v2.0):

- One accent color per screen, used identically everywhere it appears (the same green in a button is the same green in a positive metric — no per-screen accent drift).
- Green is never used for excitement or celebration — only confidence/positive-direction.
- notice (amber), not red, is the default "pay attention" color. Red is reserved for actual failures (declined payment, parsing error), not "you spent more than usual."
- No gradients except the single radial glow behind the Home hero number — nowhere else, no exceptions.

## 3. Typography (v3.0 — from the onboarding claude-design exploration)

Typography carries the design — treat it as the primary visual element, not decoration around it.

**Font stack:**

- **Newsreader (italic)** — display / headline role only (screen titles, hero headline). Replaces Inter for this one role.
- **Instrument Sans** — body, labels, buttons, section headers. Replaces Inter everywhere else.
- **JetBrains Mono** — every number and amount, unchanged from v2.0. Balances, transaction amounts, counters, OTP, stats.
- **Material Symbols Outlined**, implemented via `@expo/vector-icons`'s `MaterialCommunityIcons` — unchanged from v2.0 (see §8).

**Why the swap:** the exploration deliberately avoided reusing Inter
because it's a flagged AI-default typeface, and picked a serif display
face (Newsreader, italic) over a neutral sans (Instrument Sans) for body —
the same "distinctive display + neutral workhorse" split Copilot Money and
Apple both use, just with a serif carrying the display role instead of
tracking/weight tricks on a sans face. This reverses v2.0's own explicit
decision to drop Fraunces — that reversal is intentional, re-argued here,
not an oversight: v2.0 dropped Fraunces because Apple/Stripe don't use a
serif; this exploration instead treats the serif itself as the signature
element (craft-lens "one signature element, everything else quiet"), so
the two decisions optimize for different things and this one wins in v3.0.

**Weight discipline:** Newsreader 400 (italic only, headlines); Instrument
Sans 400/500/600; JetBrains Mono 500/600 for numbers. Avoid weights lighter
than 400 at any text size — `typography.md`'s legibility guidance flags
light/thin weights as a legibility risk, especially small.

**Type roles** (not H1/H2/Body — every style has a job). Sizes below are the
exploration's locked §10 scale; `Typography.*` token names in
`src/theme/typography.ts` should be renamed/remapped to match on
implementation, not layered on top as new tokens:

| Role | Font | Size / weight | Example |
|---|---|---|---|
| Display / hero | Newsreader italic | 40px · 400 | The one screen that earns the largest size — first impression (e.g. Welcome) |
| Display / screen title | Newsreader italic | 26–30px · 400 | Every other screen's headline |
| Body / supporting text | Instrument Sans | 15–16px · 400 | Comfortably above the 11pt floor |
| Body / card label | Instrument Sans | 12–14px · 600 | Bumped to Semibold near the small end — weight compensates for size |
| Caption / secondary line | Instrument Sans | 11–12px · 400 | At or just above the 11px floor — smallest text in the system, never smaller |
| Metric / numeric hero | JetBrains Mono | 44px · 600 | "₹28,430" (Home hero, scan count-up) |
| Numeric / list-row amount | JetBrains Mono | 16px · 600 | Per-transaction/per-category amount in a row |
| Numeric / subtotal | JetBrains Mono | 22px · 600 | A category or section subtotal |
| Numeric / screen total | JetBrains Mono | 34px · 600 | The one large total on a screen — distinct from the 44px hero, which appears once |
| Section | Instrument Sans | 13px uppercase · 600 | "RECENT ACTIVITY" |
| Label | Instrument Sans | 11px uppercase · 600 | Form field labels, badges, step counters |

Legacy tokens (`displayLg`, `headlineMd/Sm`, `titleLg`, `bodyLg/Md/Sm`,
`statementLg`, `insightReading`) map to the roles above by size/weight, not
by name — expect a token rename pass, not a silent value swap, when this is
implemented. `Fraunces` stays retired from the dependency tree; Newsreader
is a new font dependency this rewrite introduces.

## 4. Layout & Grid

- 8pt base grid. Minimum screen margin: 20px (mobile). Re-confirmed, not inherited by default — Apple and Stripe both use an 8px base independently, so this is correct baseline practice, not v1.1 residue.
- Whitespace should exceed the minimum comfortable amount — model after Apple, not Material Design density.
- Every screen has exactly one focal point above the fold.
- Cards summarize; they never contain everything. Design for "tap to expand," not "cram it in."

## 5. Shape (v3.0 — from the onboarding claude-design exploration)

**The radius scale shrinks and the CTA is no longer a pill.** This is the
single biggest visual-philosophy change in v3.0: v2.0 reserved the
maximum radius (a full pill) for CTAs specifically so shape alone made the
primary action unambiguous. The exploration's locked scale gives the CTA a
*smaller* radius than the cards around it instead — a deliberate "nothing
shouts, color alone signals the action" trade-off, decided and written
down as a trade-off, not an accident (see the exploration doc's §6.1).

Values below replace `tailwind.config.js`'s `borderRadius` scale entirely —
old values on the left are what v2.0 shipped, for migration reference:

| Token | Old (v2.0) | New (v3.0) | Use |
|---|---|---|---|
| `radius-outer` | `radius-lg` 12px | **6px** | Outer container / glass card |
| `radius-inner` | `radius-md` 8px | **4px** | Inner cell, button, input |
| `radius-cta` | `radius-pill` 9999px | **3px** | Primary CTA — no longer a pill; smaller than `radius-inner` on purpose (see above) |
| `radius-dot` | *(none — dots had no dedicated token)* | **1px** | Progress dots, tiny indicators |

`radius-sm`/`radius-xl`/`radius-2xl`/`radius-3xl` (4/16/24/32px) had no
equivalent in the exploration's locked scale — it only fixed four values
for onboarding screens, not a full app-wide scale. Keep those legacy
values for anything that isn't one of the four roles above until they are
explicitly revisited.

Circles remain reserved exclusively for: avatars, profile images, chart
nodes — never for buttons or containers. Radius should read as engineered
precision, not friendly/bubbly — the new scale intensifies that intent
rather than reversing it.

## 6. Elevation (v3.0 — no shadow token at all)

**v2.0's one-shadow-token rule is retired, not just narrowed.** The
exploration's model (`materials.md`'s own elevation vocabulary) is blur and
translucency, never a drop shadow layered under an element — depth comes
from how much of the background shows through, not a shadow drawn under
it.

- No drop shadows anywhere, including modals — the previous exception
  (`0 8px 24px rgba(0,0,0,0.28)` for modals) is removed. Replace it with a
  translucent glass surface instead (below).
- **One glass surface per screen, never stacked**: `background:
  rgba(255,255,255,0.06)`, `backdrop-filter: blur(24px) saturate(1.3)`,
  `border: 1px solid rgba(255,255,255,0.12)` (the border-subtle token),
  `inset 0 1px 0 rgba(255,255,255,0.08)` for a top highlight. Use it for
  the one elevated container on a screen — a modal, a sheet, an onboarding
  decision card — never for ordinary content cards, which stay flat
  `bg-surface` with no blur.
- Library: `expo-blur`, already how the exploration built this — no new
  dependency needed. Ordinary card-to-card hierarchy still comes from
  spacing, border-subtle, and contrast between `bg-surface` levels, as in
  v2.0 — only the *elevated-layer* case changes.

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
- **Buttons** — commit an action. Primary CTAs use `radius-cta` (3px, §5) with `padding:16px 24px` — no longer a pill (v3.0 change).
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

**Checked-and-confirmed rules from the 2026-09 onboarding claude-design
exploration** (`docs/superpowers/specs/2026-09-17-onboarding-claude-design-decisions.md`)
— these three items do not conflict with anything above, so they are
promoted into this doc directly rather than left exploration-only:

- **CTA tap-target math**: a primary CTA using `padding:16px 24px` around
  16px/600-weight label text renders at 16 + ~19 + 16 ≈ 51px tall. That
  clears the 44×44px minimum above with margin. Any future CTA padding
  change must be re-checked against 44px before shipping — do not assume
  it still clears just because the old one did.
- **Screen top padding is safe-area-relative, never a fixed number.** Use
  `useSafeAreaInsets().top + 16` (from `react-native-safe-area-context`),
  not a hardcoded px value — a fixed number only looks right on the one
  device it was eyeballed against (notch vs. Dynamic Island vs. none vary
  the real inset).
- **Numeric amount sizes are named steps, not one wide range**: a
  list-row amount, a subtotal, and a screen-level total are three
  distinct sizes, not "somewhere between 16 and 38px." When adding a new
  numeric role, name which of the three it is rather than picking an
  in-between size.

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
