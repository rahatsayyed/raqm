import { ICICIBankParser } from '../banks/ICICIBankParser';
import { TransactionType } from '../core/types';

const parser = new ICICIBankParser();
const TS = 1750000000000;

describe('ICICIBankParser', () => {
  test('canHandle returns true for ICICI senders', () => {
    expect(parser.canHandle('ICICIB')).toBe(true);
    expect(parser.canHandle('ICICIBANK')).toBe(true);
    expect(parser.canHandle('AM-ICICIB-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('SBIBK')).toBe(false);
  });

  test('parses debited with pattern', () => {
    const sms = 'Your account has been successfully debited with Rs 500.00. Info: UPI. Avl Bal Rs.9,500.00 ICICI Bank';
    const result = parser.parse(sms, 'ICICIB', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(500);
    expect(result!.bankName).toBe('ICICI Bank');
  });

  test('parses credited with pattern', () => {
    const sms = 'Acct XX1234 is credited with Rs 10,000.00 by NEFT. Available Balance is Rs. 15,000.00 ICICI Bank';
    const result = parser.parse(sms, 'ICICIB', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(10000);
    expect(result!.balance).toBe(15000);
  });

  test('parses debited for pattern', () => {
    const sms = 'ICICI Bank Acct XX1234 debited for Rs 200.00 on 20-Jun-2026 on Swiggy. Avl Bal Rs.8,000.00. UPI:123456789012';
    const result = parser.parse(sms, 'ICICIB', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(200);
    expect(result!.reference).toBe('123456789012');
  });

  test('returns null for future debit notification', () => {
    const sms = 'Your ICICI Bank account will be debited with Rs.199.00 for Netflix subscription on 25-Jun-2026.';
    const result = parser.parse(sms, 'ICICIB', TS);
    expect(result).toBeNull();
  });

  test('returns null for payment due reminder', () => {
    const sms = 'Your ICICI Bank Credit Card payment of Rs.5,000.00 is due by 30-Jun-2026. Pay now to avoid charges.';
    const result = parser.parse(sms, 'ICICIB', TS);
    expect(result).toBeNull();
  });

  test('parses IMPS transfer as TRANSFER type', () => {
    const sms = 'Acct XX1234 debited Rs 3,000.00 & Acct XX5678 credited via IMPS. RRN 987654321098';
    const result = parser.parse(sms, 'ICICIB', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.TRANSFER);
  });
});
