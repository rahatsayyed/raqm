'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SAMPLE_DASHBOARD } from '@/lib/sample-transactions';

gsap.registerPlugin(ScrollTrigger);

export function HeroParallax() {
  const containerRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const swiggyRef = useRef<HTMLDivElement>(null);
  const uberRef = useRef<HTMLDivElement>(null);
  const salaryRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const layers = [
          { el: backRef.current, scrollShift: 100, mouseAmt: 12, spin: 0 },
          { el: swiggyRef.current, scrollShift: -150, mouseAmt: 30, spin: 14 },
          { el: uberRef.current, scrollShift: -100, mouseAmt: 22, spin: -10 },
          { el: salaryRef.current, scrollShift: 180, mouseAmt: 40, spin: 12 },
          { el: frontRef.current, scrollShift: 240, mouseAmt: 56, spin: 0 },
        ] as const;

        layers.forEach(({ el, scrollShift, spin }) => {
          gsap.to(el, {
            y: scrollShift,
            rotate: `+=${spin}`,
            ease: 'none',
            scrollTrigger: {
              trigger: containerRef.current,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          });
        });

        const xSetters = layers.map(({ el, mouseAmt }) => ({
          setX: gsap.quickTo(el, 'x', { duration: 0.7, ease: 'power3.out' }),
          mouseAmt,
        }));

        function handlePointerMove(event: PointerEvent) {
          const rect = containerRef.current?.getBoundingClientRect();
          if (!rect) return;
          const relX = (event.clientX - rect.left - rect.width / 2) / (rect.width / 2);
          xSetters.forEach(({ setX, mouseAmt }) => setX(relX * mouseAmt));
        }

        window.addEventListener('pointermove', handlePointerMove);

        return () => {
          window.removeEventListener('pointermove', handlePointerMove);
        };
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set([backRef.current, swiggyRef.current, uberRef.current, salaryRef.current, frontRef.current], { x: 0, y: 0 });
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        ref={backRef}
        className="absolute -right-24 -top-20 h-72 w-96 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-primary)_24%,transparent)_0%,color-mix(in_srgb,var(--color-accent-primary)_7%,transparent)_45%,transparent_70%)] blur-[40px]"
        style={{ maskImage: 'radial-gradient(circle, black 45%, transparent 75%)', WebkitMaskImage: 'radial-gradient(circle, black 45%, transparent 75%)' }}
      />
      <div
        ref={swiggyRef}
        className="absolute left-[4%] top-[51%] hidden -rotate-6 items-center gap-3 rounded-[16px] border border-border-subtle bg-surface px-4 py-3 xl:flex"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--color-notice)_18%,white)] font-body text-sm font-semibold text-notice">
          S
        </span>
        <span className="flex flex-col">
          <span className="font-body text-sm font-semibold text-ink-headline">Swiggy</span>
          <span className="font-body text-xs text-ink-label">Food · HDFC Credit Card</span>
        </span>
        <span className="ml-3 font-mono text-sm font-semibold text-ink-headline">₹420</span>
      </div>
      <div
        ref={uberRef}
        className="absolute left-[7%] top-[57%] hidden rotate-[5deg] items-center gap-3 rounded-[16px] border border-border-subtle bg-surface px-4 py-3 xl:flex"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--color-ink-label)_14%,white)] font-body text-sm font-semibold text-ink-body">
          U
        </span>
        <span className="flex flex-col">
          <span className="font-body text-sm font-semibold text-ink-headline">Uber</span>
          <span className="font-body text-xs text-ink-label">Transport · HDFC Credit Card</span>
        </span>
        <span className="ml-3 font-mono text-sm font-semibold text-ink-headline">₹280</span>
      </div>
      <div
        ref={salaryRef}
        className="absolute left-[5%] top-[47%] hidden -rotate-3 items-center gap-3 rounded-[16px] border border-border-subtle bg-surface px-4 py-3 xl:flex"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[color-mix(in_srgb,var(--color-accent-primary)_16%,white)] font-body text-sm font-semibold text-accent-primary">
          ₹
        </span>
        <span className="flex flex-col">
          <span className="font-body text-sm font-semibold text-ink-headline">Salary</span>
          <span className="font-body text-xs text-ink-label">Income · HDFC Savings</span>
        </span>
        <span className="ml-3 font-mono text-sm font-semibold text-accent-primary">{SAMPLE_DASHBOARD.earned}</span>
      </div>
      <div
        ref={frontRef}
        className="absolute right-[9%] top-24 hidden h-24 w-24 rotate-6 items-center justify-center rounded-full border border-border-subtle bg-surface xl:flex"
      >
        <svg viewBox="0 0 100 100" className="absolute inset-2 -rotate-90">
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="9" className="stroke-surface-raised" />
          <circle cx="50" cy="50" r="40" fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray="251.3" strokeDashoffset="72.9" className="stroke-accent-primary" />
        </svg>
        <span className="font-mono text-sm font-semibold text-ink-headline">71%</span>
      </div>
    </div>
  );
}
