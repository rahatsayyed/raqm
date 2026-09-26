import { notFound } from 'next/navigation';
import Link from 'next/link';
import { featureDeepDives, getFeatureBySlug } from '@/lib/features-data';
import { WaitlistForm } from '@/components/WaitlistForm';

export function generateStaticParams() {
  return featureDeepDives.map((feature) => ({ slug: feature.slug }));
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);

  if (!feature) {
    notFound();
  }

  return (
    <main id="main-content" className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="mb-8 inline-block font-body text-sm text-ink-label hover:text-accent-primary">
        ← Back to Raqm
      </Link>
      <span
        className={`mb-4 inline-block w-fit rounded-dot px-2 py-1 font-body text-xs font-medium ${
          feature.status === 'live' ? 'bg-accent-deep text-accent-primary' : 'bg-[var(--color-surface-raised)] text-ink-label'
        }`}
      >
        {feature.statusLabel}
      </span>
      <h1 className="mb-4 font-display text-4xl text-ink-headline">{feature.name}</h1>
      <p className="mb-8 font-body text-lg text-ink-body">{feature.tagline}</p>
      <div className="mb-12 flex flex-col gap-4">
        {feature.paragraphs.map((paragraph, index) => (
          <p key={index} className="font-body text-base text-ink-body">
            {paragraph}
          </p>
        ))}
      </div>
      <div className="glass-card p-8">
        <h2 className="mb-3 font-display text-xl text-ink-headline">Get early access</h2>
        <WaitlistForm source={`feature_${feature.slug}`} />
      </div>
    </main>
  );
}
