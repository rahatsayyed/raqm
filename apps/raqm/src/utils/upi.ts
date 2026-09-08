/**
 * Builds a UPI deep link with the amount prefilled, per the UPI Deep Linking
 * spec (pa = payee VPA, pn = payee name, am = amount, cu = currency, tn = note).
 * Raqm never touches the money — this only prefills the payer's own UPI app;
 * the transfer itself happens entirely inside that app.
 */
export function buildUpiLink(input: {
  upiId: string;
  payeeName: string;
  amount: number;
  note: string;
}): string {
  const params = new URLSearchParams({
    pa: input.upiId,
    pn: input.payeeName,
    am: input.amount.toFixed(2),
    cu: 'INR',
    tn: input.note,
  });
  return `upi://pay?${params.toString()}`;
}
