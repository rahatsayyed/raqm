import { SaraswatBankParser } from '../banks/SaraswatBankParser';
import { TransactionType } from '../core/types';

const parser = new SaraswatBankParser();
const TS = 1750000000000;

describe('SaraswatBankParser', () => {
  test('canHandle returns true for Saraswat senders', () => {
    expect(parser.canHandle('SARBNK')).toBe(true);
    expect(parser.canHandle('SARASWAT')).toBe(true);
    expect(parser.canHandle('AM-SARBNK-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('AXISBK')).toBe(false);
  });

  test('parses INR debit transaction', () => {
    const sms = 'Your A/c XX1234 debited INR 400.00 on 20-Jun-2026. Avl Bal: INR 9,600.00 -Saraswat Bank';
    const result = parser.parse(sms, 'SARBNK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(400);
    expect(result!.bankName).toBe('Saraswat Co-operative Bank');
  });

  test('parses INR credit transaction', () => {
    const sms = 'Your A/c XX1234 credited INR 5,000.00 on 20-Jun-2026. Avl Bal: INR 14,600.00 -Saraswat Bank';
    const result = parser.parse(sms, 'SARBNK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(5000);
  });

  test('returns null for OTP', () => {
    const sms = 'Saraswat Bank OTP: 789123. Do not share.';
    const result = parser.parse(sms, 'SARBNK', TS);
    expect(result).toBeNull();
  });
});
