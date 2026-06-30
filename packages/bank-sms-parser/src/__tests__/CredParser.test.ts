import { CredParser } from '../banks/CredParser';
import { TransactionType } from '../core/types';

const parser = new CredParser();
const ts = 1000000000000;

describe('CredParser', () => {
  test('CRED payment to ICICI credit card', () => {
    const result = parser.parse(
      'Payment of Rs.50000 has been successfully credited towards your ICICI Bank Credit Card. Your payment was settled in 3 seconds - CRED',
      'JK-CREDIN-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50000);
    expect(result!.currency).toBe('INR');
    expect(result!.type).toBe(TransactionType.TRANSFER);
    expect(result!.merchant).toBe('ICICI Bank Credit Card');
    expect(result!.accountLast4).toBeNull();
    expect(result!.reference).toBeNull();
  });

  test('CRED payment with decimal amount', () => {
    const result = parser.parse(
      'Payment of Rs.1234.56 has been successfully credited towards your HDFC Credit Card. Your payment was settled in 3 seconds - CRED',
      'AX-CREDIN-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1234.56);
    expect(result!.type).toBe(TransactionType.TRANSFER);
    expect(result!.merchant).toBe('HDFC Credit Card');
  });

  test('CRED payment with comma-formatted amount', () => {
    const result = parser.parse(
      'Payment of Rs.50,000 has been successfully credited towards your ICICI Bank Credit Card. Your payment was settled in 3 seconds - CRED',
      'JK-CREDIN-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50000);
    expect(result!.type).toBe(TransactionType.TRANSFER);
    expect(result!.merchant).toBe('ICICI Bank Credit Card');
  });

  test('CRED sender CRED-S pattern', () => {
    const result = parser.parse(
      'Payment of Rs.10000 has been successfully credited towards your SBI Credit Card.',
      'AD-CRED-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(10000);
    expect(result!.type).toBe(TransactionType.TRANSFER);
    expect(result!.merchant).toBe('SBI Credit Card');
  });

  test('CRED sender CRED-T pattern', () => {
    const result = parser.parse(
      'Payment of Rs.5000 has been successfully credited towards your HDFC Credit Card.',
      'AX-CRED-T', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(5000);
    expect(result!.type).toBe(TransactionType.TRANSFER);
    expect(result!.merchant).toBe('HDFC Credit Card');
  });

  test('Non-CRED message (OTP should not parse)', () => {
    const result = parser.parse('Your OTP for transaction is 123456. Do not share.', 'JK-CREDIN-S', ts);
    expect(result).toBeNull();
  });

  test('Failed CRED payment should not parse', () => {
    const result = parser.parse('Payment of Rs.50000 could not be processed. Please try again later.', 'JK-CREDIN-S', ts);
    expect(result).toBeNull();
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('JK-CREDIN-S')).toBe(true);
    expect(parser.canHandle('AX-CREDIN-S')).toBe(true);
    expect(parser.canHandle('CREDIN')).toBe(true);
    expect(parser.canHandle('CRED')).toBe(true);
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('VK-JTEDGE-S')).toBe(false);
  });
});
