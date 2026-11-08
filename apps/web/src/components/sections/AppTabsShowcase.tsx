'use client';

import { showcaseTabs, type ShowcaseTab } from '@/lib/features-data';
import { MorphingTabs, type MorphingTab } from './MorphingTabs';
import { cn } from './cn';

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative mx-auto h-[440px] w-full max-w-[272px] overflow-hidden sm:h-[500px] md:w-[288px] md:max-w-none">
      <div className="absolute inset-x-0 top-0 h-[620px] rounded-[40px] bg-ink p-2">
        <div className="relative h-full overflow-hidden rounded-[32px] bg-canvas">
          <div className="absolute left-1/2 top-2 z-10 h-5 w-20 -translate-x-1/2 rounded-pill bg-ink" />
          <div className="flex items-center justify-between px-6 pb-1 pt-3 font-mono text-[10px] text-ink-subtle">
            <span>9:41</span>
            <span>5G</span>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function Amount({ children, tone }: { children: React.ReactNode; tone?: 'pos' | 'neg' }) {
  return (
    <span className={cn('font-mono text-[13px] font-medium tabular-nums', tone === 'pos' ? 'text-positive' : 'text-ink')}>
      {children}
    </span>
  );
}

function Row({ icon, name, meta, amount, tone, chip }: { icon: string; name: string; meta: string; amount: string; tone?: 'pos'; chip?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-cell bg-surface px-3 py-2.5 shadow-ring">
      <span className="grid size-8 shrink-0 place-items-center rounded-chip bg-brand-soft text-xs font-semibold text-brand">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink">{name}</span>
        <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ink-subtle">
          {chip ? <span className="rounded-pill bg-surface-sunken px-1.5 py-px text-ink-muted">{chip}</span> : null}
          {meta}
        </span>
      </span>
      <Amount tone={tone}>{amount}</Amount>
    </div>
  );
}

