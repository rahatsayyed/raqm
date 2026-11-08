'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { AppStoreBadges } from './AppStoreBadges';
import { HeroParallax } from './HeroParallax';
import { INTRO_REVEAL_EVENT } from './IntroScreen';
import { TxTicker } from './TxTicker';
import { HERO_PEEK_PAD } from './heroPeek';

export function Hero() {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const items = gsap.utils.toArray<HTMLElement>('[data-hero-item]');
        const introPending = document.documentElement.dataset.intro === 'play';

        gsap.set(items, { opacity: 0, y: 18 });
        const tl = gsap
          .timeline({ paused: introPending, delay: 0.1 })
          .to(items, { opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.08, clearProps: 'transform' });

        if (!introPending) return;
        const start = () => tl.play();
        window.addEventListener(INTRO_REVEAL_EVENT, start, { once: true });
        const fallback = setTimeout(start, 5000);
        return () => {
          window.removeEventListener(INTRO_REVEAL_EVENT, start);
          clearTimeout(fallback);
        };
      });

      return () => mm.revert();
    },
    { scope: rootRef }
  );

  return (
    <section
      ref={rootRef}
      id="hero"
      className={`relative flex min-h-[100dvh] flex-col items-center overflow-hidden px-4 pt-32 sm:px-6 sm:pt-40 ${HERO_PEEK_PAD}`}
    >
      <HeroParallax />
      <div className="relative mx-auto flex max-w-[640px] flex-col items-center text-center">
        <span
          data-hero-item
          className="mb-6 inline-flex items-center gap-2 rounded-pill bg-surface px-4 py-2 text-sm text-ink-muted shadow-ring"
        >
          <span className="h-1.5 w-1.5 rounded-pill bg-brand" aria-hidden="true" />
          Waitlist is open
        </span>
        <h1 data-hero-item className="text-balance text-h1 text-ink">
          Every spend.
          <br />
          Zero typing.
        </h1>
        <p data-hero-item className="mt-6 max-w-[34rem] text-lead text-ink-muted">
          Type it, say it, snap a statement, or just do nothing. Raqm logs it for you. Nothing ever leaves your phone.
        </p>
        <div data-hero-item className="mt-8">
          <AppStoreBadges />
        </div>
        <p data-hero-item className="mt-8 text-sm text-ink-subtle">
          <span className="font-mono font-medium text-ink">120+</span> Indian and international banks supported
        </p>
      </div>
      <TxTicker className="absolute inset-x-0 bottom-[calc(min(36dvh,340px)-1rem)]" />
    </section>
  );
}
