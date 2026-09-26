import Link from 'next/link';
import { featureDeepDives } from '@/lib/features-data';

export function Footer() {
  return (
    <footer className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex flex-col gap-4 border-t border-[var(--color-border-subtle)] pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg text-ink-headline">Raqm</p>
          <p className="font-body text-sm text-ink-label">
            On-device. Nothing you don’t choose to share ever leaves your phone.
          </p>
        </div>
        <nav className="flex gap-4">
          {featureDeepDives.map((feature) => (
            <Link
              key={feature.slug}
              href={`/features/${feature.slug}`}
              className="rounded-dot font-body text-sm text-ink-body transition-colors duration-150 hover:text-accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
            >
              {feature.name}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
