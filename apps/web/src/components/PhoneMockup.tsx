const RING_RADIUS = 29;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const BUDGET_USED_PCT = 71;

const RECENT_TRANSACTIONS = [
  { merchant: 'Swiggy', category: 'Food', amount: '−₹420' },
  { merchant: 'Uber', category: 'Transport', amount: '−₹280' },
  { merchant: 'Amazon', category: 'Shopping', amount: '−₹1,249' },
];

export function PhoneMockup() {
  const dashOffset = RING_CIRCUMFERENCE * (1 - BUDGET_USED_PCT / 100);
  const monthLabel = new Date().toLocaleDateString('en-US', { month: 'long' });

  return (
    <div
      aria-hidden="true"
      className="relative mx-auto flex aspect-[9/19] w-[280px] flex-col rounded-[2.5rem] border border-border-subtle bg-ink-headline p-3 shadow-2xl"
    >
      <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink-headline">
        <div className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#2A2A24]" />
      </div>
      <div className="relative flex-1 overflow-hidden rounded-[2rem] bg-surface">
        <div className="flex items-center justify-between px-5 pb-2 pt-8">
          <span className="font-body text-sm font-semibold text-ink-headline">Raqm</span>
          <div className="h-6 w-6 rounded-full bg-surface-raised" />
        </div>
        <div className="px-5 pb-6">
          <div className="rounded-[var(--radius-outer)] border border-border-subtle bg-surface-raised p-5">
            <span className="mb-3 block font-body text-[10px] font-semibold uppercase tracking-wide text-ink-label">
              {monthLabel}
            </span>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-2xl font-semibold leading-none text-ink-headline">₹42,680</div>
                <div className="mt-2 font-body text-xs text-ink-body">spent this month</div>
              </div>
              <div className="flex flex-none flex-col items-center gap-2 pt-1">
                <div className="relative h-12 w-12">
                  <svg viewBox="0 0 64 64" className="h-12 w-12 -rotate-90">
                    <circle cx="32" cy="32" r={RING_RADIUS} fill="none" strokeWidth="5" className="stroke-border-subtle" />
                    <circle
                      cx="32"
                      cy="32"
                      r={RING_RADIUS}
                      fill="none"
                      strokeWidth="5"
                      strokeLinecap="round"
                      className="stroke-accent-primary"
                      strokeDasharray={RING_CIRCUMFERENCE}
                      strokeDashoffset={dashOffset}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center font-mono text-[11px] font-semibold text-ink-headline">
                    {BUDGET_USED_PCT}%
                  </div>
                </div>
              </div>
            </div>
            <div className="my-4 h-px bg-border-subtle" />
            <div className="flex items-center justify-between">
              <span className="font-body text-[10px] font-semibold uppercase tracking-wide text-ink-label">
                Remaining
              </span>
              <span className="font-body text-[10px] text-ink-label">of ₹60,000 Budget</span>
            </div>
            <div className="font-mono text-sm font-semibold text-ink-headline">₹17,320</div>
          </div>
          <div className="mt-3 flex flex-col gap-2">
            {RECENT_TRANSACTIONS.map((tx) => (
              <div
                key={tx.merchant}
                className="flex items-center justify-between rounded-[var(--radius-inner)] bg-surface-raised px-3 py-2"
              >
                <div className="min-w-0">
                  <div className="truncate font-body text-xs font-semibold text-ink-headline">{tx.merchant}</div>
                  <div className="truncate font-body text-[10px] text-ink-label">{tx.category}</div>
                </div>
                <div className="shrink-0 font-mono text-xs font-semibold text-ink-headline">{tx.amount}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
