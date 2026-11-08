'use client';

import { budgetSplit, emergencyFund } from '@/lib/calculators/finance';
import { formatRupees, parseRupees } from '@/lib/calculators/money';
import { isObj, oneOf, str } from '@/lib/calculators/share';
import { CalcCard, MoneyField, Notice, ResultHero, Segmented, ShareButton, SplitBar, StatGrid, Step, useShareState } from './ui';

const numStr = (x: unknown) => str(x, 16);

const COVERS = ['3', '6', '9', '12'] as const;
type EfState = { essentials: string; cover: (typeof COVERS)[number]; saved: string; saving: string };
const efDefaults: EfState = { essentials: '30,000', cover: '6', saved: '50,000', saving: '10,000' };

function validateEf(x: unknown): EfState | null {
  if (!isObj(x)) return null;
  const essentials = numStr(x.essentials), saved = numStr(x.saved), saving = numStr(x.saving), cover = oneOf(x.cover, COVERS);
  return essentials !== null && saved !== null && saving !== null && cover ? { essentials, cover, saved, saving } : null;
}

function duration(months: number): string {
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [y ? `${y} ${y === 1 ? 'year' : 'years'}` : '', m ? `${m} ${m === 1 ? 'month' : 'months'}` : ''].filter(Boolean);
  return parts.join(' ');
}

export function EmergencyCalculator() {
  const { state: s, patch } = useShareState(efDefaults, validateEf);
  const essentials = parseRupees(s.essentials);
  const saved = s.saved.trim() === '' ? 0 : parseRupees(s.saved);
  const saving = s.saving.trim() === '' ? 0 : parseRupees(s.saving);
  const errs = {
    essentials: essentials === null || essentials <= 0 ? 'Enter your monthly essentials' : null,
    saved: saved === null ? 'Enter a valid amount' : null,
    saving: saving === null ? 'Enter a valid amount' : null,
  };
  const ok = !errs.essentials && !errs.saved && !errs.saving;
  const r = ok ? emergencyFund(essentials as number, Number(s.cover), saved as number, saving as number) : null;

  return (
    <CalcCard eyebrow="Do the math" title="Emergency fund planner">
      <Step n={1} title="Your monthly essentials" hint="Rent, food, bills, EMIs, insurance. Needs only.">
        <MoneyField label="Essentials per month" value={s.essentials} onChange={(v) => patch({ essentials: v })} error={errs.essentials} />
        <div className="mt-4">
          <p className="mb-1.5 text-sm font-semibold text-ink">Months of cover</p>
          <Segmented label="Months of cover" value={s.cover} onChange={(cover) => patch({ cover })} options={COVERS.map((c) => ({ value: c, label: `${c} months` }))} />
        </div>
      </Step>
      <Step n={2} title="Your progress" hint="What you already have and can add each month.">
        <div className="grid gap-4 sm:grid-cols-2">
          <MoneyField label="Saved so far" value={s.saved} onChange={(v) => patch({ saved: v })} error={errs.saved} />
          <MoneyField label="You can save per month" value={s.saving} onChange={(v) => patch({ saving: v })} error={errs.saving} />
        </div>
      </Step>
      <div className="space-y-4 p-5 sm:p-6">
        {r && saved !== null ? (
          <>
            <ResultHero
              label="Your target"
              value={formatRupees(r.target)}
              sub={r.gap === 0 ? 'You are already covered.' : r.monthsToGoal === null ? 'Add a monthly saving to see a finish date.' : `About ${duration(r.monthsToGoal)} to go at your pace.`}
            />
            <StatGrid
              items={[
                { label: 'Saved so far', value: formatRupees(saved) },
                { label: 'Still to save', value: formatRupees(r.gap), tone: 'brand' },
                { label: 'Progress', value: `${Math.round(r.progress * 100)}%` },
              ]}
            />
            <SplitBar
              parts={[
                { label: 'Saved', value: Math.min(saved, r.target), display: formatRupees(Math.min(saved, r.target)), tone: 'brand' },
                { label: 'To go', value: r.gap, display: formatRupees(r.gap), tone: 'muted' },
              ]}
            />
          </>
        ) : (
          <Notice tone="warn">Enter your monthly essentials to see your target.</Notice>
        )}
        <ShareButton getState={() => s} />
      </div>
    </CalcCard>
  );
}

