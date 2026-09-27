import { ScrollReveal } from './ScrollReveal';

const STEPS = [
  {
    heading: 'Your bank texts you',
    body: 'The same SMS you already get the moment you spend. Nothing new to do.',
  },
  {
    heading: 'Raqm reads it, on your phone',
    body: 'Parsed and categorized on-device, in real time. Nothing is sent anywhere.',
  },
  {
    heading: 'It’s already sorted',
    body: 'Transfers, refunds, and duplicates untangled automatically before you ever open the app.',
  },
  {
    heading: 'You just glance',
    body: 'Safe-to-spend, budgets, and nudges keep you on track — no manual entry, ever.',
  },
];

export function HowItWorks() {
  return (
    <ScrollReveal id="how-it-works" className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <span className="mb-3 block font-mono text-xs text-ink-label opacity-60">01 / 05</span>
      <h2 className="mb-10 text-balance font-display text-4xl text-ink-headline sm:text-5xl">How it works</h2>
      <ol className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {STEPS.map((step, index) => (
          <li key={step.heading} className="border-t border-border-subtle pt-6">
            <span className="font-mono text-sm text-accent-primary">{String(index + 1).padStart(2, '0')}</span>
            <h3 className="mt-3 font-display text-2xl leading-tight text-ink-headline">{step.heading}</h3>
            <p className="mt-2 font-body text-base text-ink-body">{step.body}</p>
          </li>
        ))}
      </ol>
    </ScrollReveal>
  );
}
