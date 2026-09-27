# Raqm — marketing site

The public marketing/waitlist site for Raqm, a private, on-device personal
finance tracker. Next.js (App Router), Tailwind CSS v4, GSAP + Lenis for
motion, Supabase for waitlist signups. Design system and content decisions
are recorded in `DESIGN.md`.

## Commands

```bash
npm run dev      # dev server on :3000
npm run build    # production build
npm run start    # serve the production build
npm run lint     # ESLint
npm run test     # vitest
```

Run from the repo root instead via `npm run web:dev` / `npm run web:build` /
`npm run web:start` (see the root `package.json`).

## Structure

- `src/app/` — routes: home page, `/features/[slug]` deep-dive pages, the
  waitlist server action.
- `src/components/` — presentational and motion components (Hero,
  bento grids, `PhoneMockup`, `SmoothScrollProvider`, `ScrollReveal`).
- `src/lib/` — waitlist submission logic, Supabase client, feature copy data.
