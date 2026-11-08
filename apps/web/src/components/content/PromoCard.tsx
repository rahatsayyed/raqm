import Link from 'next/link';

export function PromoCard({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-container bg-inverse p-6 text-inverse-ink shadow-3 ${className}`}>
      <p className="font-mono text-xs tracking-wide text-inverse-ink/60 uppercase">Raqm</p>
      <p className="mt-3 text-h3 text-inverse-ink">Know where your money goes, automatically.</p>
      <p className="mt-2 text-sm text-inverse-ink/70">
        Bank SMS read on your phone. Nothing leaves the device. Join the waitlist.
      </p>
      <Link
        href="/#waitlist"
        className="mt-5 inline-flex rounded-pill bg-brand px-5 py-2.5 text-sm font-medium text-brand-ink transition-transform duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inverse-ink"
      >
        Join the waitlist
      </Link>
    </div>
  );
}
