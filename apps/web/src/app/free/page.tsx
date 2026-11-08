import { ComparisonCard } from '@/components/sections/ComparisonCard';
import { Button } from '@/components/ui';
import { PageHeader } from '@/components/content/PageHeader';
import { Rise } from '@/components/content/Rise';
import { FREE_ROWS } from '@/content/comparison';
import { pageMeta } from '@/content/meta';
import { JsonLd } from '@/components/content/JsonLd';
import { PAGE_SEO } from '@/lib/seo/pages';
import { breadcrumbNode, graph, siteNodes, webPageNode } from '@/lib/seo/schema';

export const metadata = pageMeta('/free');

export default function FreePage() {
  return (
    <main id="main-content" className="pb-section-lg">
      <JsonLd
        data={graph(
          ...siteNodes(),
          webPageNode('WebPage', '/free', PAGE_SEO['/free'].title, PAGE_SEO['/free'].description),
          breadcrumbNode('/free', [{ name: 'Raqm vs other apps', path: '/free' }]),
        )}
      />
      <PageHeader
        eyebrow="Raqm vs other apps"
        title="An expense tracker without bank login or sign-up"
        sub="A side-by-side look at how Raqm works: it reads the SMS you already have, on your phone, with no bank login and no account. This is a comparison, not a pricing page."
      />
      <div className="px-4 sm:px-6">
        <Rise className="mx-auto max-w-col">
          <ComparisonCard rows={FREE_ROWS} featureLabel="Features" otherLabel="Other apps" />
        </Rise>
        <Rise className="mx-auto mt-12 max-w-col text-center">
          <p className="mx-auto max-w-md text-lead text-ink-muted">Android and iPhone are coming soon. Join the waitlist and we will let you know.</p>
          <Button href="/#waitlist" size="lg" className="mt-6">
            Join the waitlist
          </Button>
        </Rise>
      </div>
    </main>
  );
}
