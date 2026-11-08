import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ALTERNATIVES, getAlternative } from '@/content/alternatives';
import { pageMeta } from '@/lib/seo/meta';
import { breadcrumbNode, faqPageNode, graph, siteNodes, webPageNode } from '@/lib/seo/schema';
import { JsonLd } from '@/components/content/JsonLd';
import { Rise } from '@/components/content/Rise';
import { ComparisonCard } from '@/components/sections/ComparisonCard';
import { FaqAccordion } from '@/components/sections/FaqAccordion';
import { Disclaimer } from '@/components/alternatives/Disclaimer';
import { RelatedStrip } from '@/components/alternatives/RelatedStrip';
import { formatVerified } from '@/components/alternatives/format';

export const dynamicParams = false;

export function generateStaticParams() {
  return ALTERNATIVES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const alt = getAlternative(slug);
  if (!alt) return {};
  return pageMeta(`/alternatives/${alt.slug}`, alt.seoTitle, alt.seoDescription);
}

const H2 = 'mb-5 scroll-mt-28 text-[28px] font-semibold leading-8 tracking-tight text-ink';
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export default async function AlternativePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const alt = getAlternative(slug);
  if (!alt) notFound();

  const path = `/alternatives/${alt.slug}`;
  const verified = formatVerified(alt.verifiedOn);

  return (
    <main id="main-content" className="px-4 pb-24 pt-28 sm:px-6 sm:pt-36">
      <JsonLd
        data={graph(
          ...siteNodes(),
          webPageNode('WebPage', path, alt.seoTitle, alt.seoDescription, { dateModified: alt.verifiedOn }),
          breadcrumbNode(path, [
            { name: 'Alternatives', path: '/alternatives' },
            { name: alt.name, path },
          ]),
          faqPageNode(path, alt.faq),
        )}
      />
      <div className="mx-auto max-w-col">
        <div className="mx-auto max-w-3xl">
          <nav aria-label="Breadcrumb" className="mb-8 text-sm text-ink-muted">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li>
                <Link href="/" className={`rounded-tag hover:text-ink ${FOCUS}`}>
                  Home
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href="/alternatives" className={`rounded-tag hover:text-ink ${FOCUS}`}>
                  Alternatives
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li aria-current="page" className="text-ink">
                {alt.name}
              </li>
            </ol>
          </nav>

          <Rise as="header">
            <p className="inline-flex items-center gap-2 rounded-pill bg-surface py-1.5 pl-3 pr-3.5 text-sm font-semibold text-ink shadow-ring">
              <span aria-hidden className="size-2 rounded-pill bg-brand" />
              Last verified <time dateTime={alt.verifiedOn}>{verified}</time>
            </p>
            <h1 className="mt-5 text-h1 text-balance text-ink">{alt.h1}</h1>
            <p className="mt-4 max-w-xl text-lead text-ink-muted">{alt.lede}</p>
            {alt.nameNote && <p className="mt-3 text-sm text-ink-subtle">{alt.nameNote}</p>}
          </Rise>
        </div>

        <section aria-label={`Raqm compared with ${alt.name}`} className="mt-12">
          <ComparisonCard rows={alt.rows} featureLabel="Features" otherLabel={alt.name} binaryMarks raqmFooter={null} />
        </section>

        <div className="mx-auto max-w-[720px]">
          <section aria-labelledby="faq" className="mt-16">
            <h2 id="faq" className={H2}>
              Common questions
            </h2>
            <FaqAccordion variant="light" categories={[{ id: 'alt', label: 'Questions', items: alt.faq }]} compact />
          </section>

          <section aria-labelledby="sources" className="mt-14">
            <h2 id="sources" className={H2}>
              Sources
            </h2>
            <ol className="list-decimal space-y-2 pl-6 text-base text-ink-muted marker:font-mono marker:text-ink-subtle">
              {alt.sources.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className={`rounded-tag text-ink underline decoration-line underline-offset-4 hover:decoration-ink ${FOCUS}`}>
                    {s.label}
                  </a>
                </li>
              ))}
            </ol>
          </section>

          <div className="mt-10">
            <Disclaimer name={alt.name} verifiedOn={alt.verifiedOn} />
          </div>

          <RelatedStrip currentSlug={alt.slug} />
        </div>
      </div>
    </main>
  );
}
