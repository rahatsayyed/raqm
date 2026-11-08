import Link from 'next/link';
import { ALTERNATIVES } from '@/content/alternatives';
import { absoluteUrl } from '@/content/site';
import { pageMeta } from '@/lib/seo/meta';
import { PAGE_SEO } from '@/lib/seo/pages';
import { breadcrumbNode, graph, itemListNode, siteNodes, webPageNode } from '@/lib/seo/schema';
import { JsonLd } from '@/components/content/JsonLd';
import { Rise } from '@/components/content/Rise';
import { formatVerified } from '@/components/alternatives/format';

export const metadata = pageMeta('/alternatives');

const PATH = '/alternatives';
const ET_SOURCE = 'https://play.google.com/store/apps/details?id=com.smartspends&hl=en_IN&gl=IN';
const latest = ALTERNATIVES.map((a) => a.verifiedOn).sort().at(-1);

const jsonLd = graph(
  ...siteNodes(),
  webPageNode('CollectionPage', PATH, PAGE_SEO[PATH].title, PAGE_SEO[PATH].description, {
    mainEntity: { '@id': `${absoluteUrl(PATH)}#list` },
    ...(latest ? { dateModified: latest } : {}),
  }),
  itemListNode(PATH, ALTERNATIVES.map((a) => ({ name: `Raqm vs ${a.name}`, path: `${PATH}/${a.slug}` }))),
  breadcrumbNode(PATH, [{ name: 'Alternatives', path: PATH }]),
);

const arrow = (
  <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M7 17 17 7M8 7h9v9" />
  </svg>
);

const HINTS: Record<string, string> = {
  axio: 'Credit and expenses',
  pennywise: 'SMS expense tracker',
  splitwise: 'Group expense splitting',
  'money-manager': 'Expense ledger app',
  wallet: 'Budget planner app',
  'money-view': 'Loan and credit app',
};

const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring';

export default function AlternativesHubPage() {
  return (
    <main id="main-content" className="px-4 pb-24 pt-28 sm:px-6 sm:pt-36">
      <JsonLd data={jsonLd} />
      <div className="mx-auto max-w-col">
        <Rise as="header" className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-medium text-ink-subtle">Alternatives</p>
          <h1 className="mt-3 text-h1 text-balance text-ink">Apps like Axio, PennyWise, Splitwise and Money Manager</h1>
          <p className="mx-auto mt-4 max-w-xl text-lead text-ink-muted">
            Raqm beside one app at a time, using public facts only.
          </p>
        </Rise>

        <ul className="mt-12 grid gap-[18px] sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
          {ALTERNATIVES.map((a, i) => (
            <Rise as="li" key={a.slug} index={i} className="[&>a]:h-full">
              <Link
                href={`/alternatives/${a.slug}`}
                className={`group relative flex flex-col rounded-container bg-surface p-2 shadow-1 hairline transition duration-200 ease-[cubic-bezier(.4,0,.2,1)] hover:-translate-y-0.5 hover:shadow-3 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${FOCUS}`}
              >
                <div className="flex aspect-[16/8] items-end rounded-cell bg-surface-sunken p-5">
                  <p className="text-[26px] font-medium leading-[1.1] tracking-tight text-ink">
                    Raqm <span className="text-ink-subtle">vs</span> {a.name}
                  </p>
                </div>
                <div className="flex flex-1 flex-col justify-between gap-5 px-3 pb-3 pt-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">{HINTS[a.slug] ?? 'Expense app'}</p>
                    <p className="mt-1.5 text-sm leading-snug text-ink-muted">{a.lede}</p>
                  </div>
                  <span className="inline-flex min-h-10 w-fit items-center gap-2 rounded-pill bg-surface-sunken px-4 text-sm font-semibold text-ink transition-colors duration-150 group-hover:bg-ink group-hover:text-canvas motion-reduce:transition-none">
                    Read the comparison {arrow}
                  </span>
                </div>
              </Link>
            </Rise>
          ))}
        </ul>

        <div className="mt-16 grid gap-[18px] lg:grid-cols-2">
          <Rise>
            <section aria-labelledby="how-we-compare" className="h-full rounded-container bg-brand-soft p-6 sm:p-8">
              <h2 id="how-we-compare" className="text-h3 text-ink">
                How we compare
              </h2>
              <ul className="mt-4 space-y-3 text-base leading-relaxed text-ink-muted marker:text-ink-subtle [&>li]:list-disc [&>li]:ml-5">
                <li>We use public sources only: store listings, privacy policies and help pages. We do not use private tests or leaked material.</li>
                <li>Every page shows the date its facts were checked, and every fact in the table links to where it came from.</li>
                <li>A dash in the table means the fact is not confirmed in the public listing. We never turn a missing fact into a cross.</li>
                <li>Apps change. If something here is out of date, tell us and we will fix it.</li>
              </ul>
            </section>
          </Rise>
          <Rise>
            <section aria-labelledby="et-money" className="h-full rounded-container bg-surface p-6 shadow-1 hairline sm:p-8">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-subtle">Worth knowing</p>
              <h2 id="et-money" className="mt-1.5 text-h3 text-ink">
                A note on ET Money
              </h2>
              <p className="mt-3 text-base leading-relaxed text-ink-muted">
                People often ask about ET Money as an expense tracker. As of {formatVerified('2026-11-08')}, its Google Play listing describes investing only. A developer reply on that listing, dated 21 April 2025, says
                &ldquo;expense tracking and credit score are no longer available&rdquo;. We have not made a comparison page for it.
              </p>
              <a
                href={ET_SOURCE}
                target="_blank"
                rel="noopener noreferrer"
                className={`mt-4 inline-block rounded-tag text-sm font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink ${FOCUS}`}
              >
                Source: ET Money on Google Play (opens in a new tab)
              </a>
            </section>
          </Rise>
        </div>

        <Rise className="mt-12 text-center">
          <p className="text-base text-ink-muted">
            Want the short version of how Raqm differs from most apps? Read{' '}
            <Link href="/free" className={`rounded-tag font-semibold text-ink underline decoration-line underline-offset-4 hover:decoration-ink ${FOCUS}`}>
              how Raqm compares
            </Link>
            .
          </p>
        </Rise>
      </div>
    </main>
  );
}
