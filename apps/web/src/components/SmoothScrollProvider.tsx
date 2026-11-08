'use client';

import { useEffect } from 'react';
import type Lenis from 'lenis';

export let lenisInstance: Lenis | null = null;

export function scrollToHash(hash: string) {
  const target = document.querySelector(hash);
  if (!target) return;

  history.pushState(null, '', hash);
  if (lenisInstance) {
    lenisInstance.scrollTo(target as HTMLElement, { duration: 2.2 });
  } else {
    target.scrollIntoView({ behavior: 'smooth' });
  }
}

export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      return;
    }

    let cancelled = false;
    let cleanup: (() => void) | undefined;

    const start = async () => {
      const [{ default: LenisCtor }, { default: gsap }, { ScrollTrigger }] = await Promise.all([
        import('lenis'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
      ]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);

      const lenis = new LenisCtor({ duration: 1.1, smoothWheel: true });
      lenisInstance = lenis;

      const onTick = (time: number) => lenis.raf(time * 1000);
      gsap.ticker.add(onTick);
      gsap.ticker.lagSmoothing(0);
      lenis.on('scroll', ScrollTrigger.update);

      cleanup = () => {
        gsap.ticker.remove(onTick);
        lenis.destroy();
        lenisInstance = null;
      };
    };

    const hasRic = 'requestIdleCallback' in window;
    const handle = hasRic ? window.requestIdleCallback(() => void start(), { timeout: 2000 }) : window.setTimeout(() => void start(), 300);

    return () => {
      cancelled = true;
      if (hasRic) window.cancelIdleCallback(handle);
      else clearTimeout(handle);
      cleanup?.();
    };
  }, []);

  return <>{children}</>;
}
