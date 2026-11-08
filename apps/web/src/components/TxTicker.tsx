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
            <span className="text-sm font-medium text-ink">{tx.name}</span>
            <span className="text-sm text-ink-subtle">{tx.meta}</span>
            <span className="font-mono text-sm text-ink-muted">{tx.amount}</span>
            <span aria-hidden="true" className="ml-6 h-3 w-px bg-line sm:ml-8" />
          </span>
        ))
      )}
    </div>
  );
}

export function TxTicker({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`tx-ticker overflow-hidden border-y border-line py-3 [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)] ${className}`}
    >
      <div className="tx-ticker-track flex w-max">
        <TickerRun />
        <TickerRun />
      </div>
    </div>
  );
}
