import { UnionBankParser } from '../banks/UnionBankParser';
import { TransactionType } from '../core/types';

const parser = new UnionBankParser();
const TS = 1750000000000;

describe('UnionBankParser', () => {
  test('canHandle returns true for Union Bank senders', () => {
    expect(parser.canHandle('UNIONB')).toBe(true);
    expect(parser.canHandle('UNIONBANK')).toBe(true);
    expect(parser.canHandle('AM-UNIONB-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('SBIBK')).toBe(false);
  });

  test('parses debit by Mob Bk pattern', () => {
    const sms = 'A/c *1234 Debited for Rs:100.00 on 20-06-2026 18:28:02 by Mob Bk ref no 123456789000 Avl Bal Rs:9,900.00';
    const result = parser.parse(sms, 'UNIONB', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(100);
    expect(result!.bankName).toBe('Union Bank of India');
  });

  test('parses credit transaction', () => {
    const sms = 'A/c *1234 Credited for Rs:5,000.00 on 20-06-2026 by NEFT ref no 987654321. Avl Bal Rs:14,900.00';
    const result = parser.parse(sms, 'UNIONB', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(5000);
  });
});
