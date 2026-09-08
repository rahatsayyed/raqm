/**
 * Equal-split rule (v2): the total is divided evenly among totalCount rows —
 * every row, including the creator's own "You" row, is a real stored share.
 * Division happens in integer paise so every row gets an exact two-decimal
 * amount; any leftover paise from the division land on the LAST row, so the
 * array always sums to exactly totalAmount.
 */
export function computeEqualSharesInclusive(totalAmount: number, totalCount: number): number[] {
  if (totalCount <= 0) return [];
  const totalPaise = Math.round(totalAmount * 100);
  const basePaise = Math.floor(totalPaise / totalCount);
  const remainderPaise = totalPaise - basePaise * totalCount;
  const shares = Array(totalCount).fill(basePaise);
  shares[totalCount - 1] += remainderPaise;
  return shares.map((p) => p / 100);
}

/**
 * Converts percentages (assumed already reconciled to sum to 100, each
 * capped at 2 decimal places by the UI) into rupee amounts. Paise-rounded;
 * remainder from rounding lands on the last row so the array sums exactly
 * to totalAmount.
 */
export function computePercentageShares(totalAmount: number, percentages: number[]): number[] {
  if (percentages.length === 0) return [];
  const totalPaise = Math.round(totalAmount * 100);
  const paise = percentages.map((pct) => Math.floor((totalPaise * pct) / 100));
  const usedPaise = paise.reduce((s, p) => s + p, 0);
  paise[paise.length - 1] += totalPaise - usedPaise;
  return paise.map((p) => p / 100);
}

/**
 * Converts relative weights (e.g. 2/1/1) into rupee amounts proportional to
 * each weight's share of the total weight. Paise-rounded; remainder lands on
 * the last row.
 */
export function computeShareWeightAmounts(totalAmount: number, weights: number[]): number[] {
  if (weights.length === 0) return [];
  const totalWeight = weights.reduce((s, w) => s + w, 0);
  if (totalWeight <= 0) return weights.map(() => 0);
  const totalPaise = Math.round(totalAmount * 100);
  const paise = weights.map((w) => Math.floor((totalPaise * w) / totalWeight));
  const usedPaise = paise.reduce((s, p) => s + p, 0);
  paise[paise.length - 1] += totalPaise - usedPaise;
  return paise.map((p) => p / 100);
}

/**
 * Pin-and-redistribute (Exact/Percentage modes): rows the user has typed
 * into are "pinned" at their typed value; every other row splits whatever
 * remains equally. If pinned values already exceed the total, unpinned rows
 * clamp to 0 (the caller is expected to also show an over-allocation
 * warning in that case — this function only computes amounts).
 */
export function redistributeUnpinned(
  totalAmount: number,
  pinned: Map<number, number>,
  totalCount: number,
): number[] {
  const result = Array(totalCount).fill(0);
  let pinnedSum = 0;
  for (const [index, amount] of pinned) {
    result[index] = amount;
    pinnedSum += amount;
  }
  const unpinnedIndices: number[] = [];
  for (let i = 0; i < totalCount; i++) {
    if (!pinned.has(i)) unpinnedIndices.push(i);
  }
  if (unpinnedIndices.length === 0) return result;
  const remaining = totalAmount - pinnedSum;
  if (remaining <= 0) return result; // unpinned rows stay 0; caller shows over-allocation warning
  const shares = computeEqualSharesInclusive(remaining, unpinnedIndices.length);
  unpinnedIndices.forEach((idx, i) => {
    result[idx] = shares[i];
  });
  return result;
}
