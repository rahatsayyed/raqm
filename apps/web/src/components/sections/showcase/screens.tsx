import { CATS, TXS, WEEK, type Tx } from './data';

const TONE: Record<Tx['tone'], string> = {
  food: 'bg-brand-soft text-brand',
  move: 'bg-surface-sunken text-ink-muted',
  shop: 'bg-brand-soft text-ink',
  bill: 'bg-surface-sunken text-ink',
  in: 'bg-positive/15 text-positive',
};

function Dot({ tx, size = 28 }: { tx: Tx; size?: number }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-chip font-mono text-[11px] font-semibold ${TONE[tx.tone]}`}
      style={{ width: size, height: size }}
    >
      {tx.merchant[0]}
    </span>
  );
}

function TxRow({ tx, compact }: { tx: Tx; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${compact ? 'py-2' : 'py-2.5'}`}>
      <Dot tx={tx} size={compact ? 30 : 32} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-medium text-ink">{tx.merchant}</div>
        <div className="text-[11px] text-ink-subtle">{tx.category} · {tx.time}</div>
      </div>
      <div className={`font-mono text-[13px] ${tx.tone === 'in' ? 'text-positive' : 'text-ink'}`}>{tx.amount}</div>
    </div>
  );
}

const NAV = ['Home', 'Transactions', 'Analytics', 'Split', 'Chat'];

function Sidebar({ active }: { active: string }) {
  return (
    <aside className="flex w-[190px] shrink-0 flex-col gap-1 border-r border-line bg-surface-sunken p-4">
      <div className="mb-4 flex items-center gap-2 px-2 text-[15px] font-semibold text-ink">
        <span className="grid size-6 place-items-center rounded-tag bg-brand text-[12px] text-brand-ink">R</span>
        Raqm
      </div>
      {NAV.map((n) => (
        <div
          key={n}
          className={`rounded-chip px-3 py-2 text-[13px] ${n === active ? 'bg-surface font-medium text-ink shadow-ring' : 'text-ink-muted'}`}
        >
          {n}
        </div>
      ))}
    </aside>
  );
}

export function DesktopDashboard() {
  const max = Math.max(...WEEK);
  return (
    <div className="flex h-full bg-canvas">
      <Sidebar active="Home" />
      <div className="flex min-w-0 flex-1 flex-col gap-4 p-6">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[12px] text-ink-subtle">Spent this month</div>
            <div className="font-mono text-[34px] font-medium leading-none tracking-tight text-ink">₹42,680</div>
          </div>
          <div className="rounded-pill bg-brand-soft px-3 py-1 text-[12px] text-brand">₹7,320 less than last month</div>
        </div>
        <div className="grid grid-cols-[1.3fr_1fr] gap-cell">
          <div className="rounded-container border border-line bg-surface p-4">
            <div className="mb-3 flex justify-between text-[12px] text-ink-subtle">
              <span>This week</span>
              <span className="font-mono">71% of ₹60,000</span>
            </div>
            <div className="flex h-[96px] items-end gap-2">
              {WEEK.map((v, i) => (
                <div key={i} className="flex h-full flex-1 flex-col justify-end">
                  <div className={`rounded-tag ${i === 5 ? 'bg-brand' : 'bg-surface-sunken'}`} style={{ height: `${(v / max) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-ink-subtle">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="flex-1 text-center">{d}</span>)}
            </div>
          </div>
          <div className="rounded-container border border-line bg-surface p-4">
            <div className="mb-3 text-[12px] text-ink-subtle">Top categories</div>
            <div className="flex flex-col gap-3">
              {CATS.map((c) => (
                <div key={c.name}>
                  <div className="mb-1 flex justify-between text-[12px] text-ink">
                    <span>{c.name}</span>
                    <span className="font-mono text-ink-muted">{c.spent}</span>
                  </div>
                  <div className="h-1.5 rounded-pill bg-surface-sunken">
                    <div className="h-full rounded-pill bg-brand" style={{ width: `${c.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden rounded-container border border-line bg-surface px-4 pt-3">
          <div className="mb-1 flex justify-between text-[12px] text-ink-subtle"><span>Recent</span><span>View all</span></div>
          <div className="divide-y divide-line">
            {TXS.slice(0, 4).map((t) => <TxRow key={t.merchant} tx={t} compact />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function PhoneHome() {
  return (
    <div className="flex h-full flex-col gap-3 bg-canvas px-4 pb-4 pt-3">
      <div className="flex items-center justify-between font-mono text-[10px] text-ink-subtle">
        <span>9:41</span><span>●●●</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[15px] font-semibold text-ink">Raqm</span>
        <span className="grid size-7 place-items-center rounded-pill bg-surface-sunken text-[11px] text-ink-muted">A</span>
      </div>
      <div className="rounded-container border border-line bg-surface p-4">
        <div className="text-[11px] text-ink-subtle">Spent this month</div>
        <div className="font-mono text-[28px] font-medium leading-tight tracking-tight text-ink">₹42,680</div>
        <div className="mt-3 h-1.5 rounded-pill bg-surface-sunken"><div className="h-full w-[71%] rounded-pill bg-brand" /></div>
        <div className="mt-2 flex justify-between text-[10px] text-ink-subtle"><span>71% used</span><span className="font-mono">₹17,320 left</span></div>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden rounded-container border border-line bg-surface px-3 pt-2">
        <div className="text-[11px] text-ink-subtle">Today</div>
        <div className="divide-y divide-line">
          {TXS.slice(0, 5).map((t) => <TxRow key={t.merchant} tx={t} compact />)}
        </div>
      </div>
      <div className="flex justify-around rounded-pill bg-inverse py-2 text-[10px] text-inverse-ink">
        <span>Home</span><span className="opacity-60">Analytics</span><span className="opacity-60">Split</span><span className="opacity-60">Chat</span>
      </div>
    </div>
  );
}
