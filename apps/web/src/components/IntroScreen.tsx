'use client';

import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const SEEN_KEY = 'raqm-intro';
export const INTRO_REVEAL_EVENT = 'raqm-intro-reveal';
const FONT_WAIT_MS = 1200;
const FAILSAFE_MS = 4500;

export function IntroScreen() {
  const rootRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const lineRef = useRef<HTMLSpanElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const top = topRef.current;
    const bottom = bottomRef.current;
    const line = lineRef.current;
    const word = wordRef.current;
    const html = document.documentElement;
    if (!root || !top || !bottom || !line || !word) return;

    if (html.dataset.intro !== 'play') {
      root.style.display = 'none';
      return;
    }

    try {
      sessionStorage.setItem(SEEN_KEY, '1');
    } catch {}

    let cancelled = false;
    let revealed = false;
    let tl: gsap.core.Timeline | undefined;

    const reveal = () => {
      if (revealed) return;
      revealed = true;
      html.dataset.intro = 'reveal';
      window.dispatchEvent(new Event(INTRO_REVEAL_EVENT));
    };

    const finish = () => {
      reveal();
      html.dataset.intro = 'done';
      root.style.display = 'none';
    };

    const speedUp = () => tl?.timeScale(3);
    window.addEventListener('pointerdown', speedUp, { once: true });
    window.addEventListener('keydown', speedUp, { once: true });

    const failsafe = setTimeout(() => {
      tl?.kill();
      finish();
    }, FAILSAFE_MS);

    Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, FONT_WAIT_MS))]).then(() => {
      if (cancelled) return;
      tl = gsap
        .timeline({
          onComplete: () => {
            clearTimeout(failsafe);
            finish();
          },
        })
        .fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'expo.out' }, 0)
        .fromTo(word, { yPercent: 135, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.75, ease: 'expo.out' }, 0.12)
        .to(line, { opacity: 0, duration: 0.2, ease: 'power2.out' }, 1.0)
        .call(reveal, [], 1.0)
        .to(top, { yPercent: -100, duration: 0.7, ease: 'power4.inOut' }, 1.0)
        .to(bottom, { yPercent: 100, duration: 0.7, ease: 'power4.inOut' }, 1.0);
    });

    return () => {
      cancelled = true;
      clearTimeout(failsafe);
      tl?.kill();
      window.removeEventListener('pointerdown', speedUp);
      window.removeEventListener('keydown', speedUp);
    };
  }, []);

  return (
    <div ref={rootRef} aria-hidden="true" className="intro-overlay pointer-events-none fixed inset-0">
      <div
        ref={topRef}
        className="absolute inset-x-0 top-0 flex h-[calc(50dvh+1px)] items-end justify-center bg-accent-primary pb-3"
      >
        <div className="overflow-hidden px-4 pb-[0.2em]">
          <span
            ref={wordRef}
            translate="no"
            style={{ visibility: 'hidden' }}
            className="block font-display text-[clamp(4.5rem,22vw,11rem)] leading-[1.05] text-accent-deep"
          >
            Raqm
          </span>
        </div>
      </div>
      <div ref={bottomRef} className="absolute inset-x-0 bottom-0 h-[calc(50dvh+1px)] bg-accent-primary" />
      <span
        ref={lineRef}
        style={{ transform: 'scaleX(0)' }}
        className="absolute left-6 right-6 top-1/2 h-px origin-center bg-accent-deep/60 sm:left-12 sm:right-12"
      />
    </div>
  );
}
