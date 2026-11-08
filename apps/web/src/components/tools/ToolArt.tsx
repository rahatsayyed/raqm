import { budget503020, compound, emergencyFund, emi, sipFutureValue } from '@/lib/calculators/finance';
import { formatCompact, formatRupees } from '@/lib/calculators/money';
import { splitEven } from '@/lib/calculators/splitBill';
import type { ToolSlug } from '@/lib/calculators/tools';

const r = (n: number) => n * 100;

function sample(slug: ToolSlug): { value: string; caption: string; bars: number[] } {
  switch (slug) {
    case 'emi':
      return { value: formatRupees(emi(r(1_000_000), 8.5, 240).payment), caption: 'a month on a 10 L loan', bars: [92, 84, 75, 64, 52, 40, 28, 15] };
    case 'sip': {
      const v = sipFutureValue(r(10_000), 12, 120).value;
      return { value: formatCompact(v), caption: '10K a month, 10 years', bars: [10, 16, 24, 33, 45, 58, 74, 92] };
    }
    case 'compound-interest': {
      const c = compound({ initial: r(100_000), monthly: 0, annualPct: 10, months: 120 });
      return { value: c.ok ? formatCompact(c.finalBalance) : '', caption: '1 L at 10% for 10 years', bars: [14, 20, 27, 35, 45, 58, 74, 92] };
    }
    case 'split-bill':
      return { value: formatRupees(splitEven(r(4800), 4)[0]), caption: 'each, a 4 person table', bars: [70, 70, 70, 70] };
    case 'emergency-fund': {
      const e = emergencyFund(r(30_000), 6, 0, 0);
      return { value: formatCompact(e.target), caption: '6 months of 30K essentials', bars: [100, 100, 100, 100, 100, 100] };
    }
    case 'budget-50-30-20':
      return { value: formatRupees(budget503020(r(75_000)).savings), caption: 'saved from 75K take-home', bars: [50, 30, 20] };
  }
}

export function ToolArt({ slug, large = false }: { slug: ToolSlug; large?: boolean }) {
  const s = sample(slug);
  return (
    <div className={`relative flex h-full min-h-[160px] flex-col justify-between overflow-hidden rounded-cell bg-brand-soft p-4 ${large ? 'sm:p-6' : ''}`}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">Example</p>
        <p className={`mt-1 font-mono font-medium tracking-tight text-ink ${large ? 'text-[34px]' : 'text-2xl'}`}>{s.value}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{s.caption}</p>
      </div>
      <div aria-hidden className="mt-4 flex h-14 items-end gap-1.5">
        {s.bars.map((h, i) => (
          <span
            key={i}
            className={`flex-1 rounded-tag transition-transform duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)] [@media(hover:hover)]:group-hover:scale-y-[1.08] origin-bottom motion-reduce:transition-none ${i === s.bars.length - 1 ? 'bg-brand' : 'bg-brand/25'}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
