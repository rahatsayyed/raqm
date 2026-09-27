import { ScrollReveal } from './ScrollReveal';
import { SAMPLE_TRANSACTIONS } from '@/lib/sample-transactions';

const loggedExample = SAMPLE_TRANSACTIONS[0];

export function WhyRaqm() {
  return (
    <ScrollReveal className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <span className="mb-3 block font-mono text-xs text-ink-label opacity-60">01 / 04</span>
      <h2 className="mb-10 text-balance font-display text-4xl text-ink-headline sm:text-5xl">Why Raqm</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="relative flex min-h-[340px] flex-col justify-between overflow-hidden rounded-outer bg-accent-primary p-7 text-surface sm:col-span-2 sm:p-10 lg:row-span-2 lg:min-h-[520px]">
          <svg aria-hidden="true" viewBox="0 0 200 200" className="pointer-events-none absolute -bottom-24 -right-24 h-80 w-80 text-accent-deep opacity-20 sm:h-[26rem] sm:w-[26rem]">
            <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="18" opacity="0.4" />
            <circle cx="100" cy="100" r="80" fill="none" stroke="currentColor" strokeWidth="18" strokeDasharray="357 503" strokeLinecap="round" transform="rotate(-90 100 100)" />
          </svg>
          <span className="relative font-body text-sm font-medium uppercase tracking-wider text-accent-deep">On-device</span>
          <div className="relative">
            <h3 className="max-w-md font-display text-5xl leading-[1.02] text-surface sm:text-6xl">
              Nothing leaves your phone.
            </h3>
            <p className="mt-5 max-w-sm font-body text-base text-[color-mix(in_srgb,var(--color-surface)_78%,transparent)]">
              SMS parsing happens on-device. No bank linking, no server ever sees your messages.
            </p>
          </div>
        </article>

        <article className="flex min-h-[240px] flex-col justify-between rounded-outer bg-notice p-7 text-ink-headline sm:col-span-2 sm:p-8">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-7xl leading-none sm:text-8xl">120+</span>
            <span className="max-w-[10rem] font-body text-sm font-medium leading-snug">banks, read the way they text you</span>
          </div>
          <div className="mt-8">
            <h3 className="font-body text-lg font-semibold not-italic">Built for India</h3>
            <p className="mt-1 max-w-md font-body text-sm text-[color-mix(in_srgb,var(--color-ink-headline)_80%,transparent)]">
              SMS-first, UPI-aware categorization tuned for how Indian banks message you.
            </p>
          </div>
        </article>

        <article className="flex min-h-[260px] flex-col justify-between rounded-outer bg-ink-headline p-7 text-surface">
          <span className="font-display text-6xl leading-none">0 ads</span>
          <div className="mt-8">
            <h3 className="font-body text-lg font-semibold not-italic">Yours, not sold</h3>
            <p className="mt-1 font-body text-sm text-[color-mix(in_srgb,var(--color-surface)_70%,transparent)]">
              No data monetization. Your spending is not the product.
            </p>
          </div>
        </article>

        <article className="glass-card-flat flex min-h-[260px] flex-col justify-between p-7">
          <div aria-hidden="true" className="rounded-inner border border-border-subtle bg-surface p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="font-body text-sm font-semibold text-ink-headline">{loggedExample.merchant}</span>
              <span className="font-mono text-sm font-semibold text-ink-headline">{loggedExample.amount}</span>
            </div>
            <div className="mt-0.5 flex items-center justify-between gap-2 font-body text-xs text-ink-label">
              <span className="truncate">{loggedExample.source}</span>
              <span className="shrink-0">{loggedExample.time}</span>
            </div>
          </div>
          <div className="mt-8">
            <h3 className="font-body text-lg font-semibold not-italic text-ink-headline">It already knows</h3>
            <p className="mt-1 font-body text-sm text-ink-body">
              Transactions show up the moment they happen. You never type them in.
            </p>
          </div>
        </article>
      </div>
    </ScrollReveal>
  );
}
