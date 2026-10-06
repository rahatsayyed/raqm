import { ChaseUKParser } from '../banks/ChaseUKParser';
import { TransactionType } from '../core/types';

const parser = new ChaseUKParser();
const ts = 1000000000000;

describe('ChaseUKParser', () => {
  test('money in notification', () => {
    const r = parser.parse("🎉 £0.01 just landed in Test's Account from Jane Doe", 'ChaseUK', ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(0.01);
    expect(r!.currency).toBe('GBP');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Jane Doe');
    expect(r!.reference).toBeNull();
    expect(r!.accountLast4).toBeNull();
    expect(r!.balance).toBeNull();
  });

  test('thousands separator and trailing period', () => {
    const r = parser.parse("🎉 £1,250.00 just landed in Test's Account from ACME LTD.", 'ChaseUK', ts);
    expect(r!.amount).toBe(1250);
    expect(r!.merchant).toBe('ACME LTD');
  });

  test('unrelated notification returns null', () => {
    expect(parser.parse('Your Chase statement is ready', 'ChaseUK', ts)).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('ChaseUK')).toBe(true);
    expect(parser.canHandle('CHASE_UK')).toBe(true);
    expect(parser.canHandle('Chase')).toBe(false);
    expect(parser.canHandle('24273')).toBe(false);
  });
});
