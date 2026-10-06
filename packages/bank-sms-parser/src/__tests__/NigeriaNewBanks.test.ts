import { GTBankParser } from '../banks/GTBankParser';
import { StandardCharteredNigeriaParser } from '../banks/StandardCharteredNigeriaParser';
import { VFDBankParser } from '../banks/VFDBankParser';
import { MoniepointParser } from '../banks/MoniepointParser';
import { TransactionType } from '../core/types';

const ts = 1000000000000;

describe('GTBankParser', () => {
  const parser = new GTBankParser();

  test('debit alert', () => {
    const r = parser.parse(
      'Acct:******4321\nAmt:NGN15,000.00 DR\nDesc:OUTWARD TRANSFER TO OPAY - JANE DOE\nBal:NGN20,000.00\nDate:2026-01-15 9:36AM',
      'GTBank', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(15000);
    expect(r!.currency).toBe('NGN');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('OUTWARD TRANSFER TO OPAY - JANE DOE');
    expect(r!.accountLast4).toBe('4321');
    expect(r!.balance).toBe(20000);
    expect(r!.bankName).toBe('GTBank');
  });

  test('credit alert', () => {
    const r = parser.parse('Acct:******4321\nAmt:NGN2,500.50 CR\nDesc:Transfer from JOHN\nBal:NGN22,500.50', 'GTBANK', ts);
    expect(r!.amount).toBe(2500.5);
    expect(r!.type).toBe(TransactionType.INCOME);
  });

  test('empty Desc line does not capture next line', () => {
    const r = parser.parse('Acct:******4321\nAmt:NGN100.00 DR\nDesc:\nBal:NGN20,000.00', 'GTBank', ts);
    expect(r).not.toBeNull();
    expect(r!.merchant).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('GTBank')).toBe(true);
    expect(parser.canHandle('Guaranty Trust')).toBe(true);
    expect(parser.canHandle('HDFCBK')).toBe(false);
  });

  test('rejects OTP and non-alerts', () => {
    expect(parser.parse('Your OTP is 123456 Amt:NGN100 DR', 'GTBank', ts)).toBeNull();
    expect(parser.parse('Enjoy our new offers today', 'GTBank', ts)).toBeNull();
  });
});

describe('StandardCharteredNigeriaParser', () => {
  const parser = new StandardCharteredNigeriaParser();

  test('credit alert', () => {
    const r = parser.parse(
      'Credit Alert! Acct:xxxxxx1234, Amt:NGN1000.00, Desc:Salary, March, Date:2026-01-15, Bal:NGN1500000.00',
      'StanChart', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(1000);
    expect(r!.currency).toBe('NGN');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Salary, March');
    expect(r!.accountLast4).toBe('1234');
    expect(r!.balance).toBe(1500000);
  });

  test('debit alert', () => {
    const r = parser.parse('Debit Alert! Acct:xxxxxx1234, Amt:NGN2,000.00, Desc:ATM, Date:2026-01-15, Bal:NGN500.00', 'SCBANK', ts);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.amount).toBe(2000);
  });

  test('canHandle and rejections', () => {
    expect(parser.canHandle('SCBANK')).toBe(true);
    expect(parser.canHandle('StanChart')).toBe(true);
    expect(parser.canHandle('GTBank')).toBe(false);
    expect(parser.parse('Your OTP is 123456', 'SCBANK', ts)).toBeNull();
    expect(parser.parse('Debit Alert! Acct:xxxxxx1234, Amt:INR 100', 'SCBANK', ts)).toBeNull();
  });
});

describe('VFDBankParser', () => {
  const parser = new VFDBankParser();

  test('debit with fee line', () => {
    const r = parser.parse(
      'Acct: xxx901\nAmt: N11,000.00 DR\nDate: 15-JAN-2026 21:53:32\nChgs: N25.00 (COMM VAT)\nDesc: Fruits/ To JANE DOE\nBalance:N30,000.00',
      'VFD', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(11000);
    expect(r!.currency).toBe('NGN');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('Fruits/ To JANE DOE');
    expect(r!.accountLast4).toBe('901');
    expect(r!.balance).toBe(30000);
  });

  test('credit', () => {
    const r = parser.parse('Acct: xxx901\nAmt: N500.00 CR\nDesc: Refund\nBalance:N2,341.81', 'VFDMFB', ts);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.amount).toBe(500);
    expect(r!.balance).toBe(2341.81);
  });

  test('canHandle and rejections', () => {
    expect(parser.canHandle('VFD')).toBe(true);
    expect(parser.canHandle('GTBank')).toBe(false);
    expect(parser.parse('OTP 1234 Amt: N5.00 DR', 'VFD', ts)).toBeNull();
    expect(parser.parse('Welcome to VFD', 'VFD', ts)).toBeNull();
  });
});

describe('MoniepointParser', () => {
  const parser = new MoniepointParser();

  test('credit alert', () => {
    const r = parser.parse(
      'CREDIT ALERT\n\nAcc: 512****904 (Personal)\nAmt: NGN1,000.00\nBal: NGN5,000.00\nDate: 15/01/26\nTime: 03:09 PM\nDesc: Transfer from JANE DOE',
      'Moniepoint', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(1000);
    expect(r!.currency).toBe('NGN');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Transfer from JANE DOE');
    expect(r!.accountLast4).toBe('2904');
    expect(r!.balance).toBe(5000);
  });

  test('debit alert', () => {
    const r = parser.parse('DEBIT ALERT\n\nAcc: 512****904 (Business)\nAmt: NGN250.00\nBal: NGN4,750.00\nDesc: Airtime', 'Moniepoint', ts);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.amount).toBe(250);
  });

  test('canHandle and rejections', () => {
    expect(parser.canHandle('Moniepoint')).toBe(true);
    expect(parser.canHandle('Monnify')).toBe(true);
    expect(parser.canHandle('GTBank')).toBe(false);
    expect(parser.parse('Your OTP is 123456', 'Moniepoint', ts)).toBeNull();
    expect(parser.parse('Download our app', 'Moniepoint', ts)).toBeNull();
  });
});
