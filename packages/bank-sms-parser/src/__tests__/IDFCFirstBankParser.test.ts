import { IDFCFirstBankParser } from '../banks/IDFCFirstBankParser';
import { TransactionType } from '../core/types';

const parser = new IDFCFirstBankParser();
const TS = 1750000000000;

describe('IDFCFirstBankParser', () => {
  test('canHandle returns true for IDFC senders', () => {
    expect(parser.canHandle('IDFCBK')).toBe(true);
    expect(parser.canHandle('IDFCFB')).toBe(true);
    expect(parser.canHandle('IDFC')).toBe(true);
    expect(parser.canHandle('BM-IDFCBK-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('AXISBK')).toBe(false);
  });

  test('parses debited by INR pattern', () => {
    const sms = 'Your A/C XXXXXXXXXXX is debited by INR 68.00 on 06/08/25 17:36. New Bal :INR 9500.00';
    const result = parser.parse(sms, 'IDFCBK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(68);
    expect(result!.bankName).toBe('IDFC First Bank');
  });

  test('parses credited by INR pattern', () => {
    const sms = 'Your A/C XXXXXXXXXXX is credited by INR 5000.00 on 06/08/25 17:36. New Bal :INR 14500.00';
    const result = parser.parse(sms, 'IDFCBK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(5000);
  });

  test('returns null for OTP SMS', () => {
    const sms = 'Your IDFC FIRST Bank OTP is 234567 for transaction. Do not share.';
    const result = parser.parse(sms, 'IDFCBK', TS);
    expect(result).toBeNull();
  });
});
