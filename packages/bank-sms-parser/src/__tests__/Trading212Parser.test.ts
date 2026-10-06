import { Trading212Parser } from '../banks/Trading212Parser';
import { TransactionType } from '../core/types';

const parser = new Trading212Parser();
const ts = 1000000000000;

describe('Trading212Parser', () => {
  test('GBP interest notification', () => {
    const r = parser.parse('💸 You earned £0.24 interest on uninvested cash!', 'Trading212', ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(0.24);
    expect(r!.currency).toBe('GBP');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Trading 212 Interest');
  });

  test('non-GBP interest is skipped', () => {
    expect(parser.parse('💸 You earned €1.05 interest on uninvested cash!', 'Trading212', ts)).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('Trading212')).toBe(true);
    expect(parser.canHandle('TRADING 212')).toBe(true);
    expect(parser.canHandle('Chase')).toBe(false);
  });
});
