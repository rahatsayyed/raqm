'use client';

import { ViewTransition } from 'react';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { featureDeepDives, featureViewTransitionName } from '@/lib/features-data';
import { ScrollReveal } from './ScrollReveal';
import { anton } from '@/app/fonts';

const LAST_FEATURE_KEY = 'raqm:lastFeature';
const HOVER_CAPABLE_QUERY = '(hover: hover) and (pointer: fine)';
// Ghost-outline/solid-fill mechanics (stroke width, -16px/0 offset, the 0.65s plain-ease toggle, the
// 52%-viewport/40%-row-height focus anchor) copied from hauntedbouldercity.com's "YOU'LL LEARN ABOUT"
// section, incl. its zigzag column stagger on desktop; colors inverted from their cream-on-dark to
// ink-on-light for legibility here. That reference uses plain `ease` for this repeatable toggle, not
// the entrance-reveal's cubic-bezier — the two are different animations there, kept separate here too.
// not-italic: the reference's reveal type is upright; keeping Raqm's italic font-display here made the
// text-stroke ghost outline visibly drift from the solid glyph position (the slanted left-bearing doesn't
// stroke identically to the fill) — upright avoids that mismatch.
const GHOST_STROKE = '[-webkit-text-stroke-color:color-mix(in_srgb,var(--color-ink-headline)_30%,transparent)]';
// Local gutter between the accent bar (absolute left-0) and the heading content — constant across
// breakpoints, independent of the grid stagger (which shifts the whole row, not this inner gap).
const GUTTER = 'pl-8';

export function FlagshipStripVertical() {
  const listRef = useRef<HTMLOListElement>(null);
  const rowRefs = useRef<Array<HTMLLIElement | null>>([]);
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

  useEffect(() => {
    let raf = 0;
    const handleScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
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
      });
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Restore scroll position to the feature the visitor was last viewing.
  useEffect(() => {
    const returningSlug = sessionStorage.getItem(LAST_FEATURE_KEY);
    if (!returningSlug) return;
    const index = featureDeepDives.findIndex((feature) => feature.slug === returningSlug);
    sessionStorage.removeItem(LAST_FEATURE_KEY);
    if (index < 0) return;
    requestAnimationFrame(() => {
      rowRefs.current[index]?.scrollIntoView({ block: 'center' });
    });
  }, []);

  return (
    <ScrollReveal id="features" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <span className="mb-3 block font-mono text-xs text-ink-label opacity-60">04 / 05</span>
      <h2 className="mb-10 text-balance font-display text-4xl text-ink-headline sm:text-5xl">Features</h2>
      <ol ref={listRef} className="relative flex flex-col [overflow-anchor:none] lg:grid lg:grid-cols-12 lg:gap-x-8">
        {featureDeepDives.map((feature, index) => {
          const isActive = index === activeIndex;
          const isLive = feature.status === 'live';
          // Zigzag stagger (hauntedbouldercity.com's `.topic:nth-child(2n)` on a 12-col grid): every other
          // row starts two columns further right, desktop-only — collapses to a plain stack below `lg`.
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
                className="group block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
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
                      <span
                        className={`w-fit rounded-full px-3 py-1 font-body text-xs font-medium ${
                          isLive ? 'bg-accent-deep text-accent-primary' : 'bg-surface-raised text-ink-label'
                        }`}
                      >
                        {feature.statusLabel}
                      </span>
                    </div>
                    <h3
                      className={`not-italic uppercase mt-2 font-[family-name:var(--font-anton)] text-4xl leading-[1.04] tracking-normal transition-[color,-webkit-text-stroke-color,transform] duration-[650ms] ease-[ease] -translate-x-4 group-hover:translate-x-0 sm:text-6xl lg:text-8xl [-webkit-text-stroke-width:1px] ${GHOST_STROKE} motion-reduce:transition-none motion-reduce:translate-x-0 ${
                        isActive ? 'text-ink-headline [-webkit-text-stroke-color:transparent]' : 'text-transparent'
                      }`}
                    >
                      {feature.name}
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
