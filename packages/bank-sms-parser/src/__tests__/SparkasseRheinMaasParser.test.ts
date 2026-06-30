import { SparkasseRheinMaasParser } from '../banks/SparkasseRheinMaasParser';
import { TransactionType } from '../core/types';

const parser = new SparkasseRheinMaasParser();
const ts = 1000000000000;

describe('SparkasseRheinMaasParser', () => {
  test('Kartenwecker - card purchase', () => {
    const result = parser.parse(
      'Kartenwecker:\n1 neuer Kartenumsatz auf dem Konto *1832:\nKAUFLAND: -70,85 EUR\nNeuer Saldo: 991,84 EUR\nIhre Sparkasse',
      'Sparkasse', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(70.85);
    expect(result!.currency).toBe('EUR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('KAUFLAND');
    expect(result!.accountLast4).toBe('1832');
    expect(result!.balance).toBe(991.84);
    expect(result!.isFromCard).toBe(true);
  });

  test('Gehaltswecker - salary credit with thousands separator', () => {
    const result = parser.parse(
      'Gehaltswecker:\nGehalt ist auf Konto *1832 eingegangen:\nAction De.: 1.415,62 EUR\nNeuer Saldo: 1.415,67 EUR\nIhre Sparkasse',
      'Sparkasse', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1415.62);
    expect(result!.currency).toBe('EUR');
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('Action De.');
    expect(result!.accountLast4).toBe('1832');
    expect(result!.balance).toBe(1415.67);
    expect(result!.isFromCard).toBe(false);
  });

  test('Kontostandswecker - balance-only push is rejected', () => {
    const result = parser.parse(
      'Kontostandswecker:\nKonto *1832\nNeuer Saldo: 1.246,69 EUR\nNeue Umsaetze: 4\nIhre Sparkasse',
      'Sparkasse', ts
    );
    expect(result).toBeNull();
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('Sparkasse')).toBe(true);
    expect(parser.canHandle('SPARKASSE')).toBe(true);
    expect(parser.canHandle('UNKNOWN')).toBe(false);
  });
});
