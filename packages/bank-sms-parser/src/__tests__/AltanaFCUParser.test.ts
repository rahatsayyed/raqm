import { AltanaFCUParser } from '../banks/AltanaFCUParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new AltanaFCUParser();
const ts = 1000000000000;

describe('AltanaFCUParser', () => {
  test('Pending debit card charge', () => {
    const result = parser.parse(
      'Pending charge for $43.92 on 04/24 20:39 CDT at MERCHANT NAME, CITY, ST for Debit Consumer card ending in 1234.',
      'Altana FCU', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(43.92);
    expect(result!.currency).toBe('USD');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('MERCHANT NAME, CITY, ST');
    expect(result!.accountLast4).toBe('1234');
    expect(result!.isFromCard).toBe(true);
  });

  test('Pending charge with comma in amount', () => {
    const result = parser.parse(
      'Pending charge for $1,250.00 on 05/01 12:34 CDT at HOME GOODS STORE, AUSTIN, TX for Debit Consumer card ending in 5678.',
      '8775905546', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1250);
    expect(result!.currency).toBe('USD');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('HOME GOODS STORE, AUSTIN, TX');
    expect(result!.accountLast4).toBe('5678');
    expect(result!.isFromCard).toBe(true);
  });

  test('canHandle Altana FCU', () => {
    expect(parser.canHandle('Altana FCU')).toBe(true);
    expect(parser.canHandle('8775905546')).toBe(true);
    expect(parser.canHandle('(877) 590-5546')).toBe(true);
  });

  test('factory resolves Altana FCU', () => {
    const result = BankParserFactory.parse(
      'Pending charge for $43.92 on 04/24 20:39 CDT at MERCHANT NAME, CITY, ST for Debit Consumer card ending in 1234.',
      'Altana FCU', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(43.92);
    expect(result!.type).toBe(TransactionType.EXPENSE);
  });
});
