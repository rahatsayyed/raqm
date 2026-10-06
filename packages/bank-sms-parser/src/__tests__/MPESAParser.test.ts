import { MPESAParser } from '../banks/MPESAParser';
import { TransactionType } from '../core/types';

const parser = new MPESAParser();
const ts = 1000000000000;

describe('MPESAParser', () => {
  test('paid-to message has no account last4 even with a paybill account', () => {
    const r = parser.parse(
      'TJK6H7T3GA Confirmed. Ksh1,000.00 sent to Equity Paybill Account for account 123123 on 20/10/24 at 1:00 PM. New M-PESA balance is Ksh500.00.',
      'MPESA', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(1000);
    expect(r!.currency).toBe('KES');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('Equity Paybill Account');
    expect(r!.balance).toBe(500);
    expect(r!.reference).toBe('TJK6H7T3GA');
    expect(r!.accountLast4).toBeNull();
  });

  test('received message', () => {
    const r = parser.parse(
      'TJK6H7T3GB Confirmed. You have received Ksh300.00 from JANE DOE 0711111111 on 20/10/24 at 2:00 PM. New M-PESA balance is Ksh800.00.',
      'MPESA', ts
    );
    expect(r!.amount).toBe(300);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.accountLast4).toBeNull();
  });
});
