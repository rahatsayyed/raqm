import { SabbBankParser } from '../banks/SabbBankParser';
import { TransactionType } from '../core/types';

const parser = new SabbBankParser();
const ts = 1000000000000;

describe('SabbBankParser', () => {
  test('POS purchase via Samsung Pay', () => {
    const result = parser.parse(
      'شراء عبر نقاط البيع\nبطاقة: ***1111;mada(Samsung Pay);\nمبلغ: SAR 56.00\nلدى: TANOOR ALTAHI REST×\nفي: 2026-05-06 20:02:46',
      'SAB', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(56);
    expect(result!.currency).toBe('SAR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('TANOOR ALTAHI REST');
    expect(result!.accountLast4).toBe('1111');
    expect(result!.isFromCard).toBe(true);
  });

  test('Online / internet purchase via Mada', () => {
    const result = parser.parse(
      'شراء إنترنت\nبطاقة: ***1111;مدى\nمن: ***999\nمبلغ: 126.28 SAR\nلدى: AMAZON SA××AL Madin\nفي: 2026-04-28 09:35:17',
      'SAB', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(126.28);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('AMAZON SA××AL Madin');
    expect(result!.accountLast4).toBe('1111');
    expect(result!.isFromCard).toBe(true);
  });

  test('Outgoing local transfer with fees', () => {
    const result = parser.parse(
      'حوالة صادرة مقبولة\nمن: **9999\nإلى: KHALID Ahmed\nآيبان: **8888\nبنك إس تي سي\nمبلغ: SAR 200.00\nرسوم: SAR 0.57\nفي: 2026-04-30 11:04:57',
      'SAB', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(200);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('KHALID Ahmed');
    expect(result!.accountLast4).toBe('9999');
  });

  test('Incoming transfer / deposit', () => {
    const result = parser.parse(
      'إيداع حوالة واردة\nمن: FAHAD Ahmed\nإلى: **9999\nآيبان: **7777\nالبنك العربي الوطني\nمبلغ: SAR 75.00\nفي: 2026-05-05 00:59:09',
      'SAB', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(75);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('FAHAD Ahmed');
    expect(result!.accountLast4).toBe('9999');
  });

  test('Salary credit (حوالة راتب) as income', () => {
    const result = parser.parse(
      'حوالة راتب\nإلى: **001\nمبلغ: 12,345.67 SAR\nفي: 2026-05 21 10:00:00',
      'SAB', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(12345.67);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('Salary');
    expect(result!.accountLast4).toBe('001');
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('SAB')).toBe(true);
    expect(parser.canHandle('JD-SAB-S')).toBe(true);
    expect(parser.canHandle('SABB')).toBe(true);
    expect(parser.canHandle('JD-HDFCBK-S')).toBe(false);
    expect(parser.canHandle('UNKNOWN')).toBe(false);
  });
});
