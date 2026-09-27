---
name: Raqm (marketing site)
description: The pre-launch Persuade front door to Raqm, in Raqm's own brand — light-only, glass/bento, one accent.
colors:
  accent-primary: "#2E5D4E"
  accent-deep: "#DCE9E3"
  bg: "#F7F6F3"
  surface: "#FFFFFF"
  surface-raised: "#EFEDE8"
  border-subtle: "rgba(20, 20, 20, 0.08)"
  ink-headline: "#14140F"
  ink-body: "#4A4A45"
  ink-label: "#8A8880"
  notice: "#B8813C"
  error-muted: "#B4483A"
  glass-bg: "rgba(255, 255, 255, 0.55)"
  glass-highlight: "rgba(255, 255, 255, 0.6)"
typography:
  display:
    fontFamily: "Newsreader, serif"
    fontWeight: 400
    letterSpacing: "normal"
  body:
    fontFamily: "Instrument Sans, sans-serif"
    fontWeight: 400
  mono:
    fontFamily: "JetBrains Mono, monospace"
    fontWeight: 500
rounded:
  outer: "6px"
  inner: "4px"
  cta: "3px"
  dot: "1px"
spacing:
  section-x: "24px"
  section-y: "64px"
  card-gap: "16px"
components:
  button-primary:
    backgroundColor: "{colors.accent-primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.cta}"
    padding: "16px 24px"
  glass-card:
    backgroundColor: "{colors.glass-bg}"
    rounded: "{rounded.outer}"
    padding: "24px"
  input-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-headline}"
    rounded: "{rounded.inner}"
    padding: "16px"
---

# Design System: Raqm Marketing Site

## Overview

This is not a new visual identity. It is Raqm's existing brand system —
the same colors, type pairing, and glass/bento grammar `apps/raqm/DESIGN.md`
v4.0 defines — carried onto a Persuade surface for people who can't yet
open the app. Where the app is dark-only (onboarding excepted), this site
runs the light-mode `onb-*` values full-time: a deliberate, confirmed
divergence for this surface, not a reversal of the app's dark-only rule.

The site now has a real motion and depth grammar, not just a static
glass/bento layout. Three things carry it: a persistent **background
depth layer** (`BackgroundDepth`, mounted once in the root layout) of
blurred, low-opacity color blobs sitting fixed behind every route; **Lenis
smooth scroll** (`SmoothScrollProvider`) governing how the whole page
moves under the cursor/wheel/touch, in place of native scroll; and a
GSAP-driven motion system layered on top — every major section fades and
rises into place once on first scroll into view (`ScrollReveal`), and the
Hero additionally runs a three-layer scroll- and pointer-driven parallax
(`HeroParallax`). All three motion primitives check
`prefers-reduced-motion` independently and degrade to a fully static,
fully visible page — this is a hard invariant, not a nice-to-have, and
any future motion addition on this surface must carry the same check.

Two pieces of "technical chrome" run through every section: a small
sequential `NN / 04` marker (font-mono, faint) opening each major section,
and a tiny two-line SVG crosshair ("+") echoing a blueprint/technical-
drawing mark at a couple of key spots (the Hero corner, the "Why Raqm"
heading). Neither is functional; both exist purely to reinforce the
"engineered precision" character the type and shape language already
carry.

