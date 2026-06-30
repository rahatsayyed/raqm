import { ParsianBankParser } from '../banks/ParsianBankParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new ParsianBankParser();
const ts = 1000000000000;

describe('ParsianBankParser', () => {
  test('Parsian Bank deposit transaction', () => {
    const result = parser.parse(
      'مبلغ 2,000,000 تومان واریز به حساب شما انجام شد. مانده: 3,000,000 تومان',
      'PARSIANBANK', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2000000);
    expect(result!.currency).toBe('IRR');
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.balance).toBe(3000000);
  });

  test('Parsian Bank withdrawal transaction', () => {
    const result = parser.parse(
      'مبلغ 500,000 تومان از حساب شما برداشت شد. مانده: 2,500,000 تومان',
      'PARSIAN', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.balance).toBe(2500000);
  });

  test('Parsian Bank purchase transaction', () => {
    const result = parser.parse(
      'مبلغ 150,000 تومان خرید با کارت 1234-5678-9012-3456 انجام شد. مانده: 2,350,000 تومان',
      'PERSIANBANK', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(150000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.balance).toBe(2350000);
    expect(result!.isFromCard).toBe(true);
  });

  test('Parsian Bank transfer transaction', () => {
    const result = parser.parse(
      'مبلغ 800,000 تومان انتقال یافت. مانده: 1,550,000 تومان',
      'PARSIAN BANK', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(800000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.balance).toBe(1550000);
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('PARSIANBANK')).toBe(true);
    expect(parser.canHandle('PARSIAN')).toBe(true);
    expect(parser.canHandle('PERSIANBANK')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });

  test('factory resolves Parsian Bank', () => {
    const result = BankParserFactory.parse(
      'مبلغ 2,000,000 تومان واریز به حساب شما انجام شد. مانده: 3,000,000 تومان',
      'PARSIANBANK', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2000000);
    expect(result!.type).toBe(TransactionType.INCOME);
  });
});
