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
  {
    slug: 'insights',
    name: 'Insights & analytics',
    status: 'live',
    statusLabel: 'Live now',
    tagline: 'See where the month went, calmly. Totals that net out refunds and skip your own transfers.',
    sections: [
      {
        heading: 'Category totals you can trust',
        body: 'Self-transfers stay out and refunds are netted against the category they came from, so the numbers show what you actually spent.',
      },
      {
        heading: 'Month over month at a glance',
        body: 'Compare this period with the last one, and see which categories moved. Your month follows your own pay-cycle day.',
      },
      {
        heading: 'Recurring charges, flagged',
        body: 'The same merchant and amount every month is marked as a subscription, so quiet charges stop hiding.',
      },
      {
        heading: 'Calm by design',
        body: 'Nothing here is built to shame or gamify. It is a clear picture of what already happened.',
      },
    ],
  },
  {
    slug: 'smart-matching',
    name: 'Smart matching',
    status: 'live',
    statusLabel: 'Live now',
    tagline: 'Raqm spots transfers, refunds, duplicates and subscriptions so your totals stay honest.',
    sections: [
      {
        heading: 'Self-transfers are not spending',
        body: 'A debit and a credit of the same amount between your own accounts within 24 hours are linked and kept out of your totals.',
      },
      {
        heading: 'Refunds find their original spend',
        body: 'A credit that matches an earlier debit is linked as a refund and netted against that purchase.',
      },
      {
        heading: 'Duplicates caught',
        body: 'The same transaction arriving twice, from an SMS and a statement for example, is detected so it is not counted twice.',
      },
      {
        heading: 'Subscriptions flagged',
        body: 'The same merchant and amount recurring monthly is marked as a subscription, with a nudge to review it.',
      },
      {
        heading: 'You stay in charge',
        body: 'Every link can be reviewed and changed by hand, and your edits survive later scans.',
      },
    ],
  },
  {
    slug: 'widgets',
    name: 'Home-screen widgets',
    status: 'live',
    statusLabel: 'Live now - Android',
    tagline: 'Seven Android widgets put your numbers and quick actions one glance from your home screen.',
    sections: [
      {
        heading: 'Safe-to-spend, always visible',
        body: 'The daily number sits on your home screen, so you check it without opening the app.',
      },
      {
        heading: 'Budgets at a glance',
        body: 'An overview of your budgets, or a single budget you care about most, as its own widget.',
      },
      {
        heading: 'Where the money went',
        body: 'A category pie and a list of recent transactions, straight from the data on your phone.',
      },
      {
        heading: 'Add a transaction in one tap',
        body: 'An add-transaction widget, plus a voice widget, take you straight to logging a spend.',
      },
      {
        heading: 'Amounts you can mask',
        body: 'Choose to hide amounts in lists and widgets, and tap a masked amount to reveal it.',
      },
    ],
  },
  {
    slug: 'private-by-design',
    name: 'Private by design',
    status: 'live',
    statusLabel: 'Live now',
    tagline: 'Your bank texts are read on your phone and stay on your phone. No account needed.',
    sections: [
      {
        heading: 'Parsed on-device',
        body: 'Amount, merchant and category are read from the SMS right on your phone. The raw message is never sent anywhere.',
      },
      {
        heading: 'No account, no sign-up',
        body: 'Raqm works without a login. Your transactions live in a database on your device.',
      },
      {
        heading: 'Raw bank texts tidied away',
        body: 'On Android, Raqm can replace the raw bank SMS notification with a clean one, so card and balance details are not left on the lock screen.',
      },
      {
        heading: 'Hide amounts when you need to',
        body: 'Mask amounts everywhere, or only in lists and widgets, and reveal one with a tap.',
      },
      {
        heading: 'You delete, it stays deleted',
        body: 'A deleted transaction can be restored from the app, and a later scan will not bring it back.',
      },
    ],
  },
  {
    slug: 'export',
    name: 'Export & import',
    status: 'live',
    statusLabel: 'Live now',
    tagline: 'Your data is yours. Take it out as a spreadsheet or a statement, and bring history in.',
    sections: [
      {
        heading: 'Transactions as CSV',
        body: 'Export your transactions to a CSV file and open it in any spreadsheet.',
      },
      {
        heading: 'A monthly statement as PDF',
        body: 'A summary with income, expense, savings rate and your top categories for the period, ready to share.',
      },
      {
        heading: 'Bring history in',
        body: 'Import a CSV or a statement export from another app, so you do not start from zero.',
      },
      {
        heading: 'Follows your pay cycle',
        body: 'The monthly summary respects your own start-of-month day, the same as budgets and totals.',
      },
    ],
  },
];

