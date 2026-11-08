export const MAX_PAISE = 999_999_999_999;

const rupeeFmt = (digits: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const whole = rupeeFmt(0);
const fixed = rupeeFmt(2);

/** Paise to a rupee string; whole rupees by default, 2 decimals when asked. */
export function formatRupees(paise: number, decimals: 0 | 2 = 0): string {
  return (decimals === 2 ? fixed : whole).format(paise / 100);
}

/** Compact lakh/crore style for chart axes and tiles. */
export function formatCompact(paise: number): string {
  const r = paise / 100;
  const trim = (n: number) => n.toFixed(2).replace(/\.?0+$/, '');
  if (r >= 1e7) return `₹${trim(r / 1e7)} Cr`;
  if (r >= 1e5) return `₹${trim(r / 1e5)} L`;
  if (r >= 1e3) return `₹${trim(r / 1e3)}K`;
  return `₹${Math.round(r)}`;
}

/** Lenient rupee text ("1,50,000.5") to integer paise; null when invalid. */
export function parseRupees(text: string): number | null {
  const t = text.trim().replace(/[₹\s,]/g, '');
  if (!t || !/^\d*\.?\d*$/.test(t) || t === '.') return null;
  const [w = '', f = ''] = t.split('.');
  const paise = Number(w || '0') * 100 + Number(f.slice(0, 2).padEnd(2, '0'));
  return Number.isSafeInteger(paise) && paise <= MAX_PAISE ? paise : null;
}

/** Plain number text (rate, years, count) to a finite number; null when invalid. */
export function parseNumber(text: string): number | null {
  const t = text.trim().replace(/,/g, '');
  if (!t || !/^-?\d*\.?\d+$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Group the integer part with en-IN separators, keep what the user typed after the dot. */
export function groupRupeeText(text: string): string {
  const t = text.replace(/[^\d.]/g, '');
  if (!t) return '';
  const [w = '', ...rest] = t.split('.');
  const grouped = new Intl.NumberFormat('en-IN').format(Number(w || '0'));
  return rest.length ? `${grouped}.${rest.join('').slice(0, 2)}` : grouped;
}
