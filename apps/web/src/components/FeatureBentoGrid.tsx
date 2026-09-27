import { ScrollReveal } from './ScrollReveal';

interface FeatureCluster {
  title: string;
  items: string[];
  span: string;
}

const clusters: FeatureCluster[] = [
  {
    title: 'Capture',
    items: [
      'Automatic SMS-based transaction parsing',
      'PDF bank/UPI statement upload for unsupported formats',
      'Manual cash expense logging',
      '“Couldn’t parse” review queue, with support-request option',
    ],
    span: 'lg:col-span-2 lg:row-span-2',
  },
  {
    title: 'Organize',
    items: [
      'Custom merchant renaming, auto-applies going forward',
      'Group related purchases into one entry',
      'Split one purchase across multiple categories',
      'Transfer detection: sent/received money tagged correctly',
    ],
    span: 'lg:col-span-2',
  },
  {
    title: 'Stay on track',
    items: [
      'Safe-to-spend indicator',
      'Weekly + threshold budget alerts',
      'Subscription-cancellation nudges',
      'Custom pay-cycle start date',
    ],
    span: 'lg:col-span-1',
  },
  {
    title: 'Life stuff',
    items: ['Notes and location tagging on transactions', 'Lending reminders, with auto-SMS follow-up'],
    span: 'lg:col-span-1',
  },
];

export function FeatureBentoGrid() {
  return (
    <ScrollReveal className="mx-auto max-w-5xl px-6 py-16">
      <span className="mb-3 block font-mono text-xs text-ink-label opacity-40">02 / 04</span>
      <h2 className="mb-8 text-balance font-display text-2xl text-ink-headline sm:text-3xl">
        Everything you need, free
      </h2>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4 lg:grid-rows-2">
        {clusters.map((cluster) => (
          <div key={cluster.title} className={`glass-card-flat p-6 ${cluster.span}`}>
            <h3 className="mb-3 font-body text-base font-semibold not-italic text-ink-headline">
              {cluster.title}
            </h3>
            <ul className="flex flex-col gap-2">
              {cluster.items.map((item) => (
                <li key={item} className="font-body text-sm text-ink-body">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </ScrollReveal>
  );
}
