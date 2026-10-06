import { PasargadBankParser } from '../banks/PasargadBankParser';
import { TransactionType } from '../core/types';

const parser = new PasargadBankParser();
const ts = 1000000000000;

const sms = (sign: string, amount: string, balance: string, extra = '') =>
  `777.888.20000275.1\n${sign}${amount}\n04/13_10:22\nمانده: ${balance}${extra}`;

describe('PasargadBankParser', () => {
  test('deposit is INCOME', () => {
    const r = parser.parse(sms('+', '1,000,000,000', '1,000,000,000'), 'B.Pasargad', ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(1000000000);
    expect(r!.currency).toBe('IRR');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.accountLast4).toBe('2751');
    expect(r!.balance).toBe(1000000000);
  });

  test('second deposit', () => {
    const r = parser.parse(sms('+', '870,000,000', '1,870,000,000'), 'B.Pasargad', ts);
    expect(r!.amount).toBe(870000000);
    expect(r!.balance).toBe(1870000000);
  });

  test('withdrawal is EXPENSE', () => {
    const r = parser.parse(sms('-', '870,000,000', '1,000,000,000'), 'B.Pasargad', ts);
    expect(r!.amount).toBe(870000000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.accountLast4).toBe('2751');
    expect(r!.balance).toBe(1000000000);
  });

  test('OTP messages are ignored, even with the compact format', () => {
    expect(parser.parse('OTP verification', 'B.Pasargad', ts)).toBeNull();
    expect(parser.parse('Your OTP code is 12345', 'B.Pasargad', ts)).toBeNull();
    expect(
      parser.parse(sms('+', '1,000,000,000', '1,000,000,000', '\nرمز یکبار مصرف: 54321'), 'B.Pasargad', ts)
    ).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('B.Pasargad')).toBe(true);
    expect(parser.canHandle('B.PASARGAD')).toBe(true);
    expect(parser.canHandle('PASARGAD')).toBe(true);
    expect(parser.canHandle('wepod')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });
});
