/** Even split: the first `rest` people pay one paisa more. Always sums to total. */
export function splitEven(total: number, n: number): number[] {
  if (n <= 0) return [];
  const base = Math.floor(total / n);
  const rest = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

/** Largest-remainder proportional split. Always sums to total; ties go to the earlier index. */
export function splitProportional(total: number, weights: number[]): number[] {
  const w = weights.map((x) => Math.max(0, Math.floor(x)));
  const sum = w.reduce((a, b) => a + b, 0);
  if (sum <= 0) return splitEven(total, w.length);
  const bigSum = BigInt(sum);
  const parts = w.map((x, i) => {
    const num = BigInt(total) * BigInt(x);
    return { i, value: Number(num / bigSum), rem: num % bigSum };
  });
  const left = total - parts.reduce((a, p) => a + p.value, 0);
  [...parts]
    .sort((a, b) => (a.rem === b.rem ? a.i - b.i : a.rem > b.rem ? -1 : 1))
    .forEach((p, k) => {
      if (k < left) p.value += 1;
    });
  return parts.sort((a, b) => a.i - b.i).map((p) => p.value);
}

/** Percent in basis points of a paise amount, rounded half up. */
export function percentOf(paise: number, bps: number): number {
  return Number((BigInt(paise) * BigInt(bps) + BigInt(5000)) / BigInt(10000));
}

export type BillItem = { price: number; qty: number; people: number[] };
export type BillShare = { items: number; tip: number; extras: number; total: number };

/** Items split evenly among the people who shared them, tip follows each person's items, extras are even. */
export function splitBill(input: {
  items: BillItem[];
  peopleCount: number;
  tipBps: number;
  extras: number;
}): { shares: BillShare[]; subtotal: number; tip: number; total: number } {
  const n = input.peopleCount;
  const sub = new Array<number>(n).fill(0);
  let subtotal = 0;
  for (const it of input.items) {
    const line = it.price * it.qty;
    subtotal += line;
    const who = [...new Set(it.people)].filter((p) => p >= 0 && p < n);
    const eaters = who.length ? who : Array.from({ length: n }, (_, i) => i);
    const parts = splitEven(line, eaters.length);
    eaters.forEach((p, k) => {
      sub[p] += parts[k];
    });
  }
  const tip = percentOf(subtotal, input.tipBps);
  const tipShares = splitProportional(tip, sub);
  const extraShares = splitEven(input.extras, n);
  const shares = sub.map((items, i) => ({
    items,
    tip: tipShares[i],
    extras: extraShares[i],
    total: items + tipShares[i] + extraShares[i],
  }));
  return { shares, subtotal, tip, total: subtotal + tip + input.extras };
}
