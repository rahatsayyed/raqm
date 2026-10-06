import { BkashParser } from '../banks/BkashParser';
import { TransactionType } from '../core/types';

const parser = new BkashParser();
const ts = 1000000000000;

describe('BkashParser', () => {
  test('received is INCOME', () => {
    const r = parser.parse(
      'You have received Tk 6,400.00 from xxxx. Fee Tk 0.00. Balance Tk 20,288.41. TrxID ABC12345 at 26/05/2026 10:58.',
      'bKash', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(6400);
    expect(r!.currency).toBe('BDT');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.balance).toBe(20288.41);
    expect(r!.reference).toBe('ABC12345');
    expect(r!.merchant).toBeNull();
    expect(r!.accountLast4).toBeNull();
  });

  test('cash in is INCOME', () => {
    const r = parser.parse(
      'Cash In Tk 500.00 from XXXXXXXXXX successful. Fee Tk 0.00. Balance Tk 506.91. TrxID XXXXX at 29/05/2026 19:00. Download App: ...',
      'bKash', ts
    );
    expect(r!.amount).toBe(500);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.balance).toBe(506.91);
  });

  test('payment is EXPENSE', () => {
    const r = parser.parse(
      'Payment of Tk 20.00 to xxxx is successful. Balance Tk 20,268.41. TrxID xxxx at 26/05/2026 15:07',
      'bKash', ts
    );
    expect(r!.amount).toBe(20);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.balance).toBe(20268.41);
  });

  test('send money is EXPENSE', () => {
    const r = parser.parse(
      'Send Money Tk 0.20 to XXXXXXXXXX successful. Ref 2. Fee Tk 0.00. Balance Tk 0.08. TrxID XXXXX at 07/06/2026 22:45.',
      'bKash', ts
    );
    expect(r!.amount).toBe(0.2);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.balance).toBe(0.08);
  });

  test('unrelated message returns null', () => {
    expect(parser.parse('Your bKash PIN code is 1234 Tk 10.00', 'bKash', ts)).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('bKash')).toBe(true);
    expect(parser.canHandle('HDFCBK')).toBe(false);
  });
});
