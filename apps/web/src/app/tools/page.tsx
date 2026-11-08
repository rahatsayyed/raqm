import type { Metadata } from 'next';
import { TOOLS } from '@/lib/calculators/tools';
import { PromoRail } from '@/components/tools/PromoRail';
import { ToolCard } from '@/components/tools/ToolCard';
import { ToolsMotion } from '@/components/tools/ToolsMotion';

export const metadata: Metadata = {
  title: 'Free money calculators: EMI, SIP, budget and more | Raqm',
  description:
    'Free calculators for EMI, SIP, compound interest, split bills, emergency funds and the 50/30/20 budget. Rupee formatting, shareable results, calculated in your browser.',
  alternates: { canonical: '/tools' },
  openGraph: {
    title: 'Free money calculators | Raqm',
    description: 'EMI, SIP, compound interest, split bill, emergency fund and 50/30/20 budget calculators.',
    url: '/tools',
    type: 'website',
  },
};

export default function ToolsPage() {
  const [featured, ...rest] = TOOLS;
  return (
    <main id="main-content" className="px-4 pb-24 pt-28 sm:px-6 sm:pt-36">
      <ToolsMotion className="mx-auto max-w-col">
        <header className="mx-auto flex max-w-3xl flex-col items-center text-center">
          <span data-reveal className="inline-flex items-center gap-2 rounded-pill bg-surface py-1.5 pl-2 pr-3.5 text-sm font-semibold text-ink shadow-ring">
            <span className="grid size-6 place-items-center rounded-pill bg-inverse text-inverse-ink">
              <svg aria-hidden viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="3" width="14" height="18" rx="2.5" />
                <path d="M9 7.5h6M9 12h.01M12 12h.01M15 12h.01M9 16h.01M12 16h.01M15 16h.01" />
              </svg>
            </span>
            Free tools
          </span>
          <h1 data-reveal className="mt-5 text-h1 text-balance text-ink">
            Calculators for everyday money decisions
          </h1>
          <p data-reveal className="mt-4 max-w-xl text-lead text-ink-muted">
            Loans, investing, bills and budgets, in rupees. Everything is calculated in your browser, and each result can be shared with a link.
          </p>
        </header>

        <div className="mt-12 grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3 lg:mt-16">
          <div data-reveal className="sm:col-span-2">
            <ToolCard tool={featured} variant="featured" />
          </div>
          <div data-reveal className="sm:col-span-2 lg:col-span-1 lg:col-start-3 lg:row-span-2 lg:row-start-1">
            <PromoRail variant="tile" className="h-full justify-center" />
          </div>
          {rest.map((t) => (
            <div key={t.slug} data-reveal className="[&>a]:h-full">
              <ToolCard tool={t} />
            </div>
          ))}
        </div>

        <section data-reveal aria-labelledby="why-tools" className="mt-20 max-w-[720px] border-t border-line pt-10">
          <h2 id="why-tools" className="text-h3 text-ink">
            Why use these tools
          </h2>
          <p className="mt-3 leading-relaxed">
            Most money decisions come down to a few numbers: what a loan really costs, what a habit could grow into, how a shared bill divides. These calculators show those numbers with Indian digit grouping, so lakhs and crores read the way you say them.
          </p>
          <p className="mt-3 leading-relaxed">
            Nothing you type is sent to a server. Money is handled in whole paise to avoid rounding drift, and the share button stores your inputs in the link itself, not on our side. Results are estimates for planning, not financial advice.
          </p>
        </section>
      </ToolsMotion>
    </main>
  );
}
