import { ALTERNATIVES } from '@/content/alternatives';

export interface PageSeo {
  title: string;
  description: string;
}

export const HOME_SEO: PageSeo = {
  title: 'Raqm: Private Expense Tracker That Reads Your Bank SMS',
  description:
    'Raqm turns the bank SMS you already get into a clear expense history, on your phone. No bank login, no account. Built for India. Join the waitlist.',
};

export const PAGE_SEO: Record<string, PageSeo> = {
  '/features': {
    title: 'Features: Automatic SMS Expense Tracking | Raqm',
    description:
      'Bank SMS capture, auto categories, safe-to-spend budgets, bill splits with UPI links, 7 Android widgets and CSV export, all processed on your phone.',
  },
  '/free': {
    title: 'Expense Tracker Without Bank Login or Sign-up | Raqm',
    description:
      'No bank login, no account, no server holding your transactions. See how Raqm tracks spending from the SMS on your phone, compared with the usual approach.',
  },
  '/alternatives': {
    title: 'Apps Like Axio, PennyWise, Splitwise, Money Manager | Raqm',
    description:
      'Compare Raqm with Axio, PennyWise, Splitwise, Money Manager, Wallet and Money View. Plain, dated, sourced facts on SMS access, accounts and where data lives.',
  },
  '/blog': {
    title: 'Blog: Bank SMS, Expense Tracking and Privacy | Raqm',
    description:
      'Guides on tracking spending from bank SMS in India, keeping financial data on your phone, and getting honest totals from transfers and refunds.',
  },
  '/faq': {
    title: 'FAQ: SMS Permission, Privacy and Supported Banks | Raqm',
    description:
      'How Raqm reads bank SMS on your phone, why it needs SMS permission, which banks work, budgets, export, and what happens to your data if you lose your phone.',
  },
  '/about': {
    title: 'About: Why I Built a Private Expense Tracker | Raqm',
    description:
      'Raqm is built by founder Rahat Sayyed: a calm, on-device expense tracker for India that works from the bank SMS you already get. No bank login needed.',
  },
  '/privacy': {
    title: 'Privacy Policy | Raqm',
    description:
      'How Raqm handles your data, in plain words: bank SMS processed on your phone, no account, no cloud sync, and a waitlist that stores only your email.',
  },
  '/download': {
    title: 'Download: Android Coming Soon, iPhone in Progress | Raqm',
    description:
      'Raqm is not on Google Play or the App Store yet. Android with automatic SMS tracking comes first; iPhone is in progress. Join the waitlist to hear first.',
  },
};

export const FEATURE_SEO: Record<string, PageSeo> = {
  'capture-organize': {
    title: 'Track Expenses from Bank SMS Automatically | Raqm',
    description:
      'Raqm reads SMS from 120+ bank formats on your phone, logs cash in a few taps, imports Google Pay PDF statements and remembers every merchant fix.',
  },
  split: {
    title: 'Split Bills and Settle Up with UPI Links | Raqm',
    description:
      'Split a bill equally or by custom shares, send a prefilled UPI link, and let Raqm spot the repayment in your bank SMS. Nothing settles without you.',
  },
  'smarter-budgets': {
    title: 'Budgets with a Daily Safe-to-Spend Number | Raqm',
    description:
      'Budgets that follow your salary date, a daily safe-to-spend figure, a nudge at 80% and optional rollover. Built around Indian pay cycles, on your phone.',
  },
  insights: {
    title: 'Spending Insights Without Inflated Totals | Raqm',
    description:
      'Category totals that skip self-transfers and net out refunds, month-over-month changes on your own pay cycle, and recurring charges flagged for you.',
  },
  'smart-matching': {
    title: 'Detect Self-Transfers, Refunds and Duplicates | Raqm',
    description:
      'Raqm pairs transfers between your own accounts, links refunds to the original purchase and catches duplicate entries, so your spending totals stay true.',
  },
  widgets: {
    title: '7 Android Expense Widgets for Your Home Screen | Raqm',
    description:
      'Seven Android widgets for safe-to-spend, budgets, category spend, recent transactions and quick add. See your money at a glance and mask amounts when needed.',
  },
  'private-by-design': {
    title: 'Private Expense Tracker, Data Stays on Phone | Raqm',
    description:
      'Raqm parses bank SMS on your device, needs no account or bank login, and can hide raw bank alerts from your lock screen. Your transactions stay local.',
  },
  export: {
    title: 'Export Expenses to CSV and a Monthly PDF | Raqm',
    description:
      'Export every transaction to CSV, share a monthly PDF statement with income, spend and savings rate, and bring in history from a supported app export.',
  },
  'life-admin': {
    title: 'Grocery Lists, Lending Reminders and Notes | Raqm',
    description:
      'Add notes and places to any payment, get reminded about money you lent, and keep grocery lists that remember last prices and show planned vs actual.',
  },
  'budget-together': {
    title: 'Budget Together: Share a Budget, Not Everything | Raqm',
    description:
      'Coming soon: share one budget with a spouse or flatmate, pick exactly which accounts to include, and keep everything else private on your own phone.',
  },
  'ai-insights': {
    title: 'Opt-in AI Expense Insights, Privacy First | Raqm',
    description:
      'Coming soon and off by default: smarter categories, plain-language monthly summaries and a should-I-buy-this check. Only amount, category and note leave.',
  },
};

export const POST_SEO: Record<string, PageSeo> = {
  'why-your-bank-sms-should-stay-on-your-phone': {
    title: 'Is It Safe to Let an App Read Your Bank SMS? | Raqm',
    description:
      'Bank SMS reveal amounts, merchants and balances. What an SMS expense tracker should do with them, and why Raqm parses every message on your phone.',
  },
  'track-expenses-from-bank-sms-in-india': {
    title: 'How to Track Expenses from Bank SMS in India | Raqm',
    description:
      'Turn the bank and UPI alerts you already get into an automatic expense history. A step-by-step guide, from SMS permission to fixing a merchant once.',
  },
  'self-transfers-refunds-and-your-real-spending': {
    title: 'Why Self-Transfers and Refunds Inflate Spending | Raqm',
    description:
      'Moving money between your own accounts is not spending, and a refund undoes a purchase. How an expense tracker should handle both, with examples.',
  },
  'why-raqm-starts-on-android': {
    title: 'Why Raqm Is Android-First: SMS Access on iPhone',
    description:
      'Android lets apps read bank SMS with your permission; iOS does not. What that means for automatic expense tracking and how the iPhone version works.',
  },
};

export const ALTERNATIVE_SEO: Record<string, PageSeo> = Object.fromEntries(
  ALTERNATIVES.map((a) => [a.slug, { title: a.seoTitle, description: a.seoDescription }]),
);

export function seoFor(path: string): PageSeo | undefined {
  if (path === '/') return HOME_SEO;
  if (PAGE_SEO[path]) return PAGE_SEO[path];
  const [, section, slug] = path.split('/');
  if (section === 'features' && slug) return FEATURE_SEO[slug];
  if (section === 'alternatives' && slug) return ALTERNATIVE_SEO[slug];
  if (section === 'blog' && slug) return POST_SEO[slug];
  return undefined;
}
