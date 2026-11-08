import Link from 'next/link';
import type { ToolDef } from '@/lib/calculators/tools';
import { ToolArt } from './ToolArt';
import { ToolIcon } from './ToolIcon';

const arrow = (
  <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

export function ToolCard({ tool, variant = 'card' }: { tool: ToolDef; variant?: 'card' | 'featured' }) {
  const featured = variant === 'featured';
  return (
    <Link
      href={`/tools/${tool.slug}`}
      className={`group relative flex rounded-container bg-surface p-2 shadow-1 hairline transition duration-200 ease-[cubic-bezier(.4,0,.2,1)] hover:-translate-y-0.5 hover:shadow-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${featured ? 'flex-col sm:flex-row sm:gap-2' : 'flex-col'}`}
    >
      {featured ? (
        <>
          <div className="flex flex-1 flex-col justify-between gap-8 p-4 sm:p-5">
            <div>
              <span className="inline-flex size-9 items-center justify-center rounded-chip bg-inverse text-inverse-ink">
                <ToolIcon slug={tool.slug} />
              </span>
              <p className="mt-5 text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">Most used</p>
              <h2 className="mt-1.5 text-[28px] font-medium leading-[1.1] tracking-tight text-ink">{tool.name}</h2>
              <p className="mt-3 max-w-[34ch] text-[15px] leading-snug text-ink-muted">{tool.summary}</p>
            </div>
            <span className="inline-flex min-h-10 w-fit items-center gap-2 rounded-pill bg-surface-sunken px-4 text-sm font-semibold text-ink transition-colors duration-150 group-hover:bg-ink group-hover:text-canvas motion-reduce:transition-none">
              Open calculator {arrow}
            </span>
          </div>
          <div className="min-h-[200px] sm:w-[44%]">
            <ToolArt slug={tool.slug} large />
          </div>
        </>
      ) : (
        <>
          <div className="aspect-[16/10]">
            <ToolArt slug={tool.slug} />
          </div>
          <span className="absolute right-4 top-4 grid size-8 place-items-center rounded-pill bg-surface text-ink opacity-0 shadow-1 transition-opacity duration-200 [@media(hover:hover)]:group-hover:opacity-100 motion-reduce:transition-none" aria-hidden>
            {arrow}
          </span>
          <div className="px-3 pb-3 pt-4">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-chip bg-inverse text-inverse-ink">
                <ToolIcon slug={tool.slug} className="size-4" />
              </span>
              <h2 className="text-base font-semibold text-ink">{tool.name}</h2>
            </div>
            <p className="mt-2 text-sm leading-snug text-ink-muted">{tool.summary}</p>
          </div>
        </>
      )}
    </Link>
  );
}
