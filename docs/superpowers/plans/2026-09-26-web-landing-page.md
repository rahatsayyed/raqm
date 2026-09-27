# Raqm Marketing Site (`apps/web`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a single-page Next.js marketing site plus three feature deep-dive pages that convinces visitors Raqm is worth waiting for and captures their email into a Supabase-backed waitlist.

**Architecture:** A Next.js (App Router, TypeScript) app in `apps/web`, styled with Tailwind CSS v4 using Raqm's own light-mode brand tokens (reused verbatim from `apps/raqm/DESIGN.md` v4.0's `onb-*` frontmatter). Waitlist signup is a Server Action backed by one Supabase table, kept server-only. Animation is GSAP (`@gsap/react` + ScrollTrigger), added after the pages exist, driven by a `find-animation-opportunities` pass.

**Tech Stack:** Next.js (App Router, TypeScript, `--src-dir`), Tailwind CSS v4, `next/font/google` (Newsreader, Instrument Sans, JetBrains Mono), `@supabase/supabase-js`, `gsap` + `@gsap/react`, Vitest (for the one piece of real logic: waitlist submission).

**Spec:** `docs/superpowers/specs/2026-09-26-web-landing-page-design.md` — read it alongside this plan; task descriptions below assume its content (site map, copy sources, palette table) without repeating all of it.

## Global Constraints

- Light-only. No dark mode, no theme toggle (spec §2, §4).
- One accent color (`#2E5D4E`), used identically everywhere it appears — never per-section drift (spec §4).
- No drop shadows anywhere. Elevation is translucency/blur only (spec §4).
- Bento grids are variable-sized and asymmetric — never a uniform N-column grid (spec §4).
- No competitor names anywhere in copy, ever (spec §1, §3).
- Waitlist is email-only. No accounts, no auth, no password (spec §2 non-goals).
- No pricing page, no CMS, no blog (spec §2 non-goals).
- Bot mitigation is a honeypot field only for v1 — no rate limiting, no CAPTCHA (spec §5).
- No automated test suite beyond the waitlist submission logic (Task 4). Everything else is `tsc`/build-clean + manual Chrome verification, matching `apps/raqm`'s own convention (spec §9).
- JetBrains Mono is reserved for exactly one numeric "signature" moment on the home page — it is not a second body font (spec §4).

## Review Focus

1. **Empty/whitespace-only email submitted** (user hits submit with no real input, or pastes only spaces) — must return `invalid`, not crash or silently insert a blank row. Owned by Task 4.
2. **Same email submitted twice with different casing/whitespace** (`Test@Example.com `, then `test@example.com`) — must dedupe as the same signup, not create two rows. Owned by Task 4.
3. **Honeypot field filled** (bot behavior) — must short-circuit to a success-looking response without ever touching Supabase. Owned by Task 4.
4. **Unknown feature slug** (`/features/something-that-does-not-exist`) — must 404, not crash or render an empty page. Owned by Task 9.
5. **Visitor with `prefers-reduced-motion` enabled** — GSAP animations must not play (or must reduce to instant/opacity-only), not just "look fine to someone not testing for it." Owned by Task 11.

---

### Task 1: Worktree + Next.js scaffold + dependencies

**Files:**
- Create: `apps/web/` (entire Next.js scaffold, generated)
- Modify: none (root `package.json` already has `web`, `web:dev`, `web:build`, `web:start` scripts wired to `--workspace=apps/web`, and `workspaces: ["apps/*", "packages/*"]` already covers it — verify only, don't duplicate)

**Interfaces:**
- Produces: a buildable Next.js app at `apps/web`, reachable via `npm run web:dev` from the repo root.

- [ ] **Step 1: Confirm the worktree**

The worktree already exists — created before this plan's execution started:

```bash
git worktree list | grep web-landing
```

Expected: `.worktrees/web-landing` on branch `feat/web-landing`. `cd` into it; all later steps in this plan run from inside this worktree. Root `npm install` has already been run there — don't repeat it here.

- [ ] **Step 2: Scaffold Next.js**

```bash
npx create-next-app@latest apps/web \
  --typescript --tailwind --eslint --app --src-dir \
  --import-alias "@/*" --turbopack --use-npm
```

Answer any interactive prompts with the defaults shown above (they're also passable as flags on newer CLI versions — if a prompt still appears, accept the flag's value).

- [ ] **Step 3: Verify workspace wiring**

```bash
cat package.json | grep -A2 '"workspaces"'
```

Expected: `"apps/*"` is already listed. Do not add `apps/web` explicitly — the glob covers it. If somehow it's missing, add `"apps/web"` to the array and commit that separately before continuing.

- [ ] **Step 4: Verify it builds and runs**

```bash
npm install
npm run web:build
```

Expected: build succeeds with the default Next.js starter page. Fix any error before moving on — do not carry a broken build into Task 2.

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "chore(web): scaffold Next.js app in apps/web"
```

---

### Task 2: Impeccable PRODUCT.md + visual world seed

This task is process-driven, not code-driven — it runs Impeccable's own interview flow, which asks the human partner questions directly. Do not skip it or fabricate its answers.

**Files:**
- Create: `apps/web/PRODUCT.md`
- Create: `apps/web/DESIGN.md` (seed, from `new-work`)
- Create/Modify: `.impeccable/config.json` (workspace entry, written by the CLI itself)

**Interfaces:**
- Produces: `apps/web/PRODUCT.md` and a seed `apps/web/DESIGN.md` that later tasks' components are built against.

- [ ] **Step 1: Run Impeccable context and init**

From the repo root of the worktree:

```bash
.claude/skills/impeccable/scripts/impeccable context --target apps/web
```

It will report `NO_PRODUCT_MD` / `TARGET_SELECTION_REQUIRED`-style output for a brand-new target. Then invoke the skill properly: `Skill(impeccable, args: "init")`, with cwd inside `apps/web`. Follow its interview. Known answers to give it (don't re-derive from scratch, but let it confirm/ask its own way):
- **Platform:** `web`.
- **Users:** prospective Raqm users deciding whether to join the waitlist — not existing app users.
- **Purpose/positioning:** drive waitlist signups pre-launch; may reference `apps/raqm/PRODUCT.md`'s positioning (expense tracker, not "Personal CFO"; on-device/privacy-first) as sibling brand evidence, but this is a distinct Persuade-mode surface, not the app itself.
- **Mode:** Persuade (per this plan's spec, §1 goal 1).

- [ ] **Step 2: Run the visual-world workshop**

Invoke `Skill(impeccable, args: "document --seed")` (seed mode, since there's no code yet beyond the Task 1 scaffold) — or let a plain `new-work`-triggering request do it, per the skill's own routing. Give it the design system in spec §4 as already-decided brand continuity constraints (colors, type pairing, glass/bento grammar, light-only) — the workshop's job here is mostly to confirm/extend these into a seed `DESIGN.md`, not invent a new identity from scratch. It may still ask about composition-level choices (hero layout style, bento density) — answer those live with the human partner.

- [ ] **Step 3: Verify and commit**

```bash
ls apps/web/PRODUCT.md apps/web/DESIGN.md
git add apps/web/PRODUCT.md apps/web/DESIGN.md .impeccable/config.json
git commit -m "docs(web): add PRODUCT.md and seed DESIGN.md via Impeccable"
```

---

### Task 3: Design tokens — Tailwind theme, fonts, globals

**Files:**
- Create: `apps/web/src/app/fonts.ts`
- Modify: `apps/web/src/app/globals.css` (scaffold-generated, replace its token section)
- Modify: `apps/web/src/app/layout.tsx` (scaffold-generated, apply font variables)

**Interfaces:**
- Produces: CSS custom properties and Tailwind utilities (`bg-bg`, `text-ink-headline`, `text-accent-primary`, `rounded-outer`, `rounded-cta`, etc.) and font CSS variables (`--font-display`, `--font-body`, `--font-mono`) that every later component task consumes.

- [ ] **Step 1: Add font definitions**

Create `apps/web/src/app/fonts.ts`:

```ts
import { Newsreader, Instrument_Sans, JetBrains_Mono } from 'next/font/google';

export const newsreader = Newsreader({
  subsets: ['latin'],
  style: ['italic'],
  weight: ['400'],
  variable: '--font-newsreader',
  display: 'swap',
});

export const instrumentSans = Instrument_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-instrument-sans',
  display: 'swap',
});

