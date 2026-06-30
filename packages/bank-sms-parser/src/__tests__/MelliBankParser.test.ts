import { MelliBankParser } from '../banks/MelliBankParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new MelliBankParser();
const ts = 1000000000000;

describe('MelliBankParser', () => {
  test('Melli Bank deposit transaction', () => {
    const result = parser.parse(
      'مبلغ 1,500,000 ریال واریز به حساب شما انجام شد. مانده: 2,500,000 ریال',
      '+98700717', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1500000);
    expect(result!.currency).toBe('IRR');
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.balance).toBe(2500000);
  });

  test('Melli Bank withdrawal transaction', () => {
    const result = parser.parse(
      'مبلغ 750,000 ریال از حساب شما برداشت شد. مانده: 1,750,000 ریال',
      '+98700717', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(750000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.balance).toBe(1750000);
  });

  test('Melli Bank purchase transaction', () => {
    const result = parser.parse(
      'مبلغ 250,000 ریال خرید با کارت شما انجام شد. مانده: 1,500,000 ریال',
      'MELLI', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(250000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.balance).toBe(1500000);
    expect(result!.isFromCard).toBe(true);
  });

  test('Melli Bank transfer transaction', () => {
    const result = parser.parse(
      'مبلغ 1,000,000 ریال انتقال یافت. مانده: 500,000 ریال',
      'MELLIBANK', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1000000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.balance).toBe(500000);
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('+98700717')).toBe(true);
    expect(parser.canHandle('MELLI')).toBe(true);
    expect(parser.canHandle('MELLIBANK')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
  });

  test('factory resolves Melli Bank', () => {
    const result = BankParserFactory.parse(
      'مبلغ 1,500,000 ریال واریز به حساب شما انجام شد. مانده: 2,500,000 ریال',
      '+98700717', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1500000);
    expect(result!.type).toBe(TransactionType.INCOME);
  });
});
