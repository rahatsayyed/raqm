import { NepalBankParser } from '../banks/NepalBankParser';
import { TransactionType } from '../core/types';

const parser = new NepalBankParser();
const ts = 1000000000000;

describe('NepalBankParser', () => {
  test('credit is INCOME', () => {
    const r = parser.parse(
      'Dear CUSTOMER_NAME,##001 credited NPR 5,000.00 15/06/2026 12:53:44,5345345/1233123',
      'NBL_Alert', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(5000);
    expect(r!.currency).toBe('NPR');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.accountLast4).toBe('001');
    expect(r!.reference).toBe('5345345/1233123');
  });

  test('VISA debit is EXPENSE', () => {
    const r = parser.parse(
      'Dear CUSTOMER_NAME,##001 debited NPR 5,000.00 04/04/2026 12:12:12,42343244@4234234 43432@VISA',
      'NBL_Alert', ts
    );
    expect(r!.amount).toBe(5000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('VISA Transaction');
    expect(r!.accountLast4).toBe('001');
    expect(r!.reference).toBe('42343244@4234234');
  });

  test('OTP is not a transaction', () => {
    expect(parser.parse('Your OTP is 123456 for NPR 5,000.00 debited', 'NBL_Alert', ts)).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('NBL_Alert')).toBe(true);
    expect(parser.canHandle('NABIL_ALERT')).toBe(false);
    expect(parser.getBankName()).toBe('Nepal Bank Limited');
  });
});
