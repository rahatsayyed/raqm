import { GreaterBankParser } from '../banks/GreaterBankParser';
import { TransactionType } from '../core/types';

const parser = new GreaterBankParser();
const ts = 1000000000000;

describe('GreaterBankParser', () => {
  test('Debit alert with balance', () => {
    const result = parser.parse(
      'Your Account XXXX5207 had a DEBIT transaction of RS. 100.00 on 19/04/2026 at 23:21:35.Available balance is Rs. 1127.55: GREATER BANK',
      'GREATERBNK', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(100);
    expect(result!.currency).toBe('INR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('Debit Transaction');
    expect(result!.accountLast4).toBe('5207');
    expect(result!.balance).toBe(1127.55);
    expect(result!.isFromCard).toBe(false);
  });

  test('UPI transfer debit with reference', () => {
    const result = parser.parse(
      'Your a/c no. XXXXXXXX5207 is debited for Rs.100.00 on 19-04-26 and credited to a/c no. XXXXXXXX8364 (UPI Ref no 232135417634) If Not You? Call 18001217224 Greater Bank',
      'GREATERBNK', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(100);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('Bank Transfer');
    expect(result!.accountLast4).toBe('5207');
    expect(result!.reference).toBe('232135417634');
    expect(result!.isFromCard).toBe(false);
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('GREATERBNK')).toBe(true);
    expect(parser.canHandle('VM-GRTRBN-S')).toBe(true);
    expect(parser.canHandle('AD-GRTRBN-T')).toBe(true);
    expect(parser.canHandle('SBIBANK')).toBe(false);
    expect(parser.canHandle('HDFCBNK')).toBe(false);
    expect(parser.canHandle('')).toBe(false);
  });
});
