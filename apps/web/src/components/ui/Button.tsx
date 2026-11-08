import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'inverse';
export type ButtonSize = 'sm' | 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-brand text-brand-ink hover:bg-brand/90',
  secondary: 'bg-surface text-ink shadow-ring hover:bg-surface-sunken',
  ghost: 'bg-transparent text-ink hover:bg-surface-sunken',
  inverse: 'bg-inverse-ink text-inverse hover:bg-inverse-ink/90',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-[38px] px-4 text-sm',
  md: 'h-12 px-6 text-[15px]',
  lg: 'h-[54px] px-7 text-base',
};

interface ButtonOwnProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

type AnchorProps = ButtonOwnProps & { href: string } & Omit<ComponentPropsWithoutRef<'a'>, keyof ButtonOwnProps | 'href'>;
type NativeProps = ButtonOwnProps & { href?: undefined } & Omit<ComponentPropsWithoutRef<'button'>, keyof ButtonOwnProps>;

export function buttonClasses(variant: ButtonVariant = 'primary', size: ButtonSize = 'md', className?: string) {
  return cx(
    'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-pill font-sans font-semibold tracking-[-0.01em]',
    'transition-[background-color,color,box-shadow,transform] duration-150 ease-[var(--ease-standard)] active:scale-[0.98]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
    className,
  );
}

export function Button(props: AnchorProps | NativeProps) {
  const { variant = 'primary', size = 'md', icon, className, children, ...rest } = props;
  const classes = buttonClasses(variant, size, className);
  const content = (
    <>
      {children}
      {icon}
    </>
  );

  if (typeof rest.href === 'string') {
    const { href, ...anchor } = rest as AnchorProps;
    const external = /^(https?:|mailto:)/.test(href);
    return external ? (
      <a href={href} className={classes} {...anchor}>
        {content}
      </a>
    ) : (
      <Link href={href} className={classes} {...anchor}>
        {content}
      </Link>
    );
  }

  const { type = 'button', ...native } = rest as NativeProps;
  return (
    <button type={type} className={classes} {...native}>
      {content}
    </button>
  );
}
