import { CitizensBankParser } from '../banks/CitizensBankParser';
import { TransactionType } from '../core/types';

const parser = new CitizensBankParser();
const ts = 1000000000000;

describe('CitizensBankParser', () => {
  test('ATM withdrawal', () => {
    const r = parser.parse(
      'Dear CUSTOMER, ###4041 is debited by NPR 5,000.00 on 29/03/2026, Remarks: ATM/459521x2018/CTZW Av Bal: 140270.04. Support Center:01-XXXXXXX',
      'CTZN_ALERT', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(5000);
    expect(r!.currency).toBe('NPR');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('ATM Withdrawal');
    expect(r!.accountLast4).toBe('4041');
    expect(r!.reference).toBe('ATM/459521x2018/CTZW');
    expect(r!.balance).toBe(140270.04);
  });

  test('cIPS credit', () => {
    const r = parser.parse(
      'Dear CUSTOMER, ###4041 is credited by NPR 150,000.00 on 25/03/2026, Remarks: cIPS/NP2603250066636 Av Bal: 153520.04. Support Center:01-XXXXXXX',
      'CTZN_ALERT', ts
    );
    expect(r!.amount).toBe(150000);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('cIPS');
    expect(r!.accountLast4).toBe('4041');
    expect(r!.reference).toBe('cIPS/NP2603250066636');
    expect(r!.balance).toBe(153520.04);
  });

  test('VISA POS debit', () => {
    const r = parser.parse(
      'Dear CUSTOMER, ###4041 is debited by NPR 2,500.00 on 29/03/2026, Remarks: VISA/123456x2018/CTZW Av Bal: 137770.04. Support Center:01-XXXXXXX',
      'CTZN_ALERT', ts
    );
    expect(r!.amount).toBe(2500);
    expect(r!.merchant).toBe('VISA Transaction');
    expect(r!.reference).toBe('VISA/123456x2018/CTZW');
    expect(r!.balance).toBe(137770.04);
  });

  test('canHandle', () => {
    expect(parser.canHandle('CTZN_ALERT')).toBe(true);
    expect(parser.canHandle('CTZN')).toBe(false);
  });
});
