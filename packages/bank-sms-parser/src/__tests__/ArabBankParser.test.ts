import { ArabBankParser } from '../banks/ArabBankParser';
import { TransactionType } from '../core/types';

const parser = new ArabBankParser();
const ts = 1000000000000;

describe('ArabBankParser', () => {
  test('English card spend in EGP', () => {
    const r = parser.parse(
      'A Trx using Card XXXX2020 from Top Up ETISALAT Egypt for EGP 123.45 on 18-Jun-2026 at 13:59 GMT+3. Available balance is EGP 9876.54.',
      'ArabBank', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(123.45);
    expect(r!.currency).toBe('EGP');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('Top Up ETISALAT Egypt');
    expect(r!.accountLast4).toBe('2020');
    expect(r!.balance).toBe(9876.54);
    expect(r!.isFromCard).toBe(true);
  });

  test('USD card spend with EGP balance', () => {
    const r = parser.parse(
      'A Trx using Card XXXX2020 from PORKBUN COM for USD 9.84 on 05-Oct-2025 at 07:48 GMT+2. Available balance is EGP 5432.10.',
      'ArabBank', ts
    );
    expect(r!.amount).toBe(9.84);
    expect(r!.currency).toBe('USD');
    expect(r!.merchant).toBe('PORKBUN COM');
    expect(r!.balance).toBe(5432.1);
  });

  test('Arabic credit to the card', () => {
    const r = parser.parse('تم قيد مبلغ 500.00 جنيه لبطاقتك الائتمانية رقم #2020', 'ArabBank', ts);
    expect(r!.amount).toBe(500);
    expect(r!.currency).toBe('EGP');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.accountLast4).toBe('2020');
    expect(r!.isFromCard).toBe(true);
  });

  test('Jordan card spend in JOD with 3 decimals', () => {
    const r = parser.parse(
      'A Trx using Card XXXX9915 from ADANI CORNER for JOD 2.750 on 20-Jun-2026 at 14:21 GMT+3. Available balance is JOD 1649.832.',
      'ArabBank', ts
    );
    expect(r!.amount).toBe(2.75);
    expect(r!.currency).toBe('JOD');
    expect(r!.merchant).toBe('ADANI CORNER');
    expect(r!.accountLast4).toBe('9915');
    expect(r!.balance).toBe(1649.832);
  });

  test('Jordan CliQ debit is not a card', () => {
    const r = parser.parse(
      'JOD50.000 has been debited from 0156*500 to John Smith as CliQ transfer Balance 37.920JOD',
      'ArabBank', ts
    );
    expect(r!.amount).toBe(50);
    expect(r!.currency).toBe('JOD');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('John Smith');
    expect(r!.accountLast4).toBe('6500');
    expect(r!.balance).toBe(37.92);
    expect(r!.isFromCard).toBe(false);
  });

  test('Jordan CliQ credit with no-space from', () => {
    const r = parser.parse(
      'JOD172.000 has been credited to 0156*500from Jane Doe as CliQ transfer Balance 959.370JOD',
      'ArabBank', ts
    );
    expect(r!.amount).toBe(172);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Jane Doe');
    expect(r!.accountLast4).toBe('6500');
    expect(r!.balance).toBe(959.37);
    expect(r!.isFromCard).toBe(false);
  });

  test('OTP messages are rejected', () => {
    expect(parser.parse('Your OTP for Arab Bank is 123456. Do not share it with anyone.', 'ArabBank', ts)).toBeNull();
    expect(parser.parse('رمز التحقق الخاص بك في Arab Bank هو 123456', 'ArabBank', ts)).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('ArabBank')).toBe(true);
    expect(parser.canHandle('ARABBANK')).toBe(true);
    expect(parser.canHandle('AD-ARABBANK')).toBe(true);
    expect(parser.canHandle('AB-ARABBK-S')).toBe(true);
    expect(parser.canHandle('HDFC')).toBe(false);
    expect(parser.canHandle('')).toBe(false);
  });
});
