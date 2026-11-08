'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const SMS = [
  { bank: 'HDFC', merchant: 'Swiggy', amt: '-₹420', cat: 'Food' },
  { bank: 'SBI', merchant: 'Myntra', amt: '-₹1,249', cat: 'Shopping' },
  { bank: 'ICICI', merchant: 'Metro card', amt: '-₹300', cat: 'Travel' },
];

const CATS = [
  { name: 'Food', pct: 38, bar: 'bg-brand' },
  { name: 'Travel', pct: 24, bar: 'bg-ink' },
  { name: 'Shopping', pct: 22, bar: 'bg-ink-subtle' },
  { name: 'Bills', pct: 16, bar: 'bg-warning' },
];

const PEOPLE = [
  { n: 'A', paid: true },
  { n: 'M', paid: true },
  { n: 'S', paid: false },
  { n: 'R', paid: true },
];

const FACTS = ['No cloud upload', 'No account', 'Works offline'];

const card = 'flex flex-col rounded-container border border-line bg-surface p-5 shadow-1 text-ink';
const eyebrow = 'font-mono text-[12px] uppercase tracking-wide opacity-70';

function Ring() {
  const r = 34;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 88 88" className="size-[88px] shrink-0 -rotate-90" aria-hidden>
      <circle cx="44" cy="44" r={r} fill="none" strokeWidth="9" className="stroke-surface-sunken" />
      <circle cx="44" cy="44" r={r} fill="none" strokeWidth="9" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * 0.35} className="stroke-brand" />
    </svg>
  );
}

function Lock() {
  return (
    <svg viewBox="0 0 48 48" className="size-12 shrink-0" fill="none" aria-hidden>
      <rect x="9" y="21" width="30" height="21" rx="6" className="fill-inverse-ink/10 stroke-inverse-ink" strokeWidth="2" />
      <path d="M16 21v-5a8 8 0 0 1 16 0v5" className="stroke-inverse-ink" strokeWidth="2" strokeLinecap="round" />
      <circle cx="24" cy="31" r="3" className="fill-inverse-ink" />
    </svg>
  );
}

function Panel({ side }: { side: 'l' | 'r' }) {
  const left = side === 'l';
  return (
    <div
      data-panel={side}
      className={`absolute inset-y-0 w-1/2 bg-canvas will-change-transform ${left ? 'left-0 border-r' : 'right-0 border-l'} border-line`}
    >
      <div className={`absolute inset-y-0 flex flex-col justify-center gap-2 px-6 lg:px-10 ${left ? 'left-0 items-start' : 'right-0 items-end text-right'}`}>
        <span className="font-mono text-[12px] uppercase tracking-wide text-ink-subtle">{left ? '120+' : '0 bytes'}</span>
        <span className="max-w-[9rem] text-[14px] leading-snug text-ink-muted">{left ? 'bank SMS formats read' : 'sent to any server'}</span>
        <span className="mt-3 h-px w-10 bg-line" />
      </div>
      <div data-seam className={`absolute inset-y-0 flex flex-col justify-center gap-2 ${left ? 'right-6 items-end text-right' : 'left-6 items-start'}`}>
        <span className="rounded-pill border border-line bg-surface px-3 py-1 font-mono text-[12px] text-ink-subtle">{left ? 'SMS in' : 'On-device'}</span>
        <p className="text-h3 max-w-[8.5rem] text-ink">{left ? 'Every bank SMS, captured.' : 'Nothing leaves your phone.'}</p>
      </div>
    </div>
  );
}