export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
});
```

- [ ] **Step 2: Wire fonts into the root layout**

Open `apps/web/src/app/layout.tsx`. Replace its `<body>` `className` (whatever the scaffold generated) so the font variables are present:

```tsx
import type { Metadata } from 'next';
import { newsreader, instrumentSans, jetbrainsMono } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Raqm — know where your money goes, automatically',
  description:
    'Raqm reads your bank SMS on-device and shows you where your money goes — no bank linking, nothing leaves your phone. Join the waitlist.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body
        className={`${newsreader.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 3: Replace the token layer in globals.css**

Open `apps/web/src/app/globals.css`. Keep the `@import "tailwindcss";` line the scaffold generated at the top, then replace everything below it with:

```css
@import "tailwindcss";

@theme inline {
  --color-bg: #F7F6F3;
  --color-surface: #FFFFFF;
  --color-surface-raised: #EFEDE8;
  --color-border-subtle: rgba(20, 20, 20, 0.08);
  --color-ink-headline: #14140F;
  --color-ink-body: #4A4A45;
  --color-ink-label: #8A8880;
  --color-accent-primary: #2E5D4E;
  --color-accent-deep: #DCE9E3;
  --color-notice: #B8813C;
  --color-error-muted: #B4483A;

  --radius-outer: 6px;
  --radius-inner: 4px;
  --radius-cta: 3px;
  --radius-dot: 1px;

  --font-display: var(--font-newsreader);
  --font-body: var(--font-instrument-sans);
  --font-mono: var(--font-jetbrains-mono);
}

:root {
  --glass-bg: rgba(255, 255, 255, 0.55);
  --glass-highlight: rgba(255, 255, 255, 0.6);
}

body {
  background: var(--color-bg);
  color: var(--color-ink-body);
  font-family: var(--font-body);
}

h1, h2, h3, .font-display {
  font-family: var(--font-display);
  font-style: italic;
}

.glass-card {
  background: var(--glass-bg);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-outer);
  box-shadow: inset 0 1px 0 var(--glass-highlight);
  backdrop-filter: blur(24px) saturate(1.3);
}
```

`glass-bg`/`glass-highlight` stay as plain CSS variables (not Tailwind theme keys) since they're only ever consumed through the one `.glass-card` utility class, not as arbitrary Tailwind color utilities.

- [ ] **Step 4: Verify**

```bash
npm run web:build
```

Expected: clean build. Then start the dev server and confirm in Chrome that the page background is the warm off-white (`#F7F6F3`), not Next's default white/dark — this is the first visual checkpoint.

```bash
npm run web:dev
```

Use `claude-in-chrome` to open `http://localhost:3000`, take a snapshot, confirm the background color visually.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/app/fonts.ts apps/web/src/app/globals.css apps/web/src/app/layout.tsx
git commit -m "feat(web): wire brand tokens, fonts, and glass-card utility"
```

---

### Task 4: Supabase schema, client, and waitlist submission logic (TDD)

**Files:**
- Create: `apps/web/supabase/migrations/0001_waitlist_signups.sql`
- Create: `apps/web/src/lib/validate-email.ts`
- Create: `apps/web/src/lib/validate-email.test.ts`
- Create: `apps/web/src/lib/supabase-server.ts`
- Create: `apps/web/src/lib/waitlist.ts`
- Create: `apps/web/src/lib/waitlist.test.ts`
- Create: `apps/web/src/app/actions/waitlist.ts`
- Create: `apps/web/vitest.config.ts`
- Modify: `apps/web/package.json` (add `test` script, `vitest` devDependency)
- Create: `apps/web/.env.example`

**Interfaces:**
- Produces:
  - `isValidEmail(email: string): boolean` from `@/lib/validate-email`
  - `submitWaitlistEmail(email: string, source: string, client: SupabaseClient): Promise<WaitlistResult>` from `@/lib/waitlist`, where `WaitlistResult = { status: 'success' } | { status: 'duplicate' } | { status: 'invalid' } | { status: 'error'; message: string }`
  - `createServerSupabaseClient(): SupabaseClient` from `@/lib/supabase-server`
  - `waitlistSignupAction(prevState: WaitlistResult | null, formData: FormData): Promise<WaitlistResult>` from `@/app/actions/waitlist` (a Server Action) — Task 5 consumes this exact signature with `useActionState`.

- [ ] **Step 1: Install dependencies**

```bash
cd apps/web
npm install @supabase/supabase-js
npm install -D vitest
```

- [ ] **Step 2: Write the Supabase migration SQL**

Create `apps/web/supabase/migrations/0001_waitlist_signups.sql`:

```sql
create table if not exists waitlist_signups (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'unknown',
  created_at timestamptz not null default now()
);

alter table waitlist_signups enable row level security;

create policy "anon can insert waitlist signups"
  on waitlist_signups
  for insert
  to anon
  with check (true);
```

No `select` policy is created — the anon key can insert but never read the table back, matching spec §5's "no read access from the client."

- [ ] **Step 3: Add `.env.example`**

Create `apps/web/.env.example`:

```
SUPABASE_URL=
SUPABASE_ANON_KEY=
```

Do not create a real `.env.local` in this task — that requires a real Supabase project the human partner provisions (spec §8, open item). Note it in the final wrap-up (Task 17) if it's still missing.

- [ ] **Step 4: Write the failing test for email validation**

Create `apps/web/src/lib/validate-email.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { isValidEmail } from './validate-email';

describe('isValidEmail', () => {
  it('accepts a normal email', () => {
    expect(isValidEmail('person@example.com')).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(isValidEmail('')).toBe(false);
  });

  it('rejects whitespace-only input', () => {
    expect(isValidEmail('   ')).toBe(false);
  });

  it('rejects a string with no @', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
  });

  it('rejects a string with no domain', () => {
    expect(isValidEmail('person@')).toBe(false);
  });

  it('accepts an email with surrounding whitespace', () => {
    expect(isValidEmail('  person@example.com  ')).toBe(true);
  });
});
```

- [ ] **Step 5: Run it, confirm it fails**

```bash
npx vitest run src/lib/validate-email.test.ts
```

Expected: FAIL — `validate-email.ts` doesn't exist yet.

- [ ] **Step 6: Implement email validation**

Create `apps/web/src/lib/validate-email.ts`:

```ts
export function isValidEmail(email: string): boolean {
  const trimmed = email.trim();
  if (trimmed.length === 0) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}
