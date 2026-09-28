export type FeatureStatus = 'live' | 'coming-soon';

export interface FeatureMicroSection {
  heading: string;
  body: string;
}

export interface FeatureDeepDive {
  slug: string;
  name: string;
  status: FeatureStatus;
  statusLabel: string;
  tagline: string;
  sections: FeatureMicroSection[];
}

export const featureDeepDives: FeatureDeepDive[] = [
  {
    slug: 'capture-organize',
    name: 'Capture & organize',
    status: 'live',
    statusLabel: 'Live now',
    tagline: 'Your bank already texts you. Raqm reads it, sorts it, and cleans up after itself.',
    sections: [
      {
        heading: 'Every bank SMS, parsed on-device',
        body: '120+ Indian and international banks. Amount, merchant, account, balance, extracted the moment the SMS arrives, nothing sent anywhere.',
      },
      {
        heading: 'PDF statements for accounts that never text you',
        body: 'Upload a bank or UPI statement PDF and get the same structured transactions SMS parsing gives you.',
      },
      {
        heading: 'Cash, logged manually',
        body: 'Nothing to parse for a cash expense. Add it yourself in a few taps and it sits right alongside everything else.',
      },
      {
        heading: 'Rename a merchant once, it sticks',
        body: '“AMZN MKTP IN” becomes “Amazon” the first time you fix it, and every future transaction from that merchant follows.',
      },
      {
        heading: 'Split one purchase across categories',
        body: '₹500 at the supermarket that was really ₹300 groceries and ₹200 household? Split it across both, from one transaction.',
      },
      {
        heading: 'Group related purchases into one entry',
        body: 'Bundle a few small transactions into a folder, one summed entry, with a tap to expand the individual items.',
      },
      {
        heading: 'It knows a transfer isn’t an expense',
        body: 'A debit and credit within 24 hours, same amount, different accounts of yours, recognized as a self-transfer and kept out of your spending totals automatically.',
      },
      {
        heading: 'Refunds, netted against the original spend',
        body: 'A credit that matches a prior debit gets linked as a refund, so your category totals reflect what you actually kept, not the gross amount.',
      },
    ],
  },
  {
    slug: 'split',
    name: 'Split & settle',
    status: 'live',
    statusLabel: 'Live now',
    tagline: 'Split a bill, track who owes what, and let the app notice when you’ve been paid back.',
    sections: [
      {
        heading: 'Split it your way',
        body: 'Equal, custom shares, or one person covers it all. Pick per expense, not once for the whole group.',
      },
      {
        heading: 'Circles remember your people',
        body: 'Save a reusable list of who’s in: flatmates, the trip group, the weekend crew, so you never re-pick the same names every time.',
      },
      {
        heading: 'A link does the asking',
        body: 'Generate a prefilled UPI payment link and hand it over. Paying you back is one tap in their own UPI app: no manual amount typing, no “how much do I owe again?”',
      },
      {
        heading: 'It recognizes when you’ve been paid',
        body: 'Raqm spots a friend’s payment automatically from your own SMS-parsed transactions and surfaces it as a candidate match. Confirm it in one tap.',
      },
      {
        heading: 'Any two transactions, linked manually',
        body: 'Gave a friend cash and got it back a week later? Link the two yourself and mark them settled, both drop out of your expense totals, same as a self-transfer.',
      },
      {
        heading: 'Never auto-settled without your say',
        body: 'Every match is a suggestion, not an action. Nothing moves until you approve it.',
      },
    ],
  },
  {
    slug: 'smarter-budgets',
    name: 'Smarter budgets',
    status: 'live',
    statusLabel: 'Live now',
    tagline: 'A budget that adjusts to how you actually get paid, and tells you before you overspend.',
    sections: [
      {
        heading: 'Safe-to-spend, not just a total',
        body: 'A daily number that already accounts for what’s left in the period and what’s still budgeted, not just a running total of what you’ve spent.',
      },
      {
        heading: 'Alerts before it’s too late',
        body: 'A nudge at 80% of a category budget, and again the moment it’s exceeded. No surprise at month-end.',
      },
      {
        heading: 'Your month starts when you get paid',
        body: 'Set a custom pay-cycle day: the 25th, the 1st, whatever your salary date is. Every budget, alert, and month-over-month comparison follows it.',
      },
      {
        heading: 'Unused budget can roll over',
        body: 'Opt in per category: what you don’t spend this week carries into the next, instead of resetting to zero.',
      },
      {
        heading: 'Subscriptions, flagged automatically',
        body: 'The same merchant and amount recurring monthly gets flagged as a subscription, with a nudge to cancel the ones you forgot about.',
      },
    ],
  },
  {
    slug: 'life-admin',
    name: 'Life admin',
    status: 'live',
    statusLabel: 'Live now',
    tagline: 'Notes, locations, lending, and grocery lists: the small stuff that adds up.',
    sections: [
      {
        heading: 'A note and a place, on any transaction',
        body: 'Add a free-text note, or let Raqm tag where a payment happened, both live right on the transaction, under “Other Info.”',
      },
      {
        heading: 'Lending reminders that nudge, not nag',
        body: 'Mark money you’ve lent, and Raqm follows up so you don’t have to be the one who remembers.',
      },
      {
        heading: 'Grocery lists that track spend, not just items',
        body: 'Named lists (Weekly Essentials, Monthly Staples) with a running estimated total as you add things.',
      },
      {
        heading: 'It remembers what things cost last time',
        body: 'Adding milk again? The last price you paid shows up as a placeholder. Accept it or type a new one.',
      },
      {
        heading: 'Planned vs. actual, automatically',
        body: 'When a supermarket transaction comes in, Raqm offers to link it to your most recent list, so you see what you planned to spend next to what you did.',
      },
    ],
  },
  {
    slug: 'budget-together',
    name: 'Budget Together',
    status: 'coming-soon',
    statusLabel: 'Coming soon - Plus',
    tagline: 'Share a budget with your spouse or flatmate. Not your whole financial life.',
    sections: [
      {
        heading: 'Share only what you choose',
        body: 'Pick exactly which accounts to share (say, only your joint SBI account) and everything else stays private on your device, the way Raqm already works today.',
      },
      {
        heading: 'Not a shared inbox for your whole financial life',
        body: 'Your salary account, your personal cards, your own spending stay exactly as private as they are now. Budget Together only ever touches the accounts you explicitly turn on.',
      },
      {
        heading: 'Encrypted before it leaves your phone',
        body: 'Sync between devices is end-to-end encrypted. The server relays data it cannot read: not a policy promise, a property of how it’s built.',
      },
      {
        heading: 'Built for two, not a crowd',
        body: 'Designed around a spouse or a flatmate: one shared budget, two people watching it, no group-chat-sized permission model to manage.',
      },
    ],
  },
  {
    slug: 'ai-insights',
    name: 'AI, on your terms',
    status: 'coming-soon',
    statusLabel: 'Coming soon - Plus',
    tagline: 'Auto-categorization that gets smarter, spending insights, and a second opinion before you buy, without handing over your financial life.',
    sections: [
      {
        heading: 'Three fields leave your phone. Nothing else.',
        body: 'Only the amount, the category, and your own note are ever sent for processing. Never the merchant name, never your location, never the raw SMS.',
      },
      {
        heading: 'Categorization that learns your edge cases',
        body: 'Beyond merchant rules: an AI pass catches the ambiguous ones (a restaurant that’s really a work lunch, a store that sells three different kinds of things) and gets better at your specific spending over time.',
      },
      {
        heading: 'A monthly summary in plain language',
        body: 'What changed, what’s trending up, where the month went, written out, not just charted.',
      },
      {
        heading: '“Should I buy this?”, answered honestly',
        body: 'A quick read on whether a purchase fits your current budget and goals before you make it, not after.',
      },
      {
        heading: 'Turned off by default',
        body: 'It’s opt-in. You decide if and when any of this turns on, nothing is analyzed until you say so, and Raqm’s on-device parsing keeps working exactly the same either way.',
      },
    ],
  },
];

