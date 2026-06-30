import { PrimeCommercialBankParser } from '../banks/PrimeCommercialBankParser';
import { TransactionType } from '../core/types';

const parser = new PrimeCommercialBankParser();
const ts = 1000000000000;

describe('PrimeCommercialBankParser', () => {
  test('Debit transaction - withdrawn with phone remark', () => {
    const result = parser.parse(
      'Dear Customer, NPR 1,234.50 is withdrawn from A/C XXX#1234 on 01/01/2026 05:55. Rmk: 9812345678. Good Baln: NPR 321.45',
      'PCBLNPKA', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1234.5);
    expect(result!.currency).toBe('NPR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('9812345678');
    expect(result!.accountLast4).toBe('1234');
    expect(result!.reference).toBe('01/01/2026 05:55');
  });

  test('Credit transaction - deposited with text remark', () => {
    const result = parser.parse(
      'Dear Customer, NPR 9,876.00 is deposited in A/C XXX#5678 on 01/01/2026 05:55. Rmk: CASHDEP. Good Baln: NPR 54321.123.',
      'PRIME_ALERT', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(9876);
    expect(result!.currency).toBe('NPR');
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('CASHDEP');
    expect(result!.accountLast4).toBe('5678');
    expect(result!.reference).toBe('01/01/2026 05:55');
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('PCBLNPKA')).toBe(true);
    expect(parser.canHandle('PRIME_ALERT')).toBe(true);
    expect(parser.canHandle('PRIME')).toBe(true);
    expect(parser.canHandle('AD-PRIME-ALERT')).toBe(true);
    expect(parser.canHandle('UNKNOWN')).toBe(false);
  });
});
