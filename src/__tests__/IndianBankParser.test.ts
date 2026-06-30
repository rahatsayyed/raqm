import { IndianBankParser } from '../banks/IndianBankParser';
import { TransactionType } from '../core/types';

const parser = new IndianBankParser();
const TS = 1750000000000;

describe('IndianBankParser', () => {
  test('canHandle returns true for Indian Bank senders', () => {
    expect(parser.canHandle('INDBNK')).toBe(true);
    expect(parser.canHandle('INDIAN')).toBe(true);
    expect(parser.canHandle('AD-INDBNK-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('SBIBK')).toBe(false);
  });

  test('parses debited Rs. pattern', () => {
    const sms = 'Your A/c XX1234 debited Rs.750.00 on 20-Jun-2026 towards UPI. Avl Bal: Rs.8,250.00 -Indian Bank';
    const result = parser.parse(sms, 'INDBNK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(750);
    expect(result!.bankName).toBe('Indian Bank');
  });

  test('parses credited Rs. pattern', () => {
    const sms = 'Your A/c XX1234 credited Rs.5,000.00 on 20-Jun-2026 by NEFT. Avl Bal: Rs.13,250.00 -Indian Bank';
    const result = parser.parse(sms, 'INDBNK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(5000);
  });

  test('returns null for OTP', () => {
    const sms = 'Indian Bank OTP: 789012. Do not share with anyone.';
    const result = parser.parse(sms, 'INDBNK', TS);
    expect(result).toBeNull();
  });
});
