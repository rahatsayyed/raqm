# Raqm marketing site (`apps/web`) — Design Spec

**Date:** 2026-09-26
**Branch:** new worktree off `build/v0-mvp` (see Workflow)
**Scope:** a single Next.js marketing/landing site that drives waitlist signups for the pre-launch Raqm app, plus three feature deep-dive pages.

## 1. Goals

1. Convince a visitor Raqm is worth waiting for and get their email into the waitlist.
2. Subtly communicate what makes Raqm different (on-device, zero-effort capture, privacy) without naming competitors or using a comparison table.
3. Give three flagship features (Split, Budget Together, AI Insights) a proper deep-dive page each, reachable from a small teaser on the home page.
4. Match Raqm's actual brand (not a new visual identity) — same accent, same type pairing, same glass/bento grammar the app itself uses or is migrating to.

## 2. Non-goals (this round)

- No pricing page — V2 pricing isn't decided yet.
- No account/auth system — signup is an email-only waitlist entry, not a user account.
- No blog/docs/changelog.
- No direct app download link — Raqm isn't published anywhere yet.
- No light/dark toggle — light-only for now (see §5).
- No CMS — content is hardcoded in the Next.js app; a CMS is a fast-follow if the team wants non-engineers editing copy later.

## 3. Site map

```
/                          Home (single scroll page)
/features/split            Deep-dive: Split with friends (live, V1 free)
/features/budget-together  Deep-dive: Budget Together (coming, V2 paid)
/features/ai-insights      Deep-dive: AI-powered insights (coming, V2 paid)
```

### Home page sections (in order)
1. **Hero** — headline, one-line subhead, waitlist email input (primary CTA), a one-line trust signal ("Your SMS never leaves your phone").
2. **Why Raqm** — 3–4 bento cards, subtle differentiation, no competitor names:
   - "Nothing leaves your phone" (on-device SMS parsing, no bank linking)
   - "It already knows" (automatic capture vs. manually logging every expense)
   - "Built for India" (SMS-first, UPI-aware categorization)
   - "Yours, not sold" (no ad-supported model, no data monetization)
3. **Feature bento grid** — V1 free capabilities, grouped into ~4 clusters so 15 individual features don't become 15 tiny cards:
   - **Capture** — automatic SMS parsing, PDF/UPI statement upload, manual cash entry, "couldn't parse" review queue
   - **Organize** — merchant renaming, grouping, category splitting, transfer detection
   - **Stay on track** — safe-to-spend indicator, budget alerts, subscription-cancellation nudges, custom pay-cycle
   - **Life stuff** — lending reminders, notes, location tagging
4. **Flagship features strip** — 3 cards linking to the deep-dive routes: Split (badge: "Live"), Budget Together (badge: "Coming, Plus"), AI Insights (badge: "Coming, Plus").
5. **Waitlist section** — repeats the signup form (same component as hero), slightly more detail ("what happens after I sign up").
6. **Footer** — logo, one-line privacy statement, links to the three feature pages, no social/legal boilerplate beyond what's true today.

### Deep-dive page template (`/features/[slug]`)
- Header: feature name, one-line description, status badge (Live / Coming soon, Plus).
- Body: 2–3 paragraphs of real detail (pulled from the feature bullets already given, not invented specifics).
- One supporting visual (illustration or screenshot placeholder — real content once available).
- Repeated waitlist CTA.
- Back-to-home link.

## 4. Design system

Reusing Raqm's actual brand, not inventing a new one — this is the front door to the same product the app is. Per the user's direction, the site goes **light-only** (the app itself is mid-migration to app-wide light mode; the site anticipates that, doesn't wait for it).

**Colors** — reusing the exact light-mode values already locked in `apps/raqm/DESIGN.md` v4.0's frontmatter (the `onb-*` tokens, currently scoped to onboarding, adopted here as the site's primary and only palette):

| Role | Value | Source token |
|---|---|---|
| Background | `#F7F6F3` | `onb-bg-base` |
| Surface | `#FFFFFF` | `onb-bg-surface` |
| Surface raised / glass base | `#EFEDE8` | `onb-bg-surface-raised` |
| Border / hairline | `rgba(20,20,20,0.08)` | `onb-border-subtle` |
| Headline ink | `#14140F` | `onb-ink-headline` |
| Body ink | `#4A4A45` | `onb-ink-body` |
| Label ink | `#8A8880` | `onb-ink-label` |
| Accent (the one accent) | `#2E5D4E` | `onb-accent-primary` |
| Accent deep / selected | `#DCE9E3` | `onb-accent-deep` |
| Notice (amber, "pay attention") | `#B8813C` | `onb-notice` |
| Error (muted, real failures only) | `#B4483A` | `onb-error-muted` |
| Glass fill | `rgba(255,255,255,0.55)` | `onb-glass-bg` |
| Glass top highlight | `rgba(255,255,255,0.6)` | `onb-glass-highlight` |

Same discipline as the app: one accent, used identically everywhere; amber for attention, red-muted reserved for real failures (e.g. a failed signup submission), never for routine states.

