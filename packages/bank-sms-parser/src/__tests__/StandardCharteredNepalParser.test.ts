import { StandardCharteredNepalParser } from '../banks/StandardCharteredNepalParser';
import { TransactionType } from '../core/types';

const parser = new StandardCharteredNepalParser();
const ts = 1000000000000;

describe('StandardCharteredNepalParser', () => {
  test('debit is EXPENSE', () => {
    const r = parser.parse('NPR 95,000.00 has been debited from your account 3301.', 'SC_ALERT', ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(95000);
    expect(r!.currency).toBe('NPR');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.accountLast4).toBe('3301');
  });

  test('deposit is INCOME', () => {
    const r = parser.parse('NPR 80,000.00 has been deposited into your account 1234.', 'SC_ALERT', ts);
    expect(r!.amount).toBe(80000);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.accountLast4).toBe('1234');
  });

  test('ATM debit has ATM merchant', () => {
    const r = parser.parse('NPR 5,000.00 has been debited from your account 3301 at ATM.', 'SC_ALERT', ts);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('ATM Withdrawal');
  });

  test('canHandle', () => {
    expect(parser.canHandle('SC_ALERT')).toBe(true);
    expect(parser.canHandle('SCBANK')).toBe(false);
    expect(parser.canHandle('STANCHART')).toBe(false);
  });
});
