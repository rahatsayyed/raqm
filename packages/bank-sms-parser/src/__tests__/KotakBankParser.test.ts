import { KotakBankParser } from '../banks/KotakBankParser';
import { TransactionType } from '../core/types';

const parser = new KotakBankParser();
const TS = 1750000000000;

describe('KotakBankParser', () => {
  test('canHandle returns true for Kotak senders', () => {
    expect(parser.canHandle('KOTAK')).toBe(true);
    expect(parser.canHandle('AM-KOTAKB-S')).toBe(true);
    expect(parser.canHandle('Kotak Mahindra Bank')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('AXISBK')).toBe(false);
  });

  test('parses UPI sent transaction', () => {
    const sms = 'Sent Rs.800.00 from Kotak Bank AC XX1234 to swiggy@upi on 20-06-2026. Avl Bal: Rs.9,200.00';
    const result = parser.parse(sms, 'KOTAK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(800);
    expect(result!.bankName).toBe('Kotak Bank');
  });

  test('parses UPI received transaction', () => {
    const sms = 'Received Rs.2,000.00 in your Kotak Bank AC XX1234 from john@okhdfc on 20-06-2026. Avl Bal: Rs.11,200.00';
    const result = parser.parse(sms, 'KOTAK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(2000);
  });

  test('returns null for OTP SMS', () => {
    const sms = 'Your Kotak OTP is 987654. Do not share. Valid for 5 min.';
    const result = parser.parse(sms, 'KOTAK', TS);
    expect(result).toBeNull();
  });
});
