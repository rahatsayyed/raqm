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
    slug: 'split',
    name: 'Split with friends',
    status: 'live',
    statusLabel: 'Live now',
    tagline: 'Split a bill, track who owes what, stop chasing people from memory.',
    sections: [
      {
        heading: 'Split it your way',
        body: 'Equal, custom shares, or one person covers it all. Pick per expense, not once for the whole group.',
      },
      {
        heading: 'Circles remember your people',
        body: 'Save a reusable list of who’s in — flatmates, the trip group, the weekend crew — so you never re-pick the same names every time.',
      },
      {
        heading: 'A link does the asking',
        body: 'Generate a prefilled UPI payment link and hand it over. Paying you back is one tap in their own UPI app — no manual amount typing, no “how much do I owe again?”',
      },
      {
        heading: 'It recognizes when you’ve been paid',
        body: 'Raqm spots a friend’s payment automatically from your own SMS-parsed transactions and surfaces it as a candidate match. Confirm it in one tap.',
      },
      {
        heading: 'Never auto-settled without your say',
        body: 'Every match is a suggestion, not an action. Nothing moves until you approve it.',
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
        body: 'Pick exactly which accounts to share — say, only your joint SBI account — and everything else stays private on your device, the way Raqm already works today.',
      },
      {
        heading: 'Not a shared inbox for your whole financial life',
        body: 'Your salary account, your personal cards, your own spending stay exactly as private as they are now. Budget Together only ever touches the accounts you explicitly turn on.',
      },
      {
        heading: 'Encrypted before it leaves your phone',
        body: 'Sync between devices is end-to-end encrypted. The server relays data it cannot read — not a policy promise, a property of how it’s built.',
      },
      {
        heading: 'Built for two, not a crowd',
        body: 'Designed around a spouse or a flatmate: one shared budget, two people watching it, no group-chat-sized permission model to manage.',
      },
    ],
  },
  {
    slug: 'ai-insights',
    name: 'AI-powered insights',
    status: 'coming-soon',
    statusLabel: 'Coming soon - Plus',
    tagline: 'Understand your spending without handing your financial life to a black box.',
    sections: [
      {
        heading: 'Three fields leave your phone. Nothing else.',
        body: 'Only the amount, the category, and your own note are ever sent for processing. Never the merchant name, never your location, never the raw SMS.',
      },
      {
        heading: 'Turned off by default',
        body: 'It’s opt-in. You decide if and when insights turn on — nothing is analyzed until you say so.',
      },
      {
        heading: 'Doesn’t replace what already works',
        body: 'It’s additive: Raqm’s on-device SMS parsing keeps working exactly the same whether or not you turn this on. Turning it off loses you nothing you had before.',
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
