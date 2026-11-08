'use client';

import { useRef, type ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

export function ToolsMotion({ children, className }: { children: ReactNode; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('[data-reveal]', { y: 14, opacity: 0, duration: 0.65, ease: 'expo.out', stagger: 0.07, clearProps: 'transform,opacity' });
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-reveal]', { clearProps: 'all' });
      });
      return () => mm.revert();
    },
    { scope: root },
  );
  return (
    <div ref={root} className={className}>
      {children}
    </div>
  );
}
