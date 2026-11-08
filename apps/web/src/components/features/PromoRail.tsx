import Link from 'next/link';

type Variant = 'rail' | 'tile' | 'banner';

export function PromoRail({ variant = 'rail', className = '' }: { variant?: Variant; className?: string }) {
  const big = variant !== 'rail';
  return (
    <aside
      aria-label="Get Raqm"
      className={`relative isolate flex flex-col items-center overflow-hidden rounded-container bg-inverse text-center text-inverse-ink shadow-3 ${big ? 'gap-5 p-8' : 'gap-4 p-5'} ${className}`}
    >
      <span aria-hidden className="pointer-events-none absolute -top-16 left-1/2 -z-10 size-48 -translate-x-1/2 rounded-pill bg-brand/50 blur-3xl" />
      <span className={`grid place-items-center rounded-cell bg-brand text-brand-ink shadow-3 ring-1 ring-inverse-line ${big ? 'size-14 text-2xl' : 'size-12 text-xl'} font-medium`}>
        R
      </span>
      <div>
        <h2 className={`font-medium tracking-tight text-inverse-ink ${big ? 'text-h3 text-xl' : 'text-lg'}`}>Get Raqm</h2>
        <p className="mt-2 text-sm leading-snug text-inverse-ink/70">
          An expense tracker that reads your bank SMS on your phone and shows where your money goes.
        </p>
      </div>
      <Link
        href="/#waitlist"
        className="inline-flex min-h-[38px] items-center justify-center rounded-pill bg-inverse-ink px-5 text-sm font-semibold text-inverse transition-opacity duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inverse-ink motion-reduce:transition-none"
      >
        Join the waitlist
      </Link>
      <p className="text-xs text-inverse-ink/60">Pre-launch. Email only, no account.</p>
    </aside>
  );
}
