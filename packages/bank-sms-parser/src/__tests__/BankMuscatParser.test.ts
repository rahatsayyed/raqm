import { BankMuscatParser } from '../banks/BankMuscatParser';
import { TransactionType } from '../core/types';

const parser = new BankMuscatParser();
const ts = 1000000000000;

describe('BankMuscatParser', () => {
  test('Debit card purchase - merchant with leading ID', () => {
    const result = parser.parse(
      'تم خصم 0.650 OMR من حسابك رقم XXXXX9999 بإستخدام بطاقة الخصم المباشر في 757487-MASAKEN AL RAHA LLC KHOOM بتاريخ 2026/03/02 14:43:57. رصيدك الحالي هو 9999.740 OMR.',
      'BankMuscat', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(0.65);
    expect(result!.currency).toBe('OMR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('MASAKEN AL RAHA LLC KHOOM');
    expect(result!.accountLast4).toBe('9999');
    expect(result!.balance).toBe(9999.74);
    expect(result!.isFromCard).toBe(true);
  });

  test('Debit card purchase - merchant with trailing ID', () => {
    const result = parser.parse(
      'تم خصم OMR 0.100 من حسابك رقم XXXXXXX9999 بإستخدام بطاقة الخصم المباشر في Break Point QURU-650068 بتاريخ 2026/04/01 17:54:40. رصيدك الحالي هو 9999.740 OMR.',
      'BankMuscat', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(0.1);
    expect(result!.merchant).toBe('Break Point QURU');
    expect(result!.accountLast4).toBe('9999');
    expect(result!.balance).toBe(9999.74);
    expect(result!.isFromCard).toBe(true);
  });

  test('Debit card purchase - merchant with middle ID', () => {
    const result = parser.parse(
      'تم خصم OMR 0.300 من حسابك رقم XXXXXXX9999 بإستخدام بطاقة الخصم المباشر في MASAKEN AL RAHA LLC-833468 KHOOM بتاريخ 2026/04/02 16:15:38. رصيدك الحالي هو 9999.740 OMR.',
      'BankMuscat', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(0.3);
    expect(result!.merchant).toBe('MASAKEN AL RAHA LLC KHOOM');
    expect(result!.balance).toBe(9999.74);
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('BankMuscat')).toBe(true);
    expect(parser.canHandle('BKMUSCAT')).toBe(true);
    expect(parser.canHandle('bank muscat')).toBe(true);
    expect(parser.canHandle('HSBC')).toBe(false);
    expect(parser.canHandle('')).toBe(false);
  });
});
