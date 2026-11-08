import Link from 'next/link';
import { slugify, type Block } from '@/content/posts';
import { PromoCard } from './PromoCard';

function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|\[[^\]]+\]\(\/[^)]*\))/g).map((part, i) => {
        if (part.startsWith('**')) {
          return (
            <strong key={i} className="font-semibold text-ink">
              {part.slice(2, -2)}
            </strong>
          );
        }
        const link = /^\[([^\]]+)\]\((\/[^)]*)\)$/.exec(part);
        if (link) {
          return (
            <Link key={i} href={link[2]} className="text-ink underline underline-offset-4 hover:text-brand">
              {link[1]}
            </Link>
          );
        }
        return part;
      })}
    </>
  );
}

export function PostBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="mx-auto max-w-[720px] text-[18px] leading-[1.55] text-ink-muted">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'h2':
            return (
              <h2 key={i} id={slugify(b.text)} className="mt-12 mb-4 scroll-mt-28 text-[28px] leading-8 font-semibold tracking-tight text-ink">
                {b.text}
              </h2>
            );
          case 'h3':
            return (
              <h3 key={i} className="mt-8 mb-3 text-h3 text-ink">
                {b.text}
              </h3>
            );
          case 'p':
            return (
              <p key={i} className="mb-6">
                <Inline text={b.text} />
              </p>
            );
          case 'ul':
            return (
              <ul key={i} className="mb-6 list-disc space-y-3 pl-6 marker:text-ink-subtle">
                {b.items.map((it) => (
                  <li key={it}>
                    <Inline text={it} />
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={i} className="mb-6 list-decimal space-y-3 pl-6 marker:font-mono marker:text-ink-subtle">
                {b.items.map((it) => (
                  <li key={it}>
                    <Inline text={it} />
                  </li>
                ))}
              </ol>
            );
          case 'callout':
            return (
              <aside key={i} className="my-8 rounded-cell border-l-[3px] border-brand bg-brand-soft p-5">
                <p className="font-mono text-xs tracking-wide text-ink-muted uppercase">{b.label}</p>
                <p className="mt-2 text-base font-medium text-ink">{b.text}</p>
              </aside>
            );
          case 'cta':
            return <PromoCard key={i} className="my-10 lg:hidden" />;
        }
      })}
    </div>
  );
}