export function getFeatureBySlug(slug: string): FeatureDeepDive | undefined {
  return featureDeepDives.find((feature) => feature.slug === slug);
}

export interface ShowcaseTab {
  id: 'capture' | 'categorize' | 'budgets' | 'insights';
  label: string;
  title: string;
  body: string;
  points: string[];
}

export const showcaseTabs: ShowcaseTab[] = [
  {
    id: 'capture',
    label: 'Capture',
    title: 'The SMS arrives. The entry is already there.',
    body: 'Raqm reads your bank texts on the phone itself, so every spend lands in your timeline without you typing a thing.',
    points: ['120+ bank SMS formats', 'PDF statements for quiet accounts', 'Cash added in a few taps'],
  },
  {
    id: 'categorize',
    label: 'Sort',
    title: 'Fix a merchant once. It stays fixed.',
    body: 'Rename a merchant or change its category one time and every future transaction follows. Splits and groups keep odd purchases honest.',
    points: ['Merchant rules that stick', 'Split one bill across categories', 'Self-transfers kept out of spend'],
  },
  {
    id: 'budgets',
    label: 'Budgets',
    title: 'A daily number you can actually trust.',
    body: 'Safe-to-spend accounts for what is left in the period and what is still budgeted, and your month starts on your pay day.',
    points: ['Nudge at 80% of a budget', 'Custom pay-cycle day', 'Optional rollover per category'],
  },
  {
    id: 'insights',
    label: 'Insights',
    title: 'See where the month went, calmly.',
    body: 'Category totals net out refunds, subscriptions get flagged, and nothing is shown to shame you. Just what already happened.',
    points: ['Refunds netted against the spend', 'Recurring charges flagged', 'Month-over-month at a glance'],
  },
];

export interface ProcessStep {
  title: string;
  body: string;
}

export const processSteps: ProcessStep[] = [
  { title: 'Get the SMS', body: 'Every debit and credit already lands as a text. Raqm just listens.' },
  { title: 'Let Raqm read it', body: 'Amount, merchant and category, read right on your phone.' },
  { title: 'See your month', body: 'A clean timeline and budgets that are already up to date.' },
];

export type CellIcon =
  | 'bank' | 'file' | 'cash' | 'tag' | 'split' | 'swap'
  | 'refund' | 'gauge' | 'bell' | 'calendar' | 'repeat' | 'list';

export interface FeatureCell {
  icon: CellIcon;
  title: string;
  body: string;
}

export const featureCells: FeatureCell[] = [
  { icon: 'bank', title: '120+ banks', body: 'Indian and international SMS formats, parsed the moment they arrive.' },
  { icon: 'file', title: 'PDF statements', body: 'Upload a bank or UPI statement for accounts that never text you.' },
  { icon: 'cash', title: 'Cash, logged fast', body: 'Add a cash expense in a few taps and it sits beside everything else.' },
  { icon: 'tag', title: 'Merchant renames', body: 'Fix one name and every future transaction from that merchant follows.' },
  { icon: 'split', title: 'Split a purchase', body: 'Divide one transaction across categories, or group small ones into one entry.' },
  { icon: 'swap', title: 'Self-transfers', body: 'Matching debit and credit between your accounts stay out of spending.' },
  { icon: 'refund', title: 'Refunds netted', body: 'A matching credit is linked back, so totals show what you kept.' },
  { icon: 'gauge', title: 'Safe-to-spend', body: 'A daily number that knows what is left and what is still budgeted.' },
  { icon: 'bell', title: 'Early alerts', body: 'A nudge at 80% of a category budget, and again when it is passed.' },
  { icon: 'calendar', title: 'Pay-cycle months', body: 'Start your month on the 25th, the 1st, or whenever you get paid.' },
  { icon: 'repeat', title: 'Subscriptions', body: 'Same merchant, same amount, every month, flagged for you.' },
  { icon: 'list', title: 'Grocery lists', body: 'Named lists with a running total and the last price you paid.' },
];

