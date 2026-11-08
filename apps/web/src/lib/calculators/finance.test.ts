import { describe, expect, it } from 'vitest';
import { budget503020, budgetSplit, compound, emergencyFund, emi, sipFutureValue } from './finance';

const rupees = (n: number) => Math.round(n * 100);

describe('emi', () => {
  it('matches the standard example (10L, 8.5%, 20 years)', () => {
    const r = emi(rupees(1_000_000), 8.5, 240);
    expect(r.payment).toBe(867_823);
  });

  it('schedule sums exactly to principal plus interest', () => {
    const r = emi(rupees(1_000_000), 8.5, 240);
    const paid = r.yearly.reduce((a, y) => a + y.principalPaid, 0);
    expect(paid).toBe(rupees(1_000_000));
    expect(r.yearly.at(-1)?.balance).toBe(0);
    expect(r.total - r.interest).toBe(rupees(1_000_000));
  });

  it('0% rate divides the principal evenly', () => {
    const r = emi(rupees(120_000), 0, 12);
    expect(r.payment).toBe(rupees(10_000));
    expect(r.interest).toBe(0);
  });

  it('handles a partial final year', () => {
    const r = emi(rupees(50_000), 10, 18);
    expect(r.yearly).toHaveLength(2);
    expect(r.yearly[1].balance).toBe(0);
  });
});

describe('sipFutureValue', () => {
  it('10k a month at 12% effective for 10 years', () => {
    const r = sipFutureValue(rupees(10_000), 12, 120);
    expect(r.invested).toBe(rupees(1_200_000));
    expect(Math.abs(r.value - rupees(2_219_300.41))).toBeLessThanOrEqual(1);
  });

  it('start-of-month deposits are worth more', () => {
    const end = sipFutureValue(rupees(5000), 10, 60, 'end').value;
    const start = sipFutureValue(rupees(5000), 10, 60, 'start').value;
    expect(start).toBeGreaterThan(end);
  });

  it('0% rate returns exactly what was invested', () => {
    const r = sipFutureValue(rupees(1000), 0, 24);
    expect(r.value).toBe(rupees(24_000));
    expect(r.gain).toBe(0);
  });
});

describe('compound', () => {
  it('lump sum at 10% effective for 5 years', () => {
    const r = compound({ initial: rupees(100_000), monthly: 0, annualPct: 10, months: 60 });
    expect(r.ok).toBe(true);
    if (r.ok) expect(Math.abs(r.finalBalance - rupees(161_051))).toBeLessThanOrEqual(1);
  });

  it('agrees with the SIP closed form', () => {
    const r = compound({ initial: 0, monthly: rupees(10_000), annualPct: 12, months: 120 });
    const s = sipFutureValue(rupees(10_000), 12, 120);
    if (r.ok) expect(Math.abs(r.finalBalance - s.value)).toBeLessThanOrEqual(2);
  });

  it('0% rate gives no interest', () => {
    const r = compound({ initial: rupees(1000), monthly: rupees(100), annualPct: 0, months: 12 });
    if (r.ok) {
      expect(r.interest).toBe(0);
      expect(r.finalBalance).toBe(rupees(2200));
    }
  });

  it('rolls up yearly rows including a partial year', () => {
    const r = compound({ initial: rupees(1000), monthly: 0, annualPct: 5, months: 30 });
    if (r.ok) expect(r.yearly.map((y) => y.year)).toEqual([1, 2, 3]);
  });

  it('returns coded errors', () => {
    expect(compound({ initial: -1, monthly: 0, annualPct: 5, months: 12 })).toEqual({ ok: false, code: 'no-negative' });
    expect(compound({ initial: 0, monthly: 0, annualPct: 5, months: 12 })).toEqual({ ok: false, code: 'need-amount' });
    expect(compound({ initial: 1, monthly: 0, annualPct: -100, months: 12 })).toEqual({ ok: false, code: 'invalid-rate' });
    expect(compound({ initial: 1, monthly: 0, annualPct: 5, months: 0 })).toEqual({ ok: false, code: 'invalid-term' });
  });
});

describe('emergencyFund', () => {
  it('computes target, gap and months', () => {
    const r = emergencyFund(rupees(30_000), 6, rupees(60_000), rupees(10_000));
    expect(r.target).toBe(rupees(180_000));
    expect(r.gap).toBe(rupees(120_000));
    expect(r.monthsToGoal).toBe(12);
  });

  it('is done when saved covers the target', () => {
    const r = emergencyFund(rupees(10_000), 3, rupees(40_000), 0);
    expect(r.gap).toBe(0);
    expect(r.monthsToGoal).toBe(0);
    expect(r.progress).toBe(1);
  });

  it('has no end date with zero monthly saving', () => {
    expect(emergencyFund(rupees(10_000), 3, 0, 0).monthsToGoal).toBeNull();
  });
});

describe('budget', () => {
  it('50/30/20 always sums to income', () => {
    for (const income of [0, 1, 99, 100_001, rupees(75_555.55)]) {
      const b = budget503020(income);
      expect(b.needs + b.wants + b.savings).toBe(income);
    }
  });

  it('splits a round income exactly', () => {
    expect(budget503020(rupees(100_000))).toEqual({ needs: rupees(50_000), wants: rupees(30_000), savings: rupees(20_000) });
  });

  it('supports other ratios', () => {
    const b = budgetSplit(rupees(50_000), [60, 20, 20]);
    expect(b.needs).toBe(rupees(30_000));
  });
});
