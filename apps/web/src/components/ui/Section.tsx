import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { Container } from './Container';
import { cx } from './cx';

interface SectionProps extends Omit<ComponentPropsWithoutRef<'section'>, 'title'> {
  eyebrow?: string;
  title?: ReactNode;
  lead?: ReactNode;
  align?: 'center' | 'start';
  size?: 'col' | 'wide';
  spacing?: 'md' | 'lg';
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  align = 'center',
  className,
}: Pick<SectionProps, 'eyebrow' | 'title' | 'lead' | 'align' | 'className'>) {
  const centered = align === 'center';
  return (
    <header className={cx('flex flex-col gap-4', centered ? 'mx-auto items-center text-center' : 'items-start', className)}>
      {eyebrow && <p className="font-sans text-sm font-medium text-ink-subtle">{eyebrow}</p>}
      {title && <h2 className={cx('font-sans text-h2 text-ink', centered && 'max-w-[640px] text-balance')}>{title}</h2>}
      {lead && <p className={cx('font-sans text-lg leading-7 text-ink-muted', centered ? 'max-w-[540px] text-balance' : 'max-w-[560px]')}>{lead}</p>}
    </header>
  );
}

export function Section({
  eyebrow,
  title,
  lead,
  align = 'center',
  size = 'col',
  spacing = 'md',
  className,
  children,
  ...rest
}: SectionProps) {
  const hasHeading = eyebrow || title || lead;
  return (
    <section className={cx(spacing === 'lg' ? 'py-section-lg' : 'py-section', className)} {...rest}>
      <Container size={size}>
        {hasHeading && <SectionHeading eyebrow={eyebrow} title={title} lead={lead} align={align} className="mb-12" />}
        {children}
      </Container>
    </section>
  );
}