export interface HubFeature {
  slug: string;
  name: string;
  chip: string;
  summary: string;
  art: { value: string; caption: string; bars: number[] };
}

export const hubFeatures: HubFeature[] = [
  {
    slug: 'capture-organize',
    name: 'Capture & organize',
    chip: 'Capture',
    summary: 'Your bank already texts you. Raqm reads it on your phone, sorts it and keeps transfers and refunds out of the way.',
    art: { value: '120+', caption: 'bank SMS formats, read on-device', bars: [18, 26, 38, 50, 62, 74, 84, 94] },
  },
  {
    slug: 'smarter-budgets',
    name: 'Smarter budgets',
    chip: 'Budgets',
    summary: 'A safe-to-spend number, early alerts and a month that starts on your pay day.',
    art: { value: '80%', caption: 'the point where a budget nudges you', bars: [14, 24, 36, 48, 60, 72, 80] },
  },
  {
    slug: 'split',
    name: 'Split & settle',
    chip: 'Friends',
    summary: 'Split a bill, share a UPI link and let Raqm notice when you have been paid back.',
    art: { value: '₹1,200', caption: 'each, a 4 person table of ₹4,800', bars: [70, 70, 70, 70] },
  },
  {
    slug: 'insights',
    name: 'Insights & analytics',
    chip: 'Insights',
    summary: 'Category totals that net out refunds and skip transfers, with subscriptions flagged.',
    art: { value: '-₹500', caption: 'refund netted from the original spend', bars: [78, 62, 90, 54, 70, 40] },
  },
  {
    slug: 'smart-matching',
    name: 'Smart matching',
    chip: 'Matching',
    summary: 'Self-transfers, refunds, duplicates and subscriptions are spotted for you.',
    art: { value: '24h', caption: 'window to pair a transfer between your accounts', bars: [60, 60, 60, 60, 60] },
  },
  {
    slug: 'widgets',
    name: 'Home-screen widgets',
    chip: 'Android',
    summary: 'Seven widgets for safe-to-spend, budgets, categories, recent spends and quick add.',
    art: { value: '7', caption: 'Android home-screen widgets', bars: [100, 100, 100, 100, 100, 100, 100] },
  },
  {
    slug: 'private-by-design',
    name: 'Private by design',
    chip: 'Privacy',
    summary: 'SMS is parsed on your phone, with no account and no raw message sent anywhere.',
    art: { value: '0', caption: 'bank texts sent off your phone', bars: [100, 100, 100] },
  },
  {
    slug: 'export',
    name: 'Export & import',
    chip: 'Your data',
    summary: 'Take your transactions out as CSV or a monthly PDF statement, and import history in.',
    art: { value: 'CSV + PDF', caption: 'transactions and monthly statement', bars: [64, 92] },
  },
  {
    slug: 'life-admin',
    name: 'Life admin',
    chip: 'Everyday',
    summary: 'Notes, places, lending reminders and grocery lists that remember what things cost.',
    art: { value: '₹62', caption: 'last price paid, shown as a hint', bars: [40, 55, 48, 66, 58, 80] },
  },
];

export const comingSoonFeatures = featureDeepDives.filter((f) => f.status === 'coming-soon');
