'use client';

import { ViewTransition } from 'react';
import { useRef } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Link from 'next/link';
import { featureDeepDives, FEATURE_CARD_VARIANTS, featureViewTransitionName } from '@/lib/features-data';

gsap.registerPlugin(ScrollTrigger);

const COUNT = featureDeepDives.length;
const LAST_FEATURE_KEY = 'raqm:lastFeature';
const END_HOLD = 480;

const CARD_SHAPES = [
  { w: 'w-[25.5rem]', h: 'h-[22.1rem]', tiltZ: -2.5, tiltY: 2, offsetY: 0 },
  { w: 'w-[20.4rem]', h: 'h-[28.9rem]', tiltZ: 2.5, tiltY: -2, offsetY: 64 },
  { w: 'w-[22.95rem]', h: 'h-[25.5rem]', tiltZ: -2, tiltY: 2, offsetY: 128 },
] as const;

function counterLabel(index: number) {
  return `${String(index + 1).padStart(2, '0')} / ${String(COUNT).padStart(2, '0')}`;
}

export function FlagshipStrip() {
  const pinRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const track = trackRef.current;
        const pin = pinRef.current;
        if (!track || !pin) return;

        const getDistance = () => Math.max(0, track.scrollWidth - pin.offsetWidth);

        if (getDistance() < 40) {
          return;
        }

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: pin,
            start: 'top top',
            end: () => `+=${getDistance() + END_HOLD}`,
            scrub: 1,
            pin: true,
            invalidateOnRefresh: true,
            onUpdate: () => {
              const dist = getDistance();
              const x = Number(gsap.getProperty(track, 'x')) || 0;
              const fraction = dist > 0 ? gsap.utils.clamp(0, 1, -x / dist) : 0;
              const index = Math.round(fraction * (COUNT - 1));
              if (counterRef.current) counterRef.current.textContent = counterLabel(index);
            },
          },
        });

        tl.to(track, { x: () => -getDistance(), ease: 'none', duration: getDistance() }).to({}, { duration: END_HOLD });

        let restoreTimeout: ReturnType<typeof setTimeout> | undefined;
        const returningSlug = sessionStorage.getItem(LAST_FEATURE_KEY);
        if (returningSlug) {
          const index = Math.max(0, featureDeepDives.findIndex((feature) => feature.slug === returningSlug));
          restoreTimeout = setTimeout(() => {
            ScrollTrigger.refresh();
            const st = tl.scrollTrigger;
            if (!st) return;
            st.scroll(st.start + (index / (COUNT - 1)) * getDistance());
            sessionStorage.removeItem(LAST_FEATURE_KEY);
          }, 0);
        }

        return () => {
          clearTimeout(restoreTimeout);
          tl.scrollTrigger?.kill();
          tl.kill();
        };
      });

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set(trackRef.current, { x: 0 });
      });

      return () => mm.revert();
    },
    { scope: pinRef }
  );

  return (
    <div id="features" className="relative">
      <div ref={pinRef} className="relative h-[100vh] overflow-hidden motion-reduce:h-auto motion-reduce:overflow-x-auto">
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 mx-auto flex max-w-6xl items-end justify-between px-4 pt-12 sm:px-6 sm:pt-16">
          <div>
            <span className="mb-3 block font-mono text-xs text-ink-label opacity-60">04 / 05</span>
            <h2 className="text-balance font-display text-4xl text-ink-headline sm:text-5xl">Features</h2>
          </div>
          <span ref={counterRef} className="font-mono text-sm text-ink-label">
            {counterLabel(0)}
          </span>
        </div>
        <div className="flex h-full items-center" style={{ perspective: '1800px' }}>
          <div
            ref={trackRef}
            className="flex items-center gap-6 pl-[max(1rem,calc((100vw-72rem)/2+1rem))] pr-16 motion-reduce:w-max motion-reduce:snap-x motion-reduce:pt-32"
          >
            {featureDeepDives.map((feature, index) => {
              const variant = FEATURE_CARD_VARIANTS[index % FEATURE_CARD_VARIANTS.length];
              const shape = CARD_SHAPES[index % CARD_SHAPES.length];
              const isLive = feature.status === 'live';
              return (
                <Link
                  key={feature.slug}
                  href={`/features/${feature.slug}`}
                  onClick={() => sessionStorage.setItem(LAST_FEATURE_KEY, feature.slug)}
                  className={`group flex shrink-0 flex-col ${shape.w} ${shape.h} motion-reduce:snap-center`}
                  style={{
                    transform: `translateY(${shape.offsetY}px) rotateZ(${shape.tiltZ}deg) rotateY(${shape.tiltY}deg)`,
                  }}
                >
                  <ViewTransition name={featureViewTransitionName(feature.slug)} share="morph" default="none">
                    <div
                      className={`relative flex h-full flex-col rounded-[20px] border p-7 pb-9 shadow-[0_20px_45px_-20px_rgba(20,20,15,0.35)] transition-transform duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary group-hover:-translate-y-2 group-active:translate-y-0 group-active:scale-[0.99] sm:p-9 ${variant.bandBg}`}
                    >
                      <span className={`absolute right-5 top-5 font-mono text-xs opacity-50 ${variant.title}`}>
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className={`w-fit rounded-full px-3 py-1 font-body text-xs font-medium ${isLive ? variant.badgeLive : variant.badgeMuted}`}>
                        {feature.statusLabel}
                      </span>
                      <h3 className={`mt-6 font-display text-3xl leading-tight sm:text-4xl ${variant.title}`}>{feature.name}</h3>
                      <p className={`mt-3 max-w-xs font-body text-base ${variant.body}`}>{feature.tagline}</p>
                      <span className={`mt-auto pt-8 font-body text-sm font-medium ${variant.cta}`}>Read more →</span>
                    </div>
                  </ViewTransition>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
