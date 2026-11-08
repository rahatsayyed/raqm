'use client';

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { groupRupeeText } from '@/lib/calculators/money';
import { decodeShare, encodeShare } from '@/lib/calculators/share';

export function CalcCard({ eyebrow, title, children }: { eyebrow: string; title: string; children: ReactNode }) {
  return (
    <section aria-label={title} className="overflow-hidden rounded-container bg-surface shadow-1 hairline">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 border-b border-line px-5 pb-4 pt-5 sm:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">{eyebrow}</p>
          <h2 className="mt-1 text-lead font-medium text-ink">{title}</h2>
        </div>
        <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
          <span aria-hidden className="size-1.5 rounded-pill bg-positive" />
          Calculated in your browser
        </p>
      </header>
      {children}
    </section>
  );
}

export function Step({
  n,
  title,
  hint,
  action,
  children,
}: {
  n: number;
  title: string;
  hint?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section aria-label={`Step ${n}: ${title}`} className="border-b border-line p-5 sm:p-6">
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="flex items-center gap-2.5 text-h3 text-ink">
            <span className="grid size-[26px] shrink-0 place-items-center rounded-pill bg-inverse font-mono text-xs font-semibold text-inverse-ink">
              {n}
            </span>
            {title}
          </h3>
          {hint && <p className="mt-1 pl-9 text-sm text-ink-subtle">{hint}</p>}
        </div>
        {action}
      </header>
      <div>{children}</div>
    </section>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
  full,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  label: string;
  full?: boolean;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`gap-1 rounded-pill bg-surface-sunken p-1 ${full ? 'flex w-full' : 'inline-flex max-sm:flex max-sm:w-full'}`}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
          className="min-h-9 flex-1 whitespace-nowrap rounded-pill px-3.5 text-sm font-semibold text-ink-muted transition duration-150 ease-[cubic-bezier(.4,0,.2,1)] hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring aria-pressed:bg-surface aria-pressed:text-ink aria-pressed:shadow-1 motion-reduce:transition-none sm:flex-none"
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const boxCls =
  'flex min-h-11 items-center rounded-cell border bg-surface transition-colors duration-150 focus-within:border-brand focus-within:ring-2 focus-within:ring-ring/25 motion-reduce:transition-none';

function FieldShell({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-ink">
        {label}
      </label>
      <div className={`${boxCls} ${error ? 'border-negative' : 'border-line'}`}>{children}</div>
      {error ? (
        <p id={`${id}-d`} role="alert" className="mt-1.5 text-xs text-negative">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-d`} className="mt-1.5 text-xs text-ink-subtle">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

const inputCls =
  'min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-[15px] text-ink outline-none placeholder:text-ink-subtle/70';

export function MoneyField({
  label,
  hint,
  value,
  onChange,
  error,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string | null;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <span aria-hidden className="select-none pl-3.5 font-mono text-[15px] text-ink-subtle">
        ₹
      </span>
      <input
        id={id}
        value={value}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${id}-d` : undefined}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.,]/g, ''))}
        onBlur={() => onChange(groupRupeeText(value))}
        className={`${inputCls} pl-1.5`}
      />
    </FieldShell>
  );
}

export function NumField({
  label,
  hint,
  value,
  onChange,
  suffix,
  error,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  suffix?: string;
  error?: string | null;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input
        id={id}
        value={value}
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-invalid={!!error}
        aria-describedby={error || hint ? `${id}-d` : undefined}
        onChange={(e) => onChange(e.target.value.replace(/[^\d.]/g, ''))}
        className={inputCls}
      />
      {suffix && <span className="select-none pr-3.5 text-sm text-ink-subtle">{suffix}</span>}
    </FieldShell>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  max = 24,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  max?: number;
}) {
  const id = useId();
  return (
    <FieldShell id={id} label={label}>
      <input
        id={id}
        value={value}
        maxLength={max}
        autoComplete="off"
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={`${inputCls} font-sans`}
      />
    </FieldShell>
  );
}

