import { PluxeeBankParser } from '../banks/PluxeeBankParser';
import { JanaSmallFinanceBankParser } from '../banks/JanaSmallFinanceBankParser';
import { NSDLPaymentsBankParser } from '../banks/NSDLPaymentsBankParser';
import { KeralaBankParser } from '../banks/KeralaBankParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const ts = 1000000000000;

describe('PluxeeBankParser', () => {
  const parser = new PluxeeBankParser();

  test('meal card spend', () => {
    const r = parser.parse(
      'Rs. 40.00 spent from Pluxee  Meal wallet, card no.xx1234 on 17-08-2026 16:03:14 at NEW SHAKTHI  . Avl bal Rs.24342.81. Not you call 1800000000',
      'AD-PLUXEE', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(40);
    expect(r!.currency).toBe('INR');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('NEW SHAKTHI');
    expect(r!.accountLast4).toBe('1234');
    expect(r!.balance).toBe(24342.81);
  });

  test('canHandle', () => {
    expect(parser.canHandle('AD-PLUXEE')).toBe(true);
    expect(parser.canHandle('JD-PLUXEE-S')).toBe(true);
    expect(parser.canHandle('HDFCBK')).toBe(false);
  });
});

describe('JanaSmallFinanceBankParser', () => {
  const parser = new JanaSmallFinanceBankParser();

  test('UPI credit from NPCI BHIM', () => {
    const r = parser.parse(
      'Dear Customer, Your acct XX005 is credited with INR 8.00 on 13-Jun-26 from NPCI BHIM. UPI Ref no 103475395201 . JANA SFB',
      'JM-JANABK-S', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(8);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('NPCI BHIM');
    expect(r!.reference).toBe('103475395201');
    expect(r!.accountLast4).toBe('005');
  });

  test('UPI debit keeps the VPA handle', () => {
    const r = parser.parse(
      'Dear Customer, Your acct XX005 is debited with INR 250.00 on 14-Jun-26 to merchant@okaxis. UPI Ref no 103475395202 . JANA SFB',
      'JM-JANABK-S', ts
    );
    expect(r!.amount).toBe(250);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('merchant');
    expect(r!.reference).toBe('103475395202');
  });

  test('canHandle', () => {
    expect(parser.canHandle('JM-JANABK-S')).toBe(true);
    expect(parser.canHandle('JANABK')).toBe(true);
    expect(parser.canHandle('AD-JANASFB-S')).toBe(true);
    expect(parser.canHandle('HDFC')).toBe(false);
    expect(parser.canHandle('NSDLPB')).toBe(false);
  });
});

describe('NSDLPaymentsBankParser', () => {
  const parser = new NSDLPaymentsBankParser();

  test('UPI debit', () => {
    const r = parser.parse(
      'A/c XX1234 debited Rs 1.00 on 20-Jun-26 for linked myupihandle@oksbi. UPI Ref 122345526539 - NSDLPB',
      'AD-NSDLPB-S', ts
    );
    expect(r!.amount).toBe(1);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('myupihandle');
    expect(r!.reference).toBe('122345526539');
    expect(r!.accountLast4).toBe('1234');
  });

  test('UPI credit has no merchant', () => {
    const r = parser.parse(
      'A/c no XX1234 is credited for Rs.100.00 on 20-Jun-26 (UPI Ref No 617109835321) - NSDLPB',
      'AD-NSDLPB-S', ts
    );
    expect(r!.amount).toBe(100);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBeNull();
    expect(r!.reference).toBe('617109835321');
    expect(r!.accountLast4).toBe('1234');
  });

  test('dotted VPA handle is not truncated', () => {
    const r = parser.parse(
      'A/c XX1234 debited Rs 50.00 on 20-Jun-26 for linked business.name@oksbi. UPI Ref 122345526540 - NSDLPB',
      'VM-NSDLPB-S', ts
    );
    expect(r!.merchant).toBe('business.name');
  });

  test('canHandle', () => {
    expect(parser.canHandle('NSDLPB')).toBe(true);
    expect(parser.canHandle('VM-NSDLPB-S')).toBe(true);
    expect(parser.canHandle('JIOPBS')).toBe(false);
    expect(parser.canHandle('HDFC')).toBe(false);
  });
});

describe('KeralaBankParser', () => {
  const parser = new KeralaBankParser();

  test('loan recovery credit with negative balance', () => {
    const r = parser.parse(
      'Dear Customer Your A/c no XXXX0024 is credited with 15000.00 on 06-06-2026 by Loan Recovery From : 139451061. Balance is -579822.00 - Kerala Bank',
      'VM-KELBNK-S', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(15000);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Loan Recovery');
    expect(r!.accountLast4).toBe('0024');
    expect(r!.balance).toBe(-579822);
  });

  test('canHandle', () => {
    expect(parser.canHandle('KELBNK')).toBe(true);
    expect(parser.canHandle('VM-KELBNK-S')).toBe(true);
    expect(parser.canHandle('KGBANK')).toBe(false);
    expect(parser.canHandle('HDFC')).toBe(false);
  });
});

describe('factory routing for ported India banks', () => {
  test.each([
    ['AD-PLUXEE', 'Pluxee'],
    ['JM-JANABK-S', 'Jana Small Finance Bank'],
    ['AD-NSDLPB-S', 'NSDL Payments Bank'],
    ['VM-KELBNK-S', 'Kerala Bank'],
  ])('%s routes to %s', (sender, bankName) => {
    expect(BankParserFactory.getParser(sender)?.getBankName()).toBe(bankName);
  });
});
