import type { Metadata } from 'next';
import { ViewTransition } from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { featureDeepDives, getFeatureBySlug, getFeatureCardVariant, featureViewTransitionName } from '@/lib/features-data';
import { WaitlistForm } from '@/components/WaitlistForm';

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

  return {
    title: `${feature.name} · Raqm`,
    description: feature.tagline,
  };
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const feature = getFeatureBySlug(slug);

  if (!feature) {
    notFound();
  }

  const variant = getFeatureCardVariant(slug);
  const isLive = feature.status === 'live';

  return (
    <ViewTransition name={featureViewTransitionName(slug)} share="morph" default="none">
      <main id="main-content" className={`min-h-dvh px-4 pb-24 pt-10 sm:px-6 sm:pt-14 ${variant.bandBg}`}>
        <div className="mx-auto max-w-3xl">
          <Link href="/#go-deeper" className={`mb-8 inline-block font-body text-sm opacity-70 hover:opacity-100 ${variant.title}`}>
            ← Back to Raqm
          </Link>
          <span className={`mb-4 block w-fit rounded-full px-3 py-1 font-body text-xs font-medium ${isLive ? variant.badgeLive : variant.badgeMuted}`}>
            {feature.statusLabel}
          </span>
          <h1 className={`mb-4 font-display text-4xl sm:text-5xl ${variant.title}`}>{feature.name}</h1>
          <p className={`mb-12 font-body text-lg ${variant.body}`}>{feature.tagline}</p>
          <div className="mb-12 flex flex-col gap-4">
            {feature.paragraphs.map((paragraph, index) => (
              <p key={index} className={`font-body text-base ${variant.body}`}>
                {paragraph}
              </p>
            ))}
          </div>
          <div className={`${variant.panel} p-8`}>
            <h2 className={`mb-3 font-display text-xl ${variant.title}`}>Get early access</h2>
            <WaitlistForm source={`feature_${feature.slug}`} />
          </div>
        </div>
      </main>
    </ViewTransition>
  );
}
