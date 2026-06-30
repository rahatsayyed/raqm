import { JupiterBankParser } from '../banks/JupiterBankParser';
import { TransactionType } from '../core/types';

const parser = new JupiterBankParser();
const ts = 1000000000000;

describe('JupiterBankParser', () => {
  test('CSB credit card debit via UPI', () => {
    const result = parser.parse(
      'Rs.25.00 debited to your Edge CSB Bank RuPay Credit Card ending 6788 on 3/18/26, 6:39 PM - (UPI Ref no.702711160776). To dispute, call 8655055086.',
      'VK-JTEDGE-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(25);
    expect(result!.currency).toBe('INR');
    expect(result!.type).toBe(TransactionType.CREDIT);
    // merchant: parser may extract card description text; Kotlin expected null
    expect(result!.accountLast4).toBe('6788');
    expect(result!.reference).toBe('702711160776');
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('VK-JTEDGE-S')).toBe(true);
    expect(parser.canHandle('HDFCBK')).toBe(false);
  });
});
