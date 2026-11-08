import Link from 'next/link';
import { StoreBadgesWithQr } from './AppStoreBadges';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/features' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Compare', href: '/free' },
      { label: 'Download', href: '/download' },
      { label: 'Join waitlist', href: '/#waitlist' },
    ],
  },
  {
    title: 'Learn',
    links: [
      { label: 'Blog', href: '/blog' },
      { label: 'FAQ', href: '/faq' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Privacy', href: '/privacy' },
    ],
  },
];

const LINK =
  'relative inline-flex text-[14px] font-semibold leading-[17px] text-inverse-ink/50 transition-colors duration-150 after:absolute after:-inset-x-1 after:-inset-y-[6px] hover:text-inverse-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inverse-ink motion-reduce:transition-none';

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={LINK}>
      {children}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="bg-inverse px-4 pb-10 pt-20 text-inverse-ink md:px-6">
      <div className="mx-auto flex w-full max-w-col flex-col">
        <div className="relative mb-16 flex min-h-[720px] flex-col overflow-hidden rounded-card-lg bg-surface text-ink md:min-h-[500px] md:flex-row md:items-center">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -right-24 size-[360px] md:-top-24 md:bottom-auto md:size-[520px]"
          >
            <div className="absolute inset-0 rounded-full bg-brand-soft" />
            <div className="absolute inset-8 rounded-full bg-surface/70 shadow-ring md:inset-12" />
            <div className="absolute inset-20 rounded-full bg-brand-soft shadow-ring md:inset-28" />
            <div className="absolute inset-32 rounded-full bg-brand md:inset-44" />
          </div>
          <div className="relative flex w-full flex-col items-start gap-8 px-4 pb-4 pt-10 md:w-[504px] md:gap-12 md:px-10 md:py-0">
            <span
              aria-hidden="true"
              className="grid size-[52px] place-items-center rounded-cell bg-brand font-mono text-xl text-brand-ink shadow-2"
            >
              R
            </span>
            <div>
              <h2 className="mb-4 font-sans text-h2 text-balance text-ink max-md:text-[34px] max-md:leading-[37px]">
                Know where your money went, without handing it over.
              </h2>
              <p className="max-w-[320px] font-sans text-lg font-medium leading-[22px] text-ink-muted">
                Join the waitlist with just an email. No account, no card.
              </p>
            </div>
            <StoreBadgesWithQr align="start" className="w-full" />
          </div>
        </div>

        <div className="mb-16 flex flex-col items-start gap-8 md:flex-row md:justify-between">
          <div className="max-w-[260px]">
            <p className="mb-4 flex h-6 items-center gap-2.5 font-sans text-xl font-semibold leading-5 tracking-[-0.02em]">
              <span
                aria-hidden="true"
                className="grid size-7 place-items-center rounded-tag bg-brand font-mono text-sm leading-none text-brand-ink"
              >
                R
              </span>
              Raqm
            </p>
            <p className="font-sans text-sm font-medium leading-4 text-inverse-ink/50">
              A private expense tracker that works on your phone.
            </p>
          </div>
          <nav aria-label="Footer" className="flex flex-col gap-8 md:flex-row md:gap-[46px]">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="mb-4 font-sans text-sm font-semibold leading-[17px] text-inverse-ink">{column.title}</h3>
                <ul className="flex flex-col gap-2">
                  {column.links.map((link) => (
                    <li key={link.label} className="py-px">
                      <FooterLink href={link.href}>{link.label}</FooterLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="flex flex-col gap-6 border-t border-inverse-line pt-12 font-sans text-xs font-semibold text-inverse-ink/50 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-0.5">
            <p className="leading-[15px]">&copy; {new Date().getFullYear()} Raqm. All rights reserved.</p>
            <ul className="flex items-center gap-1.5 leading-[15px]">
              <li>
                <Link href="/privacy" className="transition-colors duration-150 hover:text-inverse-ink motion-reduce:transition-none">
                  Privacy
                </Link>
              </li>
              <li aria-hidden="true">&bull;</li>
              <li>
                <Link href="/about" className="transition-colors duration-150 hover:text-inverse-ink motion-reduce:transition-none">
                  About
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
