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

const rows = [
  { m: 'Uber', c: 'Travel', a: '₹214.00', d: 'M5 15v-3l2-5h10l2 5v3M5 15h14M7.5 18h.01M16.5 18h.01' },
  { m: 'Swiggy', c: 'Food', a: '₹482.00', d: 'M6 8h12l-1 11H7L6 8zM9 8a3 3 0 0 1 6 0' },
  { m: 'Netflix', c: 'Fun', a: '₹649.00', d: 'M8 6l10 6-10 6z' },
];

const bars = [40, 62, 48, 80, 56, 90];

const TOTAL = 31420;
const inr = (n: number) => `₹${Math.round(n).toLocaleString('en-IN')}`;

function Glyph({ d, className }: { d: string; className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function StatusDot({ className }: { className?: string }) {
  return <span className={cn('size-1.5 rounded-pill bg-positive', className)} />;
}

function Art({ n }: { n: number }) {
  if (n === 0) {
    return (
      <div className="relative h-44 w-full max-w-72">
        <div data-sms="old" className="absolute left-0 top-2 w-[78%] -rotate-6 rounded-cell rounded-bl-tag bg-surface p-3 shadow-[var(--shadow-ring),var(--shadow-1)]">
          <span className="mb-1 flex items-center gap-1.5 text-[10px] text-ink-subtle">
            <span className="grid size-4 place-items-center rounded-tag bg-surface-sunken text-[8px] font-medium text-ink-muted">A</span>
            AXISBK
          </span>
          <span className="block truncate text-[11px] text-ink-muted">Rs.1,250.00 debited at ZOMATO</span>
        </div>
        <div data-sms="new" className="absolute bottom-3 right-0 w-[90%] rotate-2 rounded-cell rounded-bl-tag bg-surface p-3.5 shadow-[var(--shadow-ring),var(--shadow-3)]">
          <span className="mb-1.5 flex items-center justify-between text-[10px] text-ink-subtle">
            <span className="flex items-center gap-1.5 font-medium text-ink">
              <span className="grid size-5 place-items-center rounded-tag bg-brand-soft text-[9px] text-brand">H</span>
              HDFCBK
            </span>
            <span className="flex items-center gap-1"><span data-dot className="size-1.5 rounded-pill bg-positive" />now</span>
          </span>
          <span className="block text-xs leading-snug text-ink-muted">Rs.482.00 spent on card XX4821 at SWIGGY.</span>
        </div>
        <span data-sms="tag" className="absolute right-1 top-0 flex rotate-3 items-center gap-1.5 rounded-pill bg-surface px-2.5 py-1 text-[10px] text-ink-muted shadow-[var(--shadow-ring),var(--shadow-2)]">
          <span data-dot className="size-1.5 rounded-pill bg-positive" />
          Raqm is listening
        </span>
      </div>
    );
  }
  if (n === 1) {
    return (
      <div className="relative h-44 w-full max-w-72">
        <div aria-hidden className="absolute inset-x-4 top-3 h-32 -rotate-3 rounded-cell bg-surface shadow-[var(--shadow-ring),var(--shadow-1)]" />
        <div data-card className="absolute inset-x-1 top-6 rotate-1 rounded-cell bg-surface p-2 shadow-[var(--shadow-ring),var(--shadow-3)]">
          <div className="relative">
            <span data-hl className="absolute inset-x-0 top-10 h-10 rounded-chip bg-brand-soft" />
            {rows.map((r, i) => (
              <div key={r.m} data-row className="relative flex h-10 items-center gap-2.5 px-2">
                <span className={cn('grid size-7 shrink-0 place-items-center rounded-chip', i === 1 ? 'bg-surface text-brand shadow-ring' : 'bg-surface-sunken text-ink-muted')}>
                  <Glyph d={r.d} className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-ink">{r.m}</span>
                <span data-chip className="rounded-pill bg-surface px-2 py-0.5 text-[10px] text-ink-muted shadow-ring">{r.c}</span>
                <span className="w-14 text-right font-mono text-xs text-ink">{r.a}</span>
              </div>
            ))}
          </div>
        </div>
        <span data-sort className="absolute -bottom-0 right-0 flex -rotate-2 items-center gap-1.5 rounded-pill bg-surface px-2.5 py-1 text-[10px] text-ink-muted shadow-[var(--shadow-ring),var(--shadow-2)]">
          <StatusDot />
          Sorted on-device
        </span>
      </div>
    );
  }
  return (
    <div className="relative h-44 w-full max-w-72">
      <div data-month className="absolute inset-x-1 top-3 -rotate-1 rounded-cell bg-surface p-3.5 shadow-[var(--shadow-ring),var(--shadow-3)]">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] text-ink-subtle">November spend</span>
          <span data-total className="font-mono text-sm text-ink">{inr(TOTAL)}</span>
        </div>
        <div className="mt-3 flex h-16 items-end gap-1.5">
          {bars.map((h, i) => (
            <span key={i} data-bar className="relative flex-1 origin-bottom overflow-hidden rounded-tag bg-surface-sunken" style={{ height: `${h}%` }}>
              <span data-fill className={cn('absolute inset-0 bg-brand', i === 5 ? 'opacity-100' : 'opacity-0')} />
            </span>
          ))}
        </div>
        <div className="mt-2.5 flex gap-1.5">
          {['Food', 'Travel', 'Bills'].map((c) => (
            <span key={c} className="rounded-pill bg-surface-sunken px-2 py-0.5 text-[10px] text-ink-muted">{c}</span>
          ))}
        </div>
      </div>
      <span data-budget className="absolute bottom-2 right-0 flex rotate-2 items-center gap-1.5 rounded-pill bg-surface px-2.5 py-1 text-[10px] text-ink-muted shadow-[var(--shadow-ring),var(--shadow-2)]">
        <StatusDot />
        Under budget
      </span>
    </div>
  );
}

export function ProcessSteps({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = ref.current;
      if (!root) return;
      const q = gsap.utils.selector(root);
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const idle: gsap.core.Animation[] = [];
        const keep = <T extends gsap.core.Animation>(a: T) => {
          a.pause();
          idle.push(a);
          return a;
        };
        let ready = false;

        gsap.set(q('[data-step]'), { opacity: 0, y: 14 });
        gsap.set(q('[data-fact]'), { opacity: 0, y: 8 });
        gsap.set(q('[data-sms="old"]'), { opacity: 0, x: -28 });
        gsap.set(q('[data-sms="new"]'), { opacity: 0, y: 34 });
        gsap.set(q('[data-sms="tag"]'), { opacity: 0, scale: 0.6 });
        gsap.set(q('[data-row]'), { opacity: 0, x: 24 });
        gsap.set(q('[data-card]'), { opacity: 0, y: 18 });
        gsap.set(q('[data-hl]'), { y: -40, opacity: 0 });
        gsap.set(q('[data-chip]'), { scale: 0, opacity: 0 });
        gsap.set(q('[data-sort]'), { opacity: 0, scale: 0.6 });
        gsap.set(q('[data-month]'), { opacity: 0, y: 18 });
        gsap.set(q('[data-bar]'), { scaleY: 0 });
        gsap.set(q('[data-budget]'), { opacity: 0, scale: 0.6 });
        const total = q('[data-total]')[0];
        if (total) total.textContent = inr(0);

        const counter = { v: 0 };
        const fills = q('[data-fill]');
        const chips = q('[data-chip]');

        const tl = gsap.timeline({
          defaults: { ease: 'expo.out' },
          scrollTrigger: { trigger: root, start: 'top 80%', once: true },
          onComplete: () => {
            ready = true;
            if (st.isActive) idle.forEach((a) => a.play());
          },
        });
        tl.to(q('[data-step]'), { opacity: 1, y: 0, duration: 0.65, stagger: 0.07 }, 0)
          .to(q('[data-fact]'), { opacity: 1, y: 0, duration: 0.5, stagger: 0.06 }, 0.3)
          .to(q('[data-sms="old"]'), { opacity: 1, x: 0, duration: 0.8 }, 0.25)
          .to(q('[data-sms="new"]'), { opacity: 1, y: 0, duration: 0.9, ease: 'back.out(1.4)' }, 0.5)
          .to(q('[data-sms="tag"]'), { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' }, 1)
          .to(q('[data-card]'), { opacity: 1, y: 0, duration: 0.8 }, 0.3)
          .to(q('[data-row]'), { opacity: 1, x: 0, duration: 0.7, stagger: 0.12 }, 0.5)
          .to(q('[data-hl]'), { opacity: 1, y: 0, duration: 0.5 }, 1.0)
          .to(chips[1], { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.4)' }, 1.2)
          .to(q('[data-sort]'), { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' }, 1.3)
          .to(q('[data-month]'), { opacity: 1, y: 0, duration: 0.8 }, 0.3)
          .to(q('[data-bar]'), { scaleY: 1, duration: 0.8, stagger: 0.08 }, 0.55)
          .to(
            counter,
            {
              v: TOTAL,
              duration: 1.4,
              ease: 'power2.out',
              onUpdate: () => {
                if (total) total.textContent = inr(counter.v);
              },
            },
            0.55,
          )
          .to(q('[data-budget]'), { opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(2)' }, 1.4);

        const st = ScrollTrigger.create({
          trigger: root,
          start: 'top bottom',
          end: 'bottom top',
          onToggle: (self) => {
            if (!ready) return;
            idle.forEach((a) => (self.isActive ? a.play() : a.pause()));
          },
        });

        const float = (el: Element | undefined, y: number, dur: number, delay = 0) => {
          if (el) keep(gsap.to(el, { y: `+=${y}`, duration: dur, ease: 'sine.inOut', yoyo: true, repeat: -1, delay }));
        };
        float(q('[data-sms="old"]')[0], -4, 3.1);
        float(q('[data-sms="new"]')[0], 5, 2.6, 0.4);
        float(q('[data-sms="tag"]')[0], 3, 2.2, 0.8);
        float(q('[data-sort]')[0], -3, 2.4);
        float(q('[data-budget]')[0], -3, 2.5, 0.3);
        q('[data-dot]').forEach((d) => keep(gsap.to(d, { opacity: 0.25, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1 })));

        const cycle = keep(gsap.timeline({ repeat: -1, repeatDelay: 0.4 }));
        [0, 2, 1].forEach((row, k) => {
          const t = k * 1.6;
          cycle.to(q('[data-hl]'), { y: (row - 1) * 40, duration: 0.5, ease: 'power3.inOut' }, t);
          cycle.to(chips, { scale: 0, opacity: 0, duration: 0.2, ease: 'power2.in' }, t);
          cycle.to(chips[row], { scale: 1, opacity: 1, duration: 0.5, ease: 'back.out(2.4)' }, t + 0.45);
        });

        const sweep = keep(gsap.timeline({ repeat: -1, repeatDelay: 0.6 }));
        [1, 3, 2, 4, 0, 5].forEach((b, k) => {
          sweep.to(fills, { opacity: 0, duration: 0.25 }, k * 0.9);
          sweep.to(fills[b], { opacity: 1, duration: 0.3 }, k * 0.9);
        });
        keep(gsap.to(q('[data-bar]'), { scaleY: 0.9, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: { each: 0.25, from: 'start' } }));

        return () => {
          st.kill();
          idle.forEach((a) => a.kill());
        };
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section className={cn('mx-auto w-full max-w-col px-4 py-section', className)}>
      <div ref={ref} className="relative pt-9">
        <div className="absolute left-0 top-0 z-10 flex translate-y-px">
          <span className="flex h-9 items-center gap-2 rounded-tl-cell rounded-tr-cell bg-surface pl-3.5 pr-4 text-sm text-ink-muted shadow-ring [clip-path:inset(-1px_-1px_0_-1px)]">
            <span className="grid size-5 place-items-center rounded-tag bg-brand text-brand-ink">
              <Glyph d="M5 12.5l4.5 4.5L19 7.5" className="size-3" />
            </span>
            <span>Raqm in <b className="font-medium text-ink">three</b> steps</span>
          </span>
          <span
            aria-hidden
            className="size-3 self-end bg-[radial-gradient(circle_at_100%_0,transparent_11px,rgb(var(--shadow-ink)/0.1)_11px,rgb(var(--shadow-ink)/0.1)_12px,var(--color-surface)_12px)]"
          />
        </div>
        <ol className="grid rounded-container rounded-tl-none bg-surface shadow-ring md:grid-cols-3">
          {processSteps.map((s, i) => (
            <li
              key={s.title}
              data-step
              className={cn('flex flex-col px-5 pb-6 pt-5 md:px-6', i > 0 && 'border-t border-line md:border-l md:border-t-0')}
            >
              <span className="grid size-8 place-items-center rounded-pill bg-surface-sunken font-mono text-sm text-ink-muted">{i + 1}</span>
              <div className="flex h-44 items-center justify-center">
                <Art n={i} />
              </div>
              <h3 className="text-xl font-medium tracking-tight text-ink">{s.title}</h3>
              <p className="mt-1.5 text-[15px] leading-6 text-ink-muted">{s.body}</p>
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
