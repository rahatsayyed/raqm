import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { cx } from './cx';

type CardProps<T extends ElementType> = {
  as?: T;
  tone?: 'surface' | 'sunken' | 'inverse';
  radius?: 'container' | 'lg';
  padded?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, 'as'>;

const TONES = {
  surface: 'bg-surface text-ink shadow-ring',
  sunken: 'bg-surface-sunken text-ink shadow-ring',
  inverse: 'bg-inverse text-inverse-ink',
};

export function Card<T extends ElementType = 'div'>({
  as,
  tone = 'surface',
  radius = 'container',
  padded = true,
  className,
  ...rest
}: CardProps<T>) {
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag
      className={cx(radius === 'lg' ? 'rounded-card-lg' : 'rounded-container', TONES[tone], padded && 'p-6 md:p-8', className)}
      {...rest}
    />
  );
}