Per-surface composition (which structure a given page's first viewport
uses, the exact hero layout, its signature interaction) is deliberately
not recorded here — that's route-specific strategy, not durable
world-level identity. It lives in each surface's own brief under
`.impeccable/surfaces/` (see `apps/web/.impeccable/surfaces/apps-web-src-app-page-tsx.md`
for the home page's confirmed direction).

**Imagery stance, updated:** no photography or illustration anywhere on
this surface — that constraint still holds exactly as confirmed. The
device-mockup part of the original "no device mockups this round"
constraint has since been superseded by an explicit, confirmed decision:
the Hero now ships `PhoneMockup`, a hand-built CSS/SVG recreation of the
app's own Dashboard screen (no photo, no image asset, no illustration).
It doesn't reopen the photography/illustration door; it's the one
exception, and it was built, not photographed.

**Key Characteristics:**
- Same brand as the app: one accent (`#2E5D4E`), used identically
  everywhere it appears, never decoratively.
- Light-only for this surface, reusing the `onb-*` token values as the
  primary and only palette (not a secondary/dark variant of them).
- Depth from translucency and blur, never drop shadows — now expressed at
  two layers: an ambient fixed background glow (`BackgroundDepth`) and the
  foreground glass-card treatment.
- One persistent motion system (Lenis smooth scroll + GSAP scroll-reveals
  + Hero parallax), universally reduced-motion-safe.
- A shrinking radius scale where the primary CTA gets a *smaller* radius
  than the cards around it — color, not shape, signals the action.
- No photography or illustration anywhere; the one device mockup that
  exists is CSS/SVG, not an image asset.

## Colors

One accent, used identically everywhere; amber for attention, muted red
reserved for real failures (a failed signup submission), never for
routine states. Values below are the app's existing `onb-*` light tokens
(`apps/raqm/DESIGN.md` v4.0), adopted here as the site's primary palette,
not a secondary one, and are the literal `--color-*` custom properties
declared once in `src/app/globals.css`'s `@theme inline` block — every
component consumes them by name, nothing is redeclared or hardcoded.

### Primary
- **Accent (deep green)** (`#2E5D4E`): the one accent — CTA fill, links,
  active/selected states, the JetBrains Mono numeric signature moment.
- **Accent deep / selected** (`#DCE9E3`): selected/active surface tint
  behind the accent, never a second competing color.

### Neutral
- **Background** (`#F7F6F3`): page background.
- **Surface** (`#FFFFFF`): flat (non-glass) card background.
- **Surface raised / glass base** (`#EFEDE8`): the base tone glass tiles
  sit on.
- **Border / hairline** (`rgba(20,20,20,0.08)`): dividers, card edges.
- **Headline ink** (`#14140F`): headings, hero copy.
- **Body ink** (`#4A4A45`): body copy.
- **Label ink** (`#8A8880`): labels, captions, section eyebrows, the `NN
  / 04` section markers and crosshair marks (both at 40% opacity on top of
  this ink).
- **Glass fill** (`rgba(255,255,255,0.55)`): the translucent tint layer
  every bento tile is built from.
- **Glass top highlight** (`rgba(255,255,255,0.6)`): the 1px highlight
  along a glass tile's top edge.

### Notice / Error
- **Notice (amber)** (`#B8813C`): "pay attention," used sparingly.
- **Error (muted)** (`#B4483A`): real failures only (e.g. signup
  submission error) — never routine or validation-adjacent states.

### Named Rules
**The One Accent Rule.** `#2E5D4E` is the only accent on the page. It
never shares a screen with a second saturated color; amber and muted-red
exist only for their named notice/error roles, never as decoration.

**The One Ambient Layer Rule.** `BackgroundDepth`'s three blurred blobs
(mixed down from accent-primary, notice, and accent-deep at 3–55%
opacity via `color-mix`) are the page's one persistent background
treatment, mounted once in the root layout. No section adds its own
background gradient or glow on top of it.

## Typography

**Display Font:** Newsreader (italic only) — hero headline, section
titles, deep-dive page titles.
**Body Font:** Instrument Sans — body copy, labels, buttons, nav, card
titles (set upright, not italic, even though it inherits the `h1`/`h2`/
`h3` italic rule where used directly on a heading element).
**Numeric/Mono Font:** JetBrains Mono — the site's own copy reserves it
for exactly one emphasized numeric moment (the "**120+**" banks count in
the Hero, a static figure, not animated); see the Phone Mockup exception
below, and the `NN / 04` section markers, for the other places mono
appears as chrome rather than content.

**Character:** the same pairing the app uses — a serif italic display
face supplies the one signature typographic gesture per view; a neutral
sans carries everything else without competing for attention.

### Hierarchy (as implemented)
- **Display / Hero** (400, italic, 36px→48px responsive `text-4xl
  sm:text-5xl`): the one `<h1>` on the home page.
- **Display / Section** (400, italic, 24px→30px `text-2xl sm:text-3xl`):
  every section heading (`Why Raqm`, `Everything you need, free`, `Go
  deeper`, `Get early access`) and the deep-dive page's own `<h1>` (36px
  `text-4xl` there, since it plays the hero role on that route).
