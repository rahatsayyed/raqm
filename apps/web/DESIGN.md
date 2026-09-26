<!-- SEED: established with the user before implementation; re-run /impeccable document once there's code to capture the actual tokens and components. -->

---
name: Raqm (marketing site)
description: The pre-launch Persuade front door to Raqm, in Raqm's own brand — light-only, glass/bento, one accent.
---

# Design System: Raqm Marketing Site

## Overview

This is not a new visual identity. It is Raqm's existing brand system —
the same colors, type pairing, and glass/bento grammar `apps/raqm/DESIGN.md`
v4.0 defines — carried onto a Persuade surface for people who can't yet
open the app. Where the app is dark-only (onboarding excepted), this site
runs the light-mode `onb-*` values full-time: a deliberate, confirmed
divergence for this surface, not a reversal of the app's dark-only rule.

**Confirmed with the human partner for this first surface (home page):**
a two-phase composition — "Promise, then Proof." The first viewport stays
close to bare (headline, one line, the waitlist CTA, generous negative
space, a single glass card), then yields to the bento density (why-Raqm,
feature clusters, flagship strip) as a deliberate change in rhythm rather
than opening dense. Two other structures were rolled and shown alongside
it (a bento-first hero that opens directly on the grid, and a
Fraunces-voiced "statement" hero styled like the opening line of a
financial statement) and are recorded here as the standing alternates if
"Promise, then Proof" doesn't hold up once built. A fused catalog
challenger ("The Woven Ledger" — bento tiles that visibly assemble on
scroll, dramatizing many small automatic SMS-parsing decisions resolving
into one clear picture) was judged competitive on product clarity but
heavier to build than a seed-stage call should lock in; it's worth
carrying forward as a candidate signature interaction for a later pass,
not the seed's committed structure.

**Confirmed with the human partner: imagery stance is CSS/SVG only.** No
photography, no illustration, no device mockups for this round — the
type, the glass/bento grammar, and the one JetBrains Mono numeric
signature moment carry the page on their own. (The app isn't published
yet and has no polished screenshots to show regardless.)

**Key Characteristics:**
- Same brand as the app: one accent (`#2E5D4E`), used identically
  everywhere it appears, never decoratively.
- Light-only for this surface, reusing the `onb-*` token values as the
  primary and only palette (not a secondary/dark variant of them).
- Depth from translucency and blur, never drop shadows.
- A shrinking radius scale where the primary CTA gets a *smaller* radius
  than the cards around it — color, not shape, signals the action.
- No photography or illustration this round — composition, type, and glass
  carry the page.

## Colors

One accent, used identically everywhere; amber for attention, muted red
reserved for real failures (a failed signup submission), never for
routine states. Values below are the app's existing `onb-*` light tokens
(`apps/raqm/DESIGN.md` v4.0), adopted here as the site's primary palette,
not a secondary one.

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
- **Label ink** (`#8A8880`): labels, captions, section eyebrows.
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

## Typography

**Display Font:** Newsreader (italic only) — hero headline, section
titles.
**Body Font:** Instrument Sans — body copy, labels, buttons, nav.
**Numeric/Mono Font:** JetBrains Mono — reserved for exactly one animated
numeric "signature" moment on the page (per spec §4, e.g. an SMS-parsed
counter), not used broadly, so it stays a signature rather than a second
body font.

**Character:** the same pairing the app uses — a serif italic display
face supplies the one signature typographic gesture per view; a neutral
sans carries everything else without competing for attention.

### Hierarchy
(Exact sizes/weights for this site are not yet set in code; the app's own
scale — 44px/600 metric hero, 34px/600 screen total, 22px/600 subtotal,
16px/600 list-row amount, 13px/600 uppercase section, 11px/600 uppercase
label, all JetBrains Mono/Instrument Sans per role — is the reference
point to adapt from at implementation, not a site-specific scale yet.)

### Named Rules
**The One Signature Rule.** JetBrains Mono appears in exactly one place
on the page (the animated numeric moment). Every other number and every
other line of copy stays in Newsreader or Instrument Sans.

## Layout

Bento grid: variable card sizes, gapless/tight gutters, asymmetric —
never a uniform 3-column grid (per spec §4 and the anti-slop bento
guidance it cites). The confirmed home-page pattern is two-phase: a
near-bare first viewport, then the bento density arrives as a second
beat rather than opening dense. Deep-dive pages (`/features/[slug]`)
follow the simpler template already fixed in spec §3 (header + status
badge, 2–3 paragraphs, one CSS/SVG-only supporting visual, repeated
waitlist CTA, back-to-home link) — composition invention there is scoped
to that simpler shape, not the home page's structure.

## Elevation & Depth

Depth is conveyed by translucency and blur, never by a drop shadow drawn
under an element — the same model as the app's `GlassCard`. Bento cards
on this site use the glass treatment on every card in the grid (not
capped at one glass surface per screen the way the app's onboarding rule
reads) — a deliberate, spec-confirmed choice for this dense-grid surface,
not a silent departure from the app's "one glass surface" discipline
elsewhere.

### Shadow Vocabulary
None. No drop shadows anywhere on this surface.

### Named Rules
**The Translucency-Not-Shadow Rule.** Every elevated surface reads as
"how much of the background shows through," never as an object floating
above the page with a shadow under it.

## Shapes

Same shrinking radius scale as the app (`apps/raqm/DESIGN.md` v4.0):
`radius-outer` (6px, outer glass tile), `radius-inner` (4px, inner
cell/input), `radius-cta` (3px, primary CTA — smaller than the cards
around it on purpose, so color rather than shape signals the action),
`radius-dot` (1px, tiny indicators). No pill shapes, no bubbly/friendly
rounding — radius should read as engineered precision.

## Do's and Don'ts

### Do:
- **Do** reuse the app's exact `onb-*` color values as this site's
  primary (not secondary/dark) palette.
- **Do** render every number in JetBrains Mono, and confine JetBrains Mono
  to the one signature numeric moment.
- **Do** give the primary CTA a smaller radius (`radius-cta`, 3px) than
  the cards around it.
- **Do** build every bento card with the glass treatment (blur +
  translucent tint + 1px top-highlight) — the dense grid is the
  confirmed exception to the app's one-glass-surface-per-screen rule.
- **Do** open the home page close to bare and let bento density arrive as
  a second beat, per the confirmed "Promise, then Proof" structure.

### Don't:
- **Don't** introduce a second accent color or a dark-mode variant for
  this surface — light-only, one accent, confirmed.
- **Don't** use drop shadows for elevation anywhere on this surface.
- **Don't** add photography, illustration, or device mockups this round —
  confirmed CSS/SVG-only; revisit only as an explicit future decision, not
  a silent addition.
- **Don't** use a comparison table or name competitors, even implicitly
  through imagery or layout (product-level constraint, spec §2).
- **Don't** promote the home page's confirmed composition onto the
  deep-dive pages — they keep the simpler template spec §3 already fixed.
