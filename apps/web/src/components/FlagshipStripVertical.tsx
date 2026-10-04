'use client';

import { ViewTransition } from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { featureDeepDives, featureViewTransitionName } from '@/lib/features-data';
import { ScrollReveal } from './ScrollReveal';
import { lenisInstance } from './SmoothScrollProvider';

gsap.registerPlugin(ScrollTrigger);

const LAST_FEATURE_KEY = 'raqm:lastFeature';
const HOVER_CAPABLE_QUERY = '(hover: hover) and (pointer: fine)';
// Ghost-outline/solid-fill reveal and the 52%/40% scroll-focus anchor are copied from hauntedbouldercity.com's "YOU'LL LEARN ABOUT" section.
const GHOST_STROKE = '[-webkit-text-stroke-color:color-mix(in_srgb,var(--color-ink-headline)_30%,transparent)]';
// Local gutter between the accent bar (absolute left-0) and the heading — independent of the grid stagger below.
const GUTTER = 'pl-8';
// Edge blur: a HEADING (not its row) blurs only while its own center sits in the top/bottom 10% of the viewport.
const EDGE_BAND = 0.1;
const EDGE_BLUR_PX = 2;

export function FlagshipStripVertical() {
  const listRef = useRef<HTMLOListElement>(null);
  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
  const headingRefs = useRef<Array<HTMLHeadingElement | null>>([]);
  const centerIndexRef = useRef(0);
  const hoveringRef = useRef(false);
  const revertTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleRowEnter = (index: number) => {
    if (!window.matchMedia(HOVER_CAPABLE_QUERY).matches) return;
    if (revertTimeoutRef.current) clearTimeout(revertTimeoutRef.current);
    hoveringRef.current = true;
    setActiveIndex(index);
  };

  const handleRowLeave = () => {
    if (!window.matchMedia(HOVER_CAPABLE_QUERY).matches) return;
    hoveringRef.current = false;
    revertTimeoutRef.current = setTimeout(() => {
      if (!hoveringRef.current) setActiveIndex(centerIndexRef.current);
    }, 60);
  };

  const headingQuickToRef = useRef<Array<((value: number) => void) | null>>([]);
  const activeIndexAnimRef = useRef<number | null>(null);

  useEffect(() => {
    // quickTo (not a CSS transition) because activeIndex can flip on every scroll frame — a CSS transition toggled that fast restarts its eased curve from near-zero velocity each time, reading as stutter instead of one continuous glide.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const prevIndex = activeIndexAnimRef.current;
    activeIndexAnimRef.current = activeIndex;
    if (prevIndex === null) {
      headingRefs.current.forEach((heading, i) => {
        if (!heading) return;
        headingQuickToRef.current[i] = gsap.quickTo(heading, 'x', { duration: 0.9, ease: 'power2.out' });
        gsap.set(heading, { x: reduceMotion || i === activeIndex ? 0 : -16 });
      });
      return;
    }
    if (prevIndex === activeIndex || reduceMotion) return;
    headingQuickToRef.current[prevIndex]?.(-16);
    headingQuickToRef.current[activeIndex]?.(0);
  }, [activeIndex]);

  useEffect(() => {
    return () => {
      headingRefs.current.forEach((heading) => heading && gsap.killTweensOf(heading));
    };
  }, []);

  useEffect(() => {
    // Recompute runs through gsap.ticker (same clock SmoothScrollProvider drives Lenis/ScrollTrigger with)
    // so it's frame-synced with the rest of the page's motion — but only on frames following an actual
    // scroll, via the dirty flag. Running the body (and its unconditional style.filter writes) on every
    // single tick forever, including while idle, fought the CSS transition on these same elements.
    let dirty = true;
    const lastFilter: Array<string> = [];
    const run = () => {
      if (hoveringRef.current) return;
      const list = listRef.current;
      if (!list) return;
      const listRect = list.getBoundingClientRect();
      if (listRect.bottom < 0 || listRect.top > window.innerHeight) return;
      // 52%/40% (not a plain 50/50 center match) is hauntedbouldercity.com's own focus anchor for this list.
      const focus = window.innerHeight * 0.52;
      let closest = centerIndexRef.current;
      let closestDist = Infinity;
      rowRefs.current.forEach((el, i) => {
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const dist = Math.abs(rect.top + rect.height * 0.4 - focus);
        if (dist < closestDist) {
          closestDist = dist;
          closest = i;
        }
      });
      if (closest !== centerIndexRef.current) {
        centerIndexRef.current = closest;
        setActiveIndex(closest);
      }
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      headingRefs.current.forEach((heading, i) => {
        if (!heading) return;
        let next = '';
        if (!reduceMotion) {
          // Measured off the heading itself, not its (much taller) row — otherwise the fraction tracks a
          // point 100-200px off from where the text actually sits, and the blur band drifts into the middle.
          const rect = heading.getBoundingClientRect();
          const fraction = (rect.top + rect.height / 2) / window.innerHeight;
          let blur = 0;
          if (fraction < EDGE_BAND) {
            blur = EDGE_BLUR_PX * Math.min(1, Math.max(0, 1 - fraction / EDGE_BAND));
          } else if (fraction > 1 - EDGE_BAND) {
            blur = EDGE_BLUR_PX * Math.min(1, Math.max(0, (fraction - (1 - EDGE_BAND)) / EDGE_BAND));
          }
          next = blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : '';
        }
        if (lastFilter[i] !== next) {
          lastFilter[i] = next;
          heading.style.filter = next;
        }
      });
    };
    const markDirty = () => {
      dirty = true;
    };
    const tick = () => {
      if (!dirty) return;
      dirty = false;
      run();
    };
    window.addEventListener('scroll', markDirty, { passive: true });
    gsap.ticker.add(tick);
    run();
    return () => {
      window.removeEventListener('scroll', markDirty);
      gsap.ticker.remove(tick);
    };
  }, []);

  // Restore scroll position and active color to the feature the visitor was last viewing.
  useEffect(() => {
    const returningSlug = sessionStorage.getItem(LAST_FEATURE_KEY);
    if (!returningSlug) return;
    const index = featureDeepDives.findIndex((feature) => feature.slug === returningSlug);
    sessionStorage.removeItem(LAST_FEATURE_KEY);
    if (index < 0) return;
    centerIndexRef.current = index;
    setActiveIndex(index);
    // setTimeout(0), not rAF, and deliberately no cleanup/clearTimeout: other sections' GSAP pins
    // haven't inserted their spacer height yet on mount, and StrictMode's dev-mode double-invoke
    // already clears sessionStorage on its first pass — a cleanup here would cancel the one restore.
    setTimeout(() => {
      ScrollTrigger.refresh();
      const el = rowRefs.current[index];
      if (!el) return;
      // Same target scrollIntoView({ block: 'center' }) would compute, handed to Lenis to keep it in sync.
      const rect = el.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - (window.innerHeight - rect.height) / 2;
      if (lenisInstance) {
        // Lenis persists across navigations with a stale content-height limit from the shorter deep-dive
        // page; without resize() it clamps targetY down to that limit instead of reaching this row.
        lenisInstance.resize();
        lenisInstance.scrollTo(targetY, { immediate: true });
      } else {
        el.scrollIntoView({ block: 'center' });
      }
    }, 0);
  }, []);

  return (
    <ScrollReveal id="features" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <span className="mb-3 block font-mono text-xs text-ink-label opacity-60">04 / 05</span>
      <h2 className="mb-10 text-balance font-display text-4xl text-ink-headline sm:text-5xl">Features</h2>
      <ol ref={listRef} className="relative flex flex-col [overflow-anchor:none] lg:grid lg:grid-cols-12 lg:gap-x-8">
        {featureDeepDives.map((feature, index) => {
          const isActive = index === activeIndex;
          const isLive = feature.status === 'live';
          // Zigzag stagger (reference's `.topic:nth-child(2n)`): even rows shift right on desktop only.
          const isStaggered = index % 2 === 1;
          return (
            <li
              key={feature.slug}
              ref={(el) => {
                rowRefs.current[index] = el;
              }}
              onMouseEnter={() => handleRowEnter(index)}
              onMouseLeave={handleRowLeave}
              className={`border-b border-border-subtle lg:col-span-10 lg:border-b-0 ${isStaggered ? 'lg:col-start-3' : 'lg:col-start-1'}`}
            >
              <Link
                href={`/features/${feature.slug}`}
                onClick={() => sessionStorage.setItem(LAST_FEATURE_KEY, feature.slug)}
                className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
              >
                <ViewTransition name={featureViewTransitionName(feature.slug)} share="morph" default="none">
                  <div className={`relative py-9 ${GUTTER} pr-4 sm:py-12 sm:pr-6`}>
                    <span
                      className={`pointer-events-none absolute left-0 top-1 w-0.5 bg-accent-primary transition-[height,opacity] duration-700 ease-in-out ${
                        isActive ? 'h-[calc(100%-0.5rem)] opacity-100' : 'h-6 opacity-30'
                      }`}
                    />
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs text-accent-primary sm:text-sm">{String(index + 1).padStart(2, '0')} /</span>
                    </div>
                    <h3
                      ref={(el) => {
                        headingRefs.current[index] = el;
                      }}
                      className="not-italic uppercase mt-2 font-[family-name:var(--font-anton)] text-4xl leading-[1.04] tracking-normal sm:text-6xl lg:text-8xl [will-change:transform]"
                    >
                      {/* Split from the h3 so this span's paint-heavy stroke-color repaint can't block the h3's transform compositing. */}
                      <span
                        className={`[-webkit-text-stroke-width:1px] ${GHOST_STROKE} [transition:color_900ms_cubic-bezier(0.4,0,0.2,1),-webkit-text-stroke-color_900ms_cubic-bezier(0.4,0,0.2,1)] motion-reduce:transition-none ${
                          isActive ? 'text-ink-headline [-webkit-text-stroke-color:transparent]' : 'text-transparent'
                        }`}
                      >
                        {feature.name}
                      </span>
                    </h3>
                    <p className="mt-4 max-w-xl font-body text-base text-ink-body sm:text-lg">{feature.tagline}</p>
                    <span className="mt-5 inline-block font-body text-sm font-medium text-accent-primary">Read more →</span>
                  </div>
                </ViewTransition>
              </Link>
            </li>
          );
        })}
      </ol>
    </ScrollReveal>
  );
}
