'use client';

import { useId, useState } from 'react';

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  const base = useId();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ul className="divide-y divide-line border-y border-line">
      {items.map((it, i) => {
        const isOpen = open === i;
        return (
          <li key={it.q} className="py-1">
            <h3 className="text-base">
              <button
                type="button"
                id={`${base}-t${i}`}
                aria-expanded={isOpen}
                aria-controls={`${base}-p${i}`}
                onClick={() => setOpen(isOpen ? null : i)}
                className="group flex min-h-12 w-full items-center gap-3 rounded-chip py-3 text-left font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <span aria-hidden className={`relative size-3.5 shrink-0 transition-colors duration-200 ${isOpen ? 'text-ink' : 'text-ink-subtle'}`}>
                  <svg viewBox="0 0 14 14" className={`absolute inset-0 transition duration-[120ms] motion-reduce:transition-none ${isOpen ? 'scale-[.85] opacity-0' : 'opacity-100'}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M7 1.5v11M1.5 7h11" /></svg>
                  <svg viewBox="0 0 14 14" className={`absolute inset-0 transition duration-200 motion-reduce:transition-none ${isOpen ? 'opacity-100' : 'scale-[.85] opacity-0'}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M1.5 7h11" /></svg>
                </span>
                <span className={`transition-colors duration-[250ms] motion-reduce:transition-none ${isOpen ? 'text-ink' : 'text-ink-muted'}`}>{it.q}</span>
              </button>
            </h3>
            <div
              id={`${base}-p${i}`}
              role="region"
              aria-labelledby={`${base}-t${i}`}
              inert={!isOpen}
              className={`grid transition-[grid-template-rows] duration-[350ms] ease-[cubic-bezier(.4,0,.2,1)] motion-reduce:transition-none ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
            >
              <div className="min-h-0 overflow-hidden">
                <p className={`pb-4 pl-[26px] text-[15px] leading-relaxed transition duration-300 motion-reduce:transition-none ${isOpen ? 'translate-y-0 opacity-100 delay-50' : '-translate-y-1.5 opacity-0'}`}>{it.a}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
