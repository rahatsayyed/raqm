'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WaitlistForm } from './WaitlistForm';
import { ScrollReveal } from './ScrollReveal';

gsap.registerPlugin(ScrollTrigger);

export function WaitlistSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          glowRef.current,
          { scale: 0.3, opacity: 0.12 },
          {
            scale: 1,
            opacity: 0.55,
            ease: 'none',
            scrollTrigger: {
              trigger: sectionRef.current,
              start: 'top bottom',
              end: 'top center',
              scrub: true,
            },
          }
        );
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(glowRef.current, { scale: 1, opacity: 0.35 });
      });

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  return (
    <div ref={sectionRef} className="relative overflow-hidden">
      <div
        ref={glowRef}
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[26rem] w-[26rem] -translate-x-1/2 -translate-y-1/3 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--color-accent-primary)_35%,transparent)_0%,transparent_70%)] blur-[60px]"
      />
      <ScrollReveal className="relative mx-auto max-w-3xl px-6 pb-20 pt-12 text-left sm:pt-16">
        <div className="glass-card p-8 sm:p-12">
          <span className="mb-3 block font-mono text-xs text-ink-label opacity-40">04 / 04</span>
          <h2 className="mb-3 text-balance font-display text-2xl text-ink-headline sm:text-3xl">Get early access</h2>
          <p className="mb-6 font-body text-base text-ink-body">
            We’ll email you the moment Raqm is ready to install. Nothing else, no spam.
          </p>
          <WaitlistForm source="home_waitlist_section" />
        </div>
      </ScrollReveal>
    </div>
  );
}
