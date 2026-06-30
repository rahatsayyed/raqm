import { DBSBankParser } from '../banks/DBSBankParser';
import { TransactionType } from '../core/types';

const parser = new DBSBankParser();
const TS = 1750000000000;

describe('DBSBankParser', () => {
  test('canHandle returns true for DBS senders', () => {
    expect(parser.canHandle('DBSBNK')).toBe(true);
    expect(parser.canHandle('DBSBANK')).toBe(true);
    expect(parser.canHandle('AM-DBSBNK-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('SBIBK')).toBe(false);
  });

  test('parses debited with INR pattern', () => {
    const sms = 'Your DBS Bank Acct XX1234 debited with INR 1,500.00 on 20-Jun-2026. Avl Bal INR 8,500.00';
    const result = parser.parse(sms, 'DBSBNK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(1500);
    expect(result!.bankName).toBe('DBS Bank');
  });

  test('parses credited with INR pattern', () => {
    const sms = 'Your DBS Bank Acct XX1234 credited with INR 5,000.00 on 20-Jun-2026. Avl Bal INR 13,500.00';
    const result = parser.parse(sms, 'DBSBNK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(5000);
  });

  test('returns null for OTP', () => {
    const sms = 'DBS Bank OTP: 456321. Do not share.';
    const result = parser.parse(sms, 'DBSBNK', TS);
    expect(result).toBeNull();
  });
});
