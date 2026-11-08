'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { featureCells, type CellIcon } from '@/lib/features-data';
import { cn } from './cn';
import { WidgetPhone } from './feature-cells/WidgetPhone';

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
        gsap.from('[data-phone]', {
          y: 60,
          opacity: 0,
          duration: 0.9,
          ease: 'expo.out',
          scrollTrigger: { trigger: '[data-widgets]', start: 'top 75%', once: true },
        });
        gsap.from('[data-widget]', {
          y: 16,
          opacity: 0,
          duration: 0.6,
          ease: 'expo.out',
          stagger: 0.12,
          delay: 0.25,
          scrollTrigger: { trigger: '[data-widgets]', start: 'top 75%', once: true },
        });
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
    <section id="features" aria-labelledby="features-heading" className={cn('mx-auto w-full max-w-wide scroll-mt-24 px-4 py-15', className)}>
      <div className="mx-auto mb-9 max-w-xl text-center">
        <h2 id="features-heading" className="text-h2 text-ink">The small things, handled.</h2>
        <p className="mt-3 text-lead text-ink-muted">Twelve quiet details that keep your numbers honest.</p>
      </div>
      <div ref={ref} className="mx-auto max-w-col rounded-container bg-surface p-1.5 shadow-2 shadow-ring">
        <ul className="grid auto-rows-fr gap-0.5 overflow-hidden rounded-cell sm:grid-cols-2 lg:grid-cols-3">
          {featureCells.map((c) => (
            <li
              key={c.title}
              data-cell
              className="flex min-h-[150px] flex-col gap-3 bg-surface-sunken p-5 transition-colors duration-200 [@media(hover:hover)]:hover:bg-[color-mix(in_oklab,var(--color-surface-sunken)_86%,var(--color-ink))]"
            >
              <svg
                viewBox="0 0 24 24"
                className="size-5 text-ink"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                {ICONS[c.icon]}
              </svg>
              <div className="flex flex-col gap-1.5">
                <h3 className="text-h3 font-semibold text-ink">{c.title}</h3>
                <p className="text-base leading-5 font-medium text-ink-muted">{c.body}</p>
              </div>
            </li>
          ))}
        </ul>
        <div
          data-widgets
          className="mt-0.5 grid items-end overflow-hidden rounded-cell bg-surface-sunken lg:h-[340px] lg:grid-cols-2"
        >
          <div className="relative flex items-end self-stretch px-6 pt-6">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(color-mix(in_oklab,var(--color-ink)_16%,transparent)_1px,transparent_1px)] bg-[length:20px_20px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]"
            />
            <div className="relative w-full">
              <WidgetPhone />
            </div>
          </div>
          <div className="flex flex-col gap-6 px-6 py-6 lg:self-stretch lg:justify-center lg:px-10 lg:py-6">
            <span className="inline-flex items-center gap-2.5 text-h3 font-semibold text-ink">
              <span className="grid size-7 place-items-center rounded-tag bg-brand text-brand-ink" aria-hidden>
                <svg viewBox="0 0 28 28" className="size-7" fill="currentColor">
                  <rect x="7" y="7.5" width="6" height="6" rx="1.5" />
                  <rect x="7" y="15" width="6" height="6" rx="1.5" />
                  <rect x="14.5" y="15" width="6" height="6" rx="1.5" />
                  <rect x="15.5" y="6.5" width="6" height="6" rx="1.5" transform="rotate(12 18.5 9.5)" opacity="0.6" />
                </svg>
              </span>
              Widgets
            </span>
            <div className="flex flex-col gap-3">
              <h3 className="text-h3 font-semibold text-ink">Your safe-to-spend, one glance away.</h3>
              <p className="text-base leading-5 font-medium text-ink-muted">
                Seven Android home-screen widgets: safe-to-spend, budgets, a single budget, spend by category, recent
                transactions, and one-tap cash or voice logging. Resize them, set the background opacity from 10 to 100%,
                or tint them from your wallpaper.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