**Typography** — same pairing as the app's v3.0 target: **Newsreader** (italic) for the hero headline and section titles, **Instrument Sans** for body/labels/buttons, **JetBrains Mono** reserved for one numeric "signature" moment on the page (a small animated stat, e.g. an SMS-parsed counter) — not used broadly, so it stays a signature rather than becoming a second body font.

**Shape & elevation** — bento cards use the glass treatment (blur + translucent tint + 1px top-highlight), matching the app's `GlassCard` grammar. `radius-cta`/`radius-outer`/`radius-inner` from the same v3.0 scale. No drop shadows — depth via translucency only, same as the app's elevation model.

**Layout** — bento grid: variable card sizes, gapless/tight gutters, asymmetric (not a uniform 3-column grid), per `taste-skill:taste-skill`'s anti-slop bento guidance.

## 5. Tech stack

- **Next.js** (latest stable), App Router, TypeScript, Tailwind CSS, `--src-dir`, created via `npx create-next-app@latest apps/web` from the repo root (keeps it an npm workspace member alongside `apps/raqm` and `packages/bank-sms-parser`).
- **Animation:** `gsap` + `@gsap/react` (`gsap-skills:gsap-react`), scroll-driven sections via `gsap-skills:gsap-scrolltrigger`.
- **Design build skills:** `taste-skill:taste-skill` (anti-slop core) + `taste-skill:minimalist-skill` (aesthetic base) + `taste-skill:soft-skill` (premium-polish rules). `taste-skill:imagegen-frontend-web` only if real hero imagery is needed beyond CSS/SVG — decide during the visual-world workshop, not assumed now.
- **Backend:** Supabase — one table, `waitlist_signups` (`id uuid default gen_random_uuid()`, `email text unique not null`, `source text default 'home_hero'` to track which form submitted, `created_at timestamptz default now()`). Insert-only RLS policy for the anon key (no read access from the client). Inserted via a Next.js Server Action, not a client-side Supabase call, so the anon key + insert logic stay server-side.
- **Bot mitigation (v1):** a honeypot hidden field only. Real rate-limiting is a fast-follow if spam actually shows up — not built speculatively.

## 6. Data flow & error handling

1. Visitor submits email (hero or waitlist section form) → Server Action validates format client + server side.
2. Server Action inserts into `waitlist_signups`.
   - **Success:** inline confirmation, no page reload ("You're on the list — we'll email you at launch").
   - **Duplicate email** (unique constraint violation): friendly message, not an error — "You're already on the list."
   - **Network/server error:** generic retry message, form stays filled.
3. No email confirmation/double opt-in in v1 — straight insert. (Add double opt-in later if deliverability becomes an issue.)

## 7. Workflow (process, not code)

1. Create a git worktree off `build/v0-mvp` for this work (per `superpowers:using-git-worktrees`).
2. Scaffold Next.js into `apps/web`.
3. Run `/impeccable init` on `apps/web` (Persuade mode; can reference `apps/raqm/PRODUCT.md` as sibling context but writes its own).
4. Run `/awesome-design-md` to pull 2–3 real references matching minimalism/glassmorphism/bento/luxury before locking the visual world (candidates to check: Linear, Mercury, Arc — not final, the skill decides from real examples).
5. Run Impeccable's `new-work` workshop to commit the visual world + seed `DESIGN.md`, informed by the design system in §4 (which is largely pre-decided by brand continuity, so the workshop mostly confirms/extends rather than invents from scratch).
6. Build the pages per §3, styled per `/web-design-guidelines`.
7. Run `find-animation-opportunities` (read-only) once pages exist un-animated; implement its findings with `gsap-react`/`gsap-scrolltrigger`.
8. Verify in Chrome (`claude-in-chrome`): desktop + mobile viewport, signup flow end-to-end, a11y pass (contrast on the light palette, focus states, reduced-motion fallback for GSAP).
9. Run `/impeccable document` once built, to record the real `DESIGN.md` for `apps/web`.

## 8. Prerequisites / open items

- **Supabase project:** none exists for this yet. Either the user provisions a project and hands over `SUPABASE_URL` / `SUPABASE_ANON_KEY` (and a service-role key if needed server-side), or a new project gets created during implementation — needs a decision at implementation time, not blocking the spec.
- **Domain/hosting:** not decided; Vercel is the natural default for Next.js but not confirmed.
- **Real content for feature illustrations:** deep-dive pages reference "a supporting visual" — actual asset (screenshot, illustration, or generated image) TBD during the visual-world workshop, not invented here.

## 9. Testing plan

- `npx tsc --noEmit` (or Next's build) clean.
- Manual Chrome pass: hero → waitlist submit → confirmation, on both desktop and a phone-width viewport.
- Duplicate-email and invalid-email paths manually triggered once, confirmed friendly (not raw error).
- Each of the 3 deep-dive routes loads, back-link works, waitlist CTA works.
- No automated test suite planned for v1 (matches `apps/raqm`'s own convention: `tsc` + manual verification, no test runner) — revisit if the site grows real logic beyond forms/content.
