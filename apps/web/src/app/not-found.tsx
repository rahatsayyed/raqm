import type { Metadata } from 'next';
import { Button } from '@/components/ui';

export const metadata: Metadata = {
  title: { absolute: 'Page not found | Raqm' },
  robots: { index: false, follow: false },
};

const LINKS = [
  { label: 'Features', href: '/features' },
  { label: 'Blog', href: '/blog' },
  { label: 'FAQ', href: '/faq' },
  { label: 'Compare', href: '/free' },
];

export default function NotFound() {
  return (
    <main id="main-content" className="mx-auto flex max-w-col flex-col items-center px-6 pb-section-lg pt-40 text-center md:pt-44">
      <span aria-hidden="true" className="grid size-14 place-items-center rounded-cell bg-brand font-mono text-2xl leading-none text-brand-ink">
        R
      </span>
      <p className="mt-6 font-mono text-sm text-ink-subtle">404</p>
      <h1 className="mt-3 text-h1 text-balance">That page is not here</h1>
      <p className="mx-auto mt-4 max-w-xl text-lead text-ink-muted">The link may be old or mistyped. Head back home or try one of these.</p>
      <Button href="/" size="lg" className="mt-8">
        Back to home
      </Button>
      <ul className="mt-6 flex flex-wrap justify-center gap-2">
        {LINKS.map((link) => (
          <li key={link.href}>
            <Button href={link.href} variant="secondary" size="sm">
              {link.label}
            </Button>
          </li>
        ))}
      </ul>
    </main>
  );
}
