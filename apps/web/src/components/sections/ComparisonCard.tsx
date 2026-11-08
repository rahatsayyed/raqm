'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { BinaryValue, OtherValue, RaqmValue, RowIcon, type CellValue, type IconName } from './comparison/marks';
import { WaitlistButton } from './comparison/WaitlistButton';
import { ScrollHint } from './comparison/ScrollHint';
import { HOME_ROWS } from '@/content/comparison';

gsap.registerPlugin(ScrollTrigger);

export type { CellValue, IconName };
export type ComparisonRow = {
  feature: string;
  other: CellValue;
  raqm: CellValue;
  note?: string;
  icon?: IconName;
  source?: string;
};

type Props = {
  rows?: ComparisonRow[];
  otherLabel?: string;
  raqmLabel?: string;
  raqmBadge?: string;
  featureLabel?: string;
  binaryMarks?: boolean;
  raqmFooter?: string | null;
  className?: string;
};

const COLS = 'grid-cols-[minmax(0,1fr)_280px_168px] lg:grid-cols-[minmax(0,1fr)_316px_188px]';
const F_PAD = 'pl-3.5 pr-2';
const R_PAD = 'px-4 lg:px-5';
const O_PAD = 'px-3.5';
const TEXT = 'text-base leading-5 font-medium tracking-[-0.01em]';
const TITLE = 'text-base font-semibold leading-5 tracking-[-0.01em] lg:text-lg lg:leading-[22px]';

function Logo() {
  return (
    <span
      aria-hidden="true"
      className="grid size-8 shrink-0 place-items-center rounded-tag bg-brand font-mono text-base leading-none text-brand-ink lg:size-[39px] lg:text-xl"
    >
      R
    </span>
  );
}

function AppGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-7 shrink-0 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01" strokeLinecap="round" strokeWidth="2.5" />
    </svg>
  );
}

