export type SampleCategory = 'food' | 'transport' | 'shopping' | 'groceries';

export interface SampleTransaction {
  merchant: string;
  category: string;
  kind: SampleCategory;
  source: string;
  amount: string;
  time: string;
}

// Copied verbatim from docs/superpowers/specs/2026-09-23-dashboard-prototype.html
export const SAMPLE_TRANSACTIONS: SampleTransaction[] = [
  { merchant: 'Swiggy', category: 'Food', kind: 'food', source: 'HDFC Credit Card', amount: '−₹420', time: '6:12 PM' },
  { merchant: 'Uber', category: 'Transport', kind: 'transport', source: 'HDFC Credit Card', amount: '−₹280', time: '5:41 PM' },
  { merchant: 'Amazon', category: 'Shopping', kind: 'shopping', source: 'SBI Debit Card', amount: '−₹1,249', time: '1:18 PM' },
];

export const SAMPLE_CATEGORIES = [
  { name: 'Food & Drinks', kind: 'food' as SampleCategory, spent: '₹8,420', budget: '₹12,000', pct: 70, count: 31 },
  { name: 'Shopping', kind: 'shopping' as SampleCategory, spent: '₹6,840', budget: '₹8,000', pct: 86, count: 18 },
  { name: 'Groceries', kind: 'groceries' as SampleCategory, spent: '₹3,280', budget: '₹5,000', pct: 66, count: 12 },
];

export const SAMPLE_DASHBOARD = {
  spent: '₹42,680',
  lessThanLastMonth: '₹7,320',
  remaining: '₹17,320',
  budget: '₹60,000',
  usedPct: 71,
  safeToSpendPerDay: '₹1,420',
  earned: '₹85,000',
};
