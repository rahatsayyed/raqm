'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
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

interface Geom {
  TAB_H: number;
  RAIL_H: number;
  INSET: number;
  R_FRAME: number;
  R_FILLET: number;
  R_TAB: number;
  R_PANEL: number;
}

// Concentric: R_TAB = R_PANEL = R_FRAME - INSET, rail top = INSET
const GEOM_LG: Geom = { TAB_H: 56, RAIL_H: 72, INSET: 16, R_FRAME: 32, R_FILLET: 16, R_TAB: 16, R_PANEL: 16 };
const GEOM_SM: Geom = { TAB_H: 42, RAIL_H: 54, INSET: 12, R_FRAME: 32, R_FILLET: 12, R_TAB: 20, R_PANEL: 20 };
const COMPACT_Q = '(max-width: 639.98px)';

function subscribeCompact(cb: () => void) {
  const mq = window.matchMedia(COMPACT_Q);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function liquidPath(g: Geom, left: number, width: number, W: number) {
  const { RAIL_H, TAB_H, INSET, R_FILLET, R_TAB, R_PANEL } = g;
  const L = left;
  const R = left + width;
  const top = RAIL_H - TAB_H;
  const b = RAIL_H;
  const lj = Math.max(INSET, L - R_FILLET);
  const rj = Math.min(W - INSET, R + R_FILLET);
  const ld = Math.min(R_FILLET, L - lj);
  const rd = Math.min(R_FILLET, rj - R);
  const lpr = Math.min(R_PANEL, Math.max(0, lj - INSET));
  const rpr = Math.min(R_PANEL, Math.max(0, W - INSET - rj));
  return [
    `M${INSET} ${b + R_PANEL}`,
    `V${b + lpr}`,
    `Q${INSET} ${b} ${INSET + lpr} ${b}`,
    `H${lj}`,
    `C${lj + ld * 0.55} ${b} ${L} ${b - ld + ld * 0.55} ${L} ${b - ld}`,
    `V${top + R_TAB}`,
    `Q${L} ${top} ${L + R_TAB} ${top}`,
    `H${R - R_TAB}`,
    `Q${R} ${top} ${R} ${top + R_TAB}`,
    `V${b - rd}`,
    `C${R} ${b - rd + rd * 0.55} ${rj - rd * 0.55} ${b} ${rj} ${b}`,
    `H${W - INSET - rpr}`,
    `Q${W - INSET} ${b} ${W - INSET} ${b + rpr}`,
    `V${b + R_PANEL}`,
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
  const compact = useSyncExternalStore(
    subscribeCompact,
    () => window.matchMedia(COMPACT_Q).matches,
    () => false,
  );
  const g = compact ? GEOM_SM : GEOM_LG;
  const gRef = useRef(g);
  useLayoutEffect(() => {
    gRef.current = g;
  }, [g]);
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
  const glideRef = useRef<gsap.core.Tween | null>(null);
  const flags = useRef({ visible: true });
  const [restart, setRestart] = useState(0);
  const selectRef = useRef<(n: number) => void>(() => {});

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  const select = useCallback(
    (next: number) => {
      activeRef.current = next;
      setInner(next);
      setRestart((r) => r + 1);
      onChange?.(next);
    },
    [onChange],
  );

  useEffect(() => {
    selectRef.current = select;
  }, [select]);

  const draw = useCallback(() => {
    const wrap = wrapRef.current;
    if (!wrap || !pathRef.current || !svgRef.current) return;
    const W = wrap.getBoundingClientRect().width;
    const cur = gRef.current;
    svgRef.current.setAttribute('viewBox', `0 0 ${W} ${cur.RAIL_H + cur.R_PANEL}`);
    pathRef.current.setAttribute('d', liquidPath(cur, geo.current.left, geo.current.width, W));
  }, []);

  const measure = useCallback((index: number) => {
    const el = tabRefs.current[index];
    const wrap = wrapRef.current;
    if (!el || !wrap) return null;
    const w = wrap.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    let left = r.left - w.left;
    let right = r.right - w.left;
    const inset = gRef.current.INSET;
    if (Math.abs(left - inset) < 1) left = inset;
    if (Math.abs(w.width - inset - right) < 1) right = w.width - inset;
    return { left, width: right - left };
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
          glideRef.current?.kill();
          glideRef.current = gsap.to(k, {
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
              geo.current = measure(activeRef.current) ?? { ...target };
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
      return () => {
        glideRef.current?.kill();
        mm.revert();
      };
    },
    { dependencies: [active], scope: wrapRef },
  );

  useEffect(() => {
    const t = measure(activeRef.current);
    if (t) geo.current = { ...t };
    draw();
  }, [compact, draw, measure]);

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
      if (active === shown) {
        gsap.to(panelRef.current, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.12, overwrite: true, clearProps: 'filter,transform' });
        return;
      }
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
    tweenRef.current?.paused(!flags.current.visible);
  }, []);

  useEffect(() => {
    tweenRef.current?.kill();
    tweenRef.current = null;
    const bar = barRef.current;
    if (!autoplayMs || !bar) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.set(bar, { scaleX: 0 });
    const tw = gsap.to(bar, {
      scaleX: 1,
      duration: autoplayMs / 1000,
      ease: 'none',
      paused: !flags.current.visible,
      onComplete: () => selectRef.current((activeRef.current + 1) % tabs.length),
    });
    tweenRef.current = tw;
    return () => {
      tw.kill();
      if (tweenRef.current === tw) tweenRef.current = null;
    };
  }, [active, restart, autoplayMs, tabs.length]);

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

  return (
    <div
      ref={wrapRef}
      style={{ borderRadius: g.R_FRAME, paddingBottom: g.INSET }}
      className={cn('relative overflow-hidden bg-inverse text-inverse-ink', className)}
    >
      <svg
        ref={svgRef}
        aria-hidden
        preserveAspectRatio="none"
        className="pointer-events-none absolute inset-x-0 top-0 w-full text-surface"
        style={{ height: g.RAIL_H + g.R_PANEL }}
      >
        <path ref={pathRef} fill="currentColor" />
      </svg>
      <div
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        style={{ height: g.RAIL_H, paddingInline: g.INSET }}
        className="relative z-10 flex items-end gap-1 sm:gap-2"
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
              style={{ height: g.TAB_H, borderRadius: g.R_TAB }}
              className={cn(
                'relative min-w-0 max-w-44 flex-1 basis-0 px-1 text-sm font-medium sm:px-2 outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand sm:text-base',
                on ? 'text-ink' : 'text-inverse-ink/60 hover:bg-inverse-ink/10 hover:text-inverse-ink',
              )}
            >
              <span className="relative truncate">{t.label}</span>
              {on && autoplayMs ? (
                <span aria-hidden className="absolute inset-x-3 bottom-1.5 h-0.5 sm:inset-x-4 sm:bottom-2.5 overflow-hidden rounded-full bg-line">
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
        style={{ marginInline: g.INSET, borderRadius: g.R_PANEL }}
        className={cn('relative z-10 min-h-64 overflow-hidden flex flex-col bg-surface text-ink-muted', panelClassName)}
      >
        <div ref={panelRef} className="flex flex-1 flex-col">{tabs[shown]?.panel}</div>
      </div>
    </div>
  );
}
