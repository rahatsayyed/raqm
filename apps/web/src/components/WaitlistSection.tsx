'use client';

import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { WaitlistForm } from './WaitlistForm';
import { ScrollReveal } from './ScrollReveal';

gsap.registerPlugin(ScrollTrigger);

const BOX_H = 320;
const REST_Y = BOX_H;
const MAX_RISE_DESKTOP = 115;
const MAX_RISE_MOBILE = 55;
const VELOCITY_DIVISOR = 12;

function WaveDivider({ sectionRef }: { sectionRef: React.RefObject<HTMLDivElement | null> }) {
  const pathRef = useRef<SVGPathElement>(null);
  const rise = useRef({ value: 0 });
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      const applyRise = () => {
        const midY = REST_Y - 2 * rise.current.value;
        pathRef.current?.setAttribute('d', `M0,${REST_Y} Q600,${midY} 1200,${REST_Y} L1200,${BOX_H} L0,${BOX_H} Z`);
      };

      mm.add(
        {
          isMobile: '(max-width: 639px)',
          isDesktop: '(min-width: 640px)',
          reduceMotion: '(prefers-reduced-motion: reduce)',
        },
        (context) => {
          const { isMobile, reduceMotion } = context.conditions as { isMobile: boolean; reduceMotion: boolean };

          if (reduceMotion) {
            rise.current.value = 0;
            applyRise();
            return;
          }

          const maxRise = isMobile ? MAX_RISE_MOBILE : MAX_RISE_DESKTOP;

          const st = ScrollTrigger.create({
            trigger: sectionRef.current,
            start: 'top bottom+=200',
            end: 'bottom top',
            onUpdate: (self) => {
              const velocity = Math.abs(self.getVelocity());
              const target = gsap.utils.clamp(0, maxRise, velocity / VELOCITY_DIVISOR);

              gsap.to(rise.current, {
                value: target,
                duration: 0.15,
                ease: 'power2.out',
                overwrite: true,
                onUpdate: applyRise,
              });

              if (idleTimer.current) clearTimeout(idleTimer.current);
              idleTimer.current = setTimeout(() => {
                gsap.to(rise.current, {
                  value: 0,
                  duration: 1.2,
                  ease: 'elastic.out(1, 0.4)',
                  overwrite: true,
                  onUpdate: applyRise,
                });
              }, 100);
            },
          });

          return () => {
            if (idleTimer.current) clearTimeout(idleTimer.current);
            st.kill();
          };
        }
      );

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 1200 ${BOX_H}`}
      preserveAspectRatio="none"
      className="pointer-events-none absolute inset-x-0 z-0 w-full"
      style={{ top: -BOX_H, height: BOX_H }}
    >
      <path ref={pathRef} d={`M0,${REST_Y} Q600,${REST_Y} 1200,${REST_Y} L1200,${BOX_H} L0,${BOX_H} Z`} fill="var(--color-accent-primary)" />
    </svg>
  );
}

export function WaitlistSection() {
  const sectionRef = useRef<HTMLDivElement>(null);

  return (
    <div id="waitlist" ref={sectionRef} className="relative mt-32 bg-accent-primary sm:mt-48">
      <WaveDivider sectionRef={sectionRef} />
      <ScrollReveal className="relative z-10 mx-auto max-w-3xl px-6 pb-20 pt-12 text-left sm:pt-16">
        <span className="mb-3 block font-mono text-xs text-[color-mix(in_srgb,var(--color-surface)_60%,transparent)]">05 / 05</span>
        <h2 className="mb-3 text-balance font-display text-4xl text-surface sm:text-5xl">Get early access</h2>
        <p className="mb-8 max-w-md font-body text-base text-[color-mix(in_srgb,var(--color-surface)_82%,transparent)]">
          We’ll email you the moment Raqm is ready to install. Nothing else, no spam.
        </p>
        <div className="rounded-outer border border-[color-mix(in_srgb,var(--color-surface)_16%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_8%,transparent)] p-8 sm:p-12">
          <WaitlistForm source="home_waitlist_section" tone="dark" />
        </div>
      </ScrollReveal>
    </div>
  );
}
