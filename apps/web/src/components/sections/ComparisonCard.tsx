import type { ReactNode } from 'react';

export type CellValue = 'yes' | 'no' | 'limit' | string;
export type ComparisonRow = { feature: string; other: CellValue; raqm: CellValue; note?: string };

type Props = {
  rows?: ComparisonRow[];
  otherLabel?: string;
  raqmLabel?: string;
  featureLabel?: string;
  footnote?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export const DEFAULT_COMPARISON_ROWS: ComparisonRow[] = [
  { feature: 'Processing stays on your phone', other: 'limit', raqm: 'yes' },
  { feature: 'Transactions captured automatically (Android)', other: 'limit', raqm: 'yes' },
  { feature: 'Works without a bank login shared', other: 'limit', raqm: 'yes' },
  { feature: 'Soft delete, restore anytime', other: 'limit', raqm: 'yes' },
  { feature: 'Budgets and analytics', other: 'yes', raqm: 'yes' },
  { feature: 'Forecasts and financial advice', other: 'limit', raqm: 'no' },
];

const LABEL: Record<string, string> = { yes: 'Yes', no: 'Not yet', limit: 'Varies by app' };

function Mark({ value, inverse }: { value: CellValue; inverse?: boolean }) {
  const tone = inverse ? 'text-inverse-ink' : 'text-ink';
  const dim = inverse ? 'text-inverse-ink/45' : 'text-ink-subtle';
  if (value === 'yes') {
    return (
      <span className={`inline-flex items-center gap-2 ${tone}`}>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0">
          <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="sr-only">{LABEL.yes}</span>
      </span>
    );
  }
  if (value === 'no') {
    return (
      <span className={`inline-flex items-center gap-2 ${dim}`}>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0">
          <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="sr-only">{LABEL.no}</span>
      </span>
    );
  }
  if (value === 'limit') {
    return (
      <span className={`inline-flex items-center gap-2 text-sm ${dim}`}>
        <svg aria-hidden="true" viewBox="0 0 16 16" className="size-4 shrink-0">
          <path d="M3.5 8h9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeDasharray="1.5 2.5" />
        </svg>
        <span className="hidden sm:inline">{LABEL.limit}</span>
        <span className="sr-only sm:hidden">{LABEL.limit}</span>
      </span>
    );
  }
  return <span className={`text-sm ${tone}`}>{value}</span>;
}

export function ComparisonCard({
  rows = DEFAULT_COMPARISON_ROWS,
  otherLabel = 'Typical cloud apps',
  raqmLabel = 'Raqm',
  featureLabel = 'What you get',
  footnote,
  action,
  className = '',
}: Props) {
  return (
    <div className={`overflow-hidden rounded-container bg-surface p-1.5 shadow-ring shadow-2 ${className}`}>
      <table className="w-full border-separate border-spacing-0 text-left">
        <caption className="sr-only">
          {raqmLabel} compared with {otherLabel}
        </caption>
        <thead>
          <tr>
            <th scope="col" className="px-4 py-5 align-bottom text-sm font-medium text-ink-subtle sm:px-6">
              {featureLabel}
            </th>
            <th scope="col" className="w-[26%] px-3 py-5 align-bottom text-sm font-medium text-ink-muted sm:w-[24%]">
              {otherLabel}
            </th>
            <th scope="col" className="w-[26%] rounded-t-cell bg-inverse px-3 pb-4 pt-5 align-bottom text-inverse-ink sm:w-[24%] sm:px-5">
              <span className="block text-h3">{raqmLabel}</span>
              {action && <span className="mt-3 block font-normal">{action}</span>}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const last = i === rows.length - 1;
            return (
              <tr key={r.feature}>
                <th scope="row" className={`px-4 py-4 text-base font-normal text-ink sm:px-6 ${last ? '' : 'border-b border-line'}`}>
                  {r.feature}
                  {r.note && <span className="mt-0.5 block text-sm text-ink-subtle">{r.note}</span>}
                </th>
                <td className={`px-3 py-4 ${last ? '' : 'border-b border-line'}`}>
                  <Mark value={r.other} />
                </td>
                <td className={`bg-inverse px-3 py-4 sm:px-5 ${last ? 'rounded-b-cell' : 'border-b border-inverse-line'}`}>
                  <Mark value={r.raqm} inverse />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {footnote && <div className="px-4 pb-3 pt-4 text-sm text-ink-subtle sm:px-6">{footnote}</div>}
    </div>
  );
}

export function ComparisonSection() {
  return (
    <section id="compare" aria-labelledby="compare-heading" className="px-4 py-section sm:px-6">
      <div className="mx-auto max-w-col">
        <p className="mb-4 font-mono text-xs uppercase tracking-widest text-ink-subtle">Compared</p>
        <h2 id="compare-heading" className="mb-4 max-w-xl text-balance text-h2">
          Same clear picture, different home for your data
        </h2>
        <p className="mb-10 max-w-lg text-lead text-ink-muted">Side by side with how many cloud-first finance apps work.</p>
        <ComparisonCard footnote="Based on how many cloud-first finance apps commonly work; individual apps differ." />
      </div>
    </section>
  );
}
