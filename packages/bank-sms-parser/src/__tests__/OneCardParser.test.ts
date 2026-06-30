import { OneCardParser } from '../banks/OneCardParser';
import { TransactionType } from '../core/types';

const parser = new OneCardParser();
const TS = 1750000000000;

describe('OneCardParser', () => {
  test('canHandle returns true for OneCard senders', () => {
    expect(parser.canHandle('ONECRD')).toBe(true);
    expect(parser.canHandle('ONECARD')).toBe(true);
    expect(parser.canHandle('CP-OneCrd-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('SBIBK')).toBe(false);
  });

  test('parses spent transaction as CREDIT type', () => {
    // "spent" is in the base-class keyword list, triggering type detection
    const sms = "You've spent Rs. 1,200.00 on MakeMyTrip on card ending 1234. Avl limit: Rs. 48,800.00";
    const result = parser.parse(sms, 'ONECRD', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.amount).toBe(1200);
    expect(result!.bankName).toBe('OneCard');
  });

  test('parses another spent transaction as CREDIT type', () => {
    const sms = "You've spent Rs. 500.00 at HPCL Petrol on card ending 1234. Avl limit: Rs. 49,500.00";
    const result = parser.parse(sms, 'ONECRD', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.amount).toBe(500);
  });

  test('returns null for OTP', () => {
    const sms = 'OneCard OTP: 901234. Do not share with anyone.';
    const result = parser.parse(sms, 'ONECRD', TS);
    expect(result).toBeNull();
  });
});
