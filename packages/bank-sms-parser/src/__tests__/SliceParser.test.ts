import { SliceParser } from '../banks/SliceParser';
import { TransactionType } from '../core/types';

const parser = new SliceParser();
const ts = 1000000000000;

describe('SliceParser', () => {
  test('Modern Slice UPI transfer should be EXPENSE', () => {
    const result = parser.parse(
      'Sent Rs.500 to MERCHANT NAME (UPI transaction success). Sent from slice.',
      'JK-SLICEIT', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500);
    expect(result!.currency).toBe('INR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('MERCHANT NAME');
    expect(result!.accountLast4).toBeNull();
    // reference may be null or contain partial text depending on parser
  });

  test('Modern Slice debited (bank account)', () => {
    const result = parser.parse(
      'Rs.250 debited from your slice account via UPI. Txn ID 1234567890.',
      'AD-SLCEIT-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(250);
    expect(result!.type).toBe(TransactionType.EXPENSE);
  });

  test('Modern Slice paid via UPI (no card context) is EXPENSE', () => {
    const result = parser.parse(
      'Rs.100 paid to MERCHANT via slice UPI. Txn ID 9876543210.',
      'AD-SLCEIT-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(100);
    expect(result!.type).toBe(TransactionType.EXPENSE);
  });

  test('Legacy slice credit card transaction on amazon.in (CREDIT)', () => {
    const result = parser.parse(
      'Your slice credit card transaction of RS. 50000 on amazon.in is successful. If not you, call 08048329999 - slice',
      'AD-SLCEIT-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50000);
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('amazon.in');
  });

  test('Legacy slice credit card transaction with decimal amount (CREDIT)', () => {
    const result = parser.parse(
      'Your slice credit card transaction of RS. 1234.56 on flipkart.com is successful.',
      'AX-SLICEIT-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1234.56);
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('flipkart.com');
  });

  test("Slice card 'spent' wording with card context stays CREDIT", () => {
    const result = parser.parse(
      'Rs.350 spent on your slice credit card at MERCHANT. Available limit: Rs.10000.',
      'AD-SLCEIT-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(350);
    expect(result!.type).toBe(TransactionType.CREDIT);
  });

  test('Cashback credited to slice account (INCOME)', () => {
    const result = parser.parse(
      'Rs.1000 credited to your slice account as cashback.',
      'AD-SLCEIT-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('Slice Credit');
  });

  test('Non-transaction message (OTP) should not parse', () => {
    const result = parser.parse('Your OTP for slice transaction is 123456. Do not share.', 'AD-SLCEIT-S', ts);
    expect(result).toBeNull();
  });

  test('Declined transaction should NOT be parsed', () => {
    const result = parser.parse(
      'Your slice credit card transaction of RS. 50000 on amazon.in was declined.',
      'AD-SLCEIT-S', ts
    );
    expect(result).toBeNull();
  });

  test('Failed transaction should NOT be parsed', () => {
    const result = parser.parse(
      'Your slice credit card transaction of RS. 1234.56 on flipkart.com failed.',
      'AX-SLICEIT-S', ts
    );
    expect(result).toBeNull();
  });

  test('Unsuccessful transaction should NOT be parsed', () => {
    const result = parser.parse(
      'Your slice credit card transaction of RS. 50000 on amazon.in was unsuccessful.',
      'AD-SLCEIT-S', ts
    );
    expect(result).toBeNull();
  });

  test('Date phrase should not be extracted as merchant', () => {
    const result = parser.parse(
      'Your slice credit card transaction of RS. 50000 on Feb 15 is successful.',
      'AD-SLCEIT-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50000);
    expect(result!.type).toBe(TransactionType.CREDIT);
    // merchant extraction may vary — just verify no full date string is captured
    expect(result!.merchant).not.toContain('Feb 15');
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('AD-SLCEIT-S')).toBe(true);
    expect(parser.canHandle('AX-SLICEIT-S')).toBe(true);
    expect(parser.canHandle('JK-SLICEIT')).toBe(true);
    expect(parser.canHandle('SLICEIT')).toBe(true);
    expect(parser.canHandle('SLCEIT')).toBe(true);
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('VK-JTEDGE-S')).toBe(false);
  });
});
