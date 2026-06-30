import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

describe('BankParserFactory', () => {
  test('loads 123 parsers', () => {
    // 124 files in src/banks/ but UAEBankParser is abstract — not registered
    expect(BankParserFactory.getAllParsers().length).toBe(123);
  });

  test('isKnownBankSender identifies HDFC sender', () => {
    expect(BankParserFactory.isKnownBankSender('HDFCBK')).toBe(true);
  });

  test('isKnownBankSender returns false for unknown sender', () => {
    expect(BankParserFactory.isKnownBankSender('RANDOMXYZ')).toBe(false);
  });

  test('parses HDFC debit SMS', () => {
    const sms =
      'Rs.500.00 debited from a/c **1234 on 20-06-2026. Info: UPI-MERCHANT. Avl Bal: Rs.10000.00';
    const tx = BankParserFactory.parse(sms, 'HDFCBK', Date.now());
    expect(tx).not.toBeNull();
    expect(tx!.type).toBe(TransactionType.EXPENSE);
    expect(tx!.amount).toBe(500);
  });

  test('getParser returns null for unknown sender', () => {
    expect(BankParserFactory.getParser('UNKNOWNSENDER999')).toBeNull();
  });
});