function Screen({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="px-4 pb-4">
      <p className="px-1 text-[11px] text-ink-subtle">{sub}</p>
      <p className="mb-3 px-1 text-lg font-semibold tracking-tight text-ink">{title}</p>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

function CaptureScreen() {
  return (
    <Screen title="Today" sub="Timeline">
      <div className="rounded-cell bg-surface-sunken p-3 text-[11px] leading-snug text-ink-muted">
        <span className="mb-1 block text-ink-subtle">SMS from HDFCBK</span>
        Rs.482.00 spent on card XX4821 at SWIGGY on 08-Nov. Avl bal Rs.31,204.
      </div>
      <div className="mx-auto h-4 w-px bg-line" />
      <Row icon="S" name="Swiggy" meta="HDFC card 4821" amount="₹482.00" chip="Food" />
      <Row icon="U" name="Uber" meta="UPI" amount="₹236.00" chip="Travel" />
      <Row icon="P" name="Salary credit" meta="SBI savings" amount="+₹62,000" tone="pos" />
      <Row icon="C" name="Cash, chai stall" meta="Added by hand" amount="₹40.00" />
    </Screen>
  );
}

function CategorizeScreen() {
  return (
    <Screen title="Edit merchant" sub="Transaction">
      <div className="rounded-cell bg-surface p-3 shadow-ring">
        <span className="text-[11px] text-ink-subtle">Bank text says</span>
        <span className="mt-0.5 block font-mono text-[12px] text-ink-muted">AMZN MKTP IN</span>
        <span className="mt-3 block text-[11px] text-ink-subtle">Show as</span>
        <span className="mt-1 flex items-center justify-between rounded-chip bg-surface-sunken px-3 py-2 text-[13px] font-medium text-ink">
          Amazon
          <span className="rounded-pill bg-brand px-2 py-0.5 text-[10px] text-brand-ink">Saved</span>
        </span>
      </div>
      <p className="px-1 pt-1 text-[11px] text-ink-subtle">Applied to 14 more transactions</p>
      <Row icon="A" name="Amazon" meta="2 Nov" amount="₹1,299.00" chip="Shopping" />
      <Row icon="A" name="Amazon" meta="19 Oct" amount="₹349.00" chip="Shopping" />
      <div className="flex items-center justify-between rounded-cell bg-brand-soft px-3 py-2.5 text-[12px] text-brand">
        <span>Split ₹500 supermarket bill</span>
        <span className="font-mono">300 + 200</span>
      </div>
    </Screen>
  );
}

function BudgetsScreen() {
  const bars = [
    { name: 'Food', used: 78, amt: '₹7,800 / ₹10,000' },
    { name: 'Travel', used: 42, amt: '₹2,100 / ₹5,000' },
    { name: 'Shopping', used: 96, amt: '₹9,600 / ₹10,000' },
  ];
  return (
    <Screen title="Budgets" sub="Pay cycle 25 Oct to 24 Nov">
      <div className="rounded-cell bg-inverse p-4 text-inverse-ink">
        <span className="text-[11px] text-inverse-ink/70">Safe to spend today</span>
        <span className="mt-1 block font-mono text-3xl font-medium tabular-nums">₹1,140</span>
        <span className="mt-1 block text-[11px] text-inverse-ink/70">16 days left in this cycle</span>
      </div>
      {bars.map((b) => (
        <div key={b.name} className="rounded-cell bg-surface p-3 shadow-ring">
          <div className="flex items-baseline justify-between text-[12px]">
            <span className="font-medium text-ink">{b.name}</span>
            <span className="font-mono text-[10px] text-ink-subtle">{b.amt}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-pill bg-surface-sunken">
            <div className={cn('h-full rounded-pill', b.used > 90 ? 'bg-warning' : 'bg-brand')} style={{ width: `${b.used}%` }} />
          </div>
        </div>
      ))}
    </Screen>
  );
}

function InsightsScreen() {
  const months = [52, 64, 48, 70, 58, 82];
  return (
    <Screen title="November" sub="Insights">
      <div className="rounded-cell bg-surface p-3 shadow-ring">
        <span className="text-[11px] text-ink-subtle">Spent so far</span>
        <span className="block font-mono text-2xl font-medium tabular-nums text-ink">₹31,420</span>
        <div className="mt-3 flex h-16 items-end gap-1.5">
          {months.map((h, i) => (
            <div
              key={i}
              className={cn('flex-1 rounded-tag', i === months.length - 1 ? 'bg-brand' : 'bg-surface-sunken')}
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
      <Row icon="R" name="Refund matched" meta="Myntra, netted from Shopping" amount="+₹899.00" tone="pos" />
      <Row icon="N" name="Netflix" meta="Every month" amount="₹649.00" chip="Subscription" />
      <Row icon="S" name="Spotify" meta="Every month" amount="₹119.00" chip="Subscription" />
    </Screen>
  );
}

const screens: Record<ShowcaseTab['id'], React.ReactNode> = {
  capture: <CaptureScreen />,
  categorize: <CategorizeScreen />,
  budgets: <BudgetsScreen />,
  insights: <InsightsScreen />,
};

const stats: Record<ShowcaseTab['id'], { v: string; k: string }[]> = {
  capture: [{ v: 'Auto', k: 'entry per bank SMS' }, { v: '0', k: 'bytes leave your phone' }],
  categorize: [{ v: '1 edit', k: 'fixes every match' }, { v: 'Any split', k: 'for one shared bill' }],
  budgets: [{ v: 'Your cycle', k: 'starts on pay day' }, { v: 'Daily', k: 'safe-to-spend number' }],
  insights: [{ v: 'Netted', k: 'refunds per category' }, { v: 'Auto', k: 'subscription detection' }],
};

function TabPanel({ tab, index, total }: { tab: ShowcaseTab; index: number; total: number }) {
  return (
    <div className="grid flex-1 md:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      <div className="flex min-w-0 flex-col justify-center px-6 py-8 md:px-12 md:py-12">
        <span className="font-mono text-xs text-ink-subtle">
          0{index + 1} / 0{total}
        </span>
        <h3 className="mt-3 max-w-lg text-2xl font-medium tracking-tight text-ink md:text-4xl">{tab.title}</h3>
        <p className="mt-4 max-w-lg text-base text-ink-muted">{tab.body}</p>
        <ul className="mt-6 max-w-lg divide-y divide-line border-y border-line">
          {tab.points.map((p) => (
            <li key={p} className="flex items-center gap-3 py-3 text-base text-ink">
              <span aria-hidden className="grid size-5 shrink-0 place-items-center rounded-pill bg-brand-soft text-brand">
                <svg viewBox="0 0 16 16" className="size-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3.5 8.5l3 3 6-7" />
                </svg>
              </span>
              {p}
            </li>
          ))}
        </ul>
        <dl className="mt-6 grid max-w-lg grid-cols-2 gap-2">
          {stats[tab.id].map((s) => (
            <div key={s.k} className="rounded-cell bg-surface-sunken px-4 py-3">
              <dt className="font-mono text-lg tabular-nums text-ink">{s.v}</dt>
              <dd className="text-sm text-ink-muted">{s.k}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="flex min-w-0 items-end justify-center bg-surface-sunken px-4 pt-8 md:px-10 md:pt-10">
        <PhoneFrame>{screens[tab.id]}</PhoneFrame>
      </div>
    </div>
  );
}

export function AppTabsShowcase({ className }: { className?: string }) {
  const tabs: MorphingTab[] = showcaseTabs.map((t, i) => ({
    id: t.id,
    label: t.label,
    panel: <TabPanel tab={t} index={i} total={showcaseTabs.length} />,
  }));
  return (
    <section className={cn('mx-auto w-full max-w-wide px-4 py-section md:py-section-lg', className)}>
      <div className="mx-auto mb-12 max-w-xl text-center">
        <h2 className="text-h2 text-ink">From the SMS to the month.</h2>
        <p className="mt-4 text-lead text-ink-muted">A look inside the app: capture, edit, budget, review.</p>
      </div>
      <MorphingTabs tabs={tabs} label="Raqm in the app" autoplayMs={6000} panelClassName="md:min-h-[600px]" />
    </section>
  );
}
