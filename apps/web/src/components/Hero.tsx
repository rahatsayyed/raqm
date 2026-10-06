'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { AppStoreBadges } from './AppStoreBadges';
import { HeroParallax } from './HeroParallax';
import { INTRO_REVEAL_EVENT } from './IntroScreen';
import { TxTicker } from './TxTicker';

export function Hero() {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    const title = titleRef.current;
    const line = lineRef.current;
    if (!title || !line) return;

    const mm = gsap.matchMedia();

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const restWidth = line.getBoundingClientRect().width;
      const titleWidth = title.getBoundingClientRect().width;

      const introPending = document.documentElement.dataset.intro === 'play';

      gsap.set(line, { width: 2 });
      const tl = gsap
        .timeline({ paused: introPending, delay: 0.2, onComplete: () => gsap.set(line, { clearProps: 'width' }) })
        .to(line, { width: titleWidth, duration: 0.9, ease: 'power2.out' })
        .to(line, { width: restWidth, duration: 0.8, ease: 'power2.inOut' }, '+=0.1');

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
  });

  return (
    <>
      <section id="hero" className="relative overflow-hidden px-4 pb-16 pt-20 sm:px-6 sm:pb-20 sm:pt-28">
        <HeroParallax />
        <div className="relative mx-auto flex max-w-4xl flex-col items-center text-center">
          <span className="mb-8 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface/70 px-4 py-2 font-body text-sm text-ink-body">
            <svg viewBox="0 0 24 24" className="h-4 w-4 text-ink-label" aria-hidden="true">
              <rect x="7" y="3" width="10" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
              <path d="M11 18h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
             Waitlist is open
          </span>
          <h1
            ref={titleRef}
            className="font-display text-[3.4rem] leading-[0.95] tracking-tight text-ink-headline sm:text-8xl lg:text-[8.5rem]"
          >
            <span className="block">Every spend.</span>
            <span className="block">Zero typing.</span>
          </h1>
          <div aria-hidden="true" className="mt-9 flex gap-4 sm:mt-11 sm:gap-6">
            <span ref={lineRef} className="h-px w-24 rounded-full bg-black sm:w-36" />
          </div>
          <p className="mt-9 max-w-xl font-body text-lg text-ink-body sm:mt-11 sm:text-xl">
            Type it, say it, snap a statement, or just do nothing - Raqm logs it for you. Nothing ever leaves your
            phone.
          </p>
          <div className="mt-9">
            <AppStoreBadges />
          </div>
          <p className="mt-2 font-body text-sm text-ink-label">
            <span className="font-mono text-base font-semibold text-accent-primary">120+</span> Indian and international
            banks supported
          </p>
        </div>
      </section>
      <TxTicker />
    </>
  );
}
