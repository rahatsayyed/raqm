import { MellatBankParser } from '../banks/MellatBankParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new MellatBankParser();
const ts = 1000000000000;

describe('MellatBankParser', () => {
  test('Mellat Bank withdrawal transaction', () => {
    const result = parser.parse(
      'حساب1234567890\nبرداشت1,250,000\nمانده18,750,000\n04/04/21-21:40',
      'Bank Mellat', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1250000);
    expect(result!.currency).toBe('IRR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('7890');
    expect(result!.balance).toBe(18750000);
  });

  test('Mellat Bank withdrawal with spaced amounts', () => {
    const result = parser.parse(
      'حساب1234567890\nبرداشت 1,250,000\nمانده 18,750,000\n04/04/21-21:40',
      'Bank Mellat', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1250000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('7890');
    expect(result!.balance).toBe(18750000);
  });

  test('Mellat Bank deposit transaction', () => {
    const result = parser.parse(
      'حساب1234567890\nواریز2,500,000\nمانده21,250,000\n04/07/15-08:42',
      'Bank Mellat', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2500000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('7890');
    expect(result!.balance).toBe(21250000);
  });

  test('Mellat Bank short term interest deposit transaction', () => {
    const result = parser.parse(
      'واریز سود کوتاه مدت\nحساب1234567890\nمبلغ45,670\n04/06/02',
      'Bank Mellat', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(45670);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('7890');
    expect(result!.balance).toBeNull();
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('Bank Mellat')).toBe(true);
    expect(parser.canHandle('BANKMELLAT')).toBe(true);
    expect(parser.canHandle('MELLAT BANK')).toBe(true);
    expect(parser.canHandle('MELLAT')).toBe(true);
    expect(parser.canHandle('MELLATBANK')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });

  test('should ignore non-transaction messages', () => {
    expect(parser.parse('OTP verification', 'Bank Mellat', ts)).toBeNull();
    expect(parser.parse(
      'هشدار\nمشتری گرامی  شما درحال برداشت مبلغ 100,000,000 ریال از حساب خود جهت انتقال وجه پایا  به شبای IR990000000000000000000000 به نام IR990000000000000000000000# می باشید. \nتوجه نمایید كه عدد محرمانه: 1234567 یكباررمز شما جهت تایید انتقال وجه پایا  می باشد.',
      'Bank Mellat', ts
    )).toBeNull();
  });

  test('factory resolves Mellat Bank', () => {
    const result = BankParserFactory.parse(
      'حساب1234567890\nبرداشت1,250,000\nمانده18,750,000\n04/04/21-21:40',
      'Bank Mellat', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1250000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
  });
});
