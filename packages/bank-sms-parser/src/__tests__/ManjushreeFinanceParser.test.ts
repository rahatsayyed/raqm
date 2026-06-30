import { ManjushreeFinanceParser } from '../banks/ManjushreeFinanceParser';
import { TransactionType } from '../core/types';

const parser = new ManjushreeFinanceParser();
const ts = 1000000000000;

describe('ManjushreeFinanceParser', () => {
  test('Debited example with merchant', () => {
    const result = parser.parse(
      'Your A/C ##0168658000001, has been debited by NPR 15,000.00 on 01/04/2026 10:27,Remarks:9800000000~2309320,IBFT,transfer FIRST LAST~RBB\nManjushree Finance',
      'MFL_ALERT', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(15000);
    expect(result!.currency).toBe('NPR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.reference).toBe('9800000000~2309320');
    expect(result!.merchant).toBe('FIRST LAST');
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('MFL_ALERT')).toBe(true);
    expect(parser.canHandle('MFL')).toBe(true);
    expect(parser.canHandle('MANJUSHREE')).toBe(true);
    expect(parser.canHandle('UNKNOWN')).toBe(false);
  });
});
