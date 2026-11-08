'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import gsap from 'gsap';

type Props = { scrollerRef: RefObject<HTMLElement | null> };

export function ScrollHint({ scrollerRef }: Props) {
  const [phase, setPhase] = useState<'idle' | 'on' | 'fading' | 'gone'>('idle');
  const arrow = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    let dismissed = false;
    const measure = () => {
      if (dismissed) return;
      setPhase(el.scrollWidth > el.clientWidth + 1 ? 'on' : 'idle');
    };
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      setPhase((p) => (p === 'on' ? 'fading' : 'gone'));
    };
    const onScroll = () => {
      if (el.scrollLeft > 24) dismiss();
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('touchstart', dismiss, { passive: true });
    el.addEventListener('pointerdown', dismiss, { passive: true });
    return () => {
      ro.disconnect();
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('touchstart', dismiss);
      el.removeEventListener('pointerdown', dismiss);
    };
  }, [scrollerRef]);

  useEffect(() => {
    if (phase !== 'fading') return;
    const t = window.setTimeout(() => setPhase('gone'), 200);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    const node = arrow.current;
    if (!node || phase !== 'on') return;
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.to(node, { x: 6, duration: 0.7, ease: 'sine.inOut', repeat: -1, yoyo: true });
    });
    return () => mm.revert();
  }, [phase]);

  if (phase === 'idle' || phase === 'gone') return null;

  return (
    <div aria-hidden="true" className="pointer-events-none sticky left-0 h-0 w-full lg:hidden">
      <span
        className={`absolute top-2 right-0 inline-flex h-8 items-center gap-1.5 rounded-pill bg-surface pr-2.5 pl-3.5 text-sm font-medium leading-none tracking-[-0.01em] text-ink shadow-2 ring-1 ring-line transition-opacity duration-200 ease-(--ease-standard) ${
          phase === 'fading' ? 'opacity-0' : 'opacity-100'
        }`}
      >
        Swipe
        <svg ref={arrow} viewBox="0 0 16 16" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </span>
    </div>
  );
}
