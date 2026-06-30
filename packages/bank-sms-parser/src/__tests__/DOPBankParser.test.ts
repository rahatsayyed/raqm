import { DOPBankParser } from '../banks/DOPBankParser';
import { TransactionType } from '../core/types';

const parser = new DOPBankParser();
const ts = 1000000000000;

describe('DOPBankParser', () => {
  test('Credit with Rs amount and balance', () => {
    const result = parser.parse(
      'Account  No. XXXXXXXX1234 CREDIT with amount Rs. 5550.00 on 02-03-2026. Balance: Rs.40000.00. [S76543210]',
      'VM-DOPBNK-G', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(5550);
    expect(result!.currency).toBe('INR');
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('1234');
    expect(result!.balance).toBe(40000);
    expect(result!.reference).toBe('S76543210');
  });

  test('Credit from different sender prefix', () => {
    const result = parser.parse(
      'Account  No. XXXXXXXX1234 CREDIT with amount Rs. 5550.00 on 02-02-2026. Balance: Rs.37500.00. [S33475450]',
      'BZ-DOPBNK-G', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(5550);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.balance).toBe(37500);
    expect(result!.reference).toBe('S33475450');
  });

  test('Credit with S suffix sender', () => {
    const result = parser.parse(
      'Account  No. XXXXXXXX1234 CREDIT with amount Rs. 5550.00 on 02-01-2026. Balance: Rs.32000.00. [S92247102]',
      'BV-DOPBNK-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(5550);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.balance).toBe(32000);
  });

  test('Debit transaction', () => {
    const result = parser.parse(
      'Account No. XXXXXXXX5678 DEBIT with amount Rs. 2000.00 on 15-03-2026. Balance: Rs.18000.00. [D12345678]',
      'VM-DOPBNK-G', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('5678');
    expect(result!.balance).toBe(18000);
    expect(result!.reference).toBe('D12345678');
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('VM-DOPBNK-G')).toBe(true);
    expect(parser.canHandle('BZ-DOPBNK-G')).toBe(true);
    expect(parser.canHandle('BV-DOPBNK-S')).toBe(true);
    expect(parser.canHandle('BT-DOPBNK-G')).toBe(true);
    expect(parser.canHandle('DOP-ALERTS')).toBe(true);
    expect(parser.canHandle('ALERT-DOP')).toBe(true);
    expect(parser.canHandle('DOP')).toBe(true);
    expect(parser.canHandle('UNKNOWN')).toBe(false);
    expect(parser.canHandle('HDFC')).toBe(false);
  });
});
