import Link from 'next/link';
import { Button } from './ui/Button';
import { Container } from './ui/Container';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'Features', href: '/#features' },
      { label: 'How it works', href: '/#how-it-works' },
      { label: 'Download', href: '/download' },
      { label: 'Join waitlist', href: '/#waitlist' },
    ],
  },
  {
    title: 'Tools',
    links: [
      { label: 'All tools', href: '/tools' },
      { label: 'Free to use', href: '/free' },
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

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-block rounded-tag py-1 font-sans text-[15px] text-inverse-ink/60 transition-colors duration-150 hover:text-inverse-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-inverse-ink"
    >
      {children}
    </Link>
  );
}

export function Footer() {
  return (
    <footer className="bg-inverse px-4 pb-10 pt-20 text-inverse-ink md:px-6">
      <Container className="px-0">
        <div className="relative overflow-hidden rounded-card-lg bg-surface text-ink">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 hidden size-[520px] md:block">
            <div className="absolute inset-0 rounded-full bg-brand-soft" />
            <div className="absolute inset-12 rounded-full bg-surface/70 shadow-ring" />
            <div className="absolute inset-28 rounded-full bg-brand-soft shadow-ring" />
            <div className="absolute inset-44 rounded-full bg-brand" />
          </div>
          <div className="relative flex max-w-[600px] flex-col items-start gap-8 p-8 md:gap-10 md:p-14">
            <span aria-hidden="true" className="grid size-[52px] place-items-center rounded-cell bg-brand font-mono text-xl text-brand-ink">
              R
            </span>
            <div className="flex flex-col gap-4">
              <h2 className="font-sans text-h2 text-balance text-ink">Know where your money went, without handing it over.</h2>
              <p className="font-sans text-lg leading-7 text-ink-muted">Join the waitlist with just an email. No account, no card.</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button href="/#waitlist" size="lg">
                Join waitlist
              </Button>
              <Button href="/download" variant="secondary" size="lg">
                Download
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col justify-between gap-12 md:mt-20 md:flex-row">
          <div className="max-w-[260px]">
            <p className="flex items-center gap-2 font-sans text-xl font-semibold tracking-[-0.02em]">Raqm</p>
            <p className="mt-3 font-sans text-sm leading-5 text-inverse-ink/60">
              A private expense tracker that works on your phone.
            </p>
          </div>
          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-10 gap-y-10 sm:grid-cols-4 md:gap-x-14">
            {COLUMNS.map((column) => (
              <div key={column.title}>
                <h3 className="font-sans text-sm font-semibold text-inverse-ink">{column.title}</h3>
                <ul className="mt-3 flex flex-col">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <FooterLink href={link.href}>{link.label}</FooterLink>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-14 flex flex-col gap-3 border-t border-inverse-line pt-6 font-sans text-[13px] text-inverse-ink/50 sm:flex-row sm:items-center sm:justify-between">
          <p>&copy; {new Date().getFullYear()} Raqm. All rights reserved.</p>
          <ul className="flex gap-5">
            <li>
              <Link href="/privacy" className="transition-colors duration-150 hover:text-inverse-ink">
                Privacy
              </Link>
            </li>
            <li>
              <Link href="/about" className="transition-colors duration-150 hover:text-inverse-ink">
                About
              </Link>
            </li>
          </ul>
        </div>
      </Container>
    </footer>
  );
}
