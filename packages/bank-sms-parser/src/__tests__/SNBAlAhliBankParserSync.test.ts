import { SNBAlAhliBankParser } from '../banks/SNBAlAhliBankParser';
import { TransactionType } from '../core/types';

const parser = new SNBAlAhliBankParser();
const ts = 1000000000000;

describe('SNBAlAhliBankParser upstream sync', () => {
  test('POS purchase with Samsung Pay (Mada)', () => {
    const r = parser.parse('شراء نقاط بيع SamsungPay\nبـSAR 12.34\nمن SYNTHETIC STORE\nمدى *0007\nفي 00:00 01/01/30', 'SNB-AlAhli', ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(12.34);
    expect(r!.currency).toBe('SAR');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('SYNTHETIC STORE');
    expect(r!.accountLast4).toBe('0007');
    expect(r!.isFromCard).toBe(true);
  });

  test('amount-first SAR layout with Mada-Apple card', () => {
    const r = parser.parse('شراء انترنت\nبـ23.45 SAR\nمن SYNTHETIC WALLET\nمدى-ابل *0007', 'SNB-AlAhli', ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(23.45);
    expect(r!.merchant).toBe('SYNTHETIC WALLET');
    expect(r!.accountLast4).toBe('0007');
    expect(r!.isFromCard).toBe(true);
  });

  test('refund takes precedence over purchase wording', () => {
    const r = parser.parse('استرجاع شراء\nبـ34.56 SAR\nمن SYNTHETIC RETURN STORE\nمدى *0007', 'SNB-AlAhli', ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(34.56);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('SYNTHETIC RETURN STORE');
    expect(r!.accountLast4).toBe('0007');
  });

  test('emergency cash correction returns funds', () => {
    const r = parser.parse('تصحيح سحب نقدي\nمبلغ 45.67 SAR\nمدى *0007', 'SNB-AlAhli', ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(45.67);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.accountLast4).toBe('0007');
  });

  test.each([
    'استرجاع تحويل سابق مرفوض\nبـ12.34 SAR\nمن SYNTHETIC MERCHANT\nمدى *0007',
    'استرجاع سابق مرفوض\nبـ23.45 SAR\nمن SYNTHETIC MERCHANT\nمدى *0007',
    'استرجاع عملية شراء سابقة مرفوضة\nبـ12.34 SAR\nمن SYNTHETIC MERCHANT\nمدى *0007',
    'رمز التحقق الخاص بك هو <CODE>. لا تشاركه مع أحد.',
    'الرقم السري لتأكيد شراء عبر الانترنت: <CODE>\nمبلغ 56.78 SAR\nبطاقة *0007',
    'عملية مرفوضة\nشراء-POS\nبـ67.89 SAR\nرصيد غير كافي',
    'شراء\nملاحظة: SAR 99.99 هو الحد المتاح\nمن SYNTHETIC INFORMATION',
  ])('ignored: %s', (message) => {
    expect(parser.parse(message, 'SNB-AlAhli', ts)).toBeNull();
  });
});
