import { UCOBankParser } from '../banks/UCOBankParser';
import { TransactionType } from '../core/types';

const parser = new UCOBankParser();
const ts = 1000000000000;

describe('UCOBankParser', () => {
  test('debit via UCO-UPI', () => {
    const r = parser.parse(
      'A/c XX1111 Debited with Rs.2000.00 on 21-09-2025 by UCO-UPI.Avl Bal Rs.11111.11. Report Dispute https://spgrs.ucoonline.in/Home_Page.jsp',
      'AX-UCOBNK-S', ts
    );
    expect(r!.amount).toBe(2000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.balance).toBe(11111.11);
    expect(r!.merchant).toBe('UPI Transfer');
  });

  test('credit with comma amount', () => {
    const r = parser.parse(
      'A/c XX1111 Credited with Rs.2,000.00 on 21-09-2025 by UCO-UPI.Avl Bal Rs.11111.11. Report Dispute https://spgrs.ucoonline.in/Home_Page.jsp -UCO Bank',
      'AX-UCOBNK-S', ts
    );
    expect(r!.amount).toBe(2000);
    expect(r!.type).toBe(TransactionType.INCOME);
  });

  test('sub-rupee amount without leading zero is not read as balance', () => {
    const r = parser.parse(
      'A/c XX1111 Debited with Rs..50 on 21-09-2025 by UCO-UPI.Avl Bal Rs.11111.11. Report Dispute https://spgrs.ucoonline.in/Home_Page.jsp',
      'AX-UCOBNK-S', ts
    );
    expect(r!.amount).toBe(0.5);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.balance).toBe(11111.11);
  });

  test('Avl Bal in your A/c is form', () => {
    const r = parser.parse(
      'A/c XX1111 Debited with Rs.100.00 on 21-09-2025 by UCO-UPI.Avl Bal in your A/c is Rs.2,992.54.',
      'AX-UCOBNK-S', ts
    );
    expect(r!.amount).toBe(100);
    expect(r!.balance).toBe(2992.54);
  });
});
