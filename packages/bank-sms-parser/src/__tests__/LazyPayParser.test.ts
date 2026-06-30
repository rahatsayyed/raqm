import { LazyPayParser } from '../banks/LazyPayParser';
import { TransactionType } from '../core/types';

const parser = new LazyPayParser();
const TS = 1750000000000;

describe('LazyPayParser', () => {
  test('canHandle returns true for LazyPay senders', () => {
    expect(parser.canHandle('LZYPAY')).toBe(true);
    expect(parser.canHandle('LAZYPAY')).toBe(true);
    expect(parser.canHandle('BP-LZYPAY-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('SBIBK')).toBe(false);
  });

  test('parses transaction on merchant pattern', () => {
    const sms = 'Your LazyPay txn for Rs.299.00 for txn TXN512924131 on Swiggy was successful. Avl limit: Rs.9,701.00';
    const result = parser.parse(sms, 'LZYPAY', TS);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(299);
    expect(result!.bankName).toBe('LazyPay');
  });

  test('returns null for OTP', () => {
    const sms = 'LazyPay OTP 234567. Do not share.';
    const result = parser.parse(sms, 'LZYPAY', TS);
    expect(result).toBeNull();
  });
});
