const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', RS: '₹', 'RS.': '₹', USD: '$', EUR: '€', GBP: '£', AED: 'د.إ', SAR: '﷼', THB: '฿',
};

/** Maps parser currency codes (e.g. "INR") to display symbols; passes through symbols like "₹". */
export function currencySymbol(currency?: string | null): string {
  if (!currency) return '₹';
  const upper = currency.trim().toUpperCase();
  return CURRENCY_SYMBOLS[upper] ?? currency;
}

/** "₹8,064.65" — decimals shown only when present, capped at 2 digits. */
export function formatAmount(n: number, currency?: string | null): string {
  return `${currencySymbol(currency)}${Math.abs(n).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}
