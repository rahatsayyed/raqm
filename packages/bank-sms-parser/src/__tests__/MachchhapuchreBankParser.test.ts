import { MachchhapuchreBankParser } from '../banks/MachchhapuchreBankParser';
import { TransactionType } from '../core/types';

const parser = new MachchhapuchreBankParser();
const ts = 1000000000000;

describe('MachchhapuchreBankParser', () => {
  test('withdrawal is EXPENSE with balance', () => {
    const r = parser.parse(
      'Dear CUSTOMER,NPR 3,190.00 Withdrawn from your A/C ###0018 on 29/03/2026 Remarks: medicine,K Available Bal: 20532.09. For app: http://bit.ly/3QZrCFj',
      'MBL_ALERT', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(3190);
    expect(r!.currency).toBe('NPR');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.accountLast4).toBe('0018');
    expect(r!.merchant).toBe('medicine');
    expect(r!.reference).toBe('medicine,K');
    expect(r!.balance).toBe(20532.09);
  });

  test('deposit is INCOME', () => {
    const r = parser.parse(
      'Dear CUSTOMER,NPR 50,000.00 Deposited in your A/C ###0018 on 26/02/2026 Remarks: Salary (Ma Available Bal: 55652.24. For app: http://bit.ly/3QZrCFj',
      'MBL_ALERT', ts
    );
    expect(r!.amount).toBe(50000);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.accountLast4).toBe('0018');
    expect(r!.reference).toBe('Salary (Ma');
    expect(r!.balance).toBe(55652.24);
  });

  test('canHandle', () => {
    expect(parser.canHandle('MBL_ALERT')).toBe(true);
    expect(parser.canHandle('MBL')).toBe(false);
  });
});
