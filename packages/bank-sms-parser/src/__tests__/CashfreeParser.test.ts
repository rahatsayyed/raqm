import { CashfreeParser } from '../banks/CashfreeParser';
import { TransactionType } from '../core/types';

const parser = new CashfreeParser();
const ts = 1000000000000;

describe('CashfreeParser', () => {
  test('Outgoing payment confirmation', () => {
    const result = parser.parse(
      'Payment INR 50.00 (ID:5448114171) confirmed for order #735571_428_1777162938185 on AuraGold.\nPowered by Cashfree',
      'JX-CSHfre-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50);
    expect(result!.currency).toBe('INR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('AuraGold');
    expect(result!.reference).toBe('5448114171');
  });

  test('OTP message should be rejected', () => {
    const result = parser.parse('OTP 123456 is your one time password. Do not share.', 'JX-CSHfre-S', ts);
    expect(result).toBeNull();
  });

  test('Cashfree sender without confirmation phrasing returns null', () => {
    const result = parser.parse('Payment options are available on our portal. Powered by Cashfree', 'JX-CSHfre-S', ts);
    expect(result).toBeNull();
  });

  test('Multi-word merchant is captured up to the period', () => {
    const result = parser.parse(
      'Payment INR 299.00 (ID:9988776655) confirmed for order #order_001 on Sun Direct.\nPowered by Cashfree',
      'VK-CSHfre-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(299);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('Sun Direct');
    expect(result!.reference).toBe('9988776655');
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('JX-CSHfre-S')).toBe(true);
    expect(parser.canHandle('VK-CSHfre-T')).toBe(true);
    expect(parser.canHandle('JD-CSHfre-S')).toBe(true);
    expect(parser.canHandle('CSHFRE')).toBe(true);
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('JD-HDFCBK-S')).toBe(false);
    expect(parser.canHandle('UNKNOWN')).toBe(false);
  });
});
