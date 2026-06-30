import { PNBBankParser } from '../banks/PNBBankParser';
import { TransactionType } from '../core/types';

const parser = new PNBBankParser();
const TS = 1750000000000;

describe('PNBBankParser', () => {
  test('canHandle returns true for PNB senders', () => {
    expect(parser.canHandle('PNBBNK')).toBe(true);
    expect(parser.canHandle('PNB')).toBe(true);
    expect(parser.canHandle('AM-PNBBNK-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('SBIBK')).toBe(false);
  });

  test('parses debited for pattern', () => {
    const sms = 'Your a/c no XX340 is debited for Rs 7519 on 20-Jun-2026. Avl Bal: Rs 42,481.00 -PNB';
    const result = parser.parse(sms, 'PNBBNK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(7519);
    expect(result!.bankName).toBe('Punjab National Bank');
  });

  test('parses credited pattern', () => {
    const sms = 'Rs.10,000.00 has been credited to your A/c XX340 on 20-Jun-2026. Avl Bal: Rs 52,481.00 -PNB';
    const result = parser.parse(sms, 'PNBBNK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(10000);
  });

  test('returns null for OTP', () => {
    const sms = 'PNB OTP 678901. Do not share. Valid for 5 mins.';
    const result = parser.parse(sms, 'PNBBNK', TS);
    expect(result).toBeNull();
  });
});
