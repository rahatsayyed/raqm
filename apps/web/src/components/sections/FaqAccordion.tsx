'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { FAQ_CATEGORIES, type FaqCategory } from '@/lib/faq-data';

type Variant = 'inverse' | 'light';

type Props = {
  categories?: FaqCategory[];
  variant?: Variant;
  showChips?: boolean;
  showSearch?: boolean;
  className?: string;
};

const EASE = 'cubic-bezier(.4,0,.2,1)';

const V = {
  inverse: {
    divider: 'bg-inverse-line',
    open: 'text-inverse-ink',
    closed: 'text-inverse-ink/60',
    body: 'text-inverse-ink/70',
    chipOn: 'bg-inverse-ink text-inverse',
    chipOff: 'text-inverse-ink/60 hover:text-inverse-ink ring-1 ring-inverse-line',
    input: 'bg-inverse-ink/5 text-inverse-ink placeholder:text-inverse-ink/45 ring-1 ring-inverse-line',
    empty: 'text-inverse-ink/60',
    focus: 'focus-visible:outline-inverse-ink',
  },
  light: {
    divider: 'bg-line',
    open: 'text-ink',
    closed: 'text-ink-muted',
    body: 'text-ink-muted',
    chipOn: 'bg-ink text-canvas',
    chipOff: 'text-ink-muted hover:text-ink shadow-ring',
    input: 'bg-surface text-ink placeholder:text-ink-subtle shadow-ring',
    empty: 'text-ink-muted',
    focus: 'focus-visible:outline-ring',
  },
} as const;

function Item({ id, q, a, open, onToggle, v }: { id: string; q: string; a: string; open: boolean; onToggle: () => void; v: (typeof V)[Variant] }) {
  return (
    <div>
      <h3 className="text-base font-medium">
        <button
          type="button"
          id={`${id}-t`}
          aria-expanded={open}
          aria-controls={`${id}-p`}
          onClick={onToggle}
          className={`group flex w-full items-center gap-3 rounded-tag py-5 text-left text-lead transition-colors duration-250 focus-visible:outline-2 focus-visible:outline-offset-2 ${v.focus} ${open ? v.open : v.closed}`}
        >
          <span className="relative size-3.5 shrink-0" aria-hidden="true">
            <svg viewBox="0 0 14 14" className="absolute inset-0 transition-[opacity,transform] duration-150 motion-reduce:transition-none" style={{ opacity: open ? 0 : 1, transform: open ? 'scale(.85)' : 'scale(1)' }}>
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <svg viewBox="0 0 14 14" className="absolute inset-0 transition-[opacity,transform] duration-200 motion-reduce:transition-none" style={{ opacity: open ? 1 : 0, transform: open ? 'scale(1)' : 'scale(.85)' }}>
              <path d="M1 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </span>
          <span className="text-balance">{q}</span>
        </button>
      </h3>
      <div
        id={`${id}-p`}
        role="region"
        aria-labelledby={`${id}-t`}
        className="grid motion-reduce:transition-none"
        style={{ gridTemplateRows: open ? '1fr' : '0fr', transition: `grid-template-rows 350ms ${EASE}` }}
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <p
            className={`pb-6 pl-[26px] pr-2 text-base leading-6 motion-reduce:transition-none ${v.body}`}
            style={{ opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(-6px)', transition: `opacity 300ms ${EASE} 50ms, transform 300ms ${EASE} 50ms` }}
          >
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqAccordion({ categories = FAQ_CATEGORIES, variant = 'inverse', showChips = false, showSearch = false, className }: Props) {
  const v = V[variant];
  const uid = useId();
  const [cat, setCat] = useState('all');
  const [raw, setRaw] = useState('');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(raw.trim().toLowerCase()), 160);
    return () => clearTimeout(t);
  }, [raw]);

  const items = useMemo(() => {
    const pool = categories.filter((c) => cat === 'all' || c.id === cat);
    return pool.flatMap((c) => c.items.map((it, i) => ({ ...it, key: `${c.id}-${i}` }))).filter((it) => !query || `${it.q} ${it.a}`.toLowerCase().includes(query));
  }, [categories, cat, query]);

  return (
    <div className={className}>
      {(showChips || showSearch) && (
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {showChips && (
            <div role="group" aria-label="FAQ categories" className="-mx-1 flex gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none]">
              {[{ id: 'all', label: 'All' }, ...categories].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={cat === c.id}
                  onClick={() => setCat(c.id)}
                  className={`shrink-0 rounded-pill px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 ${v.focus} ${cat === c.id ? v.chipOn : v.chipOff}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}
          {showSearch && (
            <input
              type="search"
              aria-label="Search questions"
              placeholder="Search questions"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              className={`h-10 w-full rounded-pill px-4 text-sm outline-none transition-shadow duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 sm:w-64 ${v.focus} ${v.input}`}
            />
          )}
        </div>
      )}
      <div role="list">
        {items.map((it, i) => {
          const id = `${uid}-${it.key}`;
          return (
            <div role="listitem" key={it.key}>
              {i > 0 && <div className={`h-px ${v.divider}`} />}
              <Item id={id} q={it.q} a={it.a} open={openId === id} onToggle={() => setOpenId(openId === id ? null : id)} v={v} />
            </div>
          );
        })}
        {items.length === 0 && <p className={`py-8 text-base ${v.empty}`}>No questions match that search.</p>}
      </div>
    </div>
  );
}

export function FaqSection() {
  return (
    <section id="faq" aria-labelledby="faq-heading" className="px-4 py-section sm:px-6">
      <div className="mx-auto max-w-wide rounded-card-lg bg-inverse px-6 py-14 sm:px-12 sm:py-20">
        <div className="mx-auto max-w-col">
          <p className="mb-3 font-mono text-xs uppercase tracking-widest text-inverse-ink/50">Questions</p>
          <h2 id="faq-heading" className="mb-10 text-balance text-h2 text-inverse-ink sm:mb-12">
            Straight answers, nothing hidden
          </h2>
          <FaqAccordion variant="inverse" showChips />
        </div>
      </div>
    </section>
  );
}
