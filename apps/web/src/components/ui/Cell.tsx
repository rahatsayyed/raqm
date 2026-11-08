import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { cx } from './cx';

type CellProps<T extends ElementType> = {
  as?: T;
  tone?: 'surface' | 'sunken';
} & Omit<ComponentPropsWithoutRef<T>, 'as'>;

export function Cell<T extends ElementType = 'div'>({ as, tone = 'surface', className, ...rest }: CellProps<T>) {
  const Tag = (as ?? 'div') as ElementType;
  return <Tag className={cx('rounded-cell p-5', tone === 'surface' ? 'bg-surface' : 'bg-surface-sunken', className)} {...rest} />;
}

export function CellGrid({ className, ...rest }: ComponentPropsWithoutRef<'div'>) {
  return <div className={cx('grid gap-cell overflow-hidden rounded-container bg-line p-cell shadow-ring', className)} {...rest} />;
}
