import Link from 'next/link';
import { PageHeader } from '@/components/content/PageHeader';
import { Rise } from '@/components/content/Rise';
import { StoreBadge } from '@/components/content/StoreBadge';
import { pageMeta } from '@/content/meta';
import { JsonLd } from '@/components/content/JsonLd';
import { PAGE_SEO } from '@/lib/seo/pages';
import { breadcrumbNode, graph, siteNodes, webPageNode } from '@/lib/seo/schema';

export const metadata = pageMeta('/download');

const PLATFORMS = [
  {
    store: 'android' as const,
    name: 'Android',
    status: 'Coming soon',
    text: 'The full experience: Raqm reads your bank SMS on the phone and builds your transactions automatically. Not published yet.',
  },
  {
    store: 'ios' as const,
    name: 'iPhone',
    status: 'In progress',
    text: 'iOS does not let apps read SMS, so the iPhone version uses manual entry. Still being built.',
  },
];

export default function DownloadPage() {
  return (
    <main id="main-content" className="pb-section-lg">
      <JsonLd
        data={graph(
          ...siteNodes(),
          webPageNode('WebPage', '/download', PAGE_SEO['/download'].title, PAGE_SEO['/download'].description),
          breadcrumbNode('/download', [{ name: 'Download', path: '/download' }]),
        )}
      />
      <PageHeader
        eyebrow="Download"
        title="Not on the stores yet"
        sub="Raqm is pre-launch. The waitlist is the way to be told the day it is ready."
      />
      <div className="mx-auto grid max-w-col gap-2 px-6 sm:grid-cols-2">
        {PLATFORMS.map((p, i) => (
          <Rise key={p.name} index={i} className="flex flex-col items-start gap-5 rounded-container bg-surface p-8 shadow-ring">
            <div className="flex w-full items-center justify-between">
              <h2 className="text-h3 text-ink">{p.name}</h2>
              <span className="rounded-pill bg-brand-soft px-3 py-1 text-xs font-medium text-ink">{p.status}</span>
            </div>
            <p className="text-ink-muted">{p.text}</p>
            <StoreBadge store={p.store} />
          </Rise>
        ))}
      </div>
      <Rise className="mx-auto mt-10 max-w-col px-6 text-center">
        <Link
          href="/#waitlist"
          className="inline-flex rounded-pill bg-brand px-7 py-3.5 font-medium text-brand-ink shadow-1 transition-transform duration-150 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Join the waitlist
        </Link>
        <p className="mt-4 text-sm text-ink-subtle">Email only. No account.</p>
      </Rise>
    </main>
  );
}
