'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { OtherValue, RaqmValue, RowIcon, type CellValue, type IconName } from './comparison/marks';
import { WaitlistButton } from './comparison/WaitlistButton';

gsap.registerPlugin(ScrollTrigger);

export type { CellValue, IconName };
export type ComparisonRow = { feature: string; other: CellValue; raqm: CellValue; note?: string; icon?: IconName };

type Props = {
  rows?: ComparisonRow[];
  otherLabel?: string;
  raqmLabel?: string;
  raqmBadge?: string;
  featureLabel?: string;
  className?: string;
};

export const DEFAULT_COMPARISON_ROWS: ComparisonRow[] = [
  { feature: 'Your data stays on your phone', icon: 'phone', other: 'limit', raqm: 'yes' },
  { feature: 'No account or sign-up needed', icon: 'user', other: 'limit', raqm: 'yes' },
  { feature: 'No bank login or linking', icon: 'bank', other: 'limit', raqm: 'yes' },
  { feature: 'Works offline', icon: 'wifi', other: 'limit', raqm: 'yes' },
  { feature: 'Reads bank SMS automatically (Android)', icon: 'sms', other: 'limit', raqm: 'yes' },
  { feature: 'Home-screen widgets (Android)', icon: 'widget', other: 'limit', raqm: 'yes' },
  { feature: 'Export your transactions', icon: 'export', other: 'limit', raqm: 'yes' },
  { feature: 'Budgets and analytics', icon: 'chart', other: 'yes', raqm: 'yes' },
];

const WIDE = 'sm:grid-cols-[minmax(0,1fr)_220px_140px] md:grid-cols-[minmax(0,1fr)_280px_168px] lg:grid-cols-[minmax(0,1fr)_316px_188px]';
const COLS_MARKS = `grid-cols-[minmax(0,1fr)_84px_60px] min-[400px]:grid-cols-[minmax(0,1fr)_100px_76px] ${WIDE}`;
const COLS_TEXT = `grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)_minmax(0,1fr)] ${WIDE}`;
const isMark = (v: CellValue) => v === 'yes' || v === 'no' || v === 'limit';
const F_PAD = 'pl-2.5 pr-1.5 sm:pl-3.5 sm:pr-2';
const R_PAD = 'px-2.5 sm:px-4 lg:px-5';
const O_PAD = 'px-2 sm:px-3.5';
const TEXT = 'text-xs leading-4 min-[400px]:text-[13px] sm:text-[15px] sm:leading-5 lg:text-base font-medium tracking-[-0.01em]';
const TITLE = 'text-sm font-semibold leading-[18px] tracking-[-0.01em] sm:text-base sm:leading-5 lg:text-lg lg:leading-[22px]';

function Logo() {
  return (
    <span
      aria-hidden="true"
      className="grid size-6 shrink-0 place-items-center rounded-tag bg-brand font-mono text-[13px] leading-none text-brand-ink sm:size-8 sm:text-base lg:size-[39px] lg:text-xl"
    >
      R
    </span>
  );
}

function AppGlyph() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6 shrink-0 text-ink-subtle max-[399px]:hidden sm:size-7" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round">
      <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
      <path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01" strokeLinecap="round" strokeWidth="2.5" />
    </svg>
  );
}

export function ComparisonCard({
  rows = DEFAULT_COMPARISON_ROWS,
  otherLabel = 'Other apps',
  raqmLabel = 'Raqm',
  raqmBadge = 'On-device',
  featureLabel = 'Features',
  className = '',
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const cols = rows.every((r) => isMark(r.raqm) && isMark(r.other)) ? COLS_MARKS : COLS_TEXT;
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
    <div className={`rounded-container bg-surface p-1.5 shadow-1 ${className}`}>
      <div
        ref={ref}
        role="table"
        aria-label={`${raqmLabel} compared with ${otherLabel}`}
        className={`relative grid gap-x-1.5 ${cols}`}
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
            <span className="text-sm font-semibold leading-[18px] tracking-[-0.01em] text-ink sm:text-base sm:leading-5">{featureLabel}</span>
          </div>
          <div role="columnheader" className={`relative z-10 col-start-2 flex min-h-[84px] items-center justify-between gap-4 py-5 ${R_PAD}`} style={{ gridRow: 1 }}>
            <span className="flex min-w-0 items-center gap-2 sm:gap-3">
              <Logo />
              <span className={`${TITLE} text-inverse-ink`}>{raqmLabel}</span>
            </span>
            <span className="inline-flex h-6 shrink-0 items-center self-start rounded-pill bg-inverse-ink/30 px-2 text-xs font-semibold leading-[14px] tracking-[-0.01em] text-inverse-ink max-md:hidden">
              {raqmBadge}
            </span>
          </div>
          <div role="columnheader" className={`relative z-10 col-start-3 flex min-h-[84px] items-center gap-2 py-5 ${O_PAD}`} style={{ gridRow: 1 }}>
            <AppGlyph />
            <span className={`${TITLE} min-w-0 text-ink`}>
              <span className="min-[400px]:hidden">Others</span>
              <span className="max-[399px]:hidden">{otherLabel}</span>
            </span>
          </div>
        </div>

        {rows.map((r, i) => {
          const row = i + 2;
          const top = i === 0 ? 'pt-5' : '';
          const bottom = i === rows.length - 1 ? 'pb-5' : 'pb-[18px]';
          const cell = `relative z-10 flex min-h-5 items-center ${top} ${bottom} ${TEXT}`;
          return (
            <div role="row" key={r.feature} className="contents">
              <div role="rowheader" className={`${cell} col-start-1 ${F_PAD}`} style={{ gridRow: row }}>
                <span data-cell className="flex items-center gap-2 text-ink-muted">
                  {r.icon && <RowIcon name={r.icon} />}
                  <span className="min-w-0 break-words">{r.feature}</span>
                </span>
              </div>
              <div role="cell" className={`${cell} col-start-2 text-inverse-ink ${R_PAD}`} style={{ gridRow: row }}>
                <span data-cell className="min-w-0">
                  <RaqmValue value={r.raqm} />
                </span>
              </div>
              <div role="cell" className={`${cell} col-start-3 text-ink ${O_PAD}`} style={{ gridRow: row }}>
                <span data-cell className="min-w-0">
                  <OtherValue value={r.other} />
                </span>
              </div>
            </div>
          );
        })}

        <div role="row" className="contents">
          <div role="cell" className="relative z-10 col-start-2 flex items-start py-5" style={{ gridRow: footer }}>
            <div className={`w-full ${R_PAD}`}>
              <WaitlistButton />
              <p className="mt-2.5 text-center text-xs font-semibold leading-4 tracking-[-0.01em] text-inverse-ink/70 max-[479px]:hidden">Android and iPhone coming soon</p>
            </div>
          </div>
        </div>
      </div>
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
