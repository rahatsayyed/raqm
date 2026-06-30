import { IndusIndBankParser } from '../banks/IndusIndBankParser';
import { TransactionType } from '../core/types';

const parser = new IndusIndBankParser();
const TS = 1750000000000;

describe('IndusIndBankParser', () => {
  test('canHandle returns true for IndusInd senders', () => {
    expect(parser.canHandle('INDUSB')).toBe(true);
    expect(parser.canHandle('INDUSIND')).toBe(true);
    expect(parser.canHandle('VM-INDUSB-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('SBIBK')).toBe(false);
  });

  test('parses debit transaction', () => {
    const sms = 'Rs.600.00 debited from your IndusInd Bank A/c XX1234 on 20-Jun-2026. Avl Bal: Rs.9,400.00';
    const result = parser.parse(sms, 'INDUSB', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(600);
    expect(result!.bankName).toBe('IndusInd Bank');
  });

  test('parses credit transaction', () => {
    const sms = 'Rs.3,000.00 credited to your IndusInd Bank A/c XX1234 on 20-Jun-2026. Avl Bal: Rs.12,400.00';
    const result = parser.parse(sms, 'INDUSB', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(3000);
  });

  test('returns null for OTP', () => {
    const sms = 'IndusInd Bank OTP: 123789. Do not share.';
    const result = parser.parse(sms, 'INDUSB', TS);
    expect(result).toBeNull();
  });
});
