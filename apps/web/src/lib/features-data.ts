export type FeatureStatus = 'live' | 'coming-soon';

export interface FeatureDeepDive {
  slug: string;
  name: string;
  status: FeatureStatus;
  statusLabel: string;
  tagline: string;
  paragraphs: string[];
}

export const featureDeepDives: FeatureDeepDive[] = [
  {
    slug: 'split',
    name: 'Split with friends',
    status: 'live',
    statusLabel: 'Live now',
    tagline: 'Split a bill, track who owes what, and stop chasing people from memory.',
    paragraphs: [
      'Record a group or 1:1 expense and split it equally or by custom shares. Save a reusable list of people — a Circle — so you never re-pick the same friends every time.',
      'Generate a prefilled UPI payment link and hand it to whoever owes you — paying back is one tap in their own UPI app.',
      "Raqm can spot a friend's payment automatically from your own SMS-parsed transactions, and surface it as a candidate match for you to confirm — never auto-settled without your say.",
    ],
  },
  {
    slug: 'budget-together',
    name: 'Budget Together',
    status: 'coming-soon',
    statusLabel: 'Coming soon — Plus',
    tagline: 'Share a budget with your spouse or flatmate, without sharing your whole financial life.',
    paragraphs: [
      "Choose exactly which accounts to share — say, only your joint SBI account — and everything else stays private on your device, the way Raqm already works today.",
      'Sync between devices is end-to-end encrypted. The server relays encrypted data it cannot read — not just a policy promise, a property of how it is built.',
    ],
  },
  {
    slug: 'ai-insights',
    name: 'AI-powered insights',
    status: 'coming-soon',
    statusLabel: 'Coming soon — Plus',
    tagline: 'Understand your spending patterns without handing your financial life to a black box.',
    paragraphs: [
      'Only the amount, category, and your own note are ever sent for processing — never the merchant name, never your location, never the raw SMS.',
      "It's opt-in, and it's additive: Raqm's on-device parsing keeps working exactly the same whether or not you turn this on.",
    ],
  },
];

export function getFeatureBySlug(slug: string): FeatureDeepDive | undefined {
  return featureDeepDives.find((feature) => feature.slug === slug);
}
