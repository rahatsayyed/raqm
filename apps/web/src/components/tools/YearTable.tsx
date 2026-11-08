export function YearTable({
  title,
  head,
  rows,
}: {
  title: string;
  head: string[];
  rows: (string | number)[][];
}) {
  return (
    <details className="group rounded-cell border border-line bg-surface">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
        {title}
        <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-200 group-open:rotate-180 motion-reduce:transition-none">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="max-h-80 overflow-auto border-t border-line">
        <table className="w-full min-w-[460px] border-collapse text-right text-[13px]">
          <thead className="sticky top-0 bg-surface-sunken text-xs text-ink-subtle">
            <tr>
              {head.map((h, i) => (
                <th key={h} scope="col" className={`px-4 py-2 font-semibold ${i === 0 ? 'text-left' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="font-mono text-ink">
            {rows.map((r, ri) => (
              <tr key={ri} className="border-t border-line last:bg-brand-soft/60">
                {r.map((c, ci) => (
                  <td key={ci} className={`px-4 py-2 ${ci === 0 ? 'text-left text-ink-muted' : ''}`}>
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
