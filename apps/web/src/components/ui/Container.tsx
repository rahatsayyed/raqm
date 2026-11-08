import type { ComponentPropsWithoutRef, ElementType } from 'react';
import { cx } from './cx';

type ContainerProps<T extends ElementType> = {
  as?: T;
  size?: 'col' | 'wide';
} & Omit<ComponentPropsWithoutRef<T>, 'as' | 'size'>;

export function Container<T extends ElementType = 'div'>({ as, size = 'col', className, ...rest }: ContainerProps<T>) {
  const Tag = (as ?? 'div') as ElementType;
  return <Tag className={cx('mx-auto w-full px-6', size === 'col' ? 'max-w-col' : 'max-w-wide', className)} {...rest} />;
}
