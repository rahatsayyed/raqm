import { STCBankParser } from '../banks/STCBankParser';
import { TransactionType } from '../core/types';

const parser = new STCBankParser();
const ts = 1000000000000;

describe('STCBankParser upstream sync', () => {
  test('SR amount alias', () => {
    const r = parser.parse('**0007 Purchase\nVia:0007\nAmount: 34.56 SR\nFrom: SYNTHETIC MERCHANT', 'STCBank', ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(34.56);
    expect(r!.currency).toBe('SAR');
    expect(r!.merchant).toBe('SYNTHETIC MERCHANT');
    expect(r!.accountLast4).toBe('0007');
  });

  test('flattened online purchase amount', () => {
    const r = parser.parse('Online Purchase Transaction Amount 45.67 SAR\nFrom: SYNTHETIC WALLET\nCard: *0007', 'STCBank', ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(45.67);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('SYNTHETIC WALLET');
    expect(r!.accountLast4).toBe('0007');
    expect(r!.isFromCard).toBe(true);
  });

  test('internal transfer direction', () => {
    const incoming = parser.parse('Internal transfer\nAmount: 56.78 SAR\nFrom: SYNTHETIC SENDER', 'STCBank', ts);
    expect(incoming!.type).toBe(TransactionType.INCOME);
    expect(incoming!.merchant).toBe('SYNTHETIC SENDER');
    const outgoing = parser.parse('Internal transfer\nAmount: 56.78 SAR\nTo: SYNTHETIC RECIPIENT', 'STCBank', ts);
    expect(outgoing!.type).toBe(TransactionType.EXPENSE);
    const unknown = parser.parse('Internal transfer\nAmount: 56.78 SAR', 'STCBank', ts);
    expect(unknown!.type).toBe(TransactionType.TRANSFER);
  });

  test('purchase reversal is income', () => {
    const r = parser.parse('Purchase Reversal\nAmount: 67.89 SAR\nFrom: SYNTHETIC MERCHANT', 'STCBank', ts);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.amount).toBe(67.89);
  });

  test('outward SARIE transfer is an expense', () => {
    const r = parser.parse('Outward SARIE Transfer\nAmount: 90.12 SAR\nTo: SYNTHETIC RECIPIENT', 'STCBank', ts);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('SYNTHETIC RECIPIENT');
  });

  test('wallet top-up is a transfer', () => {
    const r = parser.parse('Adding money to account\nAmount: 100 SAR', 'STCBank', ts);
    expect(r!.type).toBe(TransactionType.TRANSFER);
  });

  test.each([
    'Refund for previously declined purchase\nAmount: 13.45 SAR\nFrom: SYNTHETIC MERCHANT',
    'Refund for your previous purchase failed\nAmount: 24.68 SAR\nFrom: SYNTHETIC MERCHANT',
    'Reversal of the original transaction was declined\nAmount: 35.79 SAR\nFrom: SYNTHETIC MERCHANT',
    'Your previously declined refund\nAmount: 24.68 SAR\nFrom: SYNTHETIC MERCHANT',
    'Your previously failed reversal\nAmount: 35.79 SAR\nFrom: SYNTHETIC MERCHANT',
    'Refund was previously declined\nAmount: 46.80 SAR\nFrom: SYNTHETIC MERCHANT',
    'Refund declined earlier\nAmount: 24.68 SAR\nFrom: SYNTHETIC MERCHANT',
    'Reversal failed previously\nAmount: 35.79 SAR\nFrom: SYNTHETIC MERCHANT',
    'Refund transaction declined earlier\nAmount: 24.68 SAR\nFrom: SYNTHETIC MERCHANT',
    'Purchase Declined\nAmount: 89.01 SAR\nInsufficient balance',
    '<CODE> is your OTP\nFor: SYNTHETIC MERCHANT\nAmount: USD 0.0',
  ])('failed or security message is ignored: %s', (message) => {
    expect(parser.parse(message, 'STCBank', ts)).toBeNull();
  });

  test('generic STC telecom notice is ignored', () => {
    expect(parser.parse('Sawa recharge service credit\nAmount: 78.90 SAR\nCheck your Sawa balance', 'stc', ts)).toBeNull();
  });
});
