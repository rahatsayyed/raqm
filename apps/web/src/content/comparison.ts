import type { ComparisonRow } from '@/components/sections/ComparisonCard';

type Cell = Pick<ComparisonRow, 'icon' | 'raqm'> & { other: string; otherMark: ComparisonRow['other'] };

const CELLS = {
  data: { icon: 'phone', raqm: 'On your phone', other: 'Often on company servers', otherMark: 'limit' },
  account: { icon: 'user', raqm: 'No account', other: 'Usually an account', otherMark: 'limit' },
  bank: { icon: 'bank', raqm: 'Not needed', other: 'Often asked for', otherMark: 'limit' },
  offline: { icon: 'wifi', raqm: 'Tracking works offline', other: 'Varies by app', otherMark: 'limit' },
  sms: { icon: 'sms', raqm: 'Reads bank SMS automatically', other: 'Manual entry or linked accounts', otherMark: 'limit' },
  widget: { icon: 'widget', raqm: 'On your home screen', other: 'Varies by app', otherMark: 'limit' },
  export: { icon: 'export', raqm: 'Export your transactions', other: 'Varies by app', otherMark: 'limit' },
  budgets: { icon: 'chart', raqm: 'Budgets and analytics', other: 'Budgets and analytics', otherMark: 'yes' },
  transfers: { icon: 'transfer', raqm: 'Detected, kept out of totals', other: 'Can count as spending', otherMark: 'limit' },
  refunds: { icon: 'refund', raqm: 'Netted against the original category', other: 'Varies by app', otherMark: 'limit' },
  delete: { icon: 'trash', raqm: 'Soft delete, restorable', other: 'Varies by app', otherMark: 'limit' },
} satisfies Record<string, Cell>;

type Id = keyof typeof CELLS;

const home = (id: Id, feature: string, raqm?: string): ComparisonRow => ({ feature, icon: CELLS[id].icon, raqm: raqm ?? CELLS[id].raqm, other: CELLS[id].otherMark });
const free = (id: Id, feature: string): ComparisonRow => ({ feature, icon: CELLS[id].icon, raqm: CELLS[id].raqm, other: CELLS[id].other });

export const HOME_ROWS: ComparisonRow[] = [
  home('data', 'Your data stays on your phone'),
  home('account', 'No account or sign-up needed', 'No sign-up, ever'),
  home('bank', 'No bank login or linking', 'No bank login'),
  home('offline', 'Works offline'),
  home('sms', 'Reads bank SMS automatically (Android)'),
  home('widget', 'Home-screen widgets (Android)'),
  home('export', 'Export your transactions'),
  home('budgets', 'Budgets and analytics'),
];

export const FREE_ROWS: ComparisonRow[] = [
  free('bank', 'Bank login or account linking'),
  free('data', 'Where your data is processed'),
  free('account', 'Sign-up to use it'),
  free('sms', 'Capturing transactions (Android)'),
  free('transfers', 'Moves between your own accounts'),
  free('refunds', 'Refunds'),
  free('delete', 'Deleting a transaction'),
  free('export', 'Taking your data with you'),
];
