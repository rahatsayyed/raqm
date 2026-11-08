'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { cn } from './cn';

export interface MorphingTab {
  id: string;
  label: string;
  panel: React.ReactNode;
}

interface MorphingTabsProps {
  tabs: MorphingTab[];
  value?: number;
  onChange?: (index: number) => void;
  autoplayMs?: number;
  label?: string;
  className?: string;
  panelClassName?: string;
}

const RAIL_H = 80;
const TAB_H = 56;
const INSET = 16;
const JOIN = 24;
const PANEL_R = 28;
const TAB_R = 24;

function liquidPath(left: number, width: number, W: number) {
  const L = left;
  const R = left + width;
  const top = RAIL_H - TAB_H;
  const b = RAIL_H;
  const lj = Math.max(INSET, L - JOIN);
  const rj = Math.min(W - INSET, R + JOIN);
  const ld = Math.min(JOIN, L - lj);
  const rd = Math.min(JOIN, rj - R);
  const lpr = Math.min(PANEL_R, Math.max(0, lj - INSET));
  const rpr = Math.min(PANEL_R, Math.max(0, W - INSET - rj));
  return [
    `M${INSET} ${b + PANEL_R}`,
    `V${b + lpr}`,
    `Q${INSET} ${b} ${INSET + lpr} ${b}`,
    `H${lj}`,
    `C${lj + ld * 0.55} ${b} ${L} ${b - ld + ld * 0.55} ${L} ${b - ld}`,
    `V${top + TAB_R}`,
    `Q${L} ${top} ${L + TAB_R} ${top}`,
    `H${R - TAB_R}`,
    `Q${R} ${top} ${R} ${top + TAB_R}`,
    `V${b - rd}`,
    `C${R} ${b - rd + rd * 0.55} ${rj - rd * 0.55} ${b} ${rj} ${b}`,
    `H${W - INSET - rpr}`,
    `Q${W - INSET} ${b} ${W - INSET} ${b + rpr}`,
    `V${b + PANEL_R}`,
    'Z',
  ].join(' ');
}

