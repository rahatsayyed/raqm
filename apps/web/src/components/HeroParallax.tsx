'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function HeroParallax() {
  const containerRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const midRef = useRef<HTMLDivElement>(null);
  const frontRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const layers = [
          { el: backRef.current, scrollShift: 50, mouseAmt: 6 },
          { el: midRef.current, scrollShift: -80, mouseAmt: 16 },
          { el: frontRef.current, scrollShift: 130, mouseAmt: 30 },
        ] as const;

        layers.forEach(({ el, scrollShift }) => {
          gsap.to(el, {
            y: scrollShift,
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
        gsap.set([backRef.current, midRef.current, frontRef.current], { x: 0, y: 0 });
      });

      return () => mm.revert();
    },
    { scope: containerRef }
  );

  return (
    <div ref={containerRef} aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        ref={backRef}
        className="absolute -right-16 -top-16 h-52 w-72 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-primary)_22%,transparent)_0%,color-mix(in_srgb,var(--color-accent-primary)_6%,transparent)_45%,transparent_70%)] blur-[40px]"
        style={{ maskImage: 'radial-gradient(circle, black 45%, transparent 75%)', WebkitMaskImage: 'radial-gradient(circle, black 45%, transparent 75%)' }}
      />
      <div
        ref={midRef}
        className="glass-card-flat absolute -right-2 top-10 h-28 w-40 rotate-6 bg-[color-mix(in_srgb,var(--color-notice)_20%,var(--glass-bg-flat))] opacity-40"
      />
      <div
        ref={frontRef}
        className="glass-card-flat absolute right-24 -top-4 h-14 w-14 !rounded-full bg-[color-mix(in_srgb,var(--color-accent-primary)_26%,var(--glass-bg-flat))] opacity-60"
      />
    </div>
  );
}
