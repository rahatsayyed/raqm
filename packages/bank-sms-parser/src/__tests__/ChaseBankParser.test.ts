import { ChaseBankParser } from '../banks/ChaseBankParser';
import { TransactionType } from '../core/types';

const parser = new ChaseBankParser();
const ts = 1000000000000;

describe('ChaseBankParser', () => {
  test('card transaction', () => {
    const r = parser.parse(
      'Chase: Your credit card ending in 1234 had a transaction with AMAZON on 01/02/2026 for $25.50.',
      '24273', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(25.5);
    expect(r!.currency).toBe('USD');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.isFromCard).toBe(true);
  });

  test('canHandle leaves Chase UK to ChaseUKParser', () => {
    expect(parser.canHandle('24273')).toBe(true);
    expect(parser.canHandle('Chase')).toBe(true);
    expect(parser.canHandle('ChaseUK')).toBe(false);
    expect(parser.canHandle('CHASE_UK')).toBe(true);
  });
});