export function MorphingTabs({
  tabs,
  value,
  onChange,
  autoplayMs,
  label = 'Tabs',
  className,
  panelClassName,
}: MorphingTabsProps) {
  const [inner, setInner] = useState(0);
  const active = value ?? inner;
  const [shown, setShown] = useState(active);

  const wrapRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const geo = useRef({ left: 0, width: 0 });
  const first = useRef(true);
  const shownFirst = useRef(true);
  const activeRef = useRef(active);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const flags = useRef({ hover: false, focus: false, visible: true });

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const select = useCallback(
    (next: number) => {
      setInner(next);
      onChange?.(next);
    },
    [onChange],
  );

  const draw = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap || !pathRef.current || !svgRef.current) return;
    const W = wrap.offsetWidth;
    svgRef.current.setAttribute('viewBox', `0 0 ${W} ${RAIL_H + PANEL_R}`);
    pathRef.current.setAttribute('d', liquidPath(geo.current.left, geo.current.width, W));
  }, []);

  const measure = useCallback((index: number) => {
    const el = tabRefs.current[index];
    return el ? { left: el.offsetLeft, width: el.offsetWidth } : null;
  }, []);

  useGSAP(
    () => {
      const target = measure(active);
      if (!target) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        if (first.current) {
          geo.current = { ...target };
          draw();
        } else {
          const from = { ...geo.current };
          const k = { t: 0 };
          gsap.to(k, {
            t: 1,
            duration: 0.45,
            ease: 'expo.out',
            onUpdate: () => {
              geo.current = {
                left: from.left + (target.left - from.left) * k.t,
                width: from.width + (target.width - from.width) * k.t,
              };
              draw();
            },
            onComplete: () => {
              geo.current = { ...target };
              draw();
            },
          });
        }
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        geo.current = { ...target };
        draw();
      });
      first.current = false;
      return () => mm.revert();
    },
    { dependencies: [active], scope: wrapRef },
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => {
      const t = measure(activeRef.current);
      if (t) geo.current = { ...t };
      draw();
    });
    ro.observe(wrap);
    let live = true;
    document.fonts?.ready.then(() => {
      if (!live) return;
      const t = measure(activeRef.current);
      if (t) geo.current = { ...t };
      draw();
    });
    return () => {
      live = false;
      ro.disconnect();
    };
  }, [draw, measure]);

  useGSAP(
    () => {
      if (active === shown) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.to(panelRef.current, {
          autoAlpha: 0,
          y: -5,
          filter: 'blur(5px)',
          duration: 0.12,
          ease: 'expo.out',
          overwrite: true,
          onComplete: () => setShown(active),
        });
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.to(panelRef.current, { autoAlpha: 0, duration: 0.12, overwrite: true, onComplete: () => setShown(active) });
      });
      return () => mm.revert();
    },
    { dependencies: [active], scope: wrapRef },
  );

  useGSAP(
    () => {
      if (shownFirst.current) {
        shownFirst.current = false;
        return;
      }
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          panelRef.current,
          { autoAlpha: 0, y: 8, filter: 'blur(6px)' },
          { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.32, ease: 'expo.out', clearProps: 'filter,transform' },
        );
      });
      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.fromTo(panelRef.current, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.12 });
      });
      return () => mm.revert();
    },
    { dependencies: [shown], scope: wrapRef },
  );

  const syncPlay = useCallback(() => {
    const f = flags.current;
    tweenRef.current?.paused(f.hover || f.focus || !f.visible);
  }, []);

  useGSAP(
    () => {
      if (!autoplayMs || !barRef.current) return;
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        tweenRef.current = gsap.fromTo(
          barRef.current,
          { scaleX: 0 },
          {
            scaleX: 1,
            duration: autoplayMs / 1000,
            ease: 'none',
            onComplete: () => select((activeRef.current + 1) % tabs.length),
          },
        );
        syncPlay();
      });
      return () => {
        mm.revert();
        tweenRef.current = null;
      };
    },
    { dependencies: [active, autoplayMs, tabs.length, select, syncPlay], scope: wrapRef },
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap || !autoplayMs) return;
    const io = new IntersectionObserver(
      ([e]) => {
        flags.current.visible = e.isIntersecting;
        syncPlay();
      },
      { threshold: 0.3 },
    );
    io.observe(wrap);
    return () => io.disconnect();
  }, [autoplayMs, syncPlay]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = tabs.length;
    let next = -1;
    if (e.key === 'ArrowRight') next = (active + 1) % n;
    else if (e.key === 'ArrowLeft') next = (active - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next < 0) return;
    e.preventDefault();
    select(next);
    tabRefs.current[next]?.focus();
  };

  const setFlag = (k: 'hover' | 'focus', v: boolean) => {
    flags.current[k] = v;
    syncPlay();
  };

  return (
    <div
      ref={wrapRef}
      className={cn('relative overflow-hidden rounded-card-lg bg-inverse pb-4 text-inverse-ink', className)}
      onPointerEnter={() => setFlag('hover', true)}
      onPointerLeave={() => setFlag('hover', false)}
      onFocus={() => setFlag('focus', true)}
      onBlur={() => setFlag('focus', false)}
    >
      <svg
        ref={svgRef}
        aria-hidden
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-0 w-full text-surface"
        style={{ height: RAIL_H + PANEL_R }}
      >
        <path ref={pathRef} fill="currentColor" />
      </svg>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="relative z-10 flex h-20 items-end gap-1 px-4 sm:gap-2"
      >
        {tabs.map((t, n) => {
          const on = n === active;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[n] = el;
              }}
              type="button"
              role="tab"
              id={`mt-tab-${t.id}`}
              aria-selected={on}
              aria-controls="mt-panel"
              tabIndex={on ? 0 : -1}
              onClick={() => select(n)}
              style={{ height: TAB_H }}
              className={cn(
                'relative min-w-0 max-w-44 flex-1 basis-0 rounded-cell px-2 text-sm font-medium outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand sm:text-base',
                on ? 'text-ink' : 'text-inverse-ink/60 hover:bg-inverse-ink/10 hover:text-inverse-ink',
              )}
            >
              <span className="relative truncate">{t.label}</span>
              {on && autoplayMs ? (
                <span aria-hidden className="absolute inset-x-4 bottom-2.5 h-0.5 overflow-hidden rounded-full bg-line">
                  <span ref={barRef} className="block h-full origin-left scale-x-0 rounded-full bg-brand" />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      <div
        role="tabpanel"
        id="mt-panel"
        aria-labelledby={`mt-tab-${tabs[active]?.id}`}
        className={cn('relative z-10 mx-4 min-h-64 overflow-hidden flex flex-col rounded-[28px] bg-surface text-ink-muted', panelClassName)}
      >
        <div ref={panelRef} className="flex flex-1 flex-col">{tabs[shown]?.panel}</div>
      </div>
    </div>
  );
}