```

- [ ] **Step 7: Run it, confirm it passes**

```bash
npx vitest run src/lib/validate-email.test.ts
```

Expected: all 6 tests PASS.

- [ ] **Step 8: Write the failing test for waitlist submission**

Create `apps/web/src/lib/waitlist.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest';
import { submitWaitlistEmail } from './waitlist';
import type { SupabaseClient } from '@supabase/supabase-js';

function makeFakeClient(insertResult: { error: { code: string } | null }) {
  const insert = vi.fn().mockResolvedValue(insertResult);
  const from = vi.fn().mockReturnValue({ insert });
  return {
    client: { from } as unknown as SupabaseClient,
    insert,
    from,
  };
}

describe('submitWaitlistEmail', () => {
  it('returns invalid for an empty email without touching the client', async () => {
    const { client, from } = makeFakeClient({ error: null });
    const result = await submitWaitlistEmail('', 'home_hero', client);
    expect(result).toEqual({ status: 'invalid' });
    expect(from).not.toHaveBeenCalled();
  });

  it('returns invalid for whitespace-only email', async () => {
    const { client, from } = makeFakeClient({ error: null });
    const result = await submitWaitlistEmail('   ', 'home_hero', client);
    expect(result).toEqual({ status: 'invalid' });
    expect(from).not.toHaveBeenCalled();
  });

  it('inserts a normalized (trimmed, lowercased) email on success', async () => {
    const { client, insert } = makeFakeClient({ error: null });
    const result = await submitWaitlistEmail('  Person@Example.com  ', 'home_hero', client);
    expect(result).toEqual({ status: 'success' });
    expect(insert).toHaveBeenCalledWith({ email: 'person@example.com', source: 'home_hero' });
  });

  it('returns duplicate when the unique constraint fires', async () => {
    const { client } = makeFakeClient({ error: { code: '23505' } });
    const result = await submitWaitlistEmail('person@example.com', 'home_hero', client);
    expect(result).toEqual({ status: 'duplicate' });
  });

  it('returns a friendly error for any other database error', async () => {
    const { client } = makeFakeClient({ error: { code: '500' } });
    const result = await submitWaitlistEmail('person@example.com', 'home_hero', client);
    expect(result).toEqual({ status: 'error', message: 'Something went wrong. Please try again.' });
  });
});
```

- [ ] **Step 9: Run it, confirm it fails**

```bash
npx vitest run src/lib/waitlist.test.ts
```

Expected: FAIL — `waitlist.ts` doesn't exist yet.

- [ ] **Step 10: Implement waitlist submission**

Create `apps/web/src/lib/supabase-server.ts`:

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export function createServerSupabaseClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables');
  }

  return createClient(url, anonKey);
}
```

Create `apps/web/src/lib/waitlist.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { isValidEmail } from './validate-email';

export type WaitlistResult =
  | { status: 'success' }
  | { status: 'duplicate' }
  | { status: 'invalid' }
  | { status: 'error'; message: string };

const UNIQUE_VIOLATION = '23505';

export async function submitWaitlistEmail(
  email: string,
  source: string,
  client: SupabaseClient
): Promise<WaitlistResult> {
  if (!isValidEmail(email)) {
    return { status: 'invalid' };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const { error } = await client.from('waitlist_signups').insert({ email: normalizedEmail, source });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { status: 'duplicate' };
    }
    return { status: 'error', message: 'Something went wrong. Please try again.' };
  }

  return { status: 'success' };
}
```

- [ ] **Step 11: Run it, confirm it passes**

```bash
npx vitest run src/lib/waitlist.test.ts
```

Expected: all 5 tests PASS.

- [ ] **Step 12: Write the failing test for the honeypot short-circuit**

Create a second describe block appended to `apps/web/src/lib/waitlist.test.ts` — actually the honeypot lives in the Server Action wrapper, not this file. Create `apps/web/src/app/actions/waitlist.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { waitlistSignupAction } from './waitlist';

function formDataWith(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    fd.set(key, value);
  }
  return fd;
}

describe('waitlistSignupAction', () => {
  it('short-circuits to success when the honeypot field is filled, without touching Supabase', async () => {
    const formData = formDataWith({ email: 'person@example.com', source: 'home_hero', company: 'a bot filled this' });
    const result = await waitlistSignupAction(null, formData);
    expect(result).toEqual({ status: 'success' });
  });
});
```

- [ ] **Step 13: Run it, confirm it fails**

```bash
npx vitest run src/app/actions/waitlist.test.ts
```

Expected: FAIL — `src/app/actions/waitlist.ts` doesn't exist yet.

- [ ] **Step 14: Implement the Server Action**

Create `apps/web/src/app/actions/waitlist.ts`:

```ts
'use server';

import { submitWaitlistEmail, type WaitlistResult } from '@/lib/waitlist';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function waitlistSignupAction(
  _prevState: WaitlistResult | null,
  formData: FormData
): Promise<WaitlistResult> {
  const email = String(formData.get('email') ?? '');
  const source = String(formData.get('source') ?? 'unknown');
  const honeypot = String(formData.get('company') ?? '');

  if (honeypot.trim() !== '') {
    return { status: 'success' };
  }

  return submitWaitlistEmail(email, source, createServerSupabaseClient());
}
```

- [ ] **Step 15: Run it, confirm it passes**

```bash
npx vitest run src/app/actions/waitlist.test.ts
```

Expected: PASS. (This test never reaches `createServerSupabaseClient()` because the honeypot check returns first — it will not throw even without real env vars set.)

- [ ] **Step 16: Add the Vitest config and package.json script**

Create `apps/web/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
```

Open `apps/web/package.json` and add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 17: Run the full test suite**

```bash
npm run test
```

Expected: all tests across the three files PASS (12 total: 6 + 5 + 1).

- [ ] **Step 18: Commit**

```bash
git add apps/web/supabase apps/web/src/lib apps/web/src/app/actions apps/web/vitest.config.ts apps/web/package.json apps/web/.env.example
git commit -m "feat(web): waitlist submission logic with Supabase, TDD"
```

---

### Task 5: Signup form component

**Files:**
- Create: `apps/web/src/components/WaitlistForm.tsx`

**Interfaces:**
- Consumes: `waitlistSignupAction` from `@/app/actions/waitlist` (Task 4).
- Produces: `<WaitlistForm source="home_hero" />` — a client component later tasks (Hero, Waitlist section) render directly.

- [ ] **Step 1: Implement the component**

Create `apps/web/src/components/WaitlistForm.tsx`:

```tsx
'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { waitlistSignupAction } from '@/app/actions/waitlist';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-cta bg-accent-primary px-6 py-4 font-body text-sm font-medium text-[var(--color-surface)] disabled:opacity-60"
    >
      {pending ? 'Joining…' : 'Get early access'}
    </button>
  );
}

export function WaitlistForm({ source }: { source: string }) {
  const [state, formAction] = useActionState(waitlistSignupAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute h-0 w-0 overflow-hidden opacity-0"
      />
      <input type="hidden" name="source" value={source} />
      <label htmlFor={`email-${source}`} className="sr-only">
        Email address
      </label>
      <input
        id={`email-${source}`}
        type="email"
        name="email"
        required
        placeholder="you@email.com"
        className="rounded-inner border border-[var(--color-border-subtle)] bg-surface px-4 py-4 font-body text-sm text-ink-headline placeholder:text-ink-label focus:outline-2 focus:outline-accent-primary"
      />
      <SubmitButton />
      <div aria-live="polite" className="w-full text-sm">
        {state?.status === 'success' && (
          <p className="text-accent-primary">You&apos;re on the list — we&apos;ll email you at launch.</p>
        )}
        {state?.status === 'duplicate' && <p className="text-ink-label">You&apos;re already on the list.</p>}
        {state?.status === 'invalid' && (
          <p className="text-error-muted">That doesn&apos;t look like a valid email.</p>
        )}
        {state?.status === 'error' && <p className="text-error-muted">{state.message}</p>}
      </div>
    </form>
  );
}
```

