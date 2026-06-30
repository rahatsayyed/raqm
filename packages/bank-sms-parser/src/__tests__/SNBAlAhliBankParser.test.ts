import { SNBAlAhliBankParser } from '../banks/SNBAlAhliBankParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new SNBAlAhliBankParser();
const ts = 1000000000000;

describe('SNBAlAhliBankParser', () => {
  test('POS purchase with Samsung Pay (Mada)', () => {
    const result = parser.parse(
      'شراء نقاط بيع SamsungPay\nبـSAR 19.45\nمن filwah al\nمدى *2342\nفي 07:53 03/04/26',
      'SNB-AlAhli', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(19.45);
    expect(result!.currency).toBe('SAR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('filwah al');
    expect(result!.accountLast4).toBe('2342');
    expect(result!.isFromCard).toBe(true);
  });

  test('OTP message is ignored', () => {
    const result = parser.parse(
      'رمز التحقق الخاص بك هو 123456. لا تشاركه مع أحد.',
      'SNB-AlAhli', ts
    );
    expect(result).toBeNull();
  });

  test('factory resolves SNB AlAhli', () => {
    const result = BankParserFactory.parse(
      'شراء نقاط بيع SamsungPay\nبـSAR 19.45\nمن filwah al\nمدى *2342\nفي 07:53 03/04/26',
      'SNB-AlAhli', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(19.45);
    expect(result!.type).toBe(TransactionType.EXPENSE);
  });
});
