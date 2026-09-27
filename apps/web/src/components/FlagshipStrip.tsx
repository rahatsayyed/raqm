import Link from 'next/link';
import { featureDeepDives } from '@/lib/features-data';
import { ScrollReveal } from './ScrollReveal';

const CARD_VARIANTS = [
  {
    card: 'bg-surface border-border-subtle lg:mt-0',
    title: 'text-ink-headline',
    body: 'text-ink-body',
    cta: 'text-accent-primary',
  },
  {
    card: 'bg-surface-raised border-border-subtle ring-[6px] ring-bg -mt-6 lg:-ml-12 lg:mt-12',
    title: 'text-ink-headline',
    body: 'text-ink-body',
    cta: 'text-accent-primary',
  },
  {
    card: 'bg-ink-headline border-ink-headline ring-[6px] ring-bg -mt-6 lg:-ml-12 lg:mt-24',
    title: 'text-surface',
    body: 'text-[color-mix(in_srgb,var(--color-surface)_72%,transparent)]',
    cta: 'text-accent-deep',
  },
];

export function FlagshipStrip() {
  return (
    <ScrollReveal className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <span className="mb-3 block font-mono text-xs text-ink-label opacity-60">03 / 04</span>
      <h2 className="mb-10 text-balance font-display text-4xl text-ink-headline sm:text-5xl">Go deeper</h2>
      <div className="flex flex-col lg:flex-row lg:items-start">
        {featureDeepDives.map((feature, index) => {
          const variant = CARD_VARIANTS[index % CARD_VARIANTS.length];
          const isLive = feature.status === 'live';
          const isDark = index === 2;
          return (
            <Link
              key={feature.slug}
              href={`/features/${feature.slug}`}
              style={{ zIndex: index + 1 }}
              className={`relative flex min-h-[260px] flex-col rounded-[20px] border p-7 pb-12 transition-transform duration-200 hover:!z-20 hover:-translate-y-2 focus-visible:!z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary active:translate-y-0 active:scale-[0.99] sm:p-9 sm:pb-14 lg:min-h-[340px] lg:flex-1 lg:pr-20 ${variant.card}`}
            >
              <span
                className={`w-fit rounded-full px-3 py-1 font-body text-xs font-medium ${
                  isLive
                    ? 'bg-accent-deep text-accent-primary'
                    : isDark
                      ? 'bg-[color-mix(in_srgb,var(--color-surface)_12%,transparent)] text-[color-mix(in_srgb,var(--color-surface)_75%,transparent)]'
                      : 'bg-surface text-ink-label'
                }`}
              >
                {feature.statusLabel}
              </span>
              <h3 className={`mt-6 font-display text-3xl leading-tight sm:text-4xl ${variant.title}`}>{feature.name}</h3>
              <p className={`mt-3 max-w-xs font-body text-base ${variant.body}`}>{feature.tagline}</p>
              <span className={`mt-auto pt-8 font-body text-sm font-medium ${variant.cta}`}>Read more →</span>
            </Link>
          );
        })}
      </div>
    </ScrollReveal>
  );
}
