import { BankOfIndiaParser } from '../banks/BankOfIndiaParser';
import { TransactionType } from '../core/types';

const parser = new BankOfIndiaParser();
const TS = 1750000000000;

describe('BankOfIndiaParser', () => {
  test('canHandle returns true for BOI senders', () => {
    expect(parser.canHandle('BOIIND')).toBe(true);
    expect(parser.canHandle('BOIBNK')).toBe(true);
    expect(parser.canHandle('AM-BOIIND-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('BOB')).toBe(false);
  });

  test('parses debit transaction', () => {
    const sms = 'Rs.200.00 debited A/cXX5468 and credited to SAI MISAL via UPI Ref No 315439383341 on 20Jun26. -BOI';
    const result = parser.parse(sms, 'BOIIND', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(200);
    expect(result!.bankName).toBe('Bank of India');
  });

  test('parses credit transaction', () => {
    const sms = 'Rs.5,000.00 credited to A/cXX5468 via NEFT Ref No 987654321 on 20Jun26. -BOI';
    const result = parser.parse(sms, 'BOIIND', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(5000);
  });

  test('returns null for OTP', () => {
    const sms = 'Bank of India OTP: 567890. Do not share.';
    const result = parser.parse(sms, 'BOIIND', TS);
    expect(result).toBeNull();
  });
});
