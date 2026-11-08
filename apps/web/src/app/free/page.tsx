import { ComparisonCard, type ComparisonRow } from '@/components/sections/ComparisonCard';
import { Button } from '@/components/ui';
import { PageHeader } from '@/components/content/PageHeader';
import { Rise } from '@/components/content/Rise';
import { pageMeta } from '@/content/meta';

export const metadata = pageMeta(
  '/free',
  'Raqm vs other finance apps · Raqm',
  'See how Raqm differs from typical finance apps: no bank linking, no account, and your data stays on your phone.',
);

const ROWS: ComparisonRow[] = [
  { feature: 'Bank login or account linking', other: 'Often asked for', raqm: 'Not needed' },
  { feature: 'Where your data is processed', other: 'Often on company servers', raqm: 'On your phone' },
  { feature: 'Sign-up to use it', other: 'Usually an account', raqm: 'No account' },
  { feature: 'Capturing transactions (Android)', other: 'Manual entry or linked accounts', raqm: 'Reads bank SMS automatically' },
  { feature: 'Moves between your own accounts', other: 'Can count as spending', raqm: 'Detected, kept out of totals' },
  { feature: 'Refunds', other: 'Varies by app', raqm: 'Netted against the original category' },
  { feature: 'Deleting a transaction', other: 'Varies by app', raqm: 'Soft delete, restorable' },
  { feature: 'Taking your data with you', other: 'Varies by app', raqm: 'Export your transactions' },
];

export default function FreePage() {
  return (
    <main id="main-content" className="pb-section-lg">
      <PageHeader
        eyebrow="Raqm vs other apps"
        title="The same clear picture, without handing over your data"
        sub="Most finance apps want a bank login and a server. Raqm reads the SMS you already have, on your phone."
      />
      <Rise className="mx-auto max-w-col px-6">
        <ComparisonCard rows={ROWS} featureLabel="Features" otherLabel="Other apps" />
        <p className="mt-4 text-center text-sm text-ink-subtle">
          &ldquo;Other apps&rdquo; describes common patterns, not any one product. Raqm is pre-launch.
        </p>
      </Rise>
      <Rise className="mx-auto mt-12 flex max-w-col justify-center px-6">
        <Button href="/#waitlist" size="lg">
          Join the waitlist
        </Button>
      </Rise>
    </main>
  );
}
