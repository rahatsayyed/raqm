'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const LINE = 128;
const OFFSET = 120;
const LOCK_MS = 900;

export function useSectionSpy(ids: string[]) {
  const [active, setActive] = useState(ids[0] ?? '');
  const lock = useRef<{ id: string; t: number } | null>(null);

  useEffect(() => {
    const pick = () => {
      if (lock.current) return;
      let cur = ids[0] ?? '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= LINE) cur = id;
      }
      setActive(cur);
    };
    pick();
    addEventListener('scroll', pick, { passive: true });
    return () => removeEventListener('scroll', pick);
  }, [ids]);

  const go = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (lock.current) clearTimeout(lock.current.t);
    lock.current = { id, t: window.setTimeout(() => { lock.current = null; }, LOCK_MS) };
    setActive(id);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    scrollTo({ top: Math.max(0, el.getBoundingClientRect().top + scrollY - OFFSET), behavior: reduce ? 'auto' : 'smooth' });
    history.replaceState(null, '', `#${id}`);
  }, []);

  return { active, go };
}

export function Toc({ items, collapsible = false }: { items: { id: string; title: string }[]; collapsible?: boolean }) {
  const ids = items.map((i) => i.id);
  const { active, go } = useSectionSpy(ids);
  const listRef = useRef<HTMLOListElement>(null);
  const [bar, setBar] = useState({ top: 0, height: 0 });
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    const measure = () => {
      const li = listRef.current?.querySelector<HTMLElement>(`[data-id="${active}"]`);
      if (li) setBar({ top: li.offsetTop, height: li.offsetHeight });
    };
    measure();
    addEventListener('resize', measure);
    return () => removeEventListener('resize', measure);
  }, [active, open]);

  return (
    <div>
      <div className="relative pl-4">
        <span className="absolute top-0 bottom-0 left-0 w-px bg-line" aria-hidden="true" />
        <span
          className="absolute left-0 w-px bg-ink transition-[top,height] duration-[350ms] ease-standard motion-reduce:transition-none"
          style={{ top: bar.top, height: bar.height }}
          aria-hidden="true"
        />
        <ol ref={listRef} className="flex flex-col gap-1">
          {items.map((it, i) => (
            <li
              key={it.id}
              data-id={it.id}
              className={collapsible && !open && i > 2 ? 'hidden' : ''}
            >
              <a
                href={`#${it.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  go(it.id);
                }}
                aria-current={active === it.id ? 'location' : undefined}
                className={`flex gap-3 py-1.5 text-sm leading-5 transition-colors duration-150 ${
                  active === it.id ? 'font-semibold text-ink' : 'text-ink-muted [@media(hover:hover)]:hover:text-ink'
                }`}
              >
                <span className="font-mono tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                <span>{it.title}</span>
              </a>
            </li>
          ))}
        </ol>
      </div>
      {collapsible && items.length > 3 && (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="mt-3 rounded-pill bg-surface-sunken px-4 py-1.5 text-sm font-medium text-ink-muted"
        >
          {open ? 'Show less' : 'View full index'}
        </button>
      )}
    </div>
  );
}
