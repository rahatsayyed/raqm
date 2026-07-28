/** Resolves an account's display label — its alias if one is set, else the raw bank name. */
export function accountLabel(bankName: string, last4: string | null | undefined, labels: Map<string, string>): string {
  return labels.get(`${bankName}|${last4 ?? ''}`) ?? bankName;
}