- **Title / Card** (600, upright, 16px `text-base`): glass-card and
  flagship-tile titles.
- **Body** (400, 16–18px `text-base`/`text-lg`): paragraph copy, deep-dive
  body paragraphs, card body text (14px `text-sm` inside denser bento
  cards).
- **Label** (400–500, 12–14px `text-xs`/`text-sm`, often at reduced
  opacity): section eyebrows, form labels, footer nav, status badges.
- **Numeric signature** (600, 18px `text-lg`, JetBrains Mono): the static
  "120+" count in the Hero — the site's one intentional mono content
  moment.

### Named Rules
**The One Signature Rule.** JetBrains Mono appears as content in exactly
one place, the "120+" banks-supported stat (a static figure, not
animated). It also appears as small chrome — the `NN / 04` section
markers — which doesn't compete with the rule since it's wayfinding
chrome, not a number in the copy. Every other number and every other
line of copy stays in Newsreader or Instrument Sans.

**The Recreated-UI Exception.** `PhoneMockup`'s internal numbers (₹42,680,
71%, ₹17,320) are rendered in JetBrains Mono too, but this doesn't compete
with the rule above — that surface is depicting the real app's own screen,
where every number is mono by the app's own invariant. The exception is
scoped strictly to content that is itself a product-UI recreation, never
to marketing chrome.

## Layout

Bento grid: variable card sizes, gapless/tight gutters, asymmetric —
never a uniform 3-column grid (per spec §4 and the anti-slop bento
guidance it cites). Deep-dive pages (`/features/[slug]`) follow the
simpler template already fixed in spec §3 (header + status badge, 2–3
paragraphs, repeated waitlist CTA, back-to-home link). Spec §3's
CSS/SVG-only supporting visual per deep-dive page is not yet built —
the shipped template is text-and-CTA only. Exactly how a given page's
first viewport composes
this grammar (density, rhythm, hero structure) is that surface's own
decision — see its brief under `.impeccable/surfaces/`.

Content is capped at `max-w-5xl` (home sections) or `max-w-3xl` (waitlist
section, deep-dive pages), centered, with a consistent `px-6` side gutter
and `py-16`–`py-20` section rhythm (the Hero runs deeper, `py-28
sm:py-36`, to hold the parallax layers). Only two breakpoints are used in
practice: `sm` (640px, mobile→tablet stacking) and `lg` (1024px, where the
Hero goes row layout and bento grids expand to their full column/row
spans). The whole page scrolls through Lenis rather than native browser
scroll — see Overview and the Components entries below.

## Elevation & Depth

