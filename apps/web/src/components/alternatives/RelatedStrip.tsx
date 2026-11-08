import Link from 'next/link';
import { ALTERNATIVES } from '@/content/alternatives';

const LINK =
  'inline-flex min-h-10 items-center rounded-pill bg-surface px-4 text-sm font-semibold text-ink shadow-ring transition-colors duration-150 hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none';

export function RelatedStrip({ currentSlug }: { currentSlug: string }) {
  const others = ALTERNATIVES.filter((a) => a.slug !== currentSlug);
  return (
    <nav aria-label="Related pages" className="mt-16 border-t border-line pt-8">
      <h2 className="text-h3 text-ink">More to read</h2>
      <ul className="mt-4 flex flex-wrap gap-2.5">
        <li>
          <Link href="/alternatives" className={LINK}>
            All alternatives
          </Link>
        </li>
        {others.map((a) => (
          <li key={a.slug}>
            <Link href={`/alternatives/${a.slug}`} className={LINK}>
              Raqm vs {a.name}
            </Link>
          </li>
        ))}
        <li>
          <Link href="/free" className={LINK}>
            How Raqm differs
          </Link>
        </li>
        <li>
          <Link href="/download" className={LINK}>
            Download status
          </Link>
        </li>
      </ul>
    </nav>
  );
}
