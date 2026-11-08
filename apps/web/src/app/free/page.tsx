import { ComparisonCard } from '@/components/sections/ComparisonCard';
import { Button } from '@/components/ui';
import { PageHeader } from '@/components/content/PageHeader';
import { Rise } from '@/components/content/Rise';
import { FREE_ROWS } from '@/content/comparison';
import { pageMeta } from '@/content/meta';

export const metadata = pageMeta(
  '/free',
  'Raqm vs other finance apps · Raqm',
  'See how Raqm differs from typical finance apps: no bank linking, no account, and your data stays on your phone.',
);

export default function FreePage() {
  return (
    <main id="main-content" className="pb-section-lg">
      <PageHeader
        eyebrow="Raqm vs other apps"
        title="The same clear picture, without handing over your data"
        sub="Most finance apps want a bank login and a server. Raqm reads the SMS you already have, on your phone."
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
