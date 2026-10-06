import { NationalBankOfEgyptParser } from '../banks/NationalBankOfEgyptParser';
import { TransactionType } from '../core/types';

const parser = new NationalBankOfEgyptParser();
const ts = 1000000000000;

describe('NationalBankOfEgyptParser', () => {
  test('credit card spend maps available to creditLimit', () => {
    const r = parser.parse(
      'تم خصم 100.50 جم من بطاقة الائتمان رقم 1111 عند KASHIERFast يوم 09-10 الساعة 10:11 المتاح 9000.00 جم للمزيد اتصل ب 10000.',
      'BanK-AlAhly', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(100.5);
    expect(r!.currency).toBe('EGP');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('KASHIERFast');
    expect(r!.accountLast4).toBe('1111');
    expect(r!.creditLimit).toBe(9000);
    expect(r!.balance).toBeNull();
    expect(r!.isFromCard).toBe(true);
  });

  test('debit card ATM withdrawal with glued tokens maps available to balance', () => {
    const r = parser.parse(
      'تم خصم 200 EGP من بطاقة الخصم المباشر رقم2222 عندNBE ATM546 يوم03/09/26 الساعة21:13 المتاح800.00EGP للمزيد اتصل ب 10000',
      'BanK-AlAhly', ts
    );
    expect(r!.amount).toBe(200);
    expect(r!.merchant).toBe('NBE ATM546');
    expect(r!.accountLast4).toBe('2222');
    expect(r!.balance).toBe(800);
    expect(r!.creditLimit).toBeNull();
    expect(r!.isFromCard).toBe(true);
  });

  test('credit card spend with multi-word merchant', () => {
    const r = parser.parse(
      'تم خصم 300 جم من بطاقة الائتمان رقم 3333 عند ASWAK FATHALLA يوم 08-31 الساعة 21:20 المتاح 7000.00 جم للمزيد اتصل ب 10000.',
      'BanK-AlAhly', ts
    );
    expect(r!.amount).toBe(300);
    expect(r!.merchant).toBe('ASWAK FATHALLA');
    expect(r!.creditLimit).toBe(7000);
  });

  test('instant transfer received is INCOME and not a card', () => {
    const r = parser.parse(
      'تم إضافة تحويل لحظي لحسابكم رقم 4444 بمبلغ 400.00 جم من محمد محمد رقم مرجعي 123456789012 يوم 09-10 الساعة 20:11 للمزيد اتصل بـ 10000',
      'BanK-AlAhly', ts
    );
    expect(r!.amount).toBe(400);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('محمد محمد');
    expect(r!.reference).toBe('123456789012');
    expect(r!.accountLast4).toBe('4444');
    expect(r!.isFromCard).toBe(false);
  });

  test('unrelated message returns null', () => {
    expect(parser.parse('Your OTP is 123456', 'BanK-AlAhly', ts)).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('BanK-AlAhly')).toBe(true);
    expect(parser.canHandle('bank-alahly')).toBe(true);
    expect(parser.canHandle('AD-BANK-ALAHLY-S')).toBe(true);
    expect(parser.canHandle('CIB')).toBe(false);
    expect(parser.canHandle('AD-FEDBNK')).toBe(false);
    expect(parser.canHandle('')).toBe(false);
  });
});
