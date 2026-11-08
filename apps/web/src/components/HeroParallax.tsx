'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SAMPLE_DASHBOARD } from '@/lib/sample-transactions';

gsap.registerPlugin(ScrollTrigger);

const chip = 'absolute hidden items-center gap-3 rounded-cell bg-surface py-2.5 pl-2.5 pr-4 border border-line shadow-1 xl:flex';
const chipIcon = 'flex h-9 w-9 items-center justify-center rounded-chip text-sm font-semibold';

export function HeroParallax() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const items = gsap.utils.toArray<HTMLElement>('[data-drift]');
        items.forEach((el) => {
          const shift = Number(el.dataset.drift);
          gsap.to(el, {
            y: shift,
            ease: 'none',
            scrollTrigger: { trigger: containerRef.current, start: 'top top', end: 'bottom top', scrub: true },
          });
        });
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute left-1/2 top-[-20%] h-[70%] w-[90%] -translate-x-1/2 rounded-full bg-brand-soft opacity-70 blur-3xl" />
      <div data-drift="-90" className={`${chip} left-[7%] top-[30%] -rotate-3`}>
        <span className={`${chipIcon} bg-surface-sunken text-ink-muted`}>S</span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-ink">Swiggy</span>
          <span className="text-xs text-ink-subtle">Food · HDFC Credit Card</span>
        </span>
        <span className="ml-3 font-mono text-sm font-medium text-ink">₹420</span>
      </div>
      <div data-drift="-40" className={`${chip} left-[11%] top-[48%] rotate-2`}>
        <span className={`${chipIcon} bg-brand-soft text-brand`}>₹</span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-ink">Salary</span>
          <span className="text-xs text-ink-subtle">Income · HDFC Savings</span>
        </span>
        <span className="ml-3 font-mono text-sm font-medium text-positive">{SAMPLE_DASHBOARD.earned}</span>
      </div>
      <div data-drift="-70" className={`${chip} right-[7%] top-[34%] rotate-3`}>
        <span className={`${chipIcon} bg-surface-sunken text-ink-muted`}>U</span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-ink">Uber</span>
          <span className="text-xs text-ink-subtle">Transport · HDFC Credit Card</span>
        </span>
        <span className="ml-3 font-mono text-sm font-medium text-ink">₹280</span>
      </div>
      <div data-drift="-30" className={`${chip} right-[12%] top-[52%] -rotate-2`}>
        <span className="relative h-9 w-9">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="12" className="stroke-surface-sunken" />
            <circle cx="50" cy="50" r="40" fill="none" strokeWidth="12" strokeLinecap="round" strokeDasharray="251.3" strokeDashoffset="72.9" className="stroke-brand" />
          </svg>
        </span>
        <span className="flex flex-col">
          <span className="text-sm font-semibold text-ink">Monthly budget</span>
          <span className="text-xs text-ink-subtle">Used so far</span>
        </span>
        <span className="ml-3 font-mono text-sm font-medium text-ink">{SAMPLE_DASHBOARD.usedPct}%</span>
      </div>
    </div>
  );
}
