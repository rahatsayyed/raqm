import { ViewTransition } from 'react';
import Link from 'next/link';
import { featureDeepDives, FEATURE_CARD_VARIANTS, featureViewTransitionName } from '@/lib/features-data';
import { ScrollReveal } from './ScrollReveal';

export function FlagshipStrip() {
  return (
    <ScrollReveal id="go-deeper" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <span className="mb-3 block font-mono text-xs text-ink-label opacity-60">03 / 04</span>
      <h2 className="mb-10 text-balance font-display text-4xl text-ink-headline sm:text-5xl">Go deeper</h2>
      <div className="flex flex-col lg:flex-row lg:items-start">
        {featureDeepDives.map((feature, index) => {
          const variant = FEATURE_CARD_VARIANTS[index % FEATURE_CARD_VARIANTS.length];
          const isLive = feature.status === 'live';
          return (
            <Link
              key={feature.slug}
              href={`/features/${feature.slug}`}
              style={{ zIndex: index + 1 }}
              className="relative flex min-h-[260px] flex-col transition-transform duration-200 hover:!z-20 hover:-translate-y-2 focus-visible:!z-20 active:translate-y-0 active:scale-[0.99] lg:min-h-[340px] lg:flex-1"
            >
              <ViewTransition name={featureViewTransitionName(feature.slug)} share="morph" default="none">
                <div
                  className={`flex h-full flex-col rounded-[20px] border p-7 pb-12 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary sm:p-9 sm:pb-14 lg:pr-20 ${variant.card}`}
                >
                  <span className={`w-fit rounded-full px-3 py-1 font-body text-xs font-medium ${isLive ? variant.badgeLive : variant.badgeMuted}`}>
                    {feature.statusLabel}
                  </span>
                  <h3 className={`mt-6 font-display text-3xl leading-tight sm:text-4xl ${variant.title}`}>{feature.name}</h3>
                  <p className={`mt-3 max-w-xs font-body text-base ${variant.body}`}>{feature.tagline}</p>
                  <span className={`mt-auto pt-8 font-body text-sm font-medium ${variant.cta}`}>Read more →</span>
                </div>
              </ViewTransition>
            </Link>
          );
        })}
      </div>
    </ScrollReveal>
  );
}
