import Link from 'next/link';
import { featureDeepDives } from '@/lib/features-data';

export function FlagshipStrip() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="mb-8 font-display text-2xl text-ink-headline sm:text-3xl">Go deeper</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {featureDeepDives.map((feature) => (
          <Link
            key={feature.slug}
            href={`/features/${feature.slug}`}
            className="glass-card flex flex-col gap-2 p-6 transition-opacity hover:opacity-90"
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
    </section>
  );
}
