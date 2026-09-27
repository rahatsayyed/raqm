const RING_RADIUS = 30;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
const BUDGET_USED_PCT = 71;

export function PhoneMockup() {
  const dashOffset = RING_CIRCUMFERENCE * (1 - BUDGET_USED_PCT / 100);

  return (
    <div className="relative mx-auto w-[280px] rounded-[2.5rem] border border-black/10 bg-ink-headline p-3 shadow-2xl">
      <div className="absolute left-1/2 top-3 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-ink-headline">
        <div className="absolute right-3 top-1/2 h-1.5 w-1.5 -translate-y-1/2 rounded-full bg-[#2A2A24]" />
      </div>
      <div className="relative overflow-hidden rounded-[2rem] bg-surface">
        <div className="flex items-center justify-between px-5 pb-2 pt-8">
          <span className="font-display text-sm text-ink-headline">Raqm</span>
          <div className="h-6 w-6 rounded-full bg-surface-raised" />
        </div>
        <div className="px-5 pb-6">
          <div className="rounded-[var(--radius-outer)] border border-border-subtle bg-surface-raised p-5">
            <span className="mb-3 block font-body text-[10px] font-semibold uppercase tracking-wide text-ink-label">
              September
            </span>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-2xl font-bold leading-none text-ink-headline">₹42,680</div>
                <div className="mt-2 font-body text-xs text-ink-body">spent this month</div>
              </div>
              <div className="flex flex-none flex-col items-center gap-2 pt-1">
                <div className="relative h-12 w-12">
                  <svg viewBox="0 0 64 64" className="h-12 w-12 -rotate-90">
                    <circle cx="32" cy="32" r={RING_RADIUS} fill="none" strokeWidth="5" className="stroke-black/10" />
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
            <div className="font-mono text-sm font-bold text-ink-headline">₹17,320</div>
          </div>
        </div>
      </div>
    </div>
  );
}
