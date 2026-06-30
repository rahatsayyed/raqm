import { STCBankParser } from '../banks/STCBankParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new STCBankParser();
const ts = 1000000000000;

describe('STCBankParser', () => {
  test('Card purchase from screenshot', () => {
    const result = parser.parse(
      '**4561 Purchase\nVia:4561\nAmount: 3 SAR\nFrom: ABDULLAH SALEM MUEEN\nAt: 26/07/25 21:58',
      'STC Bank', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(3);
    expect(result!.currency).toBe('SAR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('ABDULLAH SALEM MUEEN');
    expect(result!.accountLast4).toBe('4561');
    expect(result!.isFromCard).toBe(true);
  });

  test('Card purchase with decimal amount', () => {
    const result = parser.parse(
      '**9876 Purchase\nVia:9876\nAmount: 125.50 SAR\nFrom: LULU HYPERMARKET\nAt: 14/05/26 18:23',
      'STCBank', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(125.5);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('LULU HYPERMARKET');
    expect(result!.accountLast4).toBe('9876');
    expect(result!.isFromCard).toBe(true);
  });

  test('OTP message is ignored', () => {
    const result = parser.parse(
      'Your STC Bank verification code is 123456. Do not share it.',
      'STC Bank', ts
    );
    expect(result).toBeNull();
  });

  test('factory resolves STC Bank senders', () => {
    const r1 = BankParserFactory.parse(
      '**4561 Purchase\nVia:4561\nAmount: 3 SAR\nFrom: ABDULLAH SALEM MUEEN\nAt: 26/07/25 21:58',
      'STC Bank', ts
    );
    expect(r1).not.toBeNull();
    expect(r1!.amount).toBe(3);

    const r2 = BankParserFactory.parse(
      '**9876 Purchase\nVia:9876\nAmount: 125.50 SAR\nFrom: LULU HYPERMARKET\nAt: 14/05/26 18:23',
      'STCBank', ts
    );
    expect(r2).not.toBeNull();
    expect(r2!.amount).toBe(125.5);
  });
});
