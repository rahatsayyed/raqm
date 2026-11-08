'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { processSteps } from '@/lib/features-data';
import { cn } from './cn';

gsap.registerPlugin(ScrollTrigger);

const facts = [
  { label: '120+ bank formats', d: 'M3 10l9-6 9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18' },
  { label: 'Works offline', d: 'M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01' },
  { label: 'No account needed', d: 'M6 11V8a6 6 0 0 1 12 0v3M5 11h14v9H5z' },
];

function Art({ n }: { n: number }) {
  if (n === 0) {
    return (
      <div className="relative h-full w-full max-w-60">
        <div className="absolute left-0 top-3 w-[85%] -rotate-6 rounded-cell rounded-bl-tag bg-surface p-3 text-[11px] leading-snug text-ink-subtle shadow-ring">
          <span className="block truncate">Rs.1,250.00 debited at ZOMATO</span>
        </div>
        <div className="absolute bottom-3 right-0 w-[92%] rotate-2 rounded-cell rounded-bl-tag bg-surface p-3.5 text-xs leading-snug text-ink-muted shadow-3 ring-1 ring-ring">
          <span className="mb-1.5 flex items-center justify-between text-[10px] text-ink-subtle">
            <span className="font-medium text-ink">HDFCBK</span>
            <span>now</span>
          </span>
          Rs.482.00 spent on card XX4821 at SWIGGY.
        </div>
      </div>
    );
  }
  if (n === 1) {
    return (
      <div className="relative w-full max-w-60 [mask-image:linear-gradient(to_bottom,transparent,black_22%,black_78%,transparent)]">
        <div className="flex flex-col gap-2 rounded-cell bg-surface p-2 shadow-3">
          {[
            { m: 'Uber', c: 'Travel', a: '₹214.00' },
            { m: 'Swiggy', c: 'Food', a: '₹482.00', hi: true },
            { m: 'Netflix', c: 'Fun', a: '₹649.00' },
          ].map((r) => (
            <div key={r.m} className={cn('flex items-center gap-2.5 rounded-chip px-2.5 py-2', r.hi ? 'bg-brand-soft' : 'bg-surface')}>
              <span className="grid size-7 place-items-center rounded-pill bg-surface-sunken text-[11px] font-medium text-ink">{r.m[0]}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-medium text-ink">{r.m}</span>
                <span className="block text-[10px] text-ink-subtle">{r.c}</span>
              </span>
              <span className="font-mono text-xs text-ink">{r.a}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="w-full max-w-60 rounded-cell bg-surface p-3.5 shadow-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] text-ink-subtle">November</span>
        <span className="font-mono text-sm text-ink">₹31,420</span>
      </div>
      <div className="mt-3 flex h-16 items-end gap-1.5">
        {[40, 62, 48, 80, 56, 90].map((h, i) => (
          <span key={i} className={cn('flex-1 rounded-tag', i === 5 ? 'bg-brand' : 'bg-surface-sunken')} style={{ height: `${h}%` }} />
        ))}
      </div>
      <div className="mt-3 flex gap-1.5">
        {['Food', 'Travel', 'Bills'].map((c) => (
          <span key={c} className="rounded-pill bg-surface-sunken px-2 py-0.5 text-[10px] text-ink-muted">{c}</span>
        ))}
      </div>
    </div>
  );
}

export function ProcessSteps({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-step]', {
          opacity: 0,
          y: 14,
          duration: 0.65,
          ease: 'expo.out',
          stagger: 0.07,
          scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
        });
        gsap.from('[data-fact]', {
          opacity: 0,
          y: 8,
          duration: 0.5,
          ease: 'expo.out',
          stagger: 0.06,
          delay: 0.3,
          scrollTrigger: { trigger: ref.current, start: 'top 85%', once: true },
        });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section className={cn('mx-auto w-full max-w-col px-4 py-section', className)}>
      <div ref={ref} className="relative pt-9">
        <span className="absolute left-6 top-0 z-10 -mb-px flex h-9 items-center rounded-t-cell bg-surface px-4 text-sm text-ink-muted shadow-ring [clip-path:inset(-1px_-1px_0_-1px)]">
          In <b className="mx-1 font-medium text-ink">three</b> steps
        </span>
        <ol className="grid rounded-container rounded-tl-none bg-surface shadow-ring md:grid-cols-3">
          {processSteps.map((s, i) => (
            <li
              key={s.title}
              data-step
              className={cn('flex flex-col gap-5 p-6 md:p-7', i > 0 && 'border-t border-line md:border-l md:border-t-0')}
            >
              <span className="grid size-8 place-items-center rounded-pill bg-surface-sunken font-mono text-sm text-ink-muted">{i + 1}</span>
              <div className="flex h-48 items-center justify-center rounded-cell bg-gradient-to-b from-surface-sunken to-surface p-4">
                <Art n={i} />
              </div>
              <div>
                <h3 className="text-xl font-medium tracking-tight text-ink">{s.title}</h3>
                <p className="mt-2 max-w-[30ch] text-base text-ink-muted">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-ink-muted">
          {facts.map((f) => (
            <li key={f.label} data-fact className="flex items-center gap-2">
              <svg aria-hidden viewBox="0 0 24 24" className="size-4 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d={f.d} />
              </svg>
              {f.label}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
