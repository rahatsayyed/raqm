'use client';

import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollReveal } from './ScrollReveal';

interface FeatureRow {
  title: string;
  statement: string;
  items: string[];
}

const rows: FeatureRow[] = [
  {
    title: 'Capture',
    statement: 'Your bank already texts you. That’s the input.',
    items: [
      'Automatic SMS-based transaction parsing',
      'PDF bank/UPI statement upload for unsupported formats',
      'Manual cash expense logging',
      '“Couldn’t parse” review queue, with support-request option',
    ],
  },
  {
    title: 'Organize',
    statement: 'Clean it up once. It sticks.',
    items: [
      'Custom merchant renaming, auto-applies going forward',
      'Group related purchases into one entry',
      'Split one purchase across multiple categories',
      'Transfer detection: sent/received money tagged correctly',
    ],
  },
  {
    title: 'Stay on track',
    statement: 'Know what’s safe to spend, before you spend it.',
    items: [
      'Safe-to-spend indicator',
      'Weekly + threshold budget alerts',
      'Subscription-cancellation nudges',
      'Custom pay-cycle start date',
    ],
  },
  {
    title: 'Life stuff',
    statement: 'Notes, places, and who still owes you.',
    items: ['Notes and location tagging on transactions', 'Lending reminders, with auto-SMS follow-up'],
  },
];

const ROW_PADDING = 'px-6 py-9 sm:px-10 sm:py-10';

function distMetric(x: number, y: number, x2: number, y2: number) {
  const xDiff = x - x2;
  const yDiff = y - y2;
  return xDiff * xDiff + yDiff * yDiff;
}

function findClosestEdge(x: number, y: number, width: number, height: number) {
  const topEdgeDist = distMetric(x, y, width / 2, 0);
  const bottomEdgeDist = distMetric(x, y, width / 2, height);
  return topEdgeDist < bottomEdgeDist ? 'top' : 'bottom';
}

function RowContent({ row, index, tone }: { row: FeatureRow; index: number; tone: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <div className={`grid grid-cols-[3.5rem_1fr] gap-x-4 gap-y-5 lg:grid-cols-[7rem_1fr_1.15fr] lg:gap-x-10 ${ROW_PADDING}`}>
      <span className={`font-display text-5xl leading-none lg:text-7xl ${dark ? 'text-accent-deep' : 'text-accent-primary'}`}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <div>
        <span
          className={`font-body text-sm font-medium uppercase tracking-wider ${
            dark ? 'text-[color-mix(in_srgb,var(--color-surface)_55%,transparent)]' : 'text-ink-label'
          }`}
        >
          {row.title}
        </span>
        <h3 className={`mt-2 max-w-md font-display text-3xl leading-[1.08] sm:text-4xl ${dark ? 'text-surface' : 'text-ink-headline'}`}>
          {row.statement}
        </h3>
      </div>
      <ul className="col-span-2 flex flex-col lg:col-span-1 lg:pt-1">
        {row.items.map((item) => (
          <li
            key={item}
            className={`border-t py-2.5 font-body text-base first:border-t-0 first:pt-0 ${
              dark
                ? 'border-[color-mix(in_srgb,var(--color-surface)_14%,transparent)] text-[color-mix(in_srgb,var(--color-surface)_85%,transparent)]'
                : 'border-border-subtle text-ink-body'
            }`}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ row, index }: { row: FeatureRow; index: number }) {
  const itemRef = useRef<HTMLLIElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    gsap.set(fillRef.current, { yPercent: 101 });
  }, []);

  const edgeFromEvent = (ev: React.MouseEvent<HTMLLIElement>) => {
    const rect = itemRef.current!.getBoundingClientRect();
    return findClosestEdge(ev.clientX - rect.left, ev.clientY - rect.top, rect.width, rect.height);
  };

  const handleMouseEnter = (ev: React.MouseEvent<HTMLLIElement>) => {
    if (!fillRef.current) return;
    const edge = edgeFromEvent(ev);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap
      .timeline({ defaults: { duration: reduced ? 0 : 0.6, ease: 'expo' } })
      .set(fillRef.current, { yPercent: edge === 'top' ? -101 : 101 })
      .to(fillRef.current, { yPercent: 0 });
  };

  const handleMouseLeave = (ev: React.MouseEvent<HTMLLIElement>) => {
    if (!fillRef.current) return;
    const edge = edgeFromEvent(ev);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    gsap
      .timeline({ defaults: { duration: reduced ? 0 : 0.6, ease: 'expo' } })
      .to(fillRef.current, { yPercent: edge === 'top' ? -101 : 101 });
  };

  return (
    <li
      ref={itemRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative overflow-hidden border-b border-border-subtle"
    >
      <RowContent row={row} index={index} tone="light" />
      <div ref={fillRef} className="pointer-events-none absolute inset-0 bg-ink-headline">
        <RowContent row={row} index={index} tone="dark" />
      </div>
    </li>
  );
}

export function FeatureBentoGrid() {
  return (
    <ScrollReveal className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <span className="mb-3 block font-mono text-xs text-ink-label opacity-60">02 / 04</span>
      <h2 className="mb-10 text-balance font-display text-4xl text-ink-headline sm:text-5xl">Everything you need, free</h2>
      <ol className="flex flex-col">
        {rows.map((row, index) => (
          <Row key={row.title} row={row} index={index} />
        ))}
      </ol>
    </ScrollReveal>
  );
}
