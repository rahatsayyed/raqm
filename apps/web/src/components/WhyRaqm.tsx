interface WhyCard {
  title: string;
  body: string;
}

const cards: WhyCard[] = [
  {
    title: 'Nothing leaves your phone',
    body: 'SMS parsing happens entirely on-device. No bank linking, no server ever sees your messages.',
  },
  {
    title: 'It already knows',
    body: "Transactions show up the moment they happen — you're never the one typing them in.",
  },
  {
    title: 'Built for India',
    body: 'SMS-first, UPI-aware categorization tuned for how Indian banks actually message you.',
  },
  {
    title: 'Yours, not sold',
    body: 'No ads, no data monetization. Your spending is not the product.',
  },
];

export function WhyRaqm() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16">
      <h2 className="mb-8 font-display text-2xl text-ink-headline sm:text-3xl">Why Raqm</h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.title} className="glass-card p-6">
            <h3 className="mb-2 font-body text-base font-semibold not-italic text-ink-headline">
              {card.title}
            </h3>
            <p className="font-body text-sm text-ink-body">{card.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
