export type Tx = { merchant: string; category: string; amount: string; time: string; tone: 'food' | 'move' | 'shop' | 'bill' | 'in' };

export const TXS: Tx[] = [
  { merchant: 'Swiggy', category: 'Food', amount: '-₹420', time: '6:12 PM', tone: 'food' },
  { merchant: 'Uber', category: 'Transport', amount: '-₹280', time: '5:41 PM', tone: 'move' },
  { merchant: 'Amazon', category: 'Shopping', amount: '-₹1,249', time: '1:18 PM', tone: 'shop' },
  { merchant: 'Airtel Postpaid', category: 'Bills', amount: '-₹599', time: '11:02 AM', tone: 'bill' },
  { merchant: 'Salary', category: 'Income', amount: '+₹85,000', time: 'Yesterday', tone: 'in' },
  { merchant: 'BigBasket', category: 'Groceries', amount: '-₹864', time: 'Yesterday', tone: 'food' },
  { merchant: 'Metro Card', category: 'Transport', amount: '-₹500', time: 'Yesterday', tone: 'move' },
];

export const CATS = [
  { name: 'Food & Drinks', spent: '₹8,420', pct: 70 },
  { name: 'Shopping', spent: '₹6,840', pct: 86 },
  { name: 'Groceries', spent: '₹3,280', pct: 66 },
  { name: 'Transport', spent: '₹2,150', pct: 43 },
];

export const WEEK = [38, 62, 24, 71, 45, 88, 52];