The `source` prop feeds the hidden `source` field so the two forms on the home page (hero + waitlist section) are distinguishable in the `waitlist_signups` table, and doubles as a unique `id`/`htmlFor` suffix so both forms can exist on the same page without colliding label associations.

- [ ] **Step 2: Verify**

```bash
npm run web:build
```

Expected: clean build (the component isn't rendered anywhere yet, but must type-check standalone).

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/WaitlistForm.tsx
git commit -m "feat(web): waitlist signup form component"
```

---

### Task 6: Home page — Hero + Why Raqm sections

**Files:**
- Create: `apps/web/src/components/Hero.tsx`
- Create: `apps/web/src/components/WhyRaqm.tsx`

**Interfaces:**
- Consumes: `WaitlistForm` from `@/components/WaitlistForm` (Task 5).
- Produces: `<Hero />` and `<WhyRaqm />`, both consumed by Task 8's page assembly.

- [ ] **Step 1: Implement Hero**

Create `apps/web/src/components/Hero.tsx`:

```tsx
import { WaitlistForm } from './WaitlistForm';

export function Hero() {
  return (
    <section className="mx-auto flex max-w-4xl flex-col items-start gap-6 px-6 py-24 text-left">
      <h1 className="font-display text-4xl leading-tight text-ink-headline sm:text-5xl">
        Know where your money goes. Automatically.
      </h1>
      <p className="max-w-xl font-body text-lg text-ink-body">
        Raqm reads your bank SMS on your phone and turns it into a clear picture of your spending —
        no bank linking, no manual entry, nothing sent to a server.
      </p>
      <WaitlistForm source="home_hero" />
      <p className="font-body text-sm text-ink-label">Your SMS never leaves your phone.</p>
      <p className="font-mono text-sm text-ink-label">
        <span className="text-lg font-semibold text-accent-primary">120+</span> Indian and international
        banks supported
      </p>
    </section>
  );
}
```

The `120+` figure is the one JetBrains Mono "signature numeric moment" the Global Constraints require. It is not fabricated — it's `packages/bank-sms-parser/README.md`'s own real, current claim ("Supports 120+ Indian and international banks"), the one honest number available before launch (there are no real usage stats yet to show instead). Do not invent a different number or a usage-style stat ("X transactions parsed") — nothing like that exists truthfully yet.

- [ ] **Step 2: Implement WhyRaqm**

Create `apps/web/src/components/WhyRaqm.tsx`:

```tsx
interface WhyCard {
  title: string;
  body: string;
}

const cards: WhyCard[] = [
  {
    title: 'Nothing leaves your phone',
    body: 'SMS parsing happens entirely on-device. No bank linking, no server ever sees your messages.',
  },
  {
    title: 'It already knows',
    body: "Transactions show up the moment they happen — you're never the one typing them in.",
  },
  {
    title: 'Built for India',
    body: 'SMS-first, UPI-aware categorization tuned for how Indian banks actually message you.',
  },
  {
    title: 'Yours, not sold',
    body: 'No ads, no data monetization. Your spending is not the product.',
  },
];

export function WhyRaqm() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="mb-8 font-display text-2xl text-ink-headline sm:text-3xl">Why Raqm</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="glass-card p-6">
            <h3 className="mb-2 font-body text-base font-semibold not-italic text-ink-headline">
              {card.title}
            </h3>
            <p className="font-body text-sm text-ink-body">{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run web:build
```

Expected: clean build. Neither component is rendered on a page yet (Task 8 assembles the page) — this task only needs to type-check.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/Hero.tsx apps/web/src/components/WhyRaqm.tsx
git commit -m "feat(web): hero and why-raqm sections"
```

---

### Task 7: Home page — Feature bento grid + Flagship features strip

**Files:**
- Create: `apps/web/src/lib/features-data.ts`
- Create: `apps/web/src/components/FeatureBentoGrid.tsx`
- Create: `apps/web/src/components/FlagshipStrip.tsx`

**Interfaces:**
- Produces:
  - `featureDeepDives: FeatureDeepDive[]` and `getFeatureBySlug(slug: string): FeatureDeepDive | undefined` from `@/lib/features-data` — Task 9's deep-dive routes consume these directly.
  - `<FeatureBentoGrid />` and `<FlagshipStrip />`, consumed by Task 8.

- [ ] **Step 1: Write the shared feature content data**

Create `apps/web/src/lib/features-data.ts`:

```ts
export type FeatureStatus = 'live' | 'coming-soon';

export interface FeatureDeepDive {
  slug: string;
  name: string;
  status: FeatureStatus;
  statusLabel: string;
  tagline: string;
  paragraphs: string[];
}

export const featureDeepDives: FeatureDeepDive[] = [
  {
    slug: 'split',
    name: 'Split with friends',
    status: 'live',
    statusLabel: 'Live now',
    tagline: 'Split a bill, track who owes what, and stop chasing people from memory.',
    paragraphs: [
      'Record a group or 1:1 expense and split it equally or by custom shares. Save a reusable list of people — a Circle — so you never re-pick the same friends every time.',
      'Generate a prefilled UPI payment link and hand it to whoever owes you — paying back is one tap in their own UPI app.',
      "Raqm can spot a friend's payment automatically from your own SMS-parsed transactions, and surface it as a candidate match for you to confirm — never auto-settled without your say.",
    ],
  },
  {
    slug: 'budget-together',
    name: 'Budget Together',
    status: 'coming-soon',
    statusLabel: 'Coming soon — Plus',
    tagline: 'Share a budget with your spouse or flatmate, without sharing your whole financial life.',
    paragraphs: [
      "Choose exactly which accounts to share — say, only your joint SBI account — and everything else stays private on your device, the way Raqm already works today.",
      'Sync between devices is end-to-end encrypted. The server relays encrypted data it cannot read — not just a policy promise, a property of how it is built.',
    ],
  },
  {
    slug: 'ai-insights',
    name: 'AI-powered insights',
    status: 'coming-soon',
    statusLabel: 'Coming soon — Plus',
    tagline: 'Understand your spending patterns without handing your financial life to a black box.',
    paragraphs: [
      'Only the amount, category, and your own note are ever sent for processing — never the merchant name, never your location, never the raw SMS.',
      "It's opt-in, and it's additive: Raqm's on-device parsing keeps working exactly the same whether or not you turn this on.",
    ],
  },
];

export function getFeatureBySlug(slug: string): FeatureDeepDive | undefined {
  return featureDeepDives.find((feature) => feature.slug === slug);
}
```

- [ ] **Step 2: Implement the feature bento grid**

Create `apps/web/src/components/FeatureBentoGrid.tsx`:

```tsx
interface FeatureCluster {
  title: string;
  items: string[];
  span: string;
}

const clusters: FeatureCluster[] = [
  {
    title: 'Capture',
    items: [
      'Automatic SMS-based transaction parsing',
      'PDF bank/UPI statement upload for unsupported formats',
      'Manual cash expense logging',
      '"Couldn\'t parse" review queue, with support-request option',
    ],
    span: 'lg:col-span-2 lg:row-span-2',
  },
  {
    title: 'Organize',
    items: [
      'Custom merchant renaming, auto-applies going forward',
      'Group related purchases into one entry',
      'Split one purchase across multiple categories',
      'Transfer detection — sent/received money tagged correctly',
    ],
    span: 'lg:col-span-2',
  },
  {
    title: 'Stay on track',
    items: [
      'Safe-to-spend indicator',
      'Weekly + threshold budget alerts',
      'Subscription-cancellation nudges',
      'Custom pay-cycle start date',
    ],
    span: 'lg:col-span-1 lg:row-span-2',
  },
  {
    title: 'Life stuff',
    items: ['Notes and location tagging on transactions', 'Lending reminders, with auto-SMS follow-up'],
    span: 'lg:col-span-1',
  },
];

export function FeatureBentoGrid() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="mb-8 font-display text-2xl text-ink-headline sm:text-3xl">Everything you need, free</h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:grid-rows-2">
        {clusters.map((cluster) => (
          <div key={cluster.title} className={`glass-card p-6 ${cluster.span}`}>
            <h3 className="mb-3 font-body text-base font-semibold not-italic text-ink-headline">
              {cluster.title}
            </h3>
            <ul className="flex flex-col gap-2">
              {cluster.items.map((item) => (
                <li key={item} className="font-body text-sm text-ink-body">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Implement the flagship features strip**

Create `apps/web/src/components/FlagshipStrip.tsx`:

```tsx
import Link from 'next/link';
import { featureDeepDives } from '@/lib/features-data';

export function FlagshipStrip() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="mb-8 font-display text-2xl text-ink-headline sm:text-3xl">Go deeper</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {featureDeepDives.map((feature) => (
          <Link
            key={feature.slug}
            href={`/features/${feature.slug}`}
            className="glass-card flex flex-col gap-2 p-6 transition-opacity hover:opacity-90"
          >
            <span
              className={`w-fit rounded-dot px-2 py-1 font-body text-xs font-medium ${
                feature.status === 'live'
                  ? 'bg-accent-deep text-accent-primary'
                  : 'bg-[var(--color-surface-raised)] text-ink-label'
              }`}
            >
              {feature.statusLabel}
            </span>
            <h3 className="font-body text-base font-semibold not-italic text-ink-headline">{feature.name}</h3>
            <p className="font-body text-sm text-ink-body">{feature.tagline}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Verify**

```bash
npm run web:build
```

Expected: clean build.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/lib/features-data.ts apps/web/src/components/FeatureBentoGrid.tsx apps/web/src/components/FlagshipStrip.tsx
git commit -m "feat(web): feature bento grid, flagship strip, and shared feature data"
```

---

### Task 8: Home page — Waitlist section, footer, full assembly

**Files:**
- Create: `apps/web/src/components/WaitlistSection.tsx`
- Create: `apps/web/src/components/Footer.tsx`
- Modify: `apps/web/src/app/page.tsx` (scaffold-generated, replace entirely)

**Interfaces:**
- Consumes: `Hero`, `WhyRaqm` (Task 6), `FeatureBentoGrid`, `FlagshipStrip`, `featureDeepDives` (Task 7), `WaitlistForm` (Task 5).
- Produces: the assembled `/` route.

- [ ] **Step 1: Implement the waitlist section**

Create `apps/web/src/components/WaitlistSection.tsx`:

```tsx
import { WaitlistForm } from './WaitlistForm';

export function WaitlistSection() {
  return (
    <section className="mx-auto max-w-3xl px-6 py-20 text-left">
      <div className="glass-card p-8 sm:p-12">
        <h2 className="mb-3 font-display text-2xl text-ink-headline sm:text-3xl">Get early access</h2>
        <p className="mb-6 font-body text-base text-ink-body">
          We&apos;ll email you the moment Raqm is ready to install — nothing else, no spam.
        </p>
        <WaitlistForm source="home_waitlist_section" />
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Implement the footer**

Create `apps/web/src/components/Footer.tsx`:

```tsx
import Link from 'next/link';
import { featureDeepDives } from '@/lib/features-data';

export function Footer() {
  return (
    <footer className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-4 border-t border-[var(--color-border-subtle)] pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg text-ink-headline">Raqm</p>
          <p className="font-body text-sm text-ink-label">
            On-device. Nothing you don&apos;t choose to share ever leaves your phone.
          </p>
        </div>
        <nav className="flex gap-4">
          {featureDeepDives.map((feature) => (
            <Link
              key={feature.slug}
              href={`/features/${feature.slug}`}
              className="font-body text-sm text-ink-body hover:text-accent-primary"
            >
              {feature.name}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Assemble the home page**

Replace `apps/web/src/app/page.tsx` entirely:

```tsx
import { Hero } from '@/components/Hero';
import { WhyRaqm } from '@/components/WhyRaqm';
import { FeatureBentoGrid } from '@/components/FeatureBentoGrid';
import { FlagshipStrip } from '@/components/FlagshipStrip';
import { WaitlistSection } from '@/components/WaitlistSection';
import { Footer } from '@/components/Footer';

export default function HomePage() {
  return (
    <main>
      <Hero />
      <WhyRaqm />
      <FeatureBentoGrid />
      <FlagshipStrip />
      <WaitlistSection />
      <Footer />
    </main>
  );
}
```

- [ ] **Step 4: Verify in Chrome**

```bash
npm run web:dev
```

Use `claude-in-chrome`: navigate to `http://localhost:3000`, take a full-page snapshot at desktop width and at a 375px-wide mobile viewport. Confirm: all six sections render in order, the waitlist form in both Hero and WaitlistSection work independently (submitting one doesn't affect the other's state), no layout overflow at 375px.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/WaitlistSection.tsx apps/web/src/components/Footer.tsx apps/web/src/app/page.tsx
git commit -m "feat(web): assemble home page"
```

---

### Task 9: Feature deep-dive template + 3 routes

**Files:**
- Create: `apps/web/src/app/features/[slug]/page.tsx`

**Interfaces:**
- Consumes: `getFeatureBySlug`, `featureDeepDives`, `FeatureDeepDive` from `@/lib/features-data` (Task 7); `WaitlistForm` (Task 5).
- Produces: `/features/split`, `/features/budget-together`, `/features/ai-insights`, statically generated.

- [ ] **Step 1: Implement the dynamic route**

Create `apps/web/src/app/features/[slug]/page.tsx`:

```tsx
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { featureDeepDives, getFeatureBySlug } from '@/lib/features-data';
import { WaitlistForm } from '@/components/WaitlistForm';

export function generateStaticParams() {
  return featureDeepDives.map((feature) => ({ slug: feature.slug }));
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);

  if (!feature) {
    notFound();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="mb-8 inline-block font-body text-sm text-ink-label hover:text-accent-primary">
        ← Back to Raqm
      </Link>
      <span
        className={`mb-4 inline-block w-fit rounded-dot px-2 py-1 font-body text-xs font-medium ${
          feature.status === 'live' ? 'bg-accent-deep text-accent-primary' : 'bg-[var(--color-surface-raised)] text-ink-label'
        }`}
      >
        {feature.statusLabel}
      </span>
      <h1 className="mb-4 font-display text-4xl text-ink-headline">{feature.name}</h1>
      <p className="mb-8 font-body text-lg text-ink-body">{feature.tagline}</p>
      <div className="mb-12 flex flex-col gap-4">
        {feature.paragraphs.map((paragraph, index) => (
          <p key={index} className="font-body text-base text-ink-body">
            {paragraph}
          </p>
        ))}
      </div>
      <div className="glass-card p-8">
        <h2 className="mb-3 font-display text-xl text-ink-headline">Get early access</h2>
        <WaitlistForm source={`feature_${feature.slug}`} />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Verify the 404 path (Review Focus item 4)**

```bash
npm run web:build
npm run web:start
```

In another terminal: `curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/features/does-not-exist` — expected: `404`. Then stop the `web:start` process.

- [ ] **Step 3: Verify the 3 real routes in Chrome**

```bash
npm run web:dev
```

Use `claude-in-chrome`: navigate to `/features/split`, `/features/budget-together`, `/features/ai-insights`. Confirm each shows the right name/status/tagline/paragraphs, the back link returns to `/`, and the waitlist form on each page has a distinct `source` (check the rendered hidden input or the network payload on submit).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/features
git commit -m "feat(web): feature deep-dive routes"
```

---

### Task 10: Design polish pass — taste-skill + web-design-guidelines

Every component so far (Tasks 5–9) is structurally correct and uses the right tokens, but was written directly, not run through the craft/anti-slop skills the spec's workflow (§7 step 6) requires. This task is that pass — it happens after all pages exist (Task 9) and before animation (Task 11), so motion gets added to a page whose visual craft is already settled, not one that changes shape afterward.

**Files:** whichever component files the skills' findings point at — do not guess ahead of running them; the concrete file list comes from their output, same pattern as Task 11's animation scan.

- [ ] **Step 1: Run the guidelines check**

Invoke `Skill(web-design-guidelines)` against `apps/web/src/app` and `apps/web/src/components` (or the running `http://localhost:3000` if the skill prefers a live page — follow its own instructions). Record every finding.

- [ ] **Step 2: Run the taste-skill pass**

Invoke `Skill(taste-skill:taste-skill)` (core anti-slop check) against the same surface. Then invoke `Skill(taste-skill:minimalist-skill)` and `Skill(taste-skill:soft-skill)` for the aesthetic-specific and premium-polish rules named in spec §5. Record every finding from all three.

- [ ] **Step 3: Apply the fixes**

For each finding from Steps 1–2, edit the exact component file it names. Common categories to expect, given what Tasks 5–9 actually built: bento card sizing/gap rhythm (spec §4 requires asymmetric, not uniform — `FeatureBentoGrid.tsx`'s cluster spans were a first pass, not verified against the skills yet), hover/focus state richness on interactive elements (`FlagshipStrip.tsx`'s cards, `WaitlistForm.tsx`'s button), spacing scale consistency across sections, and any generic-AI-design tell the skills flag by name. Fix every finding — do not leave one unaddressed without saying so to the human partner.

- [ ] **Step 4: Verify**

```bash
npm run web:build
npm run test
```

Expected: both clean. Then a Chrome snapshot of `/` and one feature page, to confirm the fixes actually changed what's rendered (not just the source).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src
git commit -m "polish(web): apply taste-skill and web-design-guidelines findings"
```

---

### Task 11: Animation pass — find-animation-opportunities + GSAP

**Files:**
- Modify: components identified by the `find-animation-opportunities` skill (likely `Hero.tsx`, `WhyRaqm.tsx`, `FeatureBentoGrid.tsx`, `FlagshipStrip.tsx` — confirmed by the skill's actual output, not assumed here)
- Create: `apps/web/src/components/ScrollReveal.tsx`

**Interfaces:**
- Produces: `<ScrollReveal>` wrapper, usable by any section component needing a scroll-triggered entrance.

- [ ] **Step 1: Install GSAP**

```bash
cd apps/web
npm install gsap @gsap/react
```

- [ ] **Step 2: Run the opportunity scan**

Invoke `Skill(find-animation-opportunities)` against `apps/web/src/components` and `apps/web/src/app`. It is read-only — it proposes exact motion opportunities with specific properties/values. Record its findings; the remaining steps implement them.

- [ ] **Step 3: Build the reusable scroll-reveal wrapper**

Create `apps/web/src/components/ScrollReveal.tsx`:

```tsx
'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function ScrollReveal({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(ref.current, {
          opacity: 0,
          y: 24,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 85%',
            once: true,
          },
        });
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(ref.current, { opacity: 1, y: 0 });
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
```

`gsap.matchMedia()` is the mechanism that satisfies Review Focus item 5: the reduced-motion branch runs instead of the animated one, not alongside a CSS override that might not catch every property.

- [ ] **Step 4: Apply it to each section identified by the scan**

Wrap each section component's outer return in `<ScrollReveal>` in place of its current top-level element, per the skill's actual findings from Step 2. Example for `WhyRaqm.tsx` (adjust per the real scan output, but the pattern is this shape):

```tsx
import { ScrollReveal } from './ScrollReveal';
// ...
export function WhyRaqm() {
  return (
    <ScrollReveal className="mx-auto max-w-5xl px-6 py-16">
      {/* existing h2 + grid content, unchanged */}
    </ScrollReveal>
  );
}
```

Do this for every component the scan flagged — do not animate a component the scan didn't flag.

- [ ] **Step 5: Verify reduced motion in Chrome**

Use `claude-in-chrome`'s devtools emulation (or the OS-level setting) to set `prefers-reduced-motion: reduce`, reload the page, confirm sections appear immediately with no animation. Then unset it and confirm the scroll-triggered fade-in plays normally.

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/components
git commit -m "feat(web): scroll-triggered reveal animations via GSAP"
```

---

### Task 12: Full Chrome verification pass

**Files:** none (verification only; fix forward into whichever earlier task's files if something's broken)

- [ ] **Step 1: Desktop pass**

`claude-in-chrome`: full-page snapshot of `/`, `/features/split`, `/features/budget-together`, `/features/ai-insights` at a standard desktop width. Confirm: no `console.error`/`console.warn` (`read_console_messages`), no broken images, glass cards render with visible blur (not just a flat translucent rectangle — confirms `backdrop-filter` is actually applying).

- [ ] **Step 2: Mobile pass**

Same 4 pages at 375px width. Confirm: no horizontal scroll, bento grid collapses to single column, waitlist form inputs and button stack vertically and remain tappable (min 44px touch target).

- [ ] **Step 3: Signup flow, end to end**

If a real Supabase project is available (see Task 4's `.env.example` / spec §8): submit a real email on the home hero form, confirm the success message, submit the same email again, confirm the "already on the list" message (not a raw error). If no real Supabase project is provisioned yet, note this explicitly as still-open rather than claiming it passed.

- [ ] **Step 4: Accessibility spot-check**

Tab through the home page keyboard-only: focus order reaches both waitlist forms and all flagship-strip links; each has a visible focus ring (the `focus:outline-2 focus:outline-accent-primary` from Task 5's input, and default browser focus rings elsewhere — confirm nothing suppresses them). Confirm color contrast of `ink-body`/`ink-label` text against `bg`/`surface` — both are text colors already fixed by the brand tokens, not invented here, but verify visually nothing reads as too faint.

- [ ] **Step 5: Fix forward**

Any defect found gets fixed in the file/task it belongs to (not patched inline here) and re-verified in this same task before moving on. Do not open a new task for a bug found during this pass.

---

## Addendum (post-Task-12): premium visual upgrade

Added after the user reviewed the built site and judged it generic ("AI slop... overused bento and cards") despite Task 10's automated design-review approval. Research against 5 real reference sites (bharpai.app, gravity-design.de, ol.studio, mobbin.com, matteovincenti.com) identified the root cause and a prioritized fix list — see the ledger's "Post-Task-12" entry for the full research synthesis. Tasks 13-16 below implement it, in priority order, before the final Impeccable `document` pass (renumbered to Task 17) records the real, upgraded visual system.

### Task 13: Background depth layer + Lenis smooth scroll

**Files:**
- Create: `apps/web/src/components/BackgroundDepth.tsx`
- Create: `apps/web/src/components/SmoothScrollProvider.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Modify: `apps/web/src/app/globals.css`

**Interfaces:**
- Produces: `<BackgroundDepth />` (rendered once, fixed behind all content) and `<SmoothScrollProvider>` (wraps `{children}` in the root layout).

**Why this is first:** every reference site's blur/glass surfaces read as premium because there's real depth/texture behind them. Raqm's `.glass-card` blur is currently near-invisible against a flat single-color background — this is the single highest-leverage fix.

- [ ] **Step 1: Build the background depth layer**

Create `apps/web/src/components/BackgroundDepth.tsx` — a fixed, full-viewport, `pointer-events-none`, `aria-hidden` layer sitting behind all page content (`z-index` below everything else, `position: fixed; inset: 0; z-index: -1`). Build it as 2-3 large soft radial gradients in the existing accent tones, positioned asymmetrically (not centered/uniform — matches the site's own asymmetric-bento discipline), e.g.:

```tsx
export function BackgroundDepth() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-1/4 -top-1/3 h-[60vw] w-[60vw] rounded-full bg-[radial-gradient(circle,var(--color-accent-deep)_0%,transparent_70%)] opacity-40 blur-3xl" />
      <div className="absolute -right-1/3 top-1/3 h-[50vw] w-[50vw] rounded-full bg-[radial-gradient(circle,var(--color-accent-primary)_0%,transparent_70%)] opacity-[0.08] blur-3xl" />
      <div className="absolute bottom-0 left-1/4 h-[45vw] w-[45vw] rounded-full bg-[radial-gradient(circle,var(--color-notice)_0%,transparent_70%)] opacity-[0.06] blur-3xl" />
    </div>
  );
}
```

Adjust exact positions/sizes/opacities as needed so it reads as a subtle, always-present texture — strong enough that `.glass-card`'s blur has real content to distort, subtle enough that body text everywhere stays comfortably legible (spot-check contrast over the gradient's brightest point, not just over flat background). This must stay within the light-only, one-primary-accent discipline: the non-primary-accent blobs (notice color) are decoration, not a second "accent" in the sense the constraint means (never used on interactive/text elements).

- [ ] **Step 2: Install and wire Lenis smooth scroll**

```bash
cd apps/web && npm install lenis
```

Create `apps/web/src/components/SmoothScrollProvider.tsx`:

```tsx
'use client';

import { useEffect, useRef } from 'react';
import Lenis from 'lenis';

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    const lenis = new Lenis({ duration: 1.1, smoothWheel: true });
    lenisRef.current = lenis;

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  return <>{children}</>;
}
```

Reduced motion disables Lenis entirely (falls back to native scroll) rather than trying to make inertia scrolling itself "reduced" — inertia/momentum scroll IS the motion effect here, there's no meaningful reduced variant of it.

- [ ] **Step 3: Wire both into the root layout**

Modify `apps/web/src/app/layout.tsx`: import and render `<BackgroundDepth />` as the first child of `<body>`, wrap the rest of `{children}` in `<SmoothScrollProvider>`.

- [ ] **Step 4: Verify**

```bash
npm run web:build
```

Then a Chrome check: confirm the background gradients are visible but subtle, confirm `.glass-card` elements now show a visibly distorted/blurred backdrop (not a flat translucent rectangle), confirm scroll feels like it has inertia (not 1:1 native scroll) with reduced-motion off, and confirm scroll is instant/native with reduced-motion on (DevTools emulation).

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/BackgroundDepth.tsx apps/web/src/components/SmoothScrollProvider.tsx apps/web/src/app/layout.tsx apps/web/src/app/globals.css apps/web/package.json apps/web/package-lock.json ../../package-lock.json
git commit -m "feat(web): background depth layer + Lenis smooth scroll"
```

(Adjust the lockfile paths to whichever actually changed — root and/or `apps/web` — don't leave either dangling; this project has hit that exact mistake three times already this session.)

---

### Task 14: threejs-parallax depth on Hero

**Files:**
- Modify: `apps/web/src/components/Hero.tsx` (replace the static corner-hint `div` with a parallax layer)
- Create: whatever the `threejs-parallax` skill's own workflow directs (likely a new component plus generated layer assets)

**Constraint tension to resolve, don't ignore:** the `threejs-parallax` skill's own description calls for "layered transparent PNG assets." This project's surface brief locks Hero (and the site generally) to **CSS/SVG only — no photography, no illustration, no device mockups**. Read the skill's actual instructions first (`Skill(threejs-parallax)`) before writing any code — then make a real decision, don't silently pick one side:

- If the skill's PNG layers can reasonably be **abstract, brand-colored gradient/shape blobs you generate yourself** (not photography, not illustration of people/objects/scenes — just soft depth shapes matching Task 13's background gradients), that satisfies the constraint's actual intent (no stock imagery, no decorative mascots) even though the asset format is PNG. Prefer this path.
- If the skill fundamentally requires photographic or illustrative content to be worth using, **do not use it** — fall back to a pure CSS/GSAP ScrollTrigger multi-layer parallax instead (2-3 `.glass-card`-styled shapes at different `translateY` scroll-linked speeds via `gsap.to(..., { scrollTrigger: { scrub: true } })`), which is already fully within the existing toolset (`gsap`/`ScrollTrigger` from Task 11).

Either way, this replaces Hero's current single static ghosted corner-hint (`apps/web/src/components/Hero.tsx`'s `pointer-events-none absolute -right-10 -top-6 ...` div) with something that has real scroll-linked or mouse-linked depth motion — that's the actual ask, not "use this specific library no matter what."

- [ ] **Step 1: Read the skill, decide the approach, document the decision**

Invoke `Skill(threejs-parallax)`. Read its actual requirements. Write a one-paragraph decision (which path above, and why) at the top of your eventual report — this is a real judgment call the task reviewer will scrutinize, not a rubber stamp.

- [ ] **Step 2: Implement**

Build whichever approach you chose. Keep it to Hero only for this task — don't add parallax everywhere yet. Preserve everything else Task 6 already established (the glass-card content wrapper, the copy, `WaitlistForm` usage) unchanged.

- [ ] **Step 3: Verify**

`npm run web:build` clean. Chrome check: confirm the new depth effect is visible and moves distinctly from the rest of the page on scroll (or on mouse move, if that's the mechanism chosen) — a static image that merely looks nicer isn't what this task is for. Confirm `prefers-reduced-motion: reduce` disables any scroll/mouse-linked motion here too (same discipline as Task 11).

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/Hero.tsx <whatever else you created>
git commit -m "feat(web): parallax depth layer on Hero"
```

---

### Task 15: Technical/engineering chrome details + copy tightening

**Files:**
- Modify: `apps/web/src/components/Hero.tsx`, `WhyRaqm.tsx`, `Footer.tsx` (add small chrome details)
- Modify: copy in `Hero.tsx`, `WhyRaqm.tsx`, `FeatureBentoGrid.tsx`, `FlagshipStrip.tsx`, `WaitlistSection.tsx` (tighten headlines/subheads)

**Direction:** matteovincenti.com's recipe for a low-animation site still feeling expensive: small coordinate-style labels, thin crosshair marks, numbered section markers, generous whitespace. This fits Raqm's own DESIGN.md "engineered precision" language directly — it isn't a new aesthetic, it's making the existing one legible.

- [ ] **Step 1: Add chrome details**

Add small, low-opacity (`text-ink-label`, `opacity-40`-ish) `font-mono` markers to 2-3 sections — do not overdo this, 1 marker per section is plenty:
- A numbered section marker at the top of each major section, e.g. `<span className="font-mono text-xs text-ink-label">01 / 05</span>` above "Why Raqm", `02 / 05` above the feature grid, etc. (count sections that actually exist: Hero isn't numbered since it's the entry point, then WhyRaqm/FeatureBentoGrid/FlagshipStrip/WaitlistSection get 01-04).
- A small SVG crosshair mark (a plain `+` built from two thin `<line>`s, ~12px, `stroke="var(--color-ink-label)"`, low opacity) near Hero's corner-hint area or WhyRaqm's heading — one or two total, not scattered everywhere.

- [ ] **Step 2: Tighten copy**

Rewrite these strings for more direct, confident phrasing (matching bharpai.app's "One person creates. Everyone else just pays." directness — concrete, benefit-first, no vague marketing language):
- Hero headline: keep "Know where your money goes. Automatically." (already direct) — but tighten the subhead from the current two-line sentence to something that reads in one confident breath. Propose: "Bank SMS in, spending clarity out. No linking, no typing, nothing sent anywhere."
- WhyRaqm's four card bodies: keep their substance but cut any hedging words ("entirely," "actually") that dilute directness.
- WaitlistSection heading "Get early access" is already direct — leave it.
- Flagship strip taglines: tighten to single confident sentences if any currently run long.

Use your own judgment for the exact final wording within these constraints (concrete, no competitor names, no fabricated claims) — this is real copywriting, not transcription.

- [ ] **Step 3: Verify**

`npm run web:build` clean. Chrome check: confirm chrome details read as subtle accents, not clutter; confirm no copy change introduces a false/unverifiable claim.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components
git commit -m "feat(web): technical chrome details and tightened copy"
```

---

### Task 16: CSS phone-mockup section (real product UI, not abstract cards)

**Files:**
- Create: `apps/web/src/components/PhoneMockup.tsx`
- Modify: `apps/web/src/components/Hero.tsx` (or create a new section between Hero and WhyRaqm — implementer's call based on what actually looks right; document the choice)
- Modify: `apps/web/src/app/page.tsx` if a new section is added rather than slotted into Hero

**Direction:** bharpai.app's strongest technique — a real device mockup showing real product content, not another abstract card. Recreate (don't screenshot) a small, recognizable piece of Raqm's actual dashboard design, referencing `docs/superpowers/specs/2026-09-23-dashboard-prototype.html` (already-built prototype in this repo) for the real layout: a hero card showing a spend amount (e.g. "₹42,680" spent this month), a small donut/ring showing budget-used percentage, a "Remaining ₹17,320 of ₹60,000" line. This is CSS/SVG only — build it as markup, not an image.

- [ ] **Step 1: Read the reference**

Skim `docs/superpowers/specs/2026-09-23-dashboard-prototype.html`'s hero card markup/CSS (`.hero-ring`, `.hero-number`, `.hero-remaining` classes and surrounding structure) for the real layout to recreate at a smaller scale — this is evidence of what the real app actually looks like, not a template to copy verbatim (different fonts/colors apply here: Raqm's v3.0/onboarding tokens, not v2.0's).

- [ ] **Step 2: Build the phone frame**

Create `apps/web/src/components/PhoneMockup.tsx`: an outer bezel (`rounded-[2.5rem]` or similar, dark or `ink-headline`-toned frame, ~280px wide, a notch/camera-cutout detail at top), an inner "screen" area (`bg-surface`, clipped rounded corners) containing the recreated dashboard hero card (amount, donut ring via inline SVG `<circle>` with `stroke-dasharray`, remaining-budget line) using this site's actual tokens (`--color-accent-primary`, `font-mono` for the amount, etc.) — not raqm app's dark-mode v2.0 tokens.

- [ ] **Step 3: Place it**

Decide where it reads best — most likely inside or beside Hero's glass card (replacing or supplementing the corner-hint from Task 14), or as its own brief section right after Hero. Make the call based on what actually looks balanced once built; document which you chose and why.

- [ ] **Step 4: Verify**

`npm run web:build` clean. Chrome check at desktop and 375px: confirm the mockup renders proportionally, doesn't cause overflow at mobile width, and the donut ring/amount are legible.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/PhoneMockup.tsx apps/web/src/components/Hero.tsx apps/web/src/app/page.tsx
git commit -m "feat(web): CSS phone-mockup showing real dashboard UI"
```

---

### Task 17: Impeccable document pass + final wrap-up

**Files:**
- Modify: `apps/web/DESIGN.md` (seed → real, scan mode)
- Create: the `.impeccable/design.json` sidecar for `apps/web` — **do not assume it goes to the monorepo-root `.impeccable/design.json`** just because that's where `apps/raqm`'s sidecar landed. Run `impeccable context --target apps/web` (or let `document`'s own Step 1 do it) and use whatever path *that* run reports for this target; a single shared root file could collide with `apps/raqm`'s entry if the tool doesn't namespace by workspace. Verify by reading whatever path it reports before trusting it.

- [ ] **Step 1: Run document in scan mode**

Now that real components/tokens/pages exist, invoke `Skill(impeccable, args: "document")` from inside `apps/web`. It will find the seed `DESIGN.md` from Task 2 and offer refresh/overwrite/merge — choose **merge** (same choice made for `apps/raqm`'s DESIGN.md in this session), so the seed's confirmed decisions carry forward and get backed by the real extracted tokens/components instead of being replaced.

- [ ] **Step 2: Verify with doctor**

```bash
.claude/skills/impeccable/scripts/impeccable doctor --json --target apps/web
```

Expected: `findings: []`. If not, resolve what it reports before continuing.

- [ ] **Step 3: Final full-suite check**

```bash
npm run test
npm run web:build
```

Expected: both clean.

- [ ] **Step 4: Commit**

```bash
git add apps/web/DESIGN.md .impeccable
git commit -m "docs(web): finalize DESIGN.md via Impeccable document pass"
```

- [ ] **Step 5: Report remaining open items to the human partner**

Summarize anything from spec §8 still unresolved (a real Supabase project's URL/anon key, a domain, real feature-page imagery) rather than silently closing them out — these were flagged as prerequisites, not failures of this plan.
