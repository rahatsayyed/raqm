import { SBIBankParser } from '../banks/SBIBankParser';
import { TransactionType } from '../core/types';

const parser = new SBIBankParser();
const TS = 1750000000000;

describe('SBIBankParser', () => {
  test('canHandle returns true for SBI senders', () => {
    expect(parser.canHandle('SBIBK')).toBe(true);
    expect(parser.canHandle('SBIINB')).toBe(true);
    expect(parser.canHandle('AM-SBIBK-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('ICICIB')).toBe(false);
  });

  test('parses UPI debit (debited by pattern)', () => {
    const sms = 'Your a/c XXXX1234 is debited by Rs.500.00 on 20/06/26 transfer to VPA merchant@upi Ref No 123456789012. Avl Bal Rs.9,500.00 -SBI';
    const result = parser.parse(sms, 'SBIBK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(500);
    expect(result!.balance).toBe(9500);
    expect(result!.bankName).toBe('State Bank of India');
  });

  test('parses credited by pattern (income)', () => {
    const sms = 'Your a/c XXXX1234 is credited by Rs.5,000.00 on 20/06/26 transfer from VPA john@okaxis Ref No 987654321098. Avl Bal Rs.14,500.00 -SBI';
    const result = parser.parse(sms, 'SBIBK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(5000);
  });

  test('parses Rs debited pattern', () => {
    const sms = 'Rs.250.00 has been debited from your SBI A/c no. XXXX1234 on 20-Jun-2026 to merchant. Ref: 123456';
    const result = parser.parse(sms, 'SBIBK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(250);
  });

  test('returns null for UPI mandate notification', () => {
    const sms = 'UPI-Mandate created for Netflix UMN ABC123XYZ for Rs.199.00 on 20-Jun-26. -SBI';
    const result = parser.parse(sms, 'SBIBK', TS);
    expect(result).toBeNull();
  });

  test('returns null for e-statement notification', () => {
    const sms = 'E-Statement of SBI Credit Card for May 2026 is now available. Download from YONO.';
    const result = parser.parse(sms, 'SBICRD', TS);
    expect(result).toBeNull();
  });
});
