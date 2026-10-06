import { LumbiniBikashBankParser } from '../banks/LumbiniBikashBankParser';
import { TransactionType } from '../core/types';

const parser = new LumbiniBikashBankParser();
const ts = 1000000000000;

describe('LumbiniBikashBankParser', () => {
  test('withdrawal is EXPENSE', () => {
    const r = parser.parse(
      'Dear Customer, NPR 1,199.00 has been withdrawn from your A/C 050######4545 on 28/04/2026 16:40. Remarks: 9841XXXXXXX Load eSewa;8234454',
      'LBBL_SMART', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(1199);
    expect(r!.currency).toBe('NPR');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.accountLast4).toBe('4545');
    expect(r!.reference).toBe('9841XXXXXXX Load eSewa');
  });

  test('deposit is INCOME', () => {
    const r = parser.parse(
      'Dear Customer, NPR 15,000.00 has been deposited in your A/C 050#####4545 on 29/3/2026 16:31. Remarks: Int Paid 34234;345454',
      'LBBL_SMART', ts
    );
    expect(r!.amount).toBe(15000);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.accountLast4).toBe('4545');
    expect(r!.reference).toBe('Int Paid 34234');
    expect(r!.merchant).toBe('Int Paid 34234');
  });

  test('canHandle', () => {
    expect(parser.canHandle('LBBL_SMART')).toBe(true);
    expect(parser.canHandle('LBBL')).toBe(false);
  });
});
