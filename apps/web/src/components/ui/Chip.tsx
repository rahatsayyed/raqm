import type { ComponentPropsWithoutRef } from 'react';
import { cx } from './cx';

interface ChipProps extends ComponentPropsWithoutRef<'button'> {
  active?: boolean;
}

export function Chip({ active = false, className, children, type = 'button', ...rest }: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={cx(
        'inline-flex h-9 items-center rounded-pill px-3.5 font-sans text-[15px] font-medium transition-colors duration-150',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        active ? 'bg-inverse text-inverse-ink' : 'bg-transparent text-ink-muted hover:bg-surface-sunken hover:text-ink',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