export function getFeatureBySlug(slug: string): FeatureDeepDive | undefined {
  return featureDeepDives.find((feature) => feature.slug === slug);
}

export const FEATURE_CARD_VARIANTS = [
  {
    isDark: false,
    bandBg: 'bg-surface border-border-subtle',
    title: 'text-ink-headline',
    body: 'text-ink-body',
    cta: 'text-accent-primary',
    badgeLive: 'bg-accent-deep text-accent-primary',
    badgeMuted: 'bg-surface text-ink-label',
    panel: 'glass-card',
  },
  {
    isDark: false,
    bandBg: 'bg-surface-raised border-border-subtle',
    title: 'text-ink-headline',
    body: 'text-ink-body',
    cta: 'text-accent-primary',
    badgeLive: 'bg-accent-deep text-accent-primary',
    badgeMuted: 'bg-surface text-ink-label',
    panel: 'glass-card',
  },
  {
    isDark: true,
    bandBg: 'bg-ink-headline border-ink-headline',
    title: 'text-surface',
    body: 'text-[color-mix(in_srgb,var(--color-surface)_72%,transparent)]',
    cta: 'text-accent-deep',
    badgeLive: 'bg-accent-deep text-accent-primary',
    badgeMuted: 'bg-[color-mix(in_srgb,var(--color-surface)_12%,transparent)] text-[color-mix(in_srgb,var(--color-surface)_75%,transparent)]',
    panel: 'rounded-outer border border-[color-mix(in_srgb,var(--color-surface)_16%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_8%,transparent)]',
  },
] as const;

export function getFeatureCardVariant(slug: string) {
  const index = featureDeepDives.findIndex((feature) => feature.slug === slug);
  return FEATURE_CARD_VARIANTS[index % FEATURE_CARD_VARIANTS.length];
}

export function featureViewTransitionName(slug: string) {
  return `feature-card-${slug}`;
}