export function ComparisonCard({ rows = HOME_ROWS, otherLabel = 'Other apps', raqmLabel = 'Raqm', raqmBadge = 'On-device', featureLabel = 'Features', binaryMarks = false, raqmFooter = 'Android and iPhone coming soon', className = '' }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const last = rows.length + 1;
  const footer = rows.length + 2;

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(root.querySelectorAll('[data-cell]'), {
          opacity: 0,
          y: 8,
          duration: 0.6,
          ease: 'expo.out',
          stagger: 0.012,
          scrollTrigger: { trigger: root, start: 'top 85%', once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <div
      ref={scroller}
      role="region"
      tabIndex={0}
      aria-label="Comparison table, scroll sideways"
      className={`-mt-4 -mr-4 -mb-12 overflow-x-auto overscroll-x-contain pt-4 pr-4 pb-12 lg:-my-4 lg:py-4 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin] [scrollbar-color:var(--color-line)_transparent] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:-mr-6 sm:pr-6 lg:mr-0 lg:pr-0 ${className}`}
    >
    <div className="min-w-[766px] rounded-container bg-surface p-1.5 shadow-1">
      <div
        ref={ref}
        role="table"
        aria-label={`${raqmLabel} compared with ${otherLabel}`}
        className={`relative grid gap-x-1.5 ${COLS}`}
        style={{ gridTemplateRows: `repeat(${rows.length + 2}, auto)` }}
      >
        <div aria-hidden="true" className="col-start-2 rounded-cell bg-inverse" style={{ gridRow: `1 / ${rows.length + 3}` }}>
          <div className="size-full rounded-cell bg-linear-to-b from-inverse-ink/[0.07] to-transparent" />
        </div>
        <div aria-hidden="true" className="col-start-3 rounded-cell bg-surface-sunken" style={{ gridRow: `1 / ${rows.length + 3}` }} />
        <div aria-hidden="true" className="pointer-events-none z-20 col-span-full -mx-1.5 -mb-px h-px self-end bg-line" style={{ gridRow: 1, gridColumn: '1 / -1' }} />
        <div aria-hidden="true" className="pointer-events-none z-20 col-span-full -mx-1.5 h-px self-end bg-line" style={{ gridRow: last, gridColumn: '1 / -1' }} />

        <div role="row" className="contents">
          <div role="columnheader" className={`relative z-10 col-start-1 flex min-h-[84px] items-center py-5 ${F_PAD}`} style={{ gridRow: 1 }}>
            <span className="text-base font-semibold leading-5 tracking-[-0.01em] text-ink">{featureLabel}</span>
          </div>
          <div role="columnheader" className={`relative z-10 col-start-2 flex min-h-[84px] items-center justify-between gap-4 py-5 ${R_PAD}`} style={{ gridRow: 1 }}>
            <span className="flex min-w-0 items-center gap-3">
              <Logo />
              <span className={`${TITLE} text-inverse-ink`}>{raqmLabel}</span>
            </span>
            <span className="inline-flex h-6 shrink-0 items-center self-start rounded-pill bg-inverse-ink/30 px-2 text-xs font-semibold leading-[14px] tracking-[-0.01em] text-inverse-ink">
              {raqmBadge}
            </span>
          </div>
          <div role="columnheader" className={`relative z-10 col-start-3 flex min-h-[84px] items-center gap-2 py-5 ${O_PAD}`} style={{ gridRow: 1 }}>
            <AppGlyph />
            <span className={`${TITLE} min-w-0 text-ink`}>
              {otherLabel}
            </span>
          </div>
        </div>

        {rows.map((r, i) => {
          const row = i + 2;
          const top = i === 0 ? 'pt-5' : '';
          const bottom = i === rows.length - 1 ? 'pb-5' : 'pb-[18px]';
          const cell = `relative z-10 flex min-h-5 items-start ${top} ${bottom} ${TEXT}`;
          return (
            <div role="row" key={r.feature} className="contents">
              <div role="rowheader" className={`${cell} col-start-1 ${F_PAD}`} style={{ gridRow: row }}>
                <span data-cell className="flex items-start gap-2 text-ink-muted">
                  {r.icon && <RowIcon name={r.icon} />}
                  <span className="min-w-0 break-words">{r.feature}</span>
                </span>
              </div>
              <div role="cell" className={`${cell} col-start-2 text-inverse-ink ${R_PAD}`} style={{ gridRow: row }}>
                <span data-cell className="min-w-0">
                  {binaryMarks ? <BinaryValue value={r.raqm} tone="raqm" /> : <RaqmValue value={r.raqm} />}
                </span>
              </div>
              <div role="cell" className={`${cell} col-start-3 text-ink ${O_PAD}`} style={{ gridRow: row }}>
                <span data-cell className="min-w-0">
                  {binaryMarks ? <BinaryValue value={r.other} tone="other" source={r.source} /> : <OtherValue value={r.other} />}
                </span>
              </div>
            </div>
          );
        })}

        <div role="row" className="contents">
          <div role="cell" className="relative z-10 col-start-2 flex items-start py-5" style={{ gridRow: footer }}>
            <div className={`w-full ${R_PAD}`}>
              <WaitlistButton />
              {raqmFooter && <p className="mt-2.5 text-center text-xs font-semibold leading-4 tracking-[-0.01em] text-inverse-ink/70">{raqmFooter}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
    <ScrollHint scrollerRef={scroller} />
    </div>
  );
}

export function ComparisonSection() {
  return (
    <section id="compare" aria-labelledby="compare-heading" className="px-4 py-section sm:px-6">
      <div className="mx-auto max-w-col">
        <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-subtle">Compared</p>
        <h2 id="compare-heading" className="mb-4 max-w-xl text-balance text-h2">
          Same clear picture, different home for your data
        </h2>
        <p className="mb-10 max-w-lg text-lead text-ink-muted">Side by side with how many cloud-first finance apps work.</p>
        <ComparisonCard featureLabel="Features" otherLabel="Other apps" />
      </div>
    </section>
  );
}
