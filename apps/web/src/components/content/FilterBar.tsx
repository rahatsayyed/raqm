'use client';

import { useRef } from 'react';

export function Chips({
  items,
  active,
  onPick,
  label,
}: {
  items: { id: string; label: string }[];
  active: string;
  onPick: (id: string) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="flex min-w-0 flex-1 gap-2 overflow-x-auto py-1 pr-16 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {items.map((c) => (
        <button
          key={c.id}
          type="button"
          aria-pressed={active === c.id}
          onClick={() => onPick(c.id)}
          className={`shrink-0 rounded-pill px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
            active === c.id
              ? 'bg-inverse text-inverse-ink'
              : 'bg-surface-sunken text-ink-muted [@media(hover:hover)]:hover:bg-line [@media(hover:hover)]:hover:text-ink'
          }`}
        >
          {c.label}
        </button>
      ))}
    </div>
  );
}

export function SearchPill({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <label className="group relative flex h-10 w-full shrink-0 cursor-text items-center gap-2 rounded-pill bg-surface px-4 shadow-ring transition-[width] duration-300 ease-standard focus-within:shadow-[0_0_0_2px_var(--ring)] sm:w-32 sm:focus-within:w-80 sm:has-[input:not(:placeholder-shown)]:w-80">
      <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-subtle" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
        <circle cx="9" cy="9" r="5.5" />
        <path d="m13.5 13.5 3.5 3.5" />
      </svg>
      <input
        ref={ref}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search"
        aria-label={label}
        className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-ink-subtle [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => {
            onChange('');
            ref.current?.focus();
          }}
          className="grid size-5 place-items-center rounded-pill bg-surface-sunken text-ink-muted"
        >
          <svg viewBox="0 0 12 12" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
            <path d="m2 2 8 8M10 2l-8 8" />
          </svg>
        </button>
      )}
    </label>
  );
}

export const fold = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim();
