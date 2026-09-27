import { SAMPLE_CATEGORIES, SAMPLE_TRANSACTIONS } from '@/lib/sample-transactions';

const TICKER_ITEMS = SAMPLE_TRANSACTIONS.flatMap((tx, i) => [
  { key: tx.merchant, name: tx.merchant, meta: `${tx.category} · ${tx.source}`, amount: tx.amount },
  { key: SAMPLE_CATEGORIES[i].name, name: SAMPLE_CATEGORIES[i].name, meta: `${SAMPLE_CATEGORIES[i].count} spends this month`, amount: SAMPLE_CATEGORIES[i].spent },
]);

const REPEATS_PER_HALF = 2;

function TickerRun() {
  return (
    <div className="flex shrink-0 items-center">
      {Array.from({ length: REPEATS_PER_HALF }).flatMap((_, round) =>
        TICKER_ITEMS.map((tx) => (
          <span key={`${round}-${tx.key}`} className="flex items-center gap-3 whitespace-nowrap px-6 sm:px-8">
            <span className="font-body text-sm text-ink-body sm:text-base">{tx.name}</span>
            <span className="font-body text-sm text-ink-label">{tx.meta}</span>
            <span className="font-mono text-sm font-semibold text-ink-headline sm:text-base">{tx.amount}</span>
            <span aria-hidden="true" className="ml-6 h-1 w-1 rounded-full bg-ink-label/50 sm:ml-8" />
          </span>
        ))
      )}
    </div>
  );
}

export function TxTicker() {
  return (
    <div
      aria-hidden="true"
      className="tx-ticker relative mt-4 overflow-hidden border-y border-border-subtle bg-[color-mix(in_srgb,var(--color-surface)_60%,transparent)] py-4 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]"
    >
      <div className="tx-ticker-track flex w-max">
        <TickerRun />
        <TickerRun />
      </div>
    </div>
  );
}
