'use client';

import { useMemo } from 'react';
import { formatRupees, parseNumber, parseRupees } from '@/lib/calculators/money';
import { isObj, oneOf, str } from '@/lib/calculators/share';
import { percentOf, splitBill, splitEven } from '@/lib/calculators/splitBill';
import { CalcCard, MoneyField, Notice, NumField, ResultHero, Segmented, ShareButton, StatGrid, Step, TextField, useShareState } from './ui';

const MAX_PEOPLE = 12;
const MAX_ITEMS = 25;

type Item = { name: string; price: string; qty: string; who: number[] };
type State = { mode: 'equal' | 'items'; total: string; count: string; tip: string; extras: string; names: string[]; items: Item[] };

const defaults: State = {
  mode: 'equal',
  total: '4,800',
  count: '4',
  tip: '10',
  extras: '',
  names: ['Asha', 'Ravi', 'Meera'],
  items: [
    { name: 'Paneer tikka', price: '420', qty: '1', who: [0, 1, 2] },
    { name: 'Biryani', price: '380', qty: '2', who: [0, 1] },
    { name: 'Mojito', price: '240', qty: '1', who: [2] },
  ],
};

function validate(x: unknown): State | null {
  if (!isObj(x)) return null;
  const mode = oneOf(x.mode, ['equal', 'items'] as const);
  const total = str(x.total, 16), count = str(x.count, 4), tip = str(x.tip, 8), extras = str(x.extras, 16);
  if (!mode || total === null || count === null || tip === null || extras === null) return null;
  if (!Array.isArray(x.names) || x.names.length < 2 || x.names.length > MAX_PEOPLE) return null;
  const names = x.names.map((n) => str(n, 24));
  if (names.some((n) => n === null)) return null;
  if (!Array.isArray(x.items) || x.items.length > MAX_ITEMS) return null;
  const items: Item[] = [];
  for (const it of x.items) {
    if (!isObj(it) || !Array.isArray(it.who)) return null;
    const name = str(it.name, 40), price = str(it.price, 16), qty = str(it.qty, 3);
    const who = it.who.filter((w): w is number => Number.isInteger(w) && w >= 0 && w < names.length);
    if (name === null || price === null || qty === null) return null;
    items.push({ name, price, qty, who: [...new Set(who)] });
  }
  return { mode, total, count, tip, extras, names: names as string[], items };
}

const initials = (name: string, i: number) => name.trim() || `Person ${i + 1}`;

