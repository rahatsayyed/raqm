import { HDFCBankParser } from '../banks/HDFCBankParser';
import { TransactionType } from '../core/types';

const parser = new HDFCBankParser();
const TS = 1750000000000;

describe('HDFCBankParser', () => {
  test('canHandle returns true for HDFCBK', () => {
    expect(parser.canHandle('HDFCBK')).toBe(true);
    expect(parser.canHandle('HDFCBANK')).toBe(true);
    expect(parser.canHandle('HDFC')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('ICICIB')).toBe(false);
    expect(parser.canHandle('SBIBK')).toBe(false);
  });

  test('parses UPI debit via Info: pattern', () => {
    const sms = 'Rs.500.00 debited from a/c **1234 on 20-06-26. Info: UPI-Swiggy. Avl Bal: Rs.10,000.00';
    const result = parser.parse(sms, 'HDFCBK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(500);
    expect(result!.balance).toBe(10000);
    expect(result!.bankName).toBe('HDFC Bank');
  });

  test('parses credit (deposited) transaction', () => {
    const sms = 'Rs.15,000.00 deposited to a/c **1234 on 20-06-26. Info: SALARY-ACME Corp. Avl Bal: Rs.25,000.00';
    const result = parser.parse(sms, 'HDFCBK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(15000);
  });

  test('parses credited transaction', () => {
    const sms = 'Rs.1,200.00 credited to a/c **1234 on 20-06-26 from VPA john@upi (UPI 123456789012). Avl Bal: Rs.12,000.00';
    const result = parser.parse(sms, 'HDFCBK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(1200);
  });

  test('returns null for OTP SMS', () => {
    const sms = 'Your OTP for HDFC Bank transaction is 123456. Do not share with anyone.';
    const result = parser.parse(sms, 'HDFCBK', TS);
    expect(result).toBeNull();
  });

  test('returns null for payment request SMS', () => {
    const sms = 'Someone has requested Rs.500 from your HDFC Bank account. To pay, download HDFC Bank app.';
    const result = parser.parse(sms, 'HDFCBK', TS);
    expect(result).toBeNull();
  });

  test('parses card debit transaction with Avl bal:INR format', () => {
    const sms = 'Spent Rs.2,500.00 From HDFC Bank Card 1234 At Amazon On 20-Jun-2026. Avl bal:INR 8,500.00';
    const result = parser.parse(sms, 'HDFCBK', TS);
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(2500);
    expect(result!.balance).toBe(8500);
  });
});

describe('HDFCBankParser reversals and NetBanking', () => {
  test('credit card reversal is income with merchant from By clause', () => {
    const r = parser.parse(
      'Transaction Reversed!On HDFC Bank CREDIT Card 1234 for Rs.499.00 By AMAZON        000 On 2026-08-21:10:10:10',
      'VM-HDFCBK-S', TS
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(499);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('AMAZON');
    expect(r!.accountLast4).toBe('1234');
  });

  test('NetBanking transfer names the payee', () => {
    const r = parser.parse(
      'Rs.1500.00 debited from HDFC Bank A/c XX1234 on 01-Aug-26 to RENT PAYMENT via HDFC Bank NetBanking. Avl bal:INR 5000.00',
      'VM-HDFCBK-S', TS
    );
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('RENT PAYMENT');
  });
});
