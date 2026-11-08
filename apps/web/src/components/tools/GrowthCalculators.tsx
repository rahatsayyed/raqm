'use client';

import { useMemo } from 'react';
import { compound, emi } from '@/lib/calculators/finance';
import { formatRupees, parseNumber, parseRupees } from '@/lib/calculators/money';
import { isObj, oneOf, str } from '@/lib/calculators/share';
import { GrowthChart } from './GrowthChart';
import { YearTable } from './YearTable';
import {
  CalcCard,
  MoneyField,
  Notice,
  NumField,
  ResultHero,
  Segmented,
  ShareButton,
  SplitBar,
  StatGrid,
  Step,
  useShareState,
} from './ui';

const numStr = (x: unknown) => str(x, 16);
const timingOpts = [
  { value: 'end', label: 'End of month' },
  { value: 'start', label: 'Start of month' },
] as const;

type EmiState = { principal: string; rate: string; tenure: string; unit: 'years' | 'months' };
const emiDefaults: EmiState = { principal: '10,00,000', rate: '8.5', tenure: '20', unit: 'years' };

function validateEmi(x: unknown): EmiState | null {
  if (!isObj(x)) return null;
  const principal = numStr(x.principal), rate = numStr(x.rate), tenure = numStr(x.tenure), unit = oneOf(x.unit, ['years', 'months'] as const);
  return principal !== null && rate !== null && tenure !== null && unit ? { principal, rate, tenure, unit } : null;
}

export function EmiCalculator() {
  const { state: s, patch } = useShareState(emiDefaults, validateEmi);
  const principal = parseRupees(s.principal);
  const rate = parseNumber(s.rate);
  const tenure = parseNumber(s.tenure);
  const months = tenure === null ? null : Math.round(s.unit === 'years' ? tenure * 12 : tenure);

  const errs = {
    principal: principal === null || principal <= 0 ? 'Enter a loan amount above zero' : null,
    rate: rate === null || rate < 0 || rate > 100 ? 'Enter a rate between 0 and 100' : null,
    tenure: months === null || months < 1 || months > 600 ? 'Enter a tenure from 1 month to 50 years' : null,
  };
  const ok = !errs.principal && !errs.rate && !errs.tenure;
  const res = useMemo(
    () => (ok ? emi(principal as number, rate as number, months as number) : null),
    [ok, principal, rate, months],
  );

  return (
    <CalcCard eyebrow="Do the math" title="Loan EMI calculator">
      <Step n={1} title="Loan details" hint="What you borrow and what the bank charges.">
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField label="Loan amount" value={s.principal} onChange={(v) => patch({ principal: v })} error={errs.principal} />
          <NumField label="Interest rate" suffix="% a year" value={s.rate} onChange={(v) => patch({ rate: v })} error={errs.rate} hint="As quoted by your lender" />
        </div>
      </Step>
      <Step n={2} title="Tenure" hint="How long you will take to repay.">
        <div className="flex flex-wrap items-start gap-4">
          <div className="w-full sm:w-52">
            <NumField label="Loan term" value={s.tenure} onChange={(v) => patch({ tenure: v })} error={errs.tenure} suffix={s.unit} />
          </div>
          <div className="sm:pt-[26px]">
            <Segmented label="Tenure unit" value={s.unit} onChange={(unit) => patch({ unit })} options={[{ value: 'years', label: 'Years' }, { value: 'months', label: 'Months' }]} />
          </div>
        </div>
      </Step>
      <div className="space-y-4 p-5 sm:p-6">
        {res && principal !== null ? (
          <>
            <ResultHero label="Your monthly EMI" value={formatRupees(res.payment, 2)} sub={`for ${months} months`} />
            <StatGrid
              items={[
                { label: 'Loan amount', value: formatRupees(principal) },
                { label: 'Total interest', value: formatRupees(res.interest), tone: 'brand' },
                { label: 'Total payment', value: formatRupees(res.total) },
              ]}
            />
            <SplitBar
              parts={[
                { label: 'Principal', value: principal, display: formatRupees(principal), tone: 'brand' },
                { label: 'Interest', value: res.interest, display: formatRupees(res.interest), tone: 'ink' },
              ]}
            />
            <YearTable
              title="Year-by-year repayment"
              head={['Year', 'Principal paid', 'Interest paid', 'Balance']}
              rows={res.yearly.map((y) => [y.year, formatRupees(y.principalPaid), formatRupees(y.interestPaid), formatRupees(y.balance)])}
            />
          </>
        ) : (
          <Notice tone="warn">Fill in the loan details above to see your EMI.</Notice>
        )}
        <ShareButton getState={() => s} />
      </div>
    </CalcCard>
  );
}

type CompState = { initial: string; monthly: string; rate: string; years: string; timing: 'end' | 'start' };
const compDefaults: CompState = { initial: '1,00,000', monthly: '5,000', rate: '10', years: '15', timing: 'end' };
const sipDefaults: CompState = { initial: '0', monthly: '10,000', rate: '12', years: '10', timing: 'end' };

