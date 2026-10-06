import { NepalSBIBankParser } from '../banks/NepalSBIBankParser';
import { TransactionType } from '../core/types';

const parser = new NepalSBIBankParser();
const ts = 1000000000000;

describe('NepalSBIBankParser', () => {
  test('credit is INCOME', () => {
    const r = parser.parse(
      'Your A/c XX0673 Credited by NPR 20000.00 on 08-06-2026 16:35:06,Ref: 664406213/. -NSBI\nDownload YONO Nepal SBI by clicking bit.ly/4e0NYk8 for A/c balance.',
      'NSBI_ALERT', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(20000);
    expect(r!.currency).toBe('NPR');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.accountLast4).toBe('0673');
    expect(r!.reference).toBe('664406213/');
  });

  test('debit is EXPENSE with Ref merchant', () => {
    const r = parser.parse(
      'Your A/c XX0673 Debited by NPR 400000.00 on 08-06-2026 12:49:04,Ref: MERCHANT NAME. -NSBI\nDownload YONO Nepal SBI by clicking bit.ly/4e0NYk8 for A/c balance.',
      'NSBI_ALERT', ts
    );
    expect(r!.amount).toBe(400000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.accountLast4).toBe('0673');
    expect(r!.reference).toBe('MERCHANT NAME');
    expect(r!.merchant).toBe('MERCHANT NAME');
  });

  test('canHandle', () => {
    expect(parser.canHandle('NSBI_ALERT')).toBe(true);
    expect(parser.canHandle('NSBI')).toBe(false);
  });
});
