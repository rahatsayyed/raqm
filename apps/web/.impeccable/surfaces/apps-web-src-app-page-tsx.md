---
version: 1
slug: "apps-web-src-app-page-tsx"
primary_target: "apps/web/src/app/page.tsx"
related_targets: []
---

# Surface brief: Home (`/`)

## Scope & mode

The single-scroll home page (`apps/web/src/app/page.tsx`), per spec §3 — hero,
why-Raqm bento, feature bento grid, flagship features strip, waitlist section,
footer. Mode: **Persuade**. The three `/features/[slug]` deep-dive pages are
separate surfaces with their own (simpler, already-fixed) template and are not
covered by this brief.

## Audience, job, action

A prospective Raqm user who has never used the app (it isn't published yet),
deciding whether Raqm is worth waiting for. Job: understand what makes Raqm
different, quickly. Action: give an email to the waitlist.

## Proof / content

On-device SMS parsing (zero manual entry on Android), fully local processing,
India/UPI-aware categorization, no ad-supported model — the spec's four
"Why Raqm" bento points, real today, not aspirational. One JetBrains Mono
numeric "signature" moment dramatizes the mechanism directly (the static
"120+ banks supported" count) rather than just claiming it in copy.

## Constraints

No comparison table, no competitor names (product-level, spec §2). No
pricing, no CMS, no accounts, no direct app download link. Imagery stance:
**CSS/SVG only** — no photography, no illustration. Superseded this build:
`PhoneMockup`, a hand-built CSS/SVG recreation of the app's own Dashboard
screen, ships in the Hero as DESIGN.md's one confirmed device-mockup
exception (not a photo or image asset, and not a second exception to add
to). Brand tokens (colors, type, glass/bento grammar) are DESIGN.md's, not
restated here.

## Direction contract

THESIS: Prove the mechanism — on-device, zero-effort SMS parsing — before
asking for trust rhetoric. Refuses this category's default: a generic SaaS
hero with a stock illustration and a paragraph of claims before any proof.

OWN-WORLD: Raqm's existing light-mode glass/bento grammar: one accent
(`#2E5D4E`), glass tiles (blur + translucent tint + 1px top-highlight),
Newsreader italic display, Instrument Sans body, JetBrains Mono reserved for
exactly one numeric signature moment. CSS/SVG only — no photography or
illustration this round.

STORY: A visitor lands, understands in one near-bare viewport that Raqm
parses bank SMS on-device with zero effort, then scrolls into bento proof
(why-Raqm, feature clusters, flagship strip) before being asked for an email.

FIRST VIEWPORT (as shipped): Headline + subhead + waitlist input inside a
single glass card, alongside `PhoneMockup` (the confirmed device-mockup
exception) in a row layout at `lg` and up. A three-layer `HeroParallax`
(scroll-scrubbed + pointer-follow blurred/glass shapes) sits behind the
card rather than a static corner hint. The primary CTA still lives inside
the one glass card; the parallax layers are decorative depth, not a second
competing focal point.

FORM: "Promise, then Proof" — the dealt lead (index 5) from
`concept-seed --scope surface --mode persuade` (seed key `cc2fd076`),
presented alongside "The Statement Open" (index 4, a Fraunces-voiced
statement-style hero) and "Bento From the First Pixel" (index 2, the hero as
the bento grid itself), plus one fused catalog challenger, "The Woven Ledger"
(bento tiles that visibly assemble on scroll — judged competitive on product
clarity but heavier to build than a seed-stage call should lock in; carry
forward as a future signature-interaction candidate, not the committed
structure). The human partner locked the assigned card (`optionId: "assigned"`,
no re-roll, no steer) via Impeccable's decision page.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance

## Unresolved decisions

- Exact hero headline/subhead copy — not written yet, this brief fixes
  structure, not words.
- The numeric signature moment's exact source/value (live count vs. a fixed
  proof number) needs a product-data decision at build time.
- "The Statement Open," "Bento From the First Pixel," and "The Woven Ledger"
  remain standing alternates if "Promise, then Proof" doesn't hold up once
  built.
