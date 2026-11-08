import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TOOLS, getTool, type ToolDef } from '@/lib/calculators/tools';
import { Faq } from '@/components/tools/Faq';
import { PromoRail } from '@/components/tools/PromoRail';
import { ToolCalculator } from '@/components/tools/ToolCalculator';
import { ToolCard } from '@/components/tools/ToolCard';
import { ToolsMotion } from '@/components/tools/ToolsMotion';

export const dynamicParams = false;

export function generateStaticParams() {
  return TOOLS.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) return {};
  return {
    title: `${tool.seoTitle} | Raqm`,
    description: tool.seoDescription,
    alternates: { canonical: `/tools/${tool.slug}` },
    openGraph: { title: tool.seoTitle, description: tool.seoDescription, url: `/tools/${tool.slug}`, type: 'website' },
  };
}

function jsonLd(tool: ToolDef) {
  const data = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'FAQPage',
        mainEntity: tool.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
      },
      {
        '@type': 'HowTo',
        name: `How to use the ${tool.name}`,
        step: tool.howTo.map((s) => ({ '@type': 'HowToStep', name: s.title, text: s.body })),
      },
    ],
  };
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default async function ToolPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tool = getTool(slug);
  if (!tool) notFound();
  const related = tool.related.map((s) => getTool(s)).filter((t): t is ToolDef => !!t);

  return (
    <main id="main-content" className="px-4 pb-24 pt-28 sm:px-6 sm:pt-36">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(tool) }} />
      <ToolsMotion className="mx-auto max-w-col">
        <header className="max-w-[720px]">
          <nav data-reveal aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-ink-subtle">
            <Link href="/tools" className="rounded-tag font-semibold text-ink-muted transition-colors duration-150 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none">
              Tools
            </Link>
            <span aria-hidden>/</span>
            <span className="rounded-pill bg-surface px-2.5 py-0.5 text-xs font-semibold text-ink shadow-ring">{tool.chip}</span>
          </nav>
          <h1 data-reveal className="mt-4 text-h1 text-balance text-ink">
            {tool.name}
          </h1>
          <p data-reveal className="mt-4 text-lead text-ink-muted">
            {tool.lead}
          </p>
        </header>

        <div className="mt-10 flex flex-col items-start gap-[18px] lg:flex-row">
          <div className="w-full min-w-0 flex-1 space-y-16">
            <div data-reveal>
              <ToolCalculator slug={tool.slug} />
            </div>

            <section aria-labelledby="how-to">
              <h2 id="how-to" className="text-h3 text-ink">
                How to use this calculator
              </h2>
              <ol className="mt-5 grid gap-3 sm:grid-cols-3">
                {tool.howTo.map((s, i) => (
                  <li key={s.title} className="rounded-cell bg-surface p-4 shadow-ring">
                    <span className="grid size-[26px] place-items-center rounded-pill bg-inverse font-mono text-xs font-semibold text-inverse-ink">{i + 1}</span>
                    <h3 className="mt-3 text-base font-semibold text-ink">{s.title}</h3>
                    <p className="mt-1 text-sm leading-snug">{s.body}</p>
                  </li>
                ))}
              </ol>
            </section>

            <article className="space-y-8">
              {tool.article.map((sec) => (
                <section key={sec.h}>
                  <h2 className="text-h3 text-ink">{sec.h}</h2>
                  {sec.p.map((p) => (
                    <p key={p.slice(0, 24)} className="mt-3 max-w-[68ch] leading-relaxed">
                      {p}
                    </p>
                  ))}
                </section>
              ))}
              <p className="max-w-[68ch] text-sm leading-relaxed text-ink-subtle">
                These calculators give estimates for planning only. They are not financial advice, and real products may add fees, taxes or different rate rules.
              </p>
            </article>

            <section aria-labelledby="faq">
              <h2 id="faq" className="mb-4 text-h3 text-ink">
                Frequently asked questions
              </h2>
              <Faq items={tool.faq} />
            </section>

            <section aria-labelledby="related">
              <h2 id="related" className="mb-5 text-h3 text-ink">
                Related calculators
              </h2>
              <div className="grid gap-[18px] sm:grid-cols-2 [&>a]:h-full">
                {related.map((t) => (
                  <ToolCard key={t.slug} tool={t} />
                ))}
              </div>
            </section>
          </div>

          <PromoRail className="sticky top-[104px] hidden w-[226px] shrink-0 lg:flex" />
        </div>

        <PromoRail variant="banner" className="mx-auto mt-16 max-w-[360px] lg:hidden" />
      </ToolsMotion>
    </main>
  );
}