Depth is conveyed by translucency and blur, never by a drop shadow drawn
under an element — the same model as the app's `GlassCard`, now expressed
at two layers. A fixed **background depth layer** (`BackgroundDepth`)
sits behind the entire scrolling document: three large (50–65vw),
heavily blurred (100px) radial gradients built from `color-mix`-diluted
theme colors (accent-primary at the top-left, notice at the top-right,
accent-deep pooling at the bottom), `aria-hidden` and `pointer-events-
none`, rendered once in the root layout so every route shares the same
ambient glow instead of each page inventing its own. On top of that,
every bento tile, the Hero card, the flagship links, and the waitlist
card use the same foreground `.glass-card` treatment: blur(24px)
saturate(1.3), a translucent white fill, a hairline border, and a 1px
inset top-highlight — no box-shadow anywhere in the system. This site
uses the glass treatment on every card in the grid (not capped at one
glass surface per screen the way the app's onboarding rule reads) — a
deliberate, spec-confirmed choice for this dense-grid surface, not a
silent departure from the app's "one glass surface" discipline elsewhere.

### Shadow Vocabulary
None. No drop shadows anywhere on this surface — including
`PhoneMockup`'s `shadow-2xl`, which is the one confirmed exception: it
signals a physical device sitting in front of the page, not a UI element
floating above it, so it's exempted from this site's own no-shadow rule
the same way the app's `GlassCard` is exempted from the app's flat-card
default.

### Named Rules
**The Translucency-Not-Shadow Rule.** Every elevated surface reads as
"how much of the background shows through," never as an object floating
above the page with a shadow under it — except the one physical-object
illustration (`PhoneMockup`), which is allowed a shadow because it's
depicting a real object, not a card.

## Shapes

Same shrinking radius scale as the app (`apps/raqm/DESIGN.md` v4.0):
`radius-outer` (6px, outer glass tile), `radius-inner` (4px, inner
cell/input), `radius-cta` (3px, primary CTA — smaller than the cards
around it on purpose, so color rather than shape signals the action),
`radius-dot` (1px, tiny indicators, e.g. the flagship status badges). No
pill shapes, no bubbly/friendly rounding — radius should read as
engineered precision. `PhoneMockup`'s own `2.5rem`/`2rem` corners are a
deliberate exception: they trace an actual handset silhouette, not the
site's engineered-precision language, and shouldn't be copied onto any
other component.

## Components

### Buttons
- **Shape:** `radius-cta` (3px).
- **Primary:** `bg-accent-primary`, white text, `16px 24px` padding;
  hover darkens 10% (`accent-primary/90`); active `scale(0.98)`; disabled
  `opacity-60` with active-scale suppressed.
- **Focus:** 2px accent-primary outline, 2px offset, on every interactive
  element site-wide (buttons, links, inputs).

### Cards (Glass Card)
- **Corner Style:** `radius-outer` (6px).
- **Background:** the shared `.glass-card` utility (`globals.css`):
  `--glass-bg` fill, 1px `--color-border-subtle` border, inset 1px
  `--glass-highlight` top line, `backdrop-filter: blur(24px)
  saturate(1.3)`.
- **Shadow Strategy:** none — see Elevation & Depth.
- **Internal Padding:** 24px (`p-6`) as the default; the Hero card and
  waitlist card scale up to 40–56px (`p-10`/`p-14`/`p-12`) for their
  larger, more central role.

### Inputs / Fields
- **Style:** `bg-surface`, 1px `border-subtle`, `radius-inner` (4px),
  16px padding.
- **Focus:** 2px accent-primary outline (no glow/border-color shift
  beyond the outline).
- **Honeypot:** the waitlist form carries an `aria-hidden`,
  zero-size, tab-unreachable `company` text field as its only bot
  mitigation (confirmed v1 scope; no rate-limiting).

### Navigation
No persistent nav/header exists on this site; wayfinding is the section
markers below plus the footer's flat text links to the three deep-dive
pages, and each deep-dive page's own "← Back to Raqm" link.

### Background Depth (signature)
A single, persistent ambient layer (see Elevation & Depth) mounted once
in `layout.tsx` rather than per-page — the one system-wide background
treatment. Never re-implement it locally on a section.

### Scroll Reveal (signature)
Every major section (`ScrollReveal`) fades and rises into place exactly
once, the first time it crosses 85% up the viewport: `opacity 0→1`, `y
24px→0`, 0.6s, `power2.out`, via GSAP + ScrollTrigger. Under
`prefers-reduced-motion: reduce` it renders in its final state
immediately — no animation runs at all, not even a faster one.

### Hero Parallax (signature)
Three small decorative glass/glow shapes behind the Hero card
(`HeroParallax`) move on two independent axes: a scroll-scrubbed vertical
drift (back/mid/front layers shift 50 / -80 / 130px as the Hero scrolls
through the viewport, non-monotonic on purpose so the layers visibly
separate in depth) and a pointer-follow horizontal drift
(`gsap.quickTo`, 6 / 16 / 30px amplitude toward the cursor, 0.7s settle,
`power3.out`). Fully frozen under `prefers-reduced-motion: reduce`.

### Phone Mockup (signature)
A CSS/SVG-only recreation of the app's own Dashboard screen inside a
hand-built phone silhouette (rounded `2.5rem` frame, pill notch, `9/19`
aspect ratio) — not a photo, screenshot image, or illustration asset. It
deliberately borrows the real app's own visual conventions (dark ink
frame, JetBrains Mono for every number, a budget-ring built from a single
SVG `<circle>` with a static `stroke-dasharray`/`stroke-dashoffset`, not
animated) because it's standing in for the actual product UI. See the Typography
section's Recreated-UI Exception for why its mono usage doesn't violate
the site's own one-signature-moment rule.

