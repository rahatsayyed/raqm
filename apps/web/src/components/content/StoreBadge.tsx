'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { scrollToHash } from '../SmoothScrollProvider';

export type StoreId = 'android' | 'ios';

// Flip status to 'live' and set href to the store URL when a listing exists.
export const STORES: Record<
  StoreId,
  { status: 'soon' | 'live'; href?: string; name: string; soonCaption: string; liveCaption: string; soonLabel: string }
> = {
  android: {
    status: 'soon',
    name: 'Google Play',
    soonCaption: 'Coming soon on',
    liveCaption: 'Get it on',
    soonLabel: 'Raqm for Android is coming soon on Google Play. Join the waitlist.',
  },
  ios: {
    status: 'soon',
    name: 'App Store',
    soonCaption: 'In progress for',
    liveCaption: 'Download on the',
    soonLabel: 'Raqm for iPhone is in progress for the App Store. Join the waitlist.',
  },
};

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-[22px] shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M5 3.4v17.2c0 .6.7 1 1.2.6l14.3-8.6c.5-.3.5-.9 0-1.2L6.2 2.8C5.7 2.4 5 2.8 5 3.4z" />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 384 512" className="size-[22px] shrink-0" fill="currentColor" aria-hidden="true">
      <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-14.9 0-49.3-19.7-76-19.7C60.6 141 0 184.8 0 273.5c0 26.2 4.8 53.3 14.4 81.2 12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-57.7-90-57.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
    </svg>
  );
}

const CLASS =
  'inline-flex h-[54px] items-center gap-2.5 rounded-pill border border-inverse bg-inverse py-[9px] pr-[18px] pl-[14px] text-inverse-ink transition-[opacity,transform] duration-150 ease-out hover:opacity-85 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:active:scale-100';

export function StoreBadge({ store }: { store: StoreId }) {
  const pathname = usePathname();
  const cfg = STORES[store];
  const live = cfg.status === 'live' && cfg.href;
  const href = live ? cfg.href! : '/#waitlist';
  const label = live ? `${cfg.liveCaption} ${cfg.name}` : cfg.soonLabel;

  const body = (
    <>
      {store === 'android' ? <PlayGlyph /> : <AppleGlyph />}
      <span className="flex flex-col items-start leading-tight">
        <span className="text-xs font-medium text-inverse-ink/70">{live ? cfg.liveCaption : cfg.soonCaption}</span>
        <span className="text-base font-semibold">{cfg.name}</span>
      </span>
    </>
  );

  if (live) {
    return (
      <a href={href} aria-label={label} className={CLASS} rel="noopener">
        {body}
      </a>
    );
  }
  return (
    <Link
      href={href}
      aria-label={label}
      className={CLASS}
      onClick={(event) => {
        if (pathname === '/') {
          event.preventDefault();
          scrollToHash('#waitlist');
        }
      }}
    >
      {body}
    </Link>
  );
}

export function StoreBadges({ className = '' }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-2.5 ${className}`}>
      <StoreBadge store="android" />
      <StoreBadge store="ios" />
    </div>
  );
}
