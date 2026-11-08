'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { FAQ_GROUPS, type FaqGroup } from '@/content/faq';
import { FEATURED_FAQS } from '@/lib/faq-data';

type Variant = 'inverse' | 'light';

type Props = {
  categories?: FaqGroup[];
  compact?: boolean;
  defaultOpenFirst?: boolean;
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

function Item({ id, q, a, open, onToggle, v, compact }: { id: string; q: string; a: string; open: boolean; onToggle: () => void; v: (typeof V)[Variant]; compact: boolean }) {
  return (
    <div>
      <h3 className="text-base font-medium">
        <button
          type="button"
          id={`${id}-t`}
          aria-expanded={open}
          aria-controls={`${id}-p`}
          onClick={onToggle}
          style={compact ? { paddingBottom: open ? 12 : 20, transition: `padding-bottom 350ms ${EASE}, color 250ms ${EASE}` } : undefined}
          className={`group flex w-full items-center ${compact ? 'gap-3.5 text-base font-semibold leading-5' : 'gap-3 text-lead'} rounded-tag ${compact ? 'pt-5' : 'py-5'} text-left transition-colors duration-250 motion-reduce:transition-none! focus-visible:outline-2 focus-visible:outline-offset-2 ${v.focus} ${open ? v.open : v.closed}`}
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
        className="grid motion-reduce:transition-none!"
        style={{ gridTemplateRows: open ? '1fr' : '0fr', transition: `grid-template-rows 350ms ${EASE}` }}
      >
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <p
            className={`${compact ? 'pb-5 pl-7 pt-0 font-medium leading-5' : 'pb-6 pl-[26px] pr-2 leading-6'} text-base motion-reduce:transition-none! ${v.body}`}
            style={{ opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(-6px)', transition: `opacity 300ms ${EASE} 50ms, transform 300ms ${EASE} 50ms` }}
          >
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FaqAccordion({ categories = FAQ_GROUPS, variant = 'inverse', showChips = false, showSearch = false, compact = false, defaultOpenFirst = false, className }: Props) {
  const v = V[variant];
  const uid = useId();
  const [cat, setCat] = useState('all');
  const [raw, setRaw] = useState('');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(defaultOpenFirst ? 'first' : null);

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
          const isOpen = openId === id || (openId === 'first' && i === 0);
          return (
            <div role="listitem" key={it.key}>
              {i > 0 && <div className={`h-px ${v.divider}`} />}
              <Item id={id} q={it.q} a={it.a} open={isOpen} onToggle={() => setOpenId(isOpen ? null : id)} v={v} compact={compact} />
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
    <section id="faq" aria-labelledby="faq-heading" className="bg-inverse px-4 py-section sm:px-6">
      <div className="mx-auto grid max-w-col gap-[18px] lg:grid-cols-[430px_minmax(0,1fr)] lg:gap-10">
        <div className="pt-3.5">
          <p className="mb-4 text-lg font-semibold leading-[22px] text-inverse-ink/60">FAQ</p>
          <h2 id="faq-heading" className="text-balance text-[2.125rem] font-medium leading-[2.375rem] tracking-[-0.01em] text-inverse-ink lg:text-4xl lg:leading-10">
            Some frequently asked questions.
          </h2>
        </div>
        <div className="-mt-1.5">
          <FaqAccordion variant="inverse" categories={[{ id: 'featured', label: 'Featured', items: FEATURED_FAQS }]} compact defaultOpenFirst />
          <Link
            href="/faq"
            className="mt-5 inline-block text-sm font-semibold leading-[18px] tracking-[-0.01em] text-inverse-ink underline decoration-inverse-ink/30 decoration-2 underline-offset-4 transition-colors duration-150 hover:decoration-inverse-ink focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-inverse-ink motion-reduce:transition-none"
          >
            See all questions
          </Link>
        </div>
      </div>
    </section>
  );
}
