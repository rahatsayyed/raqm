import Link from 'next/link';
import { featureDeepDives } from '@/lib/features-data';

export function Footer() {
  return (
    <footer className="bg-accent-primary px-6 py-12">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 border-t border-[color-mix(in_srgb,var(--color-surface)_20%,transparent)] pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-display text-lg text-surface">Raqm</p>
          <p className="font-body text-sm text-[color-mix(in_srgb,var(--color-surface)_65%,transparent)]">
            On-device. Nothing you don’t choose to share ever leaves your phone.
          </p>
        </div>
        <nav className="flex flex-wrap gap-4">
          {featureDeepDives.map((feature) => (
            <Link
              key={feature.slug}
              href={`/features/${feature.slug}`}
              className="rounded-dot font-body text-sm text-[color-mix(in_srgb,var(--color-surface)_82%,transparent)] transition-colors duration-150 hover:text-accent-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
            >
              {feature.name}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
