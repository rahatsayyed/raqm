const BUDGETS = [
  { name: 'Food', spent: '₹8,240', pct: 'w-[72%]' },
  { name: 'Travel', spent: '₹3,100', pct: 'w-[41%]' },
  { name: 'Bills', spent: '₹6,900', pct: 'w-[88%]' },
];

const WIDGET = 'bg-inverse text-inverse-ink shadow-2';

export function WidgetPhone() {
  return (
    <div data-phone className="mx-auto w-full max-w-72 rounded-t-[2.5rem] border border-b-0 border-line bg-ink p-2 pb-0 shadow-3">
      <div className="h-[17rem] overflow-hidden rounded-t-[2rem] bg-surface-sunken px-3.5 pt-3 lg:h-[21.5rem]">
        <div className="flex items-center justify-between px-1.5 text-[10px] font-medium text-ink-muted">
          <span>9:41</span>
          <span className="h-3 w-3 rounded-full bg-ink" aria-hidden />
          <span>78%</span>
        </div>
        <div className="mt-4 space-y-2">
          <div data-widget className={`rounded-cell p-3.5 ${WIDGET}`}>
            <p className="text-[10px] text-inverse-ink/70">Safe to spend today</p>
            <p className="mt-1 font-mono text-2xl tracking-tight">₹1,420</p>
            <p className="mt-0.5 text-[10px] text-inverse-ink/70">of ₹22,000 left this month</p>
          </div>
          <div data-widget className={`rounded-cell p-3.5 ${WIDGET}`}>
            <p className="text-[10px] text-inverse-ink/70">Budgets</p>
            <ul className="mt-2 space-y-2">
              {BUDGETS.map((b) => (
                <li key={b.name} className="text-[11px]">
                  <div className="flex justify-between">
                    <span>{b.name}</span>
                    <span className="font-mono text-inverse-ink/80">{b.spent}</span>
                  </div>
                  <div className="mt-1 h-1 rounded-pill bg-inverse-line">
                    <div className={`h-full rounded-pill bg-positive ${b.pct}`} />
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {['Add cash', 'Voice'].map((t) => (
              <div key={t} data-widget className={`flex items-center gap-2 rounded-cell p-3 text-[11px] ${WIDGET}`}>
                <span className="grid size-6 place-items-center rounded-full bg-brand text-brand-ink" aria-hidden>
                  +
                </span>
                {t}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
