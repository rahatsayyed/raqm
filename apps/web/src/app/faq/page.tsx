import { FaqAccordion } from '@/components/sections/FaqAccordion';
import { JsonLd } from '@/components/content/JsonLd';
import { PageHeader } from '@/components/content/PageHeader';
import { FAQ_GROUPS, FAQ_UPDATED } from '@/content/faq';
import { pageMeta } from '@/content/meta';
import { formatDate } from '@/content/posts';
import { absoluteUrl } from '@/content/site';

export const metadata = pageMeta(
  '/faq',
  'FAQ · Raqm',
  'Answers about Raqm: how it reads bank SMS on your phone, privacy, supported banks, budgets and exports.',
);

export default function FaqPage() {
  return (
    <main id="main-content">
      <JsonLd
        data={[
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: FAQ_GROUPS.flatMap((g) => g.items).map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          },
          {
            '@context': 'https://schema.org',
            '@type': 'BreadcrumbList',
            itemListElement: [
              { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
              { '@type': 'ListItem', position: 2, name: 'FAQ', item: absoluteUrl('/faq') },
            ],
          },
        ]}
      />
      <PageHeader eyebrow="FAQ" title="Frequently asked questions" sub="Short, honest answers. If something is missing, tell us.">
        <p className="mx-auto mt-6 inline-flex items-center gap-2 rounded-pill bg-surface-sunken px-4 py-1.5 text-[13px] text-ink-muted">
          <span className="size-1.5 rounded-pill bg-brand" aria-hidden="true" />
          Last updated {formatDate(FAQ_UPDATED)}
        </p>
      </PageHeader>
      <div className="mx-auto max-w-col px-4 pb-section-lg sm:px-6">
        <div className="rounded-container bg-surface px-5 pb-2 pt-5 shadow-ring sm:px-8">
          <FaqAccordion variant="light" categories={FAQ_GROUPS} showChips showSearch />
        </div>
      </div>
    </main>
  );
}
