import Link from 'next/link';
import { absoluteUrl } from '@/content/site';
import { pageMeta } from '@/lib/seo/meta';
import { PAGE_SEO } from '@/lib/seo/pages';
import { breadcrumbNode, graph, itemListNode, siteNodes, webPageNode } from '@/lib/seo/schema';
import { comingSoonFeatures, hubFeatures } from '@/lib/features-data';
import { JsonLd } from '@/components/content/JsonLd';
import { FeatureHubCard } from '@/components/features/FeatureHubCard';
import { FeaturesMotion } from '@/components/features/FeaturesMotion';
import { PromoRail } from '@/components/features/PromoRail';

export const metadata = pageMeta('/features');

const jsonLd = graph(
  ...siteNodes(),
  webPageNode('CollectionPage', '/features', PAGE_SEO['/features'].title, PAGE_SEO['/features'].description, {
    mainEntity: { '@id': `${absoluteUrl('/features')}#list` },
  }),
  itemListNode('/features', hubFeatures.map((f) => ({ name: f.name, path: `/features/${f.slug}` }))),
  breadcrumbNode('/features', [{ name: 'Features', path: '/features' }]),
);

export default function FeaturesPage() {
  const [featured, ...rest] = hubFeatures;
  return (
    <main id="main-content" className="px-4 pb-24 pt-28 sm:px-6 sm:pt-36">
      <JsonLd data={jsonLd} />
      <FeaturesMotion className="mx-auto max-w-col">
        <header className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span data-reveal className="inline-flex items-center gap-2 rounded-pill bg-surface py-1.5 pl-2 pr-3.5 text-sm font-semibold text-ink shadow-ring">
            <span className="grid size-6 place-items-center rounded-pill bg-inverse text-inverse-ink">
              <svg aria-hidden viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />
              </svg>
            </span>
            Features
          </span>
          <h1 data-reveal className="mt-5 text-h1 text-balance text-ink">
            Everything Raqm does with your money
          </h1>
          <p data-reveal className="mt-4 max-w-xl text-lead text-ink-muted">
            From the bank SMS to a clear month, in rupees. Pick a feature to see how it works, all of it on your phone.
          </p>
        </header>

        <div className="mt-12 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3 lg:mt-16">
          <div data-reveal className="sm:col-span-2">
            <FeatureHubCard feature={featured} variant="featured" />
          </div>
          <div data-reveal className="sm:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <PromoRail variant="tile" className="h-full justify-center" />
          </div>
          {rest.map((f) => (
            <div key={f.slug} data-reveal className="[&>a]:h-full">
              <FeatureHubCard feature={f} />
            </div>
          ))}
        </div>

        <section data-reveal aria-labelledby="coming-later" className="mt-20 max-w-[720px] border-t border-line pt-10">
          <h2 id="coming-later" className="text-h3 text-ink">
            Coming later
          </h2>
          <p className="mt-3 leading-relaxed">
            Two features are on the way and not available yet. Both stay opt-in, and the on-device tracking works the same without them.
          </p>
          <ul className="mt-4 space-y-2">
            {comingSoonFeatures.map((f) => (
              <li key={f.slug}>
                <Link
                  href={`/features/${f.slug}`}
                  className="rounded-tag font-semibold text-ink underline decoration-line underline-offset-4 transition-colors duration-150 hover:decoration-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                >
                  {f.name}
                </Link>
                <span className="text-ink-muted">: {f.tagline}</span>
              </li>
            ))}
          </ul>
        </section>
      </FeaturesMotion>
    </main>
  );
}
