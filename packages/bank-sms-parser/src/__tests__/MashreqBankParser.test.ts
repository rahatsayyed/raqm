import { MashreqBankParser } from '../banks/MashreqBankParser';
import { TransactionType } from '../core/types';

const parser = new MashreqBankParser();
const ts = 1000000000000;

describe('MashreqBankParser', () => {
  test('NEO debit card purchase with fully masked card and balance', () => {
    const r = parser.parse(
      'Thank you for using NEO VISA Debit Card Card ending XXXX for AED 5.99 at CARREFOUR on 26-AUG-2025 10:25 PM. Available Balance is AED X,480.15',
      'Mashreq', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(5.99);
    expect(r!.currency).toBe('AED');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('CARREFOUR');
    expect(r!.accountLast4).toBeNull();
    expect(r!.balance).toBe(480.15);
  });

  test('foreign currency purchase keeps the transaction currency', () => {
    const r = parser.parse(
      'Thank you for using NEO VISA Debit Card Card ending 5678 for USD 89.99 at AMAZON on 20-FEB-2025 11:30 AM. Available Balance is AED 2,500.00',
      'Mashreq', ts
    );
    expect(r!.amount).toBe(89.99);
    expect(r!.currency).toBe('USD');
    expect(r!.merchant).toBe('AMAZON');
    expect(r!.accountLast4).toBe('5678');
    expect(r!.balance).toBe(2500);
  });

  test('credit card alert without credit card wording is CREDIT with available limit', () => {
    const r = parser.parse(
      'Thank you for using your card ending 1234 for AED 50.00 at SAMPLE MERCHANT NAME on 01-JAN-2026 12:00 PM. Avl.Limit: AED 1,000.00',
      'Shreq', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(50);
    expect(r!.currency).toBe('AED');
    expect(r!.type).toBe(TransactionType.CREDIT);
    expect(r!.merchant).toBe('SAMPLE MERCHANT NAME');
    expect(r!.accountLast4).toBe('1234');
    expect(r!.creditLimit).toBe(1000);
  });

  test.each([
    'Your OTP for Mashreq transaction is 123456. Do not share with anyone. Valid for 5 minutes.',
    'Your Mashreq NEO card has been activated successfully. Thank you for banking with us.',
    'Your transaction for AED 500.00 has been declined due to insufficient balance. Please contact customer service.',
    'Your Mashreq card PIN has been changed successfully on 15-JAN-2025. If you did not initiate this, please contact us.',
  ])('not a transaction: %s', (msg) => {
    expect(parser.parse(msg, 'Mashreq', ts)).toBeNull();
  });

  test('canHandle', () => {
    for (const s of ['Mashreq', 'Shreq', 'MASHREQ', 'Mshreq', 'MSHREQ', 'AE-MASHREQ-B']) {
      expect(parser.canHandle(s)).toBe(true);
    }
    for (const s of ['HDFC', 'SBI', 'FAB', '']) {
      expect(parser.canHandle(s)).toBe(false);
    }
  });
});
