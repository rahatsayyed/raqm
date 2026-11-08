'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { featureCells, type CellIcon } from '@/lib/features-data';
import { cn } from './cn';

gsap.registerPlugin(ScrollTrigger);

const ICONS: Record<CellIcon, React.ReactNode> = {
  bank: <path d="M3 10 12 4l9 6M5 10v8m4-8v8m6-8v8m4-8v8M3 20h18" />,
  file: <path d="M7 3h7l4 4v14H7zM14 3v4h4M10 12h5M10 16h5" />,
  cash: <path d="M3 7h18v10H3zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5M6.5 12h.01M17.5 12h.01" />,
  tag: <path d="M3 12V4h8l10 10-8 8zM7.5 8.5h.01" />,
  split: <path d="M12 3v6m0 0L6 15v6m6-12 6 6v6" />,
  swap: <path d="M4 8h14m0 0-4-4m4 4-4 4M20 16H6m0 0 4-4m-4 4 4 4" />,
  refund: <path d="M4 12a8 8 0 1 0 3-6.2M4 4v4h4" />,
  gauge: <path d="M4 17a8 8 0 1 1 16 0M12 17l4-5" />,
  bell: <path d="M6 16V11a6 6 0 1 1 12 0v5l2 2H4zM10 21h4" />,
  calendar: <path d="M4 6h16v14H4zM4 10h16M8 3v4m8-4v4" />,
  repeat: <path d="M4 11V9a3 3 0 0 1 3-3h13m0 0-3-3m3 3-3 3M20 13v2a3 3 0 0 1-3 3H4m0 0 3 3m-3-3 3-3" />,
  list: <path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />,
};

export function FeatureCells({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-cell]', {
          opacity: 0,
          y: 14,
          duration: 0.65,
          ease: 'expo.out',
          stagger: { each: 0.05, grid: 'auto', from: 'start' },
          scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section id="features" aria-labelledby="features-heading" className={cn('mx-auto w-full max-w-col scroll-mt-24 px-4 py-section', className)}>
      <div className="mx-auto mb-12 max-w-xl text-center">
        <h2 id="features-heading" className="text-h2 text-ink">The small things, handled.</h2>
        <p className="mt-4 text-lead text-ink-muted">Twelve quiet details that keep your numbers honest.</p>
      </div>
      <div ref={ref} className="rounded-container bg-surface p-1.5 shadow-2 shadow-ring">
        <ul className="grid gap-cell overflow-hidden rounded-cell bg-line sm:grid-cols-2 lg:grid-cols-3">
          {featureCells.map((c) => (
            <li
              key={c.title}
              data-cell
              className="min-h-44 bg-surface-sunken p-6 transition-colors duration-200 [@media(hover:hover)]:hover:bg-surface"
            >
              <span className="grid size-10 place-items-center rounded-chip bg-inverse text-inverse-ink">
                <svg
                  viewBox="0 0 24 24"
                  className="size-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {ICONS[c.icon]}
                </svg>
              </span>
              <h3 className="mt-5 text-h3 text-ink">{c.title}</h3>
              <p className="mt-1.5 text-base text-ink-muted">{c.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
