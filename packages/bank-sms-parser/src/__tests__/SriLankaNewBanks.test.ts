import { NDBBankParser } from '../banks/NDBBankParser';
import { NationsTrustBankParser } from '../banks/NationsTrustBankParser';
import { NationalSavingsBankParser } from '../banks/NationalSavingsBankParser';
import { TransactionType } from '../core/types';

const ts = 1000000000000;

describe('NDBBankParser', () => {
  const parser = new NDBBankParser();

  test('POS debit', () => {
    const r = parser.parse(
      'LKR 12,724.00 debited from AC XXXXXXXX1234 as POS TXN on 30 Jul 2026 22:28 at MERCHANT NAME CITY. Avl Bal 2,582.08 Call 94112448888 for info',
      'NDB ALERT', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(12724);
    expect(r!.currency).toBe('LKR');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('MERCHANT NAME CITY');
    expect(r!.accountLast4).toBe('1234');
    expect(r!.balance).toBe(2582.08);
    expect(r!.reference).toBeNull();
  });

  test('CEFTS inward transfer with odd balance grouping', () => {
    const r = parser.parse(
      'LKR 60,076.25 credited to AC XXXXXXXX1234 on 02 Jul 2026 21:53 as CEFTS Inward Transfer. Avl Bal 1,789,349.08 Call 94112448888 for info',
      'NDBALERT', ts
    );
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('CEFTS Inward Transfer');
    expect(r!.balance).toBe(1789349.08);
  });

  test('CEFTS outward transfer', () => {
    const r = parser.parse(
      'LKR 50,000.00 debited from AC XXXXXXXX1234 on 02 Jul 2026 15:52 as CEFTS Outward Transfer. Avl Bal 1,527,72.83 Call 94112448888 for info',
      'NDB-ALERT', ts
    );
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.amount).toBe(50000);
    expect(r!.balance).toBe(152772.83);
  });

  test('canHandle exact only', () => {
    expect(parser.canHandle('NDB ALERT')).toBe(true);
    expect(parser.canHandle('NDB')).toBe(true);
    expect(parser.canHandle('INDBNK')).toBe(false);
  });

  test('non-transaction returns null', () => {
    expect(parser.parse('Your OTP is 123456', 'NDB ALERT', ts)).toBeNull();
    expect(parser.parse('Visit NDB for new loan offers', 'NDB ALERT', ts)).toBeNull();
  });
});

describe('NationsTrustBankParser', () => {
  const parser = new NationsTrustBankParser();

  test('card purchase', () => {
    const r = parser.parse(
      'Transaction Approved on your Card 123456******1234 for LKR 500.00 at BILL PAYMENT VIA NATIONS Available Bal LKR 12345.73  Call 0114315315 for any inquiry.',
      'NationsSMS', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(500);
    expect(r!.currency).toBe('LKR');
    expect(r!.type).toBe(TransactionType.CREDIT);
    expect(r!.merchant).toBe('BILL PAYMENT VIA NATIONS');
    expect(r!.accountLast4).toBe('1234');
    expect(r!.balance).toBe(12345.73);
  });

  test('canHandle', () => {
    expect(parser.canHandle('NationsSMS')).toBe(true);
    expect(parser.canHandle('NSB')).toBe(false);
  });

  test('bill settlement and OTP are skipped', () => {
    expect(parser.parse('Your payment of LKR 57,018.67 made to Card # 123456*****1234 on 01/07/2026', 'NationsSMS', ts)).toBeNull();
    expect(parser.parse('OTP 123456 for Transaction Approved on your Card', 'NationsSMS', ts)).toBeNull();
  });
});

describe('NationalSavingsBankParser', () => {
  const parser = new NationalSavingsBankParser();

  test('credit', () => {
    const r = parser.parse(
      'Dear MR TEST,LKR 10,000.00 Credited to your A/c XXXXXXXX1234 on 01/07/2026 at 10:15. AvlBal LKR 12,653.61.Transaction CEFT Inward Transfer Deposit.Thank you for banking with us.Call Centre 1972.',
      'NSB', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(10000);
    expect(r!.currency).toBe('LKR');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('CEFT Inward Transfer Deposit');
    expect(r!.accountLast4).toBe('1234');
    expect(r!.balance).toBe(12653.61);
  });

  test('POS debit', () => {
    const r = parser.parse(
      'Dear MR TEST,LKR 3,216.00 Debited from your A/c XXXXXXXX1234 on 01/07/2026 at 10:15. AvlBal LKR 9,437.61. @ Wetara Pharamcy & Groc Polgasowita. ATM POS Transaction.Thank you for banking with us.Call Centre 1972.',
      'AD-NSB', ts
    );
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.amount).toBe(3216);
    expect(r!.merchant).toBe('Wetara Pharamcy & Groc Polgasowita');
  });

  test('canHandle', () => {
    expect(parser.canHandle('NSB')).toBe(true);
    expect(parser.canHandle('AD-NSB')).toBe(true);
    expect(parser.canHandle('AD-NSB-S')).toBe(true);
    expect(parser.canHandle('NSBX')).toBe(false);
  });

  test('non-transaction returns null', () => {
    expect(parser.parse('Your OTP is 123456', 'NSB', ts)).toBeNull();
    expect(parser.parse('Thank you for banking with us', 'NSB', ts)).toBeNull();
  });
});
