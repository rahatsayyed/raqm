import { ApolloParser } from '../banks/ApolloParser';
import { AwashBankParser } from '../banks/AwashBankParser';
import { BankOfAbyssiniaParser } from '../banks/BankOfAbyssiniaParser';
import { ZamZamBankParser } from '../banks/ZamZamBankParser';
import { SiketBankParser } from '../banks/SiketBankParser';
import { TransactionType } from '../core/types';

const ts = 1000000000000;

describe('BankOfAbyssiniaParser', () => {
  const parser = new BankOfAbyssiniaParser();

  test('credit', () => {
    const r = parser.parse(
      'Dear TEST USER, your account 1*34 was credited with ETB 10,000.00 by SENDER NAME. Available Balance: ETB 10,276.49. Receipt: https://example.com/r/1 For help, call 8397. Bank of Abyssinia.',
      'BOA', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(10000);
    expect(r!.currency).toBe('ETB');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('SENDER NAME');
    expect(r!.accountLast4).toBe('134');
    expect(r!.balance).toBe(10276.49);
  });

  test('debit', () => {
    const r = parser.parse(
      'Dear TEST USER, your account 1*34 was debited with ETB 6,030.63. Available Balance: ETB 4,245.86. Receipt: https://example.com/r/2 Bank of Abyssinia.',
      'AB-BOA-S', ts
    );
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.amount).toBe(6030.63);
    expect(r!.balance).toBe(4245.86);
  });

  test('canHandle and rejections', () => {
    expect(parser.canHandle('BOA')).toBe(true);
    expect(parser.canHandle('Abyssinia')).toBe(true);
    expect(parser.canHandle('APOLLO')).toBe(false);
    expect(parser.parse('Your OTP is 123456', 'BOA', ts)).toBeNull();
  });
});

describe('ApolloParser', () => {
  const parser = new ApolloParser();

  test('credit', () => {
    const r = parser.parse(
      'Dear TEST USER, your account 1*34 was credited with ETB 550.00 by SENDER NAME. Available Balance: ETB 12,357.73. Receipt: https://example.com/r/1 For help, call 8397.',
      'apollo', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(550);
    expect(r!.currency).toBe('ETB');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('SENDER NAME');
    expect(r!.accountLast4).toBeNull();
    expect(r!.balance).toBe(12357.73);
  });

  test('debit', () => {
    const r = parser.parse(
      'Dear TEST USER, your account 1*34 was debited with ETB 7,000.00. Available Balance: ETB 5,595.43. Receipt: https://example.com/r/2',
      'AB-APOLLO-S', ts
    );
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.amount).toBe(7000);
    expect(r!.merchant).toBeNull();
  });

  test('canHandle and rejections', () => {
    expect(parser.canHandle('Apollo')).toBe(true);
    expect(parser.canHandle('BOA')).toBe(false);
    expect(parser.parse('Your OTP is 123456 ETB 100', 'APOLLO', ts)).toBeNull();
  });
});

describe('AwashBankParser', () => {
  const parser = new AwashBankParser();

  test('credit', () => {
    const r = parser.parse(
      'ETB 200 has been credited to your account from TEST PERSON on: 01/07/2026 with Txn ID: 123456789. Your available balance is now ETB 12,269.09.',
      'AWASH BANK', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(200);
    expect(r!.currency).toBe('ETB');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('TEST PERSON');
    expect(r!.reference).toBe('123456789');
    expect(r!.balance).toBe(12269.09);
  });

  test('telebirr transfer ignores charge and VAT', () => {
    const r = parser.parse(
      'Telebirr Transfer of 30,000.00 ETB to TEST PERSON - 251900000000 from 0123456789012/BANK, on 01/07/2026. Charge 5.00 VAT: 0.75. Your Balance is ETB 10,151.17.',
      'AWASH', ts
    );
    expect(r!.amount).toBe(30000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('TEST PERSON');
    expect(r!.accountLast4).toBe('9012');
    expect(r!.balance).toBe(10151.17);
  });

  test('bank transfer without ETB prefix on balance', () => {
    const r = parser.parse(
      'You have sent ETB 1,000 To (0123456789) - TEST PERSON by Transaction ID: ABC123 charge- 2.00 VAT- 0.30 on 01/07/2026. Your Available Balance is 11,818.92',
      'AB-AWASH-S', ts
    );
    expect(r!.amount).toBe(1000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('TEST PERSON');
    expect(r!.reference).toBe('ABC123');
    expect(r!.accountLast4).toBeNull();
    expect(r!.balance).toBe(11818.92);
  });

  test('canHandle and rejections', () => {
    expect(parser.canHandle('Awash Bank')).toBe(true);
    expect(parser.canHandle('Dashen')).toBe(false);
    expect(parser.parse('Your OTP is 123456', 'AWASH', ts)).toBeNull();
  });
});

describe('ZamZamBankParser', () => {
  const parser = new ZamZamBankParser();

  test('credit by name with whole amount', () => {
    const r = parser.parse(
      'Your account ****123456 has been credited by TEST PERSON with ETB 32000. Your current balance is ETB 45,000.50.',
      'ZamZam Bank', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(32000);
    expect(r!.currency).toBe('ETB');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('TEST PERSON');
    expect(r!.accountLast4).toBe('3456');
    expect(r!.balance).toBe(45000.5);
  });

  test('debit', () => {
    const r = parser.parse(
      'Your account ***123456 has been debited with ETB 1,200.00. Your current balance is ETB 800.00.',
      'AB-ZAMZAM-S', ts
    );
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.amount).toBe(1200);
    expect(r!.balance).toBe(800);
  });

  test('canHandle and rejections', () => {
    expect(parser.canHandle('ZAMZAM BANK')).toBe(true);
    expect(parser.canHandle('ZamZamBank')).toBe(true);
    expect(parser.canHandle('Siket')).toBe(false);
    expect(parser.parse('Your OTP is 123456', 'ZamZam Bank', ts)).toBeNull();
  });
});

describe('SiketBankParser', () => {
  const parser = new SiketBankParser();

  test('credit', () => {
    const r = parser.parse(
      'Dear Customer, Your Account 1****5678 has been Credited with ETB 30,000.00. Your Current Balance is ETB 31,000.00.',
      'Siket Bank', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(30000);
    expect(r!.currency).toBe('ETB');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.accountLast4).toBe('5678');
    expect(r!.balance).toBe(31000);
  });

  test('transfer to telebirr ignores charge and VAT', () => {
    const r = parser.parse(
      'Dear Customer, You have transferred ETB 10,012.00 from your account 1****5678 to telebirr account 251900000000 on 01/07/2026 with Reference number FT26001ABCDE. The Service Charge is ETB10.00 and VAT of ETB1.50. Your Current Balance is ETB 5,000.00.',
      'SIKET', ts
    );
    expect(r!.amount).toBe(10012);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('telebirr account 251900000000');
    expect(r!.reference).toBe('FT26001ABCDE');
    expect(r!.balance).toBe(5000);
  });

  test('canHandle and rejections', () => {
    expect(parser.canHandle('SIKET BANK')).toBe(true);
    expect(parser.canHandle('AB-SIKET-S')).toBe(true);
    expect(parser.canHandle('ZamZam')).toBe(false);
    expect(parser.parse('Your OTP is 123456', 'SIKET', ts)).toBeNull();
  });
});