export function FeatureCurtain() {
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const bento = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const open = () => {
        const bw = bento.current?.offsetWidth ?? 0;
        const visible = Math.max(0, (window.innerWidth - bw) / 2 - 20);
        return window.innerWidth / 2 - visible;
      };
      const mm = gsap.matchMedia();
      mm.add('(min-width: 768px) and (prefers-reduced-motion: no-preference)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('[data-card]', bento.current);
        gsap.set(bento.current, { opacity: 0 });
        gsap.set(cards, { scale: 0.95, y: 16 });
        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: stage.current, start: 'top top', end: '+=900', pin: true, scrub: 0.4, invalidateOnRefresh: true },
        });
        tl.to('[data-seam]', { opacity: () => (window.innerWidth - (bento.current?.offsetWidth ?? 0)) / 2 - 20 < 170 ? 0 : 1, duration: 1.2 }, 0)
          .to('[data-panel="l"]', { x: () => -open(), duration: 4, ease: 'power2.inOut' }, 0)
          .to('[data-panel="r"]', { x: () => open(), duration: 4, ease: 'power2.inOut' }, 0)
          .to(bento.current, { opacity: 1, duration: 1.4 }, 1.4)
          .to(cards, { scale: 1, y: 0, duration: 1.8, stagger: 0.15 }, 1.4)
          .to({}, { duration: 2 });
      });
      mm.add('(min-width: 768px) and (prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-panel="l"]', { x: () => -open() });
        gsap.set('[data-panel="r"]', { x: () => open() });
        gsap.set(bento.current, { opacity: 1 });
      });
      mm.add('(max-width: 767px)', () => {
        gsap.set(bento.current, { opacity: 1 });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section ref={root} className="bg-canvas">
      <div ref={stage} className="relative flex min-h-[100svh] items-center justify-center overflow-hidden py-section md:py-0">
        <div className="relative z-0 mx-auto w-full max-w-[1040px] px-4 md:px-6">
          <div ref={bento}>
            <h2 className="sr-only">What Raqm does for you</h2>
            <div className="grid grid-cols-1 gap-3 md:auto-rows-[190px] md:grid-cols-4">
              <div data-card className={`${card} !border-transparent !bg-brand !text-brand-ink justify-between gap-5 md:col-span-2 md:row-span-2`}>
                <div>
                  <p className={eyebrow}>Captured for you</p>
                  <h3 className="text-h3 mt-2 max-w-[20rem] text-inherit">Bank SMS becomes a tidy entry. No typing.</h3>
                </div>
                <div className="flex flex-col gap-2">
                  {SMS.map((s) => (
                    <div key={s.merchant} className="flex items-center gap-3 rounded-cell bg-brand-ink/10 px-3 py-2.5">
                      <span className="rounded-tag bg-brand-ink/15 px-2 py-0.5 font-mono text-[11px]">{s.bank}</span>
                      <span className="flex-1 truncate text-[14px]">{s.merchant}</span>
                      <span className="hidden font-mono text-[11px] opacity-70 sm:inline">{s.cat}</span>
                      <span className="font-mono text-[13px]">{s.amt}</span>
                    </div>
                  ))}
                </div>
                <p className="font-mono text-[12px] opacity-80">120+ bank formats, read the moment they arrive</p>
              </div>

              <div data-card className={`${card} justify-between gap-4`}>
                <div>
                  <p className={`${eyebrow} text-ink-subtle`}>Sorted by itself</p>
                  <p className="mt-1 text-[14px] leading-snug text-ink-muted">Merchants land in the right category.</p>
                </div>
                <div>
                  <div className="flex h-3 gap-[2px] overflow-hidden rounded-pill">
                    {CATS.map((c) => (
                      <span key={c.name} className={c.bar} style={{ width: `${c.pct}%` }} />
                    ))}
                  </div>
                  <ul className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1">
                    {CATS.map((c) => (
                      <li key={c.name} className="flex items-center gap-2 font-mono text-[11px] text-ink-muted">
                        <span className={`size-2 rounded-pill ${c.bar}`} />
                        {c.name} {c.pct}%
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div data-card className={`${card} justify-between gap-4`}>
                <div>
                  <p className={`${eyebrow} text-ink-subtle`}>Budgets that breathe</p>
                  <p className="mt-1 text-[14px] leading-snug text-ink-muted">See what is safe to spend each day.</p>
                </div>
                <div className="flex items-center gap-4">
                  <Ring />
                  <div>
                    <p className="font-mono text-[20px] leading-none">₹540</p>
                    <p className="mt-1 text-[12px] text-ink-subtle">safe today</p>
                    <p className="mt-2 font-mono text-[11px] text-positive">65% of ₹24,000 left</p>
                  </div>
                </div>
              </div>

              <div data-card className={`${card} justify-between gap-4 md:col-span-2`}>
                <div>
                  <p className={`${eyebrow} text-ink-subtle`}>Split with people</p>
                  <p className="mt-1 text-[14px] leading-snug text-ink-muted">Share a bill without a group chat.</p>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex -space-x-2">
                    {PEOPLE.map((p) => (
                      <span
                        key={p.n}
                        className={`grid size-10 place-items-center rounded-pill border-2 border-surface font-mono text-[13px] ${p.paid ? 'bg-brand-soft text-brand' : 'bg-surface-sunken text-ink-subtle'}`}
                      >
                        {p.n}
                      </span>
                    ))}
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-[20px] leading-none">₹1,840</p>
                    <p className="mt-1 text-[12px] text-ink-subtle">dinner, ₹460 each</p>
                    <p className="mt-1 font-mono text-[11px] text-warning">1 of 4 pending</p>
                  </div>
                </div>
              </div>

              <div data-card className={`${card} !border-inverse-line !bg-inverse !text-inverse-ink items-start justify-between gap-5 md:col-span-4 md:flex-row md:items-center`}>
                <div className="flex items-center gap-5">
                  <Lock />
                  <div>
                    <p className="text-h3 text-inherit">Private on-device</p>
                    <p className="mt-1 max-w-[26rem] text-[14px] leading-snug opacity-80">Reading, sorting and totals all happen on your phone. Your SMS never leaves it.</p>
                  </div>
                </div>
                <ul className="flex flex-wrap gap-2">
                  {FACTS.map((f) => (
                    <li key={f} className="rounded-pill border border-inverse-line px-3 py-1.5 font-mono text-[12px]">{f}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-0 z-10 max-md:hidden">
          <Panel side="l" />
          <Panel side="r" />
        </div>
      </div>
    </section>
  );
}
