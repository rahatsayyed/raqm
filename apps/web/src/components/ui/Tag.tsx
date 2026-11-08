import type { ComponentPropsWithoutRef } from 'react';
import { cx } from './cx';

type TagTone = 'neutral' | 'brand' | 'inverse';

const TONES: Record<TagTone, string> = {
  neutral: 'bg-surface-sunken text-ink-muted',
  brand: 'bg-brand-soft text-brand',
  inverse: 'bg-inverse-ink/10 text-inverse-ink',
};

export function Tag({
  tone = 'neutral',
  className,
  children,
  ...rest
}: ComponentPropsWithoutRef<'span'> & { tone?: TagTone }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-sans text-[13px] font-medium leading-none',
        TONES[tone],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
