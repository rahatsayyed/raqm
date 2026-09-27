import { ScrollLift } from './ScrollLift';
import { SAMPLE_CATEGORIES, SAMPLE_DASHBOARD, SAMPLE_TRANSACTIONS, type SampleCategory } from '@/lib/sample-transactions';

const RING_RADIUS = 42;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const ICON_TINT: Record<SampleCategory, string> = {
  food: 'bg-[color-mix(in_srgb,var(--color-notice)_18%,white)] text-notice',
  transport: 'bg-accent-deep text-accent-primary',
  shopping: 'bg-surface-raised text-ink-body',
  groceries: 'bg-accent-deep text-accent-primary',
};

function CategoryIcon({ kind }: { kind: SampleCategory }) {
  const common = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] sm:h-12 sm:w-12 ${ICON_TINT[kind]}`}>
      <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
        {kind === 'food' && (
          <>
            <path {...common} d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10" />
            <path {...common} d="M17 21V3c-2 1.5-3 4-3 7v3h3" />
          </>
        )}
        {kind === 'transport' && (
          <>
            <path {...common} d="M5 16V11l2-5h10l2 5v5H5Z" />
            <path {...common} d="M5 11h14M8 19v-3M16 19v-3" />
          </>
        )}
        {kind === 'groceries' && (
          <>
            <path {...common} d="M3 10h18l-2 10H5L3 10Z" />
            <path {...common} d="m8 10 3-6M16 10l-3-6M9 14v3M15 14v3" />
          </>
        )}
        {kind === 'shopping' && (
          <>
            <path {...common} d="M5 8h14l-1 13H6L5 8Z" />
            <path {...common} d="M9 10V7a3 3 0 0 1 6 0v3" />
          </>
        )}
      </svg>
    </span>
  );
}

export function ProductSheet() {
  const now = new Date();
  const month = now.toLocaleDateString('en-US', { month: 'long' });
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-US', { month: 'long' });
  const dashOffset = RING_CIRCUMFERENCE * (1 - SAMPLE_DASHBOARD.usedPct / 100);
  const d = SAMPLE_DASHBOARD;

  return (
    <section id="product" className="relative px-4 pt-8 sm:px-6 sm:pt-12">
      <ScrollLift className="mx-auto w-full max-w-6xl will-change-transform">
        <div
          role="img"
          aria-label={`Preview of the Raqm dashboard: ${d.spent} spent this month, ${d.usedPct}% of a ${d.budget} budget used, with recent Swiggy, Uber and Amazon transactions logged from SMS.`}
          className="rounded-t-[28px] border border-b-0 border-[color-mix(in_srgb,var(--color-ink-headline)_14%,transparent)] bg-surface px-4 pb-8 pt-5 [mask-image:linear-gradient(to_bottom,black_90%,transparent)] sm:rounded-t-[36px] sm:px-8 sm:pb-12 sm:pt-7 lg:px-12"
        >
          <div className="mb-6 flex items-center justify-between sm:mb-8">
            <span className="font-body text-lg font-semibold text-ink-headline sm:text-xl">Raqm</span>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-ink-label">
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <circle cx="12" cy="9" r="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
                <path d="M5 20c1.5-3.5 4-5 7-5s5.5 1.5 7 5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.45fr_1fr] lg:gap-8">
            <div className="min-w-0 rounded-[22px] border border-border-subtle bg-bg p-5 sm:p-8">
              <span className="flex items-center gap-1 font-body text-sm font-medium text-ink-label">
                {month}
                <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                  <path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="mt-4 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="font-mono text-[2.75rem] font-semibold leading-none tracking-tight text-ink-headline sm:text-[3.5rem]">
                    {d.spent}
                  </div>
                  <div className="mt-2 font-body text-base text-ink-body">spent this month</div>
                  <span className="mt-4 inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent-deep px-3 py-1.5 font-body text-sm font-medium text-accent-primary">
                    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
                      <path d="m3 7 7 7 4-4 7 7M21 12v5h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span className="font-mono">{d.lessThanLastMonth}</span> less than {prevMonth}
                  </span>
                </div>
                <div className="flex items-center gap-4 sm:border-l sm:border-border-subtle sm:pl-6">
                  <div className="flex flex-col">
                    <span className="font-body text-xs font-semibold uppercase tracking-wider text-ink-label">Remaining</span>
                    <span className="mt-1 font-mono text-2xl font-semibold text-ink-headline">{d.remaining}</span>
                    <span className="whitespace-nowrap font-body text-sm text-ink-label">of {d.budget} Budget</span>
                  </div>
                  <div className="relative h-24 w-24 shrink-0">
                    <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90" aria-hidden="true">
                      <circle cx="50" cy="50" r={RING_RADIUS} fill="none" strokeWidth="9" className="stroke-surface-raised" />
                      <circle
                        cx="50"
                        cy="50"
                        r={RING_RADIUS}
                        fill="none"
                        strokeWidth="9"
                        strokeLinecap="round"
                        className="stroke-accent-primary"
                        strokeDasharray={RING_CIRCUMFERENCE}
                        strokeDashoffset={dashOffset}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="font-mono text-lg font-semibold leading-none text-ink-headline">{d.usedPct}%</span>
                      <span className="mt-1 font-body text-xs text-ink-label">used</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="my-6 h-px bg-border-subtle" />
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-body text-sm text-ink-label">Safe to spend</span>
                  <span className="font-mono text-lg font-semibold text-ink-headline">{d.safeToSpendPerDay}</span>
                  <span className="font-body text-sm text-ink-label">/day</span>
                </div>
                <div className="hidden h-8 w-px bg-border-subtle sm:block" />
                <div className="flex items-baseline gap-2">
                  <span className="font-body text-sm text-ink-label">Earned</span>
                  <span className="font-mono text-lg font-semibold text-ink-headline">{d.earned}</span>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col">
              <div className="mb-3 flex items-center justify-between px-1">
                <span className="font-body text-lg font-semibold text-ink-headline">Recent transactions</span>
                <span className="font-body text-sm font-medium text-accent-primary">See all ›</span>
              </div>
              <div className="flex flex-col divide-y divide-border-subtle rounded-[22px] border border-border-subtle bg-bg">
                {SAMPLE_TRANSACTIONS.map((tx) => (
                  <div key={tx.merchant} className="flex items-center gap-4 px-4 py-4 sm:px-5 sm:py-5">
                    <CategoryIcon kind={tx.kind} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-body text-base font-semibold text-ink-headline">{tx.merchant}</div>
                      <div className="truncate font-body text-sm text-ink-label">
                        {tx.category} · {tx.source}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="font-mono text-base font-semibold text-ink-headline">{tx.amount}</span>
                      <span className="font-body text-xs text-ink-label">{tx.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-8 sm:mt-10">
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="font-body text-lg font-semibold text-ink-headline">Categories</span>
              <span className="font-body text-sm font-medium text-accent-primary">See all ›</span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-5">
              {SAMPLE_CATEGORIES.map((cat) => (
                <div key={cat.name} className="min-w-0 rounded-[22px] border border-border-subtle bg-bg p-5">
                  <div className="flex items-center gap-3">
                    <CategoryIcon kind={cat.kind} />
                    <div className="min-w-0">
                      <div className="truncate font-body text-base font-semibold text-ink-headline">{cat.name}</div>
                      <div className="font-body text-sm text-ink-label">{cat.count} spends</div>
                    </div>
                  </div>
                  <div className="mt-5 flex items-baseline gap-2">
                    <span className="font-mono text-xl font-semibold text-ink-headline">{cat.spent}</span>
                    <span className="font-body text-sm text-ink-label">of {cat.budget}</span>
                  </div>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-raised">
                    <div className="h-full rounded-full bg-accent-primary" style={{ width: `${cat.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </ScrollLift>
    </section>
  );
}
