/**
 * Equal-split rule: the total is divided among (participantCount + 1) shares —
 * the named participants plus the creator's own implicit share, which is never
 * stored as a row. Division happens in integer paise so every participant gets
 * an exact two-decimal amount; any leftover paise from the division fall out of
 * this array entirely and land on the creator's share (total minus the sum of
 * these), never on a participant.
 */
export function computeEqualShares(totalAmount: number, participantCount: number): number[] {
  if (participantCount <= 0) return [];
  const totalPaise = Math.round(totalAmount * 100);
  const shareCount = participantCount + 1;
  const basePaise = Math.floor(totalPaise / shareCount);
  return Array(participantCount).fill(basePaise / 100);
}