function validateComp(x: unknown): CompState | null {
  if (!isObj(x)) return null;
  const initial = numStr(x.initial), monthly = numStr(x.monthly), rate = numStr(x.rate), years = numStr(x.years), timing = oneOf(x.timing, ['end', 'start'] as const);
  return initial !== null && monthly !== null && rate !== null && years !== null && timing ? { initial, monthly, rate, years, timing } : null;
}

function GrowthCalculator({ mode }: { mode: 'sip' | 'compound' }) {
  const isSip = mode === 'sip';
  const { state: s, patch } = useShareState(isSip ? sipDefaults : compDefaults, validateComp);
  const initial = isSip ? 0 : s.initial.trim() === '' ? 0 : parseRupees(s.initial);
  const monthly = s.monthly.trim() === '' ? 0 : parseRupees(s.monthly);
  const rate = parseNumber(s.rate);
  const yrs = parseNumber(s.years);
  const months = yrs === null ? null : Math.round(yrs * 12);

  const errs = {
    initial: initial === null ? 'Enter a valid amount' : null,
    monthly: monthly === null ? 'Enter a valid amount' : isSip && monthly === 0 ? 'Enter a monthly amount above zero' : null,
    rate: rate === null || rate < 0 || rate > 100 ? 'Enter a rate between 0 and 100' : null,
    years: months === null || months < 1 || months > 600 ? 'Enter a term from 1 month to 50 years' : null,
  };
  const ok = !errs.initial && !errs.monthly && !errs.rate && !errs.years && (initial ?? 0) + (monthly ?? 0) > 0;
  const res = useMemo(
    () => (ok ? compound({ initial: initial as number, monthly: monthly as number, annualPct: rate as number, months: months as number, timing: s.timing }) : null),
    [ok, initial, monthly, rate, months, s.timing],
  );

  return (
    <CalcCard eyebrow="Do the math" title={isSip ? 'SIP return calculator' : 'Compound interest calculator'}>
      <Step n={1} title={isSip ? 'Your investment' : 'Your savings'} hint={isSip ? 'What you put in every month.' : 'A starting amount, regular deposits, or both.'}>
        <div className="grid gap-4 sm:grid-cols-2">
          {!isSip && <MoneyField label="Starting amount" value={s.initial} onChange={(v) => patch({ initial: v })} error={errs.initial} />}
          <MoneyField label="Monthly deposit" value={s.monthly} onChange={(v) => patch({ monthly: v })} error={errs.monthly} />
        </div>
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-semibold text-ink">Deposit timing</p>
          <Segmented label="Deposit timing" value={s.timing} onChange={(timing) => patch({ timing })} options={[...timingOpts]} />
        </div>
      </Step>
      <Step n={2} title="Rate and time" hint="Both are assumptions you can change.">
        <div className="grid gap-4 sm:grid-cols-2">
          <NumField
            label={isSip ? 'Expected return' : 'Effective interest rate'}
            suffix="% a year"
            value={s.rate}
            onChange={(v) => patch({ rate: v })}
            error={errs.rate}
            hint="Effective yearly rate, compounded monthly"
          />
          <NumField label="Time" suffix="years" value={s.years} onChange={(v) => patch({ years: v })} error={errs.years} />
        </div>
      </Step>
      <div className="space-y-4 p-5 sm:p-6">
        {res && res.ok ? (
          <>
            <ResultHero label={isSip ? 'Estimated value' : 'Final balance'} value={formatRupees(res.finalBalance)} sub={`after ${yrs} ${yrs === 1 ? 'year' : 'years'} at ${rate}% effective a year`} />
            <StatGrid
              items={[
                { label: 'Total invested', value: formatRupees(res.invested) },
                { label: isSip ? 'Estimated gains' : 'Interest earned', value: formatRupees(res.interest), tone: 'brand' },
                { label: 'Share from growth', value: `${res.interestShare.toFixed(1)}%` },
              ]}
            />
            <GrowthChart rows={res.yearly} start={initial ?? 0} />
            <YearTable
              title="Year-by-year growth"
              head={['Year', 'Invested', 'Interest', 'Balance']}
              rows={res.yearly.map((y) => [y.year, formatRupees(y.invested), formatRupees(y.interest), formatRupees(y.balance)])}
            />
            <p className="text-xs text-ink-subtle">Estimates only. Returns are not guaranteed, and tax, fees and inflation are not included.</p>
          </>
        ) : (
          <Notice tone="warn">Enter an amount, a rate and a time to see the growth.</Notice>
        )}
        <ShareButton getState={() => s} />
      </div>
    </CalcCard>
  );
}

export const SipCalculator = () => <GrowthCalculator mode="sip" />;
export const CompoundCalculator = () => <GrowthCalculator mode="compound" />;
