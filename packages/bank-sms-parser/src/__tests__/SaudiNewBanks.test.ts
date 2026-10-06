import { BSFBankParser } from '../banks/BSFBankParser';
import { D360BankParser } from '../banks/D360BankParser';
import { TransactionType } from '../core/types';
import { FinancialMessageFields, TransferDirection } from '../core/FinancialMessageFields';
import { FinancialMessageSafety } from '../core/FinancialMessageSafety';
import { SaudiTransactionMessageGuards } from '../core/SaudiTransactionMessageGuards';

const ts = 1000000000000;

describe('BSFBankParser', () => {
  const parser = new BSFBankParser();

  test('outgoing transfer ignores fee', () => {
    const r = parser.parse(
      'عملية حوالة مالية صادرة مقبولة\nخصمت من حساب ****0136\nإلى TEST RECIPIENT\nبنك TEST\nآيبان ****8287\nالقيمة SAR 505.00\nالرسوم SAR 0.58\nفي28-07-2026 14:33:53',
      'BSF', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(505);
    expect(r!.currency).toBe('SAR');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('TEST RECIPIENT');
    expect(r!.accountLast4).toBe('0136');
    expect(r!.reference).toBe('****8287');
  });

  test('incoming transfer', () => {
    const r = parser.parse(
      'حوالة واردة\nمبلغ: 359.0 SAR\nلـ:SA**********R1******8\nمن: TEST SENDER\nآيبان: ****4318\nفي: 04-08-2026 15:51',
      'AD-BSF-S', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(359);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('TEST SENDER');
    expect(r!.accountLast4).toBeNull();
    expect(r!.reference).toBe('****4318');
  });

  test('canHandle', () => {
    expect(parser.canHandle('BSF')).toBe(true);
    expect(parser.canHandle('VK-BSF-T')).toBe(true);
    expect(parser.canHandle('HDFCBK')).toBe(false);
  });

  test('rejects OTP', () => {
    expect(parser.parse('رمز التحقق 123456 OTP', 'BSF', ts)).toBeNull();
    expect(parser.parse('Welcome to BSF', 'BSF', ts)).toBeNull();
  });
});

describe('D360BankParser', () => {
  const parser = new D360BankParser();

  test('foreign currency purchase records SAR settlement', () => {
    const r = parser.parse(
      'International Online Purchase\nAmount: TRY 342.00 (SAR 27.51)\nAt: SYNTHETIC MERCHANT\nCard: *1234 - VISA\nDate: 2026-07-08 18:14',
      'D360Bank', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(27.51);
    expect(r!.currency).toBe('SAR');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('SYNTHETIC MERCHANT');
    expect(r!.accountLast4).toBe('1234');
    expect(r!.isFromCard).toBe(true);
  });

  test('incoming transfer', () => {
    const r = parser.parse(
      'Incoming Transfer: TEST BANK\nAmount: SAR 1,500.00\nAccount number: *5678\nAt: 2026-07-08 18:14',
      'D360BANK', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(1500);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('TEST BANK');
    expect(r!.accountLast4).toBe('5678');
  });

  test('canHandle', () => {
    expect(parser.canHandle('D360Bank')).toBe(true);
    expect(parser.canHandle('STC')).toBe(false);
  });

  test('declined, OTP and promo messages are rejected', () => {
    expect(parser.parse('Purchase declined\nAmount: SAR 10.00', 'D360Bank', ts)).toBeNull();
    expect(parser.parse('Your OTP is 123456. Amount: SAR 10.00', 'D360Bank', ts)).toBeNull();
    expect(parser.parse('Exclusive SAR cashback offer on all transfers!', 'D360Bank', ts)).toBeNull();
  });
});

describe('Saudi shared helpers', () => {
  test('FinancialMessageFields', () => {
    expect(FinancialMessageFields.sarAmount('Amount: SAR 1,200.50', ['Amount'])).toBe(1200.5);
    expect(FinancialMessageFields.sarAmount('Amount: 99 SR', ['Amount'])).toBe(99);
    expect(FinancialMessageFields.sarAmount('Amount: USD 5', ['Amount'])).toBeNull();
    expect(FinancialMessageFields.transferDirection('From: X\nAmount: SAR 1')).toBe(TransferDirection.INCOMING);
    expect(FinancialMessageFields.transferDirection('To: X')).toBe(TransferDirection.OUTGOING);
    expect(FinancialMessageFields.transferDirection('hello')).toBeNull();
  });

  test('guards', () => {
    expect(SaudiTransactionMessageGuards.isDeclinedOrFailed('Refund declined')).toBe(true);
    expect(SaudiTransactionMessageGuards.isDeclinedOrFailed('Purchase SAR 10 at SHOP')).toBe(false);
    expect(SaudiTransactionMessageGuards.isPromotionalOrOperationalNotice('Special offer for you')).toBe(true);
    expect(FinancialMessageSafety.isSecurityCode('Your code is 1234')).toBe(true);
  });
});
