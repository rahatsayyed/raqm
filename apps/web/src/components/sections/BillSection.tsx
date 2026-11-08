'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

type Line = { kind: 'group'; label: string } | { kind: 'item'; label: string; value: string };

const LINES: Line[] = [
  { kind: 'group', label: 'Your data' },
  { kind: 'item', label: 'Transactions copied online', value: 'Often' },
  { kind: 'item', label: 'Account to get started', value: 'Usual' },
  { kind: 'item', label: 'Bank login shared', value: 'Sometimes' },
  { kind: 'group', label: 'Your money' },
  { kind: 'item', label: 'Paid tier for the useful bits', value: 'Common' },
  { kind: 'item', label: 'Ads shaped by your spending', value: 'Sometimes' },
  { kind: 'item', label: 'Export behind a paywall', value: 'Sometimes' },
  { kind: 'item', label: 'Auto-renewing plan', value: 'Common' },
];

const ITEM_COUNT = LINES.filter((l) => l.kind === 'item').length;
const DASH = '-'.repeat(120);
const DOTS = '.'.repeat(120);

function Rule() {
  return (
    <div aria-hidden="true" className="flex text-ink/35">
      <span>+</span>
      <span className="min-w-0 flex-1 overflow-hidden whitespace-nowrap">{DASH}</span>
      <span>+</span>
    </div>
  );
}

function Frame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex ${className}`}>
      <span aria-hidden="true" className="text-ink/35">|</span>
      <div className="min-w-0 flex-1 px-[1ch] sm:px-[2ch]">{children}</div>
      <span aria-hidden="true" className="text-ink/35">|</span>
    </div>
  );
}

function Odometer({ value }: { value: number }) {
  return (
    <span role="img" aria-label={String(value)} className="relative inline-block h-[1em] overflow-hidden leading-none">
      <span aria-hidden="true" className="invisible block">0</span>
      <span data-odo className="absolute inset-x-0 top-0 block" style={{ transform: `translateY(-${value * 10}%)` }}>
        {Array.from({ length: 10 }, (_, d) => (
          <span key={d} aria-hidden="true" className="block h-[1em] text-center leading-none">{d}</span>
        ))}
      </span>
    </span>
  );
}

export function BillSection() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;
      const card = el.querySelector<HTMLElement>('[data-card]')!;
      const paper = el.querySelector<HTMLElement>('[data-paper]')!;
      const head = el.querySelector<HTMLElement>('[data-head]')!;
      const block = el.querySelector<HTMLElement>('[data-block]')!;
      const odo = el.querySelector<HTMLElement>('[data-odo]')!;
      const total = el.querySelector<HTMLElement>('[data-total]')!;
      const items = Array.from(el.querySelectorAll<HTMLElement>('[data-item]'));
      const state = { p: 1 };

      const render = (p: number) => {
        const y = p * paper.offsetHeight;
        paper.style.clipPath = `inset(0 0 ${(1 - p) * 100}% 0)`;
        head.style.top = `${p * 100}%`;
        head.style.opacity = String(gsap.utils.clamp(0, 1, (1 - p) * 20));
        const s = (p * 14) % 2;
        block.style.left = `calc(${s < 1 ? s : 2 - s} * (100% - 3ch))`;
        let n = 0;
        items.forEach((it) => {
          if (it.offsetTop + it.offsetHeight <= y + 1) n += 1;
        });
        odo.style.transform = `translateY(-${n * 10}%)`;
        total.textContent = String(n);
      };

      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const desktop = window.matchMedia('(min-width: 1024px)').matches;
        state.p = 0;
        render(0);
        gsap.to(state, {
          p: 1,
          ease: 'none',
          onUpdate: () => render(state.p),
          scrollTrigger: desktop
            ? { trigger: card, start: 'center center', end: '+=1000', pin: true, scrub: 0.4 }
            : { trigger: card, start: 'top 70%', end: 'bottom 45%', scrub: 0.4 },
        });
        return () => {
          paper.style.clipPath = '';
          head.style.opacity = '0';
          odo.style.transform = `translateY(-${ITEM_COUNT * 10}%)`;
          total.textContent = String(ITEM_COUNT);
        };
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        head.style.opacity = '0';
      });

      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section ref={root} id="bill" aria-labelledby="bill-heading" className="px-4 py-section sm:px-6">
      <div className="mx-auto max-w-wide">
        <div data-card className="rounded-container bg-surface p-1.5 shadow-ring shadow-2">
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-12">
            <div className="flex min-w-0 flex-col justify-between gap-10 rounded-cell p-6 sm:p-10 lg:col-span-5">
              <div>
                <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-subtle">The bill</p>
                <h2 id="bill-heading" className="mb-4 text-balance text-h2">
                  What typical finance apps ask of you
                </h2>
                <p className="max-w-md text-base leading-6 text-ink-muted">
                  Many cloud-first apps want a login, a server copy and a subscription. Raqm needs none of them, so the count stays at zero.
                </p>
              </div>
              <div>
                <div className="font-mono text-[clamp(7rem,14vw,11rem)] font-medium leading-none tracking-tight text-ink">
                  <Odometer value={ITEM_COUNT} />
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-wide text-ink-subtle">
                  <span>Things typical apps ask of you</span>
                  <span className="rounded-tag bg-brand-soft px-2 py-1 text-brand">Raqm: 0</span>
                </div>
              </div>
            </div>

            <div className="min-w-0 rounded-cell bg-surface-sunken p-4 sm:p-8 lg:col-span-7">
              <div className="relative mx-auto max-w-[56ch] font-mono text-[11.5px] uppercase leading-[1.7] text-ink sm:text-sm">
                <div data-paper className="relative">
                  <Rule />
                  <Frame>
                    <p className="flex justify-between py-[1.2em] font-medium">
                      <span>Typical cloud app</span>
                      <span className="text-ink-subtle">Varies</span>
                    </p>
                  </Frame>
                  <Rule />
                  {LINES.map((l, i) =>
                    l.kind === 'group' ? (
                      <Frame key={i}>
                        <p className="pt-[1.2em] text-ink-subtle">{l.label}</p>
                      </Frame>
                    ) : (
                      <div key={i} data-item>
                        <Frame>
                          <p className="flex items-end gap-x-[1ch]">
                            <span className="min-w-0">{l.label}</span>
                            <span aria-hidden="true" className="min-w-[2ch] flex-1 overflow-hidden whitespace-nowrap text-ink/35">{DOTS}</span>
                            <span>{l.value}</span>
                          </p>
                        </Frame>
                      </div>
                    )
                  )}
                  <Frame>
                    <p className="pt-[1.2em]" />
                  </Frame>
                  <Rule />
                  <Frame>
                    <p className="flex justify-between py-[0.6em] font-medium">
                      <span>Things you hand over</span>
                      <span data-total>{ITEM_COUNT}</span>
                    </p>
                  </Frame>
                  <Frame>
                    <p className="my-[0.4em] flex justify-between rounded-tag bg-inverse px-[1ch] py-[0.3em] text-inverse-ink">
                      <span>Raqm</span>
                      <span>INR 0 &middot; stays on your phone</span>
                    </p>
                  </Frame>
                  <Rule />
                </div>
                <div data-head aria-hidden="true" className="pointer-events-none absolute inset-x-0 opacity-0" style={{ top: '100%' }}>
                  <div className="h-0.5 bg-ink" />
                  <div data-block className="absolute -top-1 h-2 w-[3ch] bg-ink" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
