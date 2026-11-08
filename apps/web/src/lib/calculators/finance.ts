import { splitProportional } from './splitBill';

/** Monthly rate from an effective yearly percent. */
export const monthlyFromEffective = (annualPct: number) => Math.pow(1 + annualPct / 100, 1 / 12) - 1;

/** Monthly rate from a stated (nominal) yearly percent, as banks quote loans. */
export const monthlyFromNominal = (annualPct: number) => annualPct / 100 / 12;

export type YearRow = { year: number; invested: number; balance: number; interest: number };

export type EmiYear = { year: number; principalPaid: number; interestPaid: number; balance: number };

/** Loan EMI in paise. Interest is rounded each month so the schedule sums exactly; the last payment absorbs rounding. */
export function emi(principal: number, annualPct: number, months: number) {
  const r = monthlyFromNominal(annualPct);
  const exact =
    r === 0 ? principal / months : (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
  const payment = Math.round(exact);
  let bal = principal;
  let total = 0;
  let yearP = 0;
  let yearI = 0;
  const yearly: EmiYear[] = [];
  for (let m = 1; m <= months; m++) {
    const interest = Math.round(bal * r);
    let pay = payment;
    if (m === months || pay - interest > bal) pay = bal + interest;
    const princ = pay - interest;
    bal -= princ;
    total += pay;
    yearP += princ;
    yearI += interest;
    if (m % 12 === 0 || m === months) {
      yearly.push({ year: Math.ceil(m / 12), principalPaid: yearP, interestPaid: yearI, balance: bal });
      yearP = 0;
      yearI = 0;
    }
  }
  return { payment, total, interest: total - principal, yearly };
}

/** SIP closed form, effective yearly rate. Start-of-month deposits earn one extra month. */
export function sipFutureValue(
  monthly: number,
  annualPct: number,
  months: number,
  timing: 'end' | 'start' = 'end',
) {
  const r = monthlyFromEffective(annualPct);
  const fv = r === 0 ? monthly * months : monthly * ((Math.pow(1 + r, months) - 1) / r);
  const value = Math.round(timing === 'start' ? fv * (1 + r) : fv);
  const invested = monthly * months;
  return { value, invested, gain: value - invested };
}

export type CompoundResult =
  | { ok: false; code: 'no-negative' | 'need-amount' | 'invalid-rate' | 'invalid-term' }
  | {
      ok: true;
      finalBalance: number;
      invested: number;
      interest: number;
      interestShare: number;
      yearly: YearRow[];
    };

/** Month-by-month compounding of a lump sum plus monthly deposits, at an effective yearly rate. */
export function compound(opts: {
  initial: number;
  monthly: number;
  annualPct: number;
  months: number;
  timing?: 'end' | 'start';
}): CompoundResult {
  const { initial, monthly, annualPct, months, timing = 'end' } = opts;
  if (initial < 0 || monthly < 0) return { ok: false, code: 'no-negative' };
  if (initial <= 0 && monthly <= 0) return { ok: false, code: 'need-amount' };
  if (annualPct <= -100) return { ok: false, code: 'invalid-rate' };
  if (!Number.isInteger(months) || months < 1) return { ok: false, code: 'invalid-term' };
  const r = monthlyFromEffective(annualPct);
  let bal = initial;
  let invested = initial;
  const yearly: YearRow[] = [];
  for (let m = 1; m <= months; m++) {
    if (timing === 'start') {
      bal += monthly;
      bal += bal * r;
    } else {
      bal += bal * r + monthly;
    }
    invested += monthly;
    if (m % 12 === 0 || m === months) {
      yearly.push({
        year: Math.ceil(m / 12),
        invested,
        balance: Math.round(bal),
        interest: Math.round(bal) - invested,
      });
    }
  }
  const finalBalance = Math.round(bal);
  return {
    ok: true,
    finalBalance,
    invested,
    interest: finalBalance - invested,
    interestShare: finalBalance > 0 ? ((finalBalance - invested) / finalBalance) * 100 : 0,
    yearly,
  };
}

/** Emergency fund: target is essentials x months of cover; months to goal at a steady saving. */
export function emergencyFund(essentials: number, coverMonths: number, saved: number, monthlySaving: number) {
  const target = essentials * coverMonths;
  const gap = Math.max(0, target - saved);
  return {
    target,
    gap,
    progress: target > 0 ? Math.min(1, saved / target) : 0,
    monthsToGoal: gap === 0 ? 0 : monthlySaving > 0 ? Math.ceil(gap / monthlySaving) : null,
  };
}

/** Split take-home pay by needs/wants/savings percents; parts always sum to income. */
export function budgetSplit(income: number, pct: [number, number, number]) {
  const [needs, wants, savings] = splitProportional(income, pct);
  return { needs, wants, savings };
}

export const budget503020 = (income: number) => budgetSplit(income, [50, 30, 20]);
