import type { HubFeature } from '@/lib/features-data';

export function FeatureArt({ art, large = false }: { art: HubFeature['art']; large?: boolean }) {
  return (
    <div className={`relative flex h-full min-h-[160px] flex-col justify-between overflow-hidden rounded-cell bg-brand-soft p-4 ${large ? 'sm:p-6' : ''}`}>
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-subtle">Example</p>
        <p className={`mt-1 font-mono font-medium tracking-tight text-ink ${large ? 'text-[34px]' : 'text-2xl'}`}>{art.value}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{art.caption}</p>
      </div>
      <div aria-hidden className="mt-4 flex h-14 items-end gap-1.5">
        {art.bars.map((h, i) => (
          <span
            key={i}
            className={`flex-1 rounded-tag transition-transform duration-[600ms] ease-[cubic-bezier(.16,1,.3,1)] [@media(hover:hover)]:group-hover:scale-y-[1.08] origin-bottom motion-reduce:transition-none ${i === art.bars.length - 1 ? 'bg-brand' : 'bg-brand/25'}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}
