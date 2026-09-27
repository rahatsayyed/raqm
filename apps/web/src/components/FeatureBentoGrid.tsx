import { ScrollReveal } from './ScrollReveal';

interface FeatureRow {
  title: string;
  statement: string;
  items: string[];
}

const rows: FeatureRow[] = [
  {
    title: 'Capture',
    statement: 'Your bank already texts you. That’s the input.',
    items: [
      'Automatic SMS-based transaction parsing',
      'PDF bank/UPI statement upload for unsupported formats',
      'Manual cash expense logging',
      '“Couldn’t parse” review queue, with support-request option',
    ],
  },
  {
    title: 'Organize',
    statement: 'Clean it up once. It sticks.',
    items: [
      'Custom merchant renaming, auto-applies going forward',
      'Group related purchases into one entry',
      'Split one purchase across multiple categories',
      'Transfer detection: sent/received money tagged correctly',
    ],
  },
  {
    title: 'Stay on track',
    statement: 'Know what’s safe to spend, before you spend it.',
    items: [
      'Safe-to-spend indicator',
      'Weekly + threshold budget alerts',
      'Subscription-cancellation nudges',
      'Custom pay-cycle start date',
    ],
  },
  {
    title: 'Life stuff',
    statement: 'Notes, places, and who still owes you.',
    items: ['Notes and location tagging on transactions', 'Lending reminders, with auto-SMS follow-up'],
  },
];

function Row({ row, index, lead }: { row: FeatureRow; index: number; lead: boolean }) {
  const muted = lead ? 'text-[color-mix(in_srgb,var(--color-surface)_55%,transparent)]' : 'text-ink-label';
  return (
    <li
      className={`grid grid-cols-[3.5rem_1fr] gap-x-4 gap-y-5 lg:grid-cols-[7rem_1fr_1.15fr] lg:gap-x-10 ${
        lead
          ? 'rounded-outer bg-ink-headline px-6 py-9 text-surface sm:px-10 sm:py-12'
          : 'border-b border-border-subtle px-6 py-9 sm:px-10 sm:py-10'
      }`}
    >
      <span className={`font-display text-5xl leading-none lg:text-7xl ${lead ? 'text-accent-deep' : 'text-accent-primary'}`}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <div>
        <span className={`font-body text-sm font-medium uppercase tracking-wider ${muted}`}>{row.title}</span>
        <h3 className={`mt-2 max-w-md font-display text-3xl leading-[1.08] sm:text-4xl ${lead ? 'text-surface' : 'text-ink-headline'}`}>
          {row.statement}
        </h3>
      </div>
      <ul className="col-span-2 flex flex-col lg:col-span-1 lg:pt-1">
        {row.items.map((item) => (
          <li
            key={item}
            className={`border-t py-2.5 font-body text-base first:border-t-0 first:pt-0 ${
              lead
                ? 'border-[color-mix(in_srgb,var(--color-surface)_14%,transparent)] text-[color-mix(in_srgb,var(--color-surface)_85%,transparent)]'
                : 'border-border-subtle text-ink-body'
            }`}
          >
            {item}
          </li>
        ))}
      </ul>
    </li>
  );
}

export function FeatureBentoGrid() {
  return (
    <ScrollReveal className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <span className="mb-3 block font-mono text-xs text-ink-label opacity-60">02 / 04</span>
      <h2 className="mb-10 text-balance font-display text-4xl text-ink-headline sm:text-5xl">Everything you need, free</h2>
      <ol className="flex flex-col">
        {rows.map((row, index) => (
          <Row key={row.title} row={row} index={index} lead={index === 0} />
        ))}
      </ol>
    </ScrollReveal>
  );
}
