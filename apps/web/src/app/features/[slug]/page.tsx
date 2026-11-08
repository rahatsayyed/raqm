import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { featureDeepDives, getFeatureBySlug } from '@/lib/features-data';
import { WaitlistForm } from '@/components/WaitlistForm';
import { ScrollToTop } from '@/components/ScrollToTop';
import { JsonLd } from '@/components/content/JsonLd';
import { pageMeta } from '@/lib/seo/meta';
import { FEATURE_SEO } from '@/lib/seo/pages';
import { breadcrumbNode, graph, siteNodes, webPageNode } from '@/lib/seo/schema';

export function generateStaticParams() {
  return featureDeepDives.map((feature) => ({ slug: feature.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);

  if (!feature) {
    return {};
  }

  return pageMeta(`/features/${feature.slug}`, feature.name, feature.tagline);
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);

  if (!feature) {
    notFound();
  }

  const isLive = feature.status === 'live';
  const path = `/features/${feature.slug}`;
  const seo = FEATURE_SEO[feature.slug];

  return (
    <main id="main-content" className="min-h-dvh px-4 pb-24 pt-28 sm:px-6 sm:pt-36">
      <JsonLd
        data={graph(
          ...siteNodes(),
          webPageNode('WebPage', path, seo?.title ?? feature.name, seo?.description ?? feature.tagline),
          breadcrumbNode(path, [
            { name: 'Features', path: '/features' },
            { name: feature.name, path },
          ]),
        )}
      />
      <ScrollToTop />
      <div className="mx-auto max-w-3xl">
        <Link href="/features" className="mb-8 inline-block rounded-pill text-sm text-ink-muted hover:text-ink">
          ← All features
        </Link>
        <span
          className={`mb-4 block w-fit rounded-pill px-3 py-1 text-xs font-medium ${isLive ? 'bg-brand-soft text-brand' : 'bg-surface-sunken text-ink-muted'}`}
        >
          {feature.statusLabel}
        </span>
        <h1 className="mb-4 text-h2 text-ink">{feature.h1}</h1>
        <p className="mb-12 text-lead text-ink-muted">{feature.tagline}</p>
        <div className="mb-16 flex flex-col divide-y divide-line">
          {feature.sections.map((section, index) => (
            <div key={section.heading} className="grid grid-cols-1 gap-2 py-7 first:pt-0 sm:grid-cols-[10rem_1fr] sm:gap-8">
              <span className="font-mono text-xs text-ink-subtle">{String(index + 1).padStart(2, '0')}</span>
              <div>
                <h3 className="mb-2 text-h3 text-ink">{section.heading}</h3>
                <p className="text-base text-ink-muted">{section.body}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-container bg-surface p-8 shadow-ring">
          <h2 className="mb-3 text-h3 text-ink">Get early access</h2>
          <WaitlistForm source={`feature_${feature.slug}`} />
        </div>
      </div>
    </main>
  );
}
