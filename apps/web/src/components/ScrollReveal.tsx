'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function ScrollReveal({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from(ref.current, {
          opacity: 0,
          y: 24,
          duration: 0.6,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: ref.current,
            start: 'top 85%',
            once: true,
          },
        });
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(ref.current, { opacity: 1, y: 0 });
      });

      return () => mm.revert();
    },
    { scope: ref }
  );

  return (
    <div ref={ref} id={id} className={className}>
      {children}
    </div>
  );
}
