'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { scrollToHash } from '../../SmoothScrollProvider';

export function WaitlistButton() {
  const pathname = usePathname();
  return (
    <Link
      href="/#waitlist"
      aria-label="Join the Raqm waitlist"
      onClick={(event) => {
        if (pathname === '/') {
          event.preventDefault();
          scrollToHash('#waitlist');
        }
      }}
      className="flex h-12 w-full items-center justify-center rounded-pill bg-inverse-ink px-4 text-sm font-semibold tracking-[-0.01em] text-inverse transition-[opacity,transform] duration-150 ease-out hover:opacity-90 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none motion-reduce:active:scale-100 lg:text-base"
    >
      Join the waitlist
    </Link>
  );
}
