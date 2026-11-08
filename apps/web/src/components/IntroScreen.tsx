'use client';

import { useEffect, useRef } from 'react';

const SEEN_KEY = 'raqm-intro';
const DONE_MS = 1650;

export function IntroScreen() {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const html = document.documentElement;
    if (!root) return;

    if (html.dataset.intro !== 'play') {
      root.style.display = 'none';
      return;
    }

    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {}

    const finish = () => {
      html.dataset.intro = 'done';
      root.style.display = 'none';
    };

    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    if (nav && nav.type !== 'navigate') {
      finish();
      return;
    }

    const timer = setTimeout(finish, DONE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div ref={rootRef} aria-hidden="true" className="intro-overlay pointer-events-none fixed inset-0">
      <div className="intro-top absolute inset-x-0 top-0 flex h-[calc(50dvh+1px)] items-end justify-center bg-brand pb-3">
        <div className="overflow-hidden px-4 pb-[0.2em]">
          <span
            translate="no"
            className="intro-word block font-sans font-medium tracking-tight text-[clamp(4.5rem,22vw,11rem)] leading-[1.05] text-brand-ink"
          >
            Raqm
          </span>
        </div>
      </div>
      <div className="intro-bottom absolute inset-x-0 bottom-0 h-[calc(50dvh+1px)] bg-brand" />
      <span className="intro-line absolute left-6 right-6 top-1/2 h-px origin-center bg-brand-ink/60 sm:left-12 sm:right-12" />
    </div>
  );
}
