'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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

const ROW_PADDING = 'px-5 py-7 sm:px-10 sm:py-10';
// Must match ROW_EXPAND_MS below — JS tracks this CSS transition's duration.
const ROW_EXPAND_DURATION_CLASS = 'duration-700 ease-in-out';

function RowContent({ row, index, tone, isActive }: { row: FeatureRow; index: number; tone: 'light' | 'dark'; isActive: boolean }) {
  const dark = tone === 'dark';
  return (
    <div
      className={`grid grid-cols-[2.5rem_1fr] gap-x-3 gap-y-0 sm:grid-cols-[3.5rem_1fr] sm:gap-x-4 sm:gap-y-5 lg:grid-cols-[7rem_1fr_1.15fr] lg:gap-x-10 ${ROW_PADDING}`}
    >
      <span className={`font-display text-4xl leading-none sm:text-5xl lg:text-7xl ${dark ? 'text-accent-deep' : 'text-accent-primary'}`}>
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
        <h3 className={`mt-1.5 max-w-md text-balance font-display text-[1.625rem] leading-[1.12] sm:mt-2 sm:text-4xl sm:leading-[1.08] ${dark ? 'text-surface' : 'text-ink-headline'}`}>
          {row.statement}
        </h3>
        <div
          aria-hidden
          className={`grid transition-[grid-template-rows] ${ROW_EXPAND_DURATION_CLASS} motion-reduce:transition-none sm:hidden ${
            isActive ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
          }`}
        >
          <div className="min-h-0 overflow-hidden">
            <span className="mt-3.5 inline-flex items-center gap-2 rounded-full border border-border-subtle py-1 pl-3 pr-1 font-body text-xs text-ink-label">
              {row.items.length} features
              <span className="relative flex size-6 items-center justify-center rounded-full bg-ink-headline/[0.06]">
                <span className="absolute h-px w-2.5 bg-current" />
                <span className="absolute h-2.5 w-px bg-current" />
              </span>
            </span>
          </div>
        </div>
      </div>
      <div
        className={`col-span-2 grid transition-[grid-template-rows] ${ROW_EXPAND_DURATION_CLASS} motion-reduce:transition-none lg:col-span-1 sm:grid-rows-[1fr] ${
          isActive ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <ul className="flex flex-col pt-5 sm:pt-0 lg:pt-1">
            {row.items.map((item) => (
              <li
                key={item}
                className={`border-t py-3 font-body text-[0.9375rem] leading-snug first:border-t-0 first:pt-0 sm:py-2.5 sm:text-base sm:leading-normal ${
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
      </div>
    </div>
  );
}

const MOBILE_QUERY = '(max-width: 639px)';
const HOVER_CAPABLE_QUERY = '(hover: hover) and (pointer: fine)';
const ROW_EXPAND_MS = 700;

export function FeatureBentoGrid() {
  const listRef = useRef<HTMLOListElement>(null);
  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const overlayRef = useRef<HTMLDivElement>(null);
  const centerIndexRef = useRef(0);
  const hoveringRef = useRef(false);
  const revertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionLockedUntilRef = useRef(0);
  const activeIndexRef = useRef(0);
  const overlayChaseRef = useRef<{ top: number; height: number } | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  activeIndexRef.current = activeIndex;

  const moveOverlayTo = (index: number, animate = true) => {
    const list = listRef.current;
    const target = rowRefs.current[index];
    const overlay = overlayRef.current;
    if (!list || !target || !overlay) return;
    setActiveIndex(index);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isMobile = window.matchMedia(MOBILE_QUERY).matches;

    if (isMobile) {
      // Mobile rows resize (expand/collapse) via CSS; the chase loop below eases the overlay toward the live target instead of snapping here.
      if (!animate) overlayChaseRef.current = null;
      return;
    }

    const listRect = list.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    gsap.to(overlay, {
      top: rect.top - listRect.top,
      height: rect.height,
      duration: animate && !reduced ? 0.6 : 0,
      ease: 'expo.out',
      overwrite: 'auto',
    });
  };

  // Mobile only: ease the overlay toward the active row's live rect while the list is on screen.
  useEffect(() => {
    const listEl = listRef.current;
    if (!listEl) return;
    const mobileMq = window.matchMedia(MOBILE_QUERY);
    const reducedMq = window.matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let lastTime = performance.now();
    const CHASE_TAU_MS = 120;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = now - lastTime;
      lastTime = now;
      if (!mobileMq.matches) return;
      const list = listRef.current;
      const target = rowRefs.current[activeIndexRef.current];
      const overlay = overlayRef.current;
      if (!list || !target || !overlay) return;
      const listRect = list.getBoundingClientRect();
      const rect = target.getBoundingClientRect();
      const nextTarget = { top: rect.top - listRect.top, height: rect.height };
      const reduced = reducedMq.matches;
      const current = overlayChaseRef.current;
      if (!current || reduced) {
        overlayChaseRef.current = nextTarget;
      } else {
        const factor = 1 - Math.exp(-dt / CHASE_TAU_MS);
        overlayChaseRef.current = {
          top: current.top + (nextTarget.top - current.top) * factor,
          height: current.height + (nextTarget.height - current.height) * factor,
        };
      }
      gsap.set(overlay, overlayChaseRef.current);
    };
    const observer = new IntersectionObserver(
      ([entry]) => {
        cancelAnimationFrame(raf);
        if (!entry.isIntersecting) return;
        lastTime = performance.now();
        raf = requestAnimationFrame(tick);
      },
      { rootMargin: '200px 0px' },
    );
    observer.observe(listEl);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, []);

  useLayoutEffect(() => {
    moveOverlayTo(0, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let raf = 0;
    const handleScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (hoveringRef.current) return;
        if (performance.now() < transitionLockedUntilRef.current) return;
        const list = listRef.current;
        if (!list) return;
        const listRect = list.getBoundingClientRect();
        if (listRect.bottom < 0 || listRect.top > window.innerHeight) return;
        const viewportCenter = window.innerHeight / 2;
        let closest = centerIndexRef.current;
        let closestDist = Infinity;
        rowRefs.current.forEach((el, i) => {
          if (!el) return;
          const rect = el.getBoundingClientRect();
          const dist = Math.abs(rect.top + rect.height / 2 - viewportCenter);
          if (dist < closestDist) {
            closestDist = dist;
            closest = i;
          }
        });
        if (closest !== centerIndexRef.current) {
          centerIndexRef.current = closest;
          // The row transition itself reflows the list for ROW_EXPAND_MS; lock out reclassification so that reflow can't flap `closest` mid-transition.
          if (window.matchMedia(MOBILE_QUERY).matches) {
            transitionLockedUntilRef.current = performance.now() + ROW_EXPAND_MS + 80;
          }
          moveOverlayTo(closest);
        }
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRowEnter = (index: number) => {
    if (!window.matchMedia(HOVER_CAPABLE_QUERY).matches) return;
    if (revertTimeoutRef.current) clearTimeout(revertTimeoutRef.current);
    hoveringRef.current = true;
    moveOverlayTo(index);
  };

  const handleRowTap = (index: number) => {
    if (!window.matchMedia(MOBILE_QUERY).matches || index === activeIndexRef.current) return;
    centerIndexRef.current = index;
    transitionLockedUntilRef.current = performance.now() + 1200;
    moveOverlayTo(index);
  };

  const handleRowLeave = () => {
    if (!window.matchMedia(HOVER_CAPABLE_QUERY).matches) return;
    hoveringRef.current = false;
    revertTimeoutRef.current = setTimeout(() => {
      if (!hoveringRef.current) moveOverlayTo(centerIndexRef.current);
    }, 60);
  };

  return (
    <ScrollReveal id="everything-free" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <span className="mb-3 block font-mono text-xs text-ink-label opacity-60">03 / 05</span>
      <h2 className="mb-8 text-balance sm:mb-10 font-display text-4xl text-ink-headline sm:text-5xl">Everything you need, free</h2>
      <ol ref={listRef} className="relative flex flex-col [overflow-anchor:none]">
        <div ref={overlayRef} className="pointer-events-none absolute inset-x-0 top-0 z-10 overflow-hidden rounded-[14px] bg-ink-headline sm:rounded-none">
          <RowContent row={rows[activeIndex]} index={activeIndex} tone="dark" isActive />
        </div>
        {rows.map((row, index) => (
          <li
            key={row.title}
            ref={(el) => {
              rowRefs.current[index] = el;
            }}
            onMouseEnter={() => handleRowEnter(index)}
            onMouseLeave={handleRowLeave}
            onClick={() => handleRowTap(index)}
            className="touch-manipulation border-b border-border-subtle transition-colors duration-150 ease-out [-webkit-tap-highlight-color:transparent] max-sm:cursor-pointer max-sm:active:bg-ink-headline/[0.04]"
          >
            <RowContent row={row} index={index} tone="light" isActive={index === activeIndex} />
          </li>
        ))}
      </ol>
    </ScrollReveal>
  );
}
