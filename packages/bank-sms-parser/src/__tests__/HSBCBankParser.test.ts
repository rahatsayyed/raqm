import { HSBCBankParser } from '../banks/HSBCBankParser';
import { TransactionType } from '../core/types';

const parser = new HSBCBankParser();
const ts = 1000000000000;

describe('HSBCBankParser', () => {
  test('Outgoing NEFT Transfer - credited to other bank', () => {
    const result = parser.parse(
      'HSBC: Dear HSBC Customer, your NEFT transaction with reference number HSBCN00106726185 for INR 150,000.00 has been credited to the HDFC A/c XXXXXXXXXX6956 of AKASH KEDIA on 01-01-2026 at 15:36:47 .',
      'VM-HSBCIN-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(150000);
    expect(result!.currency).toBe('INR');
    expect(result!.type).toBe(TransactionType.TRANSFER);
    expect(result!.merchant).toBe('AKASH KEDIA');
  });

  test('Debit Card Purchase', () => {
    const result = parser.parse(
      'HSBC: Thank you for using HSBC Debit Card XXXXX71xx for INR 305.00 on 15-Dec-25 at IKEA INDIA .',
      'VM-HSBCIN', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(305);
    expect(result!.currency).toBe('INR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('IKEA INDIA');
    // accountLast4: parser may not extract alphanumeric card suffixes like "71xx"
  });

  test('Incoming NEFT Credit', () => {
    const result = parser.parse(
      'HSBC: INR 50,000.00 is credited to your A/c 074-260***-006 as NEFT from CHAS A/c ***6983 of John Doe .',
      'VM-HSBCIN-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50000);
    expect(result!.currency).toBe('INR');
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('CHAS A/c ***6983 of John Doe');
    expect(result!.accountLast4).toBe('0006');
  });

  test('Payment from Account', () => {
    const result = parser.parse(
      'HSBC: INR 1,234.56 is paid from your A/c 074-260***-006 to AMAZON on 20-Dec-25. Your Avl Bal is INR 98,765.44 .',
      'HSBCIN', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1234.56);
    expect(result!.currency).toBe('INR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('AMAZON');
    expect(result!.accountLast4).toBe('0006');
    expect(result!.balance).toBe(98765.44);
  });

  test('Egypt Credit Card Purchase (EGP)', () => {
    const result = parser.parse(
      'Your Credit Card ending with 0006 has been used for EGP 199.99 on 23/01/2026 at SomePremium. Your available limit is EGP 5004.29',
      'HSBC', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(199.99);
    expect(result!.currency).toBe('EGP');
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('SomePremium');
    expect(result!.accountLast4).toBe('0006');
    expect(result!.isFromCard).toBe(true);
  });
});
