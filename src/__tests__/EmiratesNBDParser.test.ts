import { EmiratesNBDParser } from '../banks/EmiratesNBDParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new EmiratesNBDParser();
const ts = 1000000000000;

describe('EmiratesNBDParser', () => {
  test('Credit Card Purchase with Available Limit', () => {
    const result = parser.parse(
      'Purchase of AED 27.74 with Credit Card ending 9074 at Keeta, Dubai. Avl Cr. Limit is AED 30,978.13',
      'EmiratesNBD', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(27.74);
    expect(result!.currency).toBe('AED');
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('Keeta, Dubai');
    expect(result!.accountLast4).toBe('9074');
  });

  test('Account Debit', () => {
    const result = parser.parse(
      'AED 500.00 debited from A/C xxxx1234 on 24-Dec-25. Avl Bal is AED 15,234.50',
      'ENBD', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('1234');
  });

  test('Account Credit', () => {
    const result = parser.parse(
      'AED 2,500.00 credited to A/C xxxx5678 on 24-Dec-25. Available Balance: AED 25,750.00',
      'EmiratesNB', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2500);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('5678');
  });

  test('Credit Card Purchase - Simple', () => {
    const result = parser.parse(
      'Purchase of AED 150.00 with Credit Card ending 4321 at Mall of Emirates. Avl Cr. Limit is AED 45,000.00',
      'EmiratesNBD', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(150);
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('Mall of Emirates');
    expect(result!.accountLast4).toBe('4321');
  });

  test('Multi-currency Purchase - USD', () => {
    const result = parser.parse(
      'Purchase of USD 100.00 with Credit Card ending 9074 at Amazon.com. Avl Cr. Limit is USD 10,000.00',
      'EmiratesNBD', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(100);
    expect(result!.currency).toBe('USD');
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('Amazon.com');
    expect(result!.accountLast4).toBe('9074');
  });

  test('Multi-currency Purchase - EUR', () => {
    const result = parser.parse(
      'Purchase of EUR 75.50 with Credit Card ending 4321 at Booking.com. Avl Cr. Limit is EUR 5,000.00',
      'ENBD', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(75.5);
    expect(result!.currency).toBe('EUR');
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('Booking.com');
  });

  test('Multi-currency Debit - GBP', () => {
    const result = parser.parse(
      'GBP 200.00 debited from A/C xxxx5678 on 25-Dec-25. Avl Bal is GBP 3,500.00',
      'EmiratesNBD', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(200);
    expect(result!.currency).toBe('GBP');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('5678');
  });

  test('factory resolves Emirates NBD senders', () => {
    const r1 = BankParserFactory.parse(
      'Purchase of AED 27.74 with Credit Card ending 9074 at Keeta, Dubai. Avl Cr. Limit is AED 30,978.13',
      'EmiratesNBD', ts
    );
    expect(r1).not.toBeNull();
    expect(r1!.amount).toBe(27.74);

    const r2 = BankParserFactory.parse(
      'AED 500.00 debited from A/C xxxx1234 on 24-Dec-25. Avl Bal is AED 15,234.50',
      'ENBD', ts
    );
    expect(r2).not.toBeNull();
    expect(r2!.amount).toBe(500);
  });
});