export function SplitBillCalculator() {
  const { state: s, patch } = useShareState(defaults, validate);
  const tip = s.tip.trim() === '' ? 0 : parseNumber(s.tip);
  const extras = s.extras.trim() === '' ? 0 : parseRupees(s.extras);
  const tipBps = tip === null ? null : Math.round(tip * 100);
  const tipErr = tip === null || tip < 0 || tip > 100 ? 'Enter a tip between 0 and 100' : null;
  const extrasErr = extras === null ? 'Enter a valid amount' : null;

  const total = parseRupees(s.total);
  const count = parseNumber(s.count);
  const totalErr = total === null || total <= 0 ? 'Enter the bill amount' : null;
  const countErr = count === null || !Number.isInteger(count) || count < 2 || count > MAX_PEOPLE ? `Use 2 to ${MAX_PEOPLE} people` : null;

  const equal = useMemo(() => {
    if (totalErr || countErr || tipErr || extrasErr) return null;
    const tipAmt = percentOf(total as number, tipBps as number);
    const grand = (total as number) + tipAmt + (extras as number);
    const parts = splitEven(grand, count as number);
    return { grand, tipAmt, parts };
  }, [totalErr, countErr, tipErr, extrasErr, total, tipBps, extras, count]);

  const rowErrs = s.items.map((it) => {
    if (it.price.trim() === '') return null;
    const p = parseRupees(it.price);
    const q = parseNumber(it.qty);
    if (p === null || p <= 0) return 'Enter a valid price';
    if (q === null || !Number.isInteger(q) || q < 1 || q > 99) return 'Quantity 1 to 99';
    return null;
  });
  const itemsErr = rowErrs.some(Boolean);

  const byItem = useMemo(() => {
    if (itemsErr || tipErr || extrasErr) return null;
    const items = s.items
      .filter((it) => it.price.trim() !== '')
      .map((it) => ({ price: parseRupees(it.price) as number, qty: Number(it.qty), people: it.who }));
    if (!items.length) return null;
    return splitBill({ items, peopleCount: s.names.length, tipBps: tipBps as number, extras: extras as number });
  }, [itemsErr, tipErr, extrasErr, s.items, s.names.length, tipBps, extras]);

  const setItem = (i: number, p: Partial<Item>) => patch({ items: s.items.map((it, k) => (k === i ? { ...it, ...p } : it)) });
  const setName = (i: number, v: string) => patch({ names: s.names.map((n, k) => (k === i ? v : n)) });
  const addPerson = () => patch({ names: [...s.names, ''] });
  const removePerson = (i: number) =>
    patch({
      names: s.names.filter((_, k) => k !== i),
      items: s.items.map((it) => ({ ...it, who: it.who.filter((w) => w !== i).map((w) => (w > i ? w - 1 : w)) })),
    });
  const toggle = (i: number, person: number) =>
    setItem(i, { who: s.items[i].who.includes(person) ? s.items[i].who.filter((w) => w !== person) : [...s.items[i].who, person] });

  const feeFields = (n: number) => (
    <Step n={n} title="Tip and fees" hint="Tip follows each person's items. Fees are shared evenly.">
      <div className="grid gap-4 sm:grid-cols-2">
        <NumField label="Tip" suffix="%" value={s.tip} onChange={(v) => patch({ tip: v })} error={tipErr} />
        <MoneyField label="Fees and taxes (optional)" value={s.extras} onChange={(v) => patch({ extras: v })} error={extrasErr} />
      </div>
    </Step>
  );

  const addBtn =
    'inline-flex min-h-9 items-center rounded-pill border border-line px-3.5 text-sm font-semibold text-ink transition duration-150 hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none';

  return (
    <CalcCard eyebrow="Do the math" title="Split the bill">
      <div className="border-b border-line p-5 sm:px-6">
        <Segmented
          full
          label="Split mode"
          value={s.mode}
          onChange={(mode) => patch({ mode })}
          options={[{ value: 'equal', label: 'Split equally' }, { value: 'items', label: 'By item' }]}
        />
      </div>

      {s.mode === 'equal' ? (
        <>
          <Step n={1} title="The bill" hint="The amount on the bill before tip.">
            <div className="grid gap-4 sm:grid-cols-2">
              <MoneyField label="Bill amount" value={s.total} onChange={(v) => patch({ total: v })} error={totalErr} />
              <NumField label="People" value={s.count} onChange={(v) => patch({ count: v })} error={countErr} />
            </div>
          </Step>
          {feeFields(2)}
          <div className="space-y-4 p-5 sm:p-6">
            {equal ? (
              <>
                <ResultHero
                  label="Each person pays"
                  value={formatRupees(equal.parts[0], 2)}
                  sub={equal.parts[0] !== equal.parts[equal.parts.length - 1] ? `The last ${equal.parts.filter((p) => p < equal.parts[0]).length} pay ${formatRupees(equal.parts[equal.parts.length - 1], 2)} so the total matches.` : `${equal.parts.length} people, split evenly`}
                />
                <StatGrid
                  items={[
                    { label: 'Bill', value: formatRupees(total as number, 2) },
                    { label: 'Tip', value: formatRupees(equal.tipAmt, 2) },
                    { label: 'Grand total', value: formatRupees(equal.grand, 2), tone: 'brand' },
                  ]}
                />
              </>
            ) : (
              <Notice tone="warn">Enter the bill and number of people to see each share.</Notice>
            )}
            <ShareButton getState={() => s} />
          </div>
        </>
      ) : (
        <>
          <Step
            n={1}
            title="Who is splitting"
            hint={`Up to ${MAX_PEOPLE} people.`}
            action={<button type="button" disabled={s.names.length >= MAX_PEOPLE} onClick={addPerson} className={addBtn}>Add person</button>}
          >
            <ul className="grid gap-3 sm:grid-cols-2">
              {s.names.map((n, i) => (
                <li key={i} className="flex items-end gap-2">
                  <div className="min-w-0 flex-1">
                    <TextField label={`Person ${i + 1}`} value={n} onChange={(v) => setName(i, v)} placeholder={`Person ${i + 1}`} />
                  </div>
                  <button
                    type="button"
                    disabled={s.names.length <= 2}
                    onClick={() => removePerson(i)}
                    aria-label={`Remove ${initials(n, i)}`}
                    className="grid size-11 shrink-0 place-items-center rounded-cell border border-line text-ink-muted transition duration-150 hover:bg-surface-sunken hover:text-negative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-40 motion-reduce:transition-none"
                  >
                    <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                  </button>
                </li>
              ))}
            </ul>
          </Step>
          <Step
            n={2}
            title="What was ordered"
            hint="Tick everyone who shared each item. None ticked means everyone."
            action={<button type="button" disabled={s.items.length >= MAX_ITEMS} onClick={() => patch({ items: [...s.items, { name: '', price: '', qty: '1', who: [] }] })} className={addBtn}>Add item</button>}
          >
            <ul className="space-y-3">
              {s.items.map((it, i) => (
                <li key={i} className="rounded-cell bg-surface-sunken/60 p-3 sm:p-4">
                  <div className="grid grid-cols-[1fr_72px_auto] gap-3 sm:grid-cols-[1.4fr_1fr_88px_auto]">
                    <div className="col-span-3 sm:col-span-1"><TextField label="Item" max={40} value={it.name} onChange={(v) => setItem(i, { name: v })} placeholder="e.g. Pizza" /></div>
                    <MoneyField label="Price" value={it.price} onChange={(v) => setItem(i, { price: v })} error={rowErrs[i]} />
                    <NumField label="Qty" value={it.qty} onChange={(v) => setItem(i, { qty: v })} />
                    <button
                      type="button"
                      onClick={() => patch({ items: s.items.filter((_, k) => k !== i) })}
                      aria-label={`Remove item ${i + 1}`}
                      className="mt-[26px] grid size-11 place-items-center rounded-cell border border-line bg-surface text-ink-muted transition duration-150 hover:text-negative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none"
                    >
                      <svg aria-hidden width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                    </button>
                  </div>
                  <fieldset className="mt-3">
                    <legend className="sr-only">Shared by</legend>
                    <div className="flex flex-wrap gap-1.5">
                      {s.names.map((n, p) => (
                        <label
                          key={p}
                          className="cursor-pointer rounded-pill border border-line bg-surface px-3 py-1.5 text-[13px] font-medium text-ink-muted transition duration-150 has-[:checked]:border-brand has-[:checked]:bg-brand-soft has-[:checked]:text-ink has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring motion-reduce:transition-none"
                        >
                          <input type="checkbox" className="sr-only" checked={it.who.includes(p)} onChange={() => toggle(i, p)} />
                          {initials(n, p)}
                        </label>
                      ))}
                    </div>
                  </fieldset>
                </li>
              ))}
              {!s.items.length && <li className="rounded-cell border border-dashed border-line p-4 text-center text-sm text-ink-subtle">No items yet. Add the first one.</li>}
            </ul>
          </Step>
          {feeFields(3)}
          <div className="space-y-4 p-5 sm:p-6">
            {byItem ? (
              <>
                <ResultHero label="Bill total" value={formatRupees(byItem.total, 2)} sub={`${formatRupees(byItem.subtotal, 2)} items + ${formatRupees(byItem.tip, 2)} tip + ${formatRupees(extras as number, 2)} fees`} />
                <div className="overflow-x-auto rounded-cell border border-line">
                  <table className="w-full min-w-[460px] text-right text-sm">
                    <thead className="bg-surface-sunken text-xs text-ink-subtle">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left font-semibold">Person</th>
                        <th scope="col" className="px-4 py-2 font-semibold">Items</th>
                        <th scope="col" className="px-4 py-2 font-semibold">Tip</th>
                        <th scope="col" className="px-4 py-2 font-semibold">Fees</th>
                        <th scope="col" className="px-4 py-2 font-semibold text-ink">Owes</th>
                      </tr>
                    </thead>
                    <tbody className="font-mono text-ink">
                      {byItem.shares.map((sh, i) => (
                        <tr key={i} className="border-t border-line">
                          <th scope="row" className="px-4 py-2.5 text-left font-sans font-medium">{initials(s.names[i], i)}</th>
                          <td className="px-4 py-2.5 text-ink-muted">{formatRupees(sh.items, 2)}</td>
                          <td className="px-4 py-2.5 text-ink-muted">{formatRupees(sh.tip, 2)}</td>
                          <td className="px-4 py-2.5 text-ink-muted">{formatRupees(sh.extras, 2)}</td>
                          <td className="px-4 py-2.5 font-medium">{formatRupees(sh.total, 2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <Notice tone="warn">Add at least one item with a price to see who owes what.</Notice>
            )}
            <ShareButton getState={() => s} />
          </div>
        </>
      )}
    </CalcCard>
  );
}
