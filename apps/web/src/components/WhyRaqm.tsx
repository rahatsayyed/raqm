import { ScrollReveal } from './ScrollReveal';

interface WhyCard {
  title: string;
  body: string;
  span: string;
}

const cards: WhyCard[] = [
  {
    title: 'Nothing leaves your phone',
    body: 'SMS parsing happens on-device. No bank linking, no server ever sees your messages.',
    span: 'lg:col-span-2 lg:row-span-2',
  },
  {
    title: 'It already knows',
    body: 'Transactions show up the moment they happen. You never type them in.',
    span: 'lg:col-span-1',
  },
  {
    title: 'Built for India',
    body: 'SMS-first, UPI-aware categorization tuned for how Indian banks message you.',
    span: 'lg:col-span-1',
  },
  {
    title: 'Yours, not sold',
    body: 'No ads, no data monetization. Your spending is not the product.',
    span: 'lg:col-span-2',
  },
];

export function WhyRaqm() {
  return (
    <ScrollReveal className="mx-auto max-w-5xl px-6 py-16">
      <span className="mb-3 block font-mono text-xs text-ink-label opacity-40">01 / 04</span>
      <h2 className="mb-8 flex items-center gap-3 text-balance font-display text-2xl text-ink-headline sm:text-3xl">
        <svg aria-hidden="true" width="12" height="12" viewBox="0 0 12 12" className="shrink-0 opacity-40">
          <line x1="6" y1="0" x2="6" y2="12" stroke="var(--color-ink-label)" strokeWidth="1" />
          <line x1="0" y1="6" x2="12" y2="6" stroke="var(--color-ink-label)" strokeWidth="1" />
        </svg>
        Why Raqm
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
        {cards.map((card) => (
          <div key={card.title} className={`glass-card p-6 ${card.span}`}>
            <h3 className="mb-2 font-body text-base font-semibold not-italic text-ink-headline">
              {card.title}
            </h3>
            <p className="font-body text-sm text-ink-body">{card.body}</p>
          </div>
        ))}
      </div>
    </ScrollReveal>
  );
}
