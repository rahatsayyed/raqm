# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user: a prospective Raqm user encountering the marketing site
pre-launch — someone deciding whether Raqm is worth waiting for and worth
handing over an email address to join the waitlist. Not an existing app
user; the app itself isn't published anywhere yet, so this visitor has no
prior hands-on experience with Raqm and is evaluating it entirely on what
the site tells and shows them.

## Product Purpose

This site exists to convince a visitor Raqm is worth waiting for and
convert that conviction into a waitlist signup (email only, no account).
It also gives three flagship features (Split, Budget Together, AI
Insights) a proper deep-dive page each. Success is measured in waitlist
signups, not engagement or time-on-site.

## Positioning

This is the pre-launch Persuade-mode front door to the same product
described in `apps/raqm/PRODUCT.md` — it packages that product's real
positioning for a visitor who can't yet try the app, rather than inventing
a separate site-level pitch:

- Raqm **is an expense tracker** (not a "Personal CFO" — that framing was
  explicitly corrected at the app level and must not resurface here).
- What differentiates it: automatic, zero-effort capture (Android SMS
  parsing) or low-friction manual/PDF capture (iOS), fully on-device
  processing, and a calm presentation of what already happened.
- Differentiation on this site stays subtle — no competitor names, no
  comparison table (explicit non-goal, see spec §2).

## Operating Context

- Site map: `/` (single scroll home page) plus three deep-dive routes,
  `/features/split`, `/features/budget-together`, `/features/ai-insights`.
- Single conversion action throughout: an email-only waitlist form
  (hero section and a repeated waitlist section on home; repeated on each
  deep-dive page), inserting into a `waitlist_signups` Supabase table via
  a server-side action.
- No accounts, no login, no pricing page, no CMS, no blog/docs/changelog,
  no direct app download link (the app isn't published yet) — all
  confirmed non-goals for this round (spec §2).
- Full site content, page structure, and copy sourced already exist in
  `docs/superpowers/specs/2026-09-26-web-landing-page-design.md` (§3);
  this file records product truth, not the page-by-page content plan.

## Capabilities and Constraints

- Light-only visual language for this surface specifically, even though
  the app itself is dark-only elsewhere — a deliberate, confirmed
  divergence (spec §4), not an oversight to reconcile later.
- Reuses the app's actual brand system (colors, type pairing, glass/bento
  grammar) rather than inventing a new visual identity for the site — see
  `apps/raqm/DESIGN.md` v4.0 frontmatter for the source tokens.
- Waitlist signup: email format validated client + server side; duplicate
  email is treated as a friendly non-error ("you're already on the list"),
  not a failure state; no email confirmation/double opt-in in v1.
- Bot mitigation for v1 is a honeypot field only; no rate-limiting built
  speculatively.
- Stack already scaffolded (Task 1 of this plan): Next.js (App Router),
  TypeScript, Tailwind CSS, as an npm-workspaces member alongside
  `apps/raqm` and `packages/bank-sms-parser`.

## Brand Commitments

- Name: **Raqm**. This site is explicitly the same brand as the app, not
  a new identity — same one accent, same type pairing, same glass/bento
  grammar the app itself uses or is migrating to (spec §4, §1 goal 4).
- Voice: consistent with the app's calm, non-shaming, non-gamified tone
  (`apps/raqm/PRODUCT.md` Brand Commitments) — a persuasive site can be
  enthusiastic about the product without adopting a hype or urgency voice
  that contradicts that calm positioning.

## Evidence on Hand

No user testimonials, press, benchmarks, or external evidence exist yet —
the product is pre-launch. Do not fabricate any of these for copy, social
proof, or "why people love it" style sections.

## Product Principles

1. Every claim must be true today, not aspirational — no invented
   specifics, no comparison tables, no naming competitors (spec §2, §1
   goal 2).
2. This is the same brand as the app, packaged for persuasion — reuse its
   actual visual system rather than treating the site as a fresh identity
   exercise.
3. Positioning stays anchored to "expense tracker," never re-drifting
   toward "Personal CFO" framing, even in marketing copy where that framing
   might read as more impressive.
4. The waitlist email capture is the one conversion goal on every page;
   every section should either build the case for it or offer it directly.
5. Subtlety over comparison: differentiate through what Raqm actually does
   (on-device, automatic, India-first) rather than contrasting it against
   named alternatives.

## Accessibility & Inclusion

Contrast must hold on the light palette (spec §4's `onb-*` tokens were
chosen for onboarding use and need a contrast check in this broader,
persuasion-surface context); visible focus states on all interactive
elements; motion (GSAP/ScrollTrigger) must respect `prefers-reduced-motion`
(spec §9 testing plan).