### Section Marker (signature)
A small `NN / 04` counter (`font-mono`, `text-xs`, 40% opacity) opens
each of the home page's four major sections in order (Why Raqm, feature
grid, flagship strip, waitlist) — quiet sequential wayfinding chrome, not
a functional index or nav.

### Crosshair Mark (signature)
A tiny two-line SVG "+" (12×12px, `--color-ink-label` stroke, 40%
opacity) appears at the Hero's top-left corner and beside the "Why Raqm"
heading — a blueprint/technical-drawing motif reinforcing the "engineered
precision" character. Decorative only; never a real target, indicator, or
interactive element.

## Do's and Don'ts

### Do:
- **Do** reuse the app's exact `onb-*` color values as this site's
  primary (not secondary/dark) palette.
- **Do** render every number in JetBrains Mono in the site's own chrome,
  and confine that usage to the one signature numeric moment (the "120+"
  stat) — with the Phone Mockup's internal numbers as the one confirmed,
  narrowly-scoped exception.
- **Do** give the primary CTA a smaller radius (`radius-cta`, 3px) than
  the cards around it.
- **Do** build every bento card with the glass treatment (blur +
  translucent tint + 1px top-highlight) — the dense grid is the
  confirmed exception to the app's one-glass-surface-per-screen rule.
- **Do** keep `BackgroundDepth` as the page's one persistent ambient
  background layer, mounted once in the root layout, not per-section.
- **Do** gate every new motion addition on `prefers-reduced-motion` the
  same way `SmoothScrollProvider`, `ScrollReveal`, and `HeroParallax`
  already do — this is a hard accessibility invariant on this surface.

### Don't:
- **Don't** introduce a second accent color or a dark-mode variant for
  this surface — light-only, one accent, confirmed.
- **Don't** use drop shadows for elevation anywhere on this surface,
  except `PhoneMockup`'s confirmed physical-object exception.
- **Don't** add photography or illustration — still confirmed CSS/SVG-
  only. This no longer blanket-bans device mockups: `PhoneMockup` is the
  one confirmed, hand-built exception; don't add a second one, and don't
  treat this as license to add a real screenshot or photo anywhere.
- **Don't** use a comparison table or name competitors, even implicitly
  through imagery or layout (product-level constraint, spec §2).
- **Don't** add a second Hero-style parallax moment elsewhere on the page
  — the Hero is the one parallax surface; every other section uses the
  plainer Scroll Reveal entrance only.
- **Don't** promote any one surface's confirmed composition (recorded in
  its own brief under `.impeccable/surfaces/`) into this file — DESIGN.md
  stays world-level; the deep-dive pages keep the simpler template spec
  §3 already fixed regardless of what the home page's brief decides.
