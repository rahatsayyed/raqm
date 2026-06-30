import { BankOfBarodaParser } from '../banks/BankOfBarodaParser';
import { TransactionType } from '../core/types';

const parser = new BankOfBarodaParser();
const TS = 1750000000000;

describe('BankOfBarodaParser', () => {
  test('canHandle returns true for BOB senders', () => {
    expect(parser.canHandle('BOB')).toBe(true);
    expect(parser.canHandle('BOBSMS')).toBe(true);
    expect(parser.canHandle('AM-BOBSMS-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('SBIBK')).toBe(false);
  });

  test('parses Dr. (debit) pattern', () => {
    const sms = 'Rs.300.00 Dr. from A/c XX1234 on 20-Jun-2026. Info: UPI. Avl Bal: Rs.4,700.00 -Bank of Baroda';
    const result = parser.parse(sms, 'BOBSMS', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(300);
    expect(result!.bankName).toBe('Bank of Baroda');
  });

  test('parses credited with INR pattern', () => {
    const sms = 'Your A/c XX1234 is credited with INR 5,000.00 on 20-Jun-2026 by NEFT. Avl Bal: INR 9,700.00 -Bank of Baroda';
    const result = parser.parse(sms, 'BOBSMS', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(5000);
  });

  test('returns null for OTP', () => {
    const sms = 'Bank of Baroda OTP 456789 for transaction. Valid 10 mins.';
    const result = parser.parse(sms, 'BOBSMS', TS);
    expect(result).toBeNull();
  });
});
