'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function ScrollLift({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          ref.current,
          { y: 140, scale: 0.9, rotateX: 14, transformPerspective: 1400, transformOrigin: '50% 0%' },
          {
            y: 0,
            scale: 1,
            rotateX: 0,
            ease: 'none',
            scrollTrigger: { trigger: ref.current, start: 'top bottom', end: 'top 30%', scrub: true },
          }
        );
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(ref.current, { clearProps: 'transform' });
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
