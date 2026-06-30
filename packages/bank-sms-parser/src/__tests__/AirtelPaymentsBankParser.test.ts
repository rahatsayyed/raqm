import { AirtelPaymentsBankParser } from '../banks/AirtelPaymentsBankParser';
import { TransactionType } from '../core/types';

const parser = new AirtelPaymentsBankParser();
const TS = 1750000000000;

describe('AirtelPaymentsBankParser', () => {
  test('canHandle returns true for AIRBNK senders', () => {
    expect(parser.canHandle('AIRBNK')).toBe(true);
    expect(parser.canHandle('AD-AIRBNK-S')).toBe(true);
  });

  test('canHandle returns false for other senders', () => {
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('AIRTEL')).toBe(false);
  });

  test('parses credited with pattern', () => {
    const sms = 'Airtel Payments Bank a/c is credited with Rs.20.00. Txn ID: 560992310006. Call 180023400 for help';
    const result = parser.parse(sms, 'AIRBNK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.amount).toBe(20);
    expect(result!.bankName).toBe('Airtel Payments Bank');
  });

  test('parses debited from pattern', () => {
    const sms = 'Rs. 5.00 debited from Airtel Payments Bank a/c Txn ID 987654321 Bal:15.56 Call 180023400 for help';
    const result = parser.parse(sms, 'AIRBNK', TS);
    expect(result).not.toBeNull();
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.amount).toBe(5);
    expect(result!.balance).toBe(15.56);
  });

  test('returns null for OTP', () => {
    const sms = 'Your Airtel Payments Bank OTP is 678901. Valid for 10 mins.';
    const result = parser.parse(sms, 'AIRBNK', TS);
    expect(result).toBeNull();
  });
});
