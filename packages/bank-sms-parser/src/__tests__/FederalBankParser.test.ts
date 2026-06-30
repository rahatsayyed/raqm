import { FederalBankParser } from '../banks/FederalBankParser';
import { TransactionType } from '../core/types';

const parser = new FederalBankParser();
const TS = 1750000000000;

describe('FederalBankParser', () => {
  test('canHandle returns true for Federal Bank senders', () => {
    expect(parser.canHandle('FEDBNK')).toBe(true);
    expect(parser.canHandle('FEDERAL')).toBe(true);
    expect(parser.canHandle('AM-FEDBNK-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('AXISBK')).toBe(false);
  });

  test('parses debit transaction', () => {
    const sms = 'Rs.500.00 debited from A/c xx1234 on 20-Jun-2026 towards UPI/Merchant. Avl Bal: Rs.9,500.00 -Federal Bank';
    const result = parser.parse(sms, 'FEDBNK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(500);
    expect(result!.bankName).toBe('Federal Bank');
  });

  test('parses credit transaction', () => {
    const sms = 'Rs.2,000.00 credited to A/c xx1234 on 20-Jun-2026 from NEFT. Avl Bal: Rs.11,500.00 -Federal Bank';
    const result = parser.parse(sms, 'FEDBNK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(2000);
  });

  test('returns null for OTP', () => {
    const sms = 'Federal Bank OTP: 345678. Valid for 5 mins. Do not share.';
    const result = parser.parse(sms, 'FEDBNK', TS);
    expect(result).toBeNull();
  });
});