const RATIOS = {
  '50-30-20': [50, 30, 20],
  '60-20-20': [60, 20, 20],
  '70-20-10': [70, 20, 10],
} as const;
type Ratio = keyof typeof RATIOS;
const RATIO_KEYS = Object.keys(RATIOS) as Ratio[];
type BudgetState = { income: string; ratio: Ratio };
const budgetDefaults: BudgetState = { income: '75,000', ratio: '50-30-20' };

function validateBudget(x: unknown): BudgetState | null {
  if (!isObj(x)) return null;
  const income = numStr(x.income), ratio = oneOf(x.ratio, RATIO_KEYS);
  return income !== null && ratio ? { income, ratio } : null;
}

export function BudgetCalculator() {
  const { state: s, patch } = useShareState(budgetDefaults, validateBudget);
  const income = parseRupees(s.income);
  const err = income === null || income <= 0 ? 'Enter your monthly take-home pay' : null;
  const pct = RATIOS[s.ratio];
  const b = !err && income !== null ? budgetSplit(income, [pct[0], pct[1], pct[2]]) : null;
  const rows = b
    ? ([
        ['Needs', b.needs, pct[0], 'brand'],
        ['Wants', b.wants, pct[1], 'ink'],
        ['Savings', b.savings, pct[2], 'soft'],
      ] as const)
    : null;

  return (
    <CalcCard eyebrow="Do the math" title="Needs, wants and savings">
      <Step n={1} title="Your income" hint="Take-home pay: what reaches your account each month.">
        <MoneyField label="Monthly take-home pay" value={s.income} onChange={(v) => patch({ income: v })} error={err} />
      </Step>
      <Step n={2} title="Pick a split" hint="50/30/20 is the classic. Try the others if your costs are higher.">
        <Segmented
          label="Budget split"
          value={s.ratio}
          onChange={(ratio) => patch({ ratio })}
          options={RATIO_KEYS.map((k) => ({ value: k, label: k.replace(/-/g, ' / ') }))}
        />
      </Step>
      <div className="space-y-4 p-5 sm:p-6">
        {rows && b && income !== null ? (
          <>
            <ResultHero label="Put aside for savings each month" value={formatRupees(b.savings)} sub={`${formatRupees(b.savings * 12)} over a year`} />
            <SplitBar parts={rows.map(([label, value, , tone]) => ({ label, value, display: formatRupees(value), tone }))} />
            <div className="overflow-hidden rounded-cell border border-line">
              <table className="w-full text-right text-sm">
                <thead className="bg-surface-sunken text-xs text-ink-subtle">
                  <tr>
                    <th scope="col" className="px-4 py-2 text-left font-semibold">Bucket</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Share</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Monthly</th>
                    <th scope="col" className="px-4 py-2 font-semibold">Yearly</th>
                  </tr>
                </thead>
                <tbody className="font-mono text-ink">
                  {rows.map(([label, value, p]) => (
                    <tr key={label} className="border-t border-line">
                      <th scope="row" className="px-4 py-2.5 text-left font-sans font-medium">{label}</th>
                      <td className="px-4 py-2.5 text-ink-muted">{p}%</td>
                      <td className="px-4 py-2.5">{formatRupees(value)}</td>
                      <td className="px-4 py-2.5 text-ink-muted">{formatRupees(value * 12)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <Notice tone="warn">Enter your monthly take-home pay to see the split.</Notice>
        )}
        <ShareButton getState={() => s} />
      </div>
    </CalcCard>
  );
}
