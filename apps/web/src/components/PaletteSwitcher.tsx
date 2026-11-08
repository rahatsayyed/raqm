'use client';

import { useSyncExternalStore } from 'react';
import { PALETTES, ACTIVE_PALETTE, type PaletteName } from '@/styles/palette.config';

const KEY = 'raqm-palette';
const root = () => document.documentElement;

function subscribe(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(root(), { attributes: true, attributeFilter: ['data-palette'] });
  try {
    const saved = localStorage.getItem(KEY);
    if (saved && (PALETTES as readonly string[]).includes(saved)) root().dataset.palette = saved;
  } catch {}
  return () => obs.disconnect();
}

const getSnapshot = () => root().dataset.palette ?? ACTIVE_PALETTE;
const getServerSnapshot = () => ACTIVE_PALETTE as string;

export function PaletteSwitcher() {
  const current = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const pick = (name: PaletteName) => {
    root().dataset.palette = name;
    try {
      localStorage.setItem(KEY, name);
    } catch {}
  };

  return (
    <div className="fixed bottom-4 left-16 z-[80] flex items-center gap-1 rounded-pill bg-surface p-1 font-mono text-[11px] shadow-3 ring-1 ring-line">
      {PALETTES.map((name) => (
        <button
          key={name}
          type="button"
          onClick={() => pick(name)}
          aria-pressed={current === name}
          className={`rounded-pill px-2.5 py-1 transition-colors duration-150 ${
            current === name ? 'bg-brand text-brand-ink' : 'text-ink-muted hover:bg-surface-sunken'
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