export function ResultHero({
  label,
  value,
  sub,
  children,
}: {
  label: string;
  value: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-cell bg-inverse p-5 text-inverse-ink sm:p-6" aria-live="polite">
      <p className="text-sm text-inverse-ink/70">{label}</p>
      <p className="mt-1.5 break-words font-mono text-[clamp(1.875rem,1.4rem+2vw,2.75rem)] font-medium leading-none tracking-tight">
        {value}
      </p>
      {sub && <p className="mt-2 text-sm text-inverse-ink/70">{sub}</p>}
      {children}
    </div>
  );
}

export function StatGrid({ items }: { items: { label: string; value: string; tone?: 'brand' }[] }) {
  return (
    <dl className="grid grid-cols-2 gap-cell overflow-hidden rounded-cell bg-line sm:grid-cols-3">
      {items.map((s) => (
        <div key={s.label} className={`min-w-0 p-4 ${s.tone === 'brand' ? 'bg-brand-soft' : 'bg-surface'}`}>
          <dt className="text-xs text-ink-subtle">{s.label}</dt>
          <dd className="mt-1 break-words font-mono text-[15px] font-medium text-ink">{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const toneCls = { brand: 'bg-brand', ink: 'bg-ink', soft: 'bg-brand-soft', muted: 'bg-surface-sunken' } as const;
export type Tone = keyof typeof toneCls;

export function SplitBar({ parts }: { parts: { label: string; value: number; display: string; tone: Tone }[] }) {
  const total = parts.reduce((a, p) => a + p.value, 0) || 1;
  return (
    <div>
      <div className="flex h-3 gap-0.5 overflow-hidden rounded-pill" role="img" aria-label={parts.map((p) => `${p.label} ${p.display}`).join(', ')}>
        {parts.map((p) => (
          <span
            key={p.label}
            className={`${toneCls[p.tone]} transition-[width] duration-[350ms] ease-[cubic-bezier(.4,0,.2,1)] motion-reduce:transition-none`}
            style={{ width: `${(p.value / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
        {parts.map((p) => (
          <li key={p.label} className="flex items-center gap-2 text-ink-muted">
            <span aria-hidden className={`size-2.5 rounded-tag ${toneCls[p.tone]} ring-1 ring-line`} />
            {p.label} <span className="font-mono text-ink">{p.display}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Notice({ children, tone = 'info' }: { children: ReactNode; tone?: 'info' | 'warn' }) {
  return (
    <p
      role={tone === 'warn' ? 'alert' : 'status'}
      className={`rounded-chip px-3.5 py-2.5 text-sm ${tone === 'warn' ? 'bg-surface-sunken text-warning' : 'bg-brand-soft text-ink'}`}
    >
      {children}
    </p>
  );
}

export function ShareButton({ getState }: { getState: () => unknown }) {
  const [msg, setMsg] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const share = async () => {
    const hash = encodeShare(getState());
    const url = `${location.origin}${location.pathname}${hash}`;
    history.replaceState(null, '', hash);
    let text = 'Link copied';
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      text = 'Link is in the address bar';
    }
    setMsg(text);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(''), 2200);
  };
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={share}
        className="inline-flex min-h-10 items-center gap-2 rounded-pill border border-line bg-surface px-4 text-sm font-semibold text-ink transition duration-150 hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
      >
        <svg aria-hidden width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 4.4" />
          <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 0 0 7.07 7.07l1.33-1.3" />
        </svg>
        Share this result
      </button>
      <span role="status" className="text-sm text-ink-subtle">
        {msg}
      </span>
    </div>
  );
}

/** Calculator state with defaults on the server, then restored from the URL hash after mount. */
export function useShareState<T>(defaults: T, validate: (x: unknown) => T | null) {
  const [state, setState] = useState<T>(defaults);
  const validateRef = useRef(validate);
  useEffect(() => {
    const raw = decodeShare(location.hash);
    const next = raw === null ? null : validateRef.current(raw);
    if (next) {
      const id = requestAnimationFrame(() => setState(next));
      return () => cancelAnimationFrame(id);
    }
  }, []);
  const patch = useCallback((p: Partial<T>) => setState((s) => ({ ...s, ...p })), []);
  return { state, patch, setState };
}
