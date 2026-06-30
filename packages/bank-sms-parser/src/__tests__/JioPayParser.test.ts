import { JioPayParser } from '../banks/JioPayParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new JioPayParser();
const ts = 1000000000000;

describe('JioPayParser', () => {
  test('JioPay recharge successful', () => {
    const result = parser.parse(
      'Recharge Successful for Jio Number : 9876543210. Rs. 249.00 paid. Transaction ID : BR000CAUBYON',
      'JIOPAY', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(249);
    expect(result!.currency).toBe('INR');
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('Jio Recharge - 9876****');
    expect(result!.reference).toBe('BR000CAUBYON');
  });

  test('JioPay payment successful to merchant', () => {
    const result = parser.parse(
      'Payment successful to ZOMATO. Rs. 500.00 paid. Transaction ID : BR000CAUBYON',
      'JIOPAY', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500);
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('ZOMATO');
    expect(result!.reference).toBe('BR000CAUBYON');
  });

  test('JioPay bill payment', () => {
    const result = parser.parse(
      'Bill Payment of Rs. 1,234.56 for Electricity bill successful. Rs. 1,234.56 paid. Transaction ID : BR000CAUBYON',
      'JIOPAY', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1234.56);
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('Electricity Bill');
    expect(result!.reference).toBe('BR000CAUBYON');
  });

  test('bill notification should be rejected', () => {
    const billMessage = `Your 14-Dec-2025 e-bill for Jio Number 7593988738 has been sent to Techexplorers2020@gmail.com.
        Bill Summary :
        Bill period : 30-Nov-2025 to 13-Dec-2025
        Total Amount payable : Rs. 242.38
        Payment due date: 23-DEC-2025`;
    const result = parser.parse(billMessage, 'JD-JIOPAY-S', ts);
    expect(result).toBeNull();
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('JIOPAY')).toBe(true);
    expect(parser.canHandle('HDFCBK')).toBe(false);
  });

  test('factory resolves JioPay', () => {
    const result = BankParserFactory.parse(
      'Recharge Successful for Jio Number : 9876543210. Rs. 249.00 paid',
      'JIOPAY', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(249);
    expect(result!.type).toBe(TransactionType.CREDIT);
  });
});
