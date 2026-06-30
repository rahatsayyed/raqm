import { AxisBankParser } from '../banks/AxisBankParser';
import { TransactionType } from '../core/types';

const parser = new AxisBankParser();
const TS = 1750000000000;

describe('AxisBankParser', () => {
  test('canHandle returns true for Axis senders', () => {
    expect(parser.canHandle('AXISBK')).toBe(true);
    expect(parser.canHandle('AXISBANK')).toBe(true);
    expect(parser.canHandle('AM-AXISBK-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('ICICIB')).toBe(false);
  });

  test('parses INR debited pattern', () => {
    const sms = 'INR 1,500.00 debited from Axis Bank A/c XX1234 on 20-06-2026. Info: UPI-Amazon. Avl Bal: INR 8,500.00';
    const result = parser.parse(sms, 'AXISBK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(1500);
    expect(result!.bankName).toBe('Axis Bank');
  });

  test('parses INR credited pattern', () => {
    const sms = 'INR 5,000.00 credited to Axis Bank A/c XX1234 on 20-06-2026. Info: NEFT-Transfer. Avl Bal: INR 13,500.00';
    const result = parser.parse(sms, 'AXISBK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(5000);
  });

  test('returns null for OTP SMS', () => {
    const sms = 'Your Axis Bank OTP is 456789 for login. Valid for 10 minutes.';
    const result = parser.parse(sms, 'AXISBK', TS);
    expect(result).toBeNull();
  });
});
