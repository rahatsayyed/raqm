import Link from 'next/link';
import { featureDeepDives } from '@/lib/features-data';
import { ScrollReveal } from './ScrollReveal';

export function FlagshipStrip() {
  return (
    <ScrollReveal className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="mb-8 text-balance font-display text-2xl text-ink-headline sm:text-3xl">Go deeper</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:grid-rows-2">
        {featureDeepDives.map((feature, index) => (
          <Link
            key={feature.slug}
            href={`/features/${feature.slug}`}
            className={`glass-card flex flex-col gap-2 p-6 transition-[transform,background-color,border-color] duration-150 hover:-translate-y-0.5 hover:border-accent-primary/30 hover:bg-[color-mix(in_srgb,var(--glass-bg),white_15%)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary active:translate-y-0 active:scale-[0.99] ${
              index === 0 ? 'sm:row-span-2' : ''
            }`}
          >
            <span
              className={`w-fit rounded-dot px-2 py-1 font-body text-xs font-medium ${
                feature.status === 'live'
                  ? 'bg-accent-deep text-accent-primary'
                  : 'bg-[var(--color-surface-raised)] text-ink-label'
              }`}
            >
              {feature.statusLabel}
            </span>
            <h3 className="font-body text-base font-semibold not-italic text-ink-headline">{feature.name}</h3>
            <p className="font-body text-sm text-ink-body">{feature.tagline}</p>
          </Link>
        ))}
      </div>
    </ScrollReveal>
  );
}
