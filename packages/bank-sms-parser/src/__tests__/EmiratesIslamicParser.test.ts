import { EmiratesIslamicParser } from '../banks/EmiratesIslamicParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new EmiratesIslamicParser();
const ts = 1000000000000;

describe('EmiratesIslamicParser', () => {
  test('Debit Card Purchase', () => {
    const result = parser.parse(
      'Debit Card Purchase\nCard Ending: 1111\nAt: talabat.com, DUBAI\nAmount: AED 12.34\nDate: 21/12/2024 20:18\nAvailable Balance: AED 12,123.12',
      'EI SMS', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(12.34);
    expect(result!.currency).toBe('AED');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('talabat.com, DUBAI');
    expect(result!.accountLast4).toBe('1111');
    expect(result!.balance).toBe(12123.12);
  });

  test('Telegraphic Transfer Deducted', () => {
    const result = parser.parse(
      'Telegraphic Transfer Deducted From Account: 123XXX12XXX12  Amount: AED 12.00 Date: 21/12/2024 20:18 Available Balance: AED 12,123.12',
      'EI SMS', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(12);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('1212');
    expect(result!.balance).toBe(12123.12);
  });

  test('Payment towards Credit Card', () => {
    const result = parser.parse(
      'Payment towards Credit Card\nFrom Account: 12345XXXXX123\nAmount: AED 1,123.12\nDate: 21/12/2024 12:34\nAvailable Balance: AED 12,123.12',
      'EI SMS', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1123.12);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('5123');
    expect(result!.balance).toBe(12123.12);
  });

  test('Credit Card Purchase', () => {
    const result = parser.parse(
      'Credit Card Purchase\nCard Ending: 1234\nAt: ROXY CINEMA - Dubai Hi, Dubai\nAmount: AED 123.00\nDate: 21/12/2024, 20:12\nAvailable Limit: AED 123,123.12',
      'EI SMS', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(123);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('ROXY CINEMA - Dubai Hi, Dubai');
    expect(result!.accountLast4).toBe('1234');
    expect(result!.balance).toBe(123123.12);
  });

  test('Credit Card payment receipt (confirmation) should not parse', () => {
    const result = parser.parse(
      'This is to confirm receipt of your payment of AED 123.00 towards your Credit Card starting with 123456  on 21/12/2024. Available limit is   AED 123,123.12.',
      'EI SMS', ts
    );
    expect(result).toBeNull();
  });

  test('ATM Withdrawal', () => {
    const result = parser.parse(
      'ATM Withdrawal\nDebit Card Ending: 1234\nFrom: ABU DHABI UAEAE, ABU DHABI\nAmount: AED 123.00\nDate: 21/12/2024, 20:12\nAvailable Balance: AED 123.12',
      'EI SMS', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(123);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('ATM Withdrawal: ABU DHABI UAEAE, ABU DHABI');
    expect(result!.accountLast4).toBe('1234');
    expect(result!.balance).toBe(123.12);
  });

  test('Online Banking Transfer', () => {
    const result = parser.parse(
      'Online Banking Transfer From Account: 123XXX12XXX12 Amount: AED 12,123.00 Date: 21/12/2024 20:12 Available Balance: AED 123,123.12',
      'EI SMS', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(12123);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('1212');
    expect(result!.balance).toBe(123123.12);
  });

  test('Telegraphic Transfer Received', () => {
    const result = parser.parse(
      'Telegraphic Transfer Received To Account: 123XXX12XXX12 Amount: AED 12.00 Date: 21/12/2024 00:12 Available Balance: AED 123,123.12',
      'EI SMS', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(12);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('1212');
    expect(result!.balance).toBe(123123.12);
  });

  test('Salary Deposited', () => {
    const result = parser.parse(
      'Salary Deposited Account: 123XXX12XXX12 Amount: AED 123,123.12 Date: 21/12/2024 22:44 Available Balance: AED 123,123.12',
      'EI SMS', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(123123.12);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('1212');
  });

  test('OTP message is not a transaction', () => {
    const result = parser.parse(
      'Your OTP for Emirates Islamic online banking is 123456. Do not share it with anyone.',
      'EI SMS', ts
    );
    expect(result).toBeNull();
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('EI SMS')).toBe(true);
    expect(parser.canHandle('EISMS')).toBe(true);
    expect(parser.canHandle('OTHER')).toBe(false);
    expect(parser.canHandle('EMIRATESNBD')).toBe(false);
    expect(parser.canHandle('ENBD')).toBe(false);
    expect(parser.canHandle('EI')).toBe(false);
  });

  test('Debit Card Purchase in USD (foreign currency)', () => {
    const result = parser.parse(
      'Debit Card Purchase\nCard Ending: 1111\nAt: AMAZON.COM, USA\nAmount: USD 50.00\nDate: 21/12/2024 20:18\nAvailable Balance: AED 12,123.12',
      'EI SMS', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50);
    expect(result!.currency).toBe('USD');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('AMAZON.COM, USA');
    expect(result!.accountLast4).toBe('1111');
    expect(result!.balance).toBe(12123.12);
  });

  test('Credit Card Purchase in EUR (foreign currency)', () => {
    const result = parser.parse(
      'Credit Card Purchase\nCard Ending: 1234\nAt: ZARA, MADRID\nAmount: EUR 20.00\nDate: 21/12/2024, 20:12\nAvailable Limit: AED 5,000.00',
      'EI SMS', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(20);
    expect(result!.currency).toBe('EUR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('ZARA, MADRID');
    expect(result!.accountLast4).toBe('1234');
    expect(result!.balance).toBe(5000);
  });

  test('Telegraphic Transfer Received in GBP (foreign currency)', () => {
    const result = parser.parse(
      'Telegraphic Transfer Received To Account: 123XXX12XXX12 Amount: GBP 100.00 Date: 21/12/2024 00:12 Available Balance: AED 123,123.12',
      'EI SMS', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(100);
    expect(result!.currency).toBe('GBP');
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.accountLast4).toBe('1212');
    expect(result!.balance).toBe(123123.12);
  });

  test('factory resolves Emirates Islamic', () => {
    const result = BankParserFactory.parse(
      'Debit Card Purchase\nCard Ending: 1111\nAt: talabat.com, DUBAI\nAmount: AED 12.34\nDate: 21/12/2024 20:18\nAvailable Balance: AED 12,123.12',
      'EI SMS', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(12.34);
    expect(result!.type).toBe(TransactionType.EXPENSE);
  });
});
