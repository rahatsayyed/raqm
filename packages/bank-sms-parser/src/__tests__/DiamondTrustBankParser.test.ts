import { DiamondTrustBankParser } from '../banks/DiamondTrustBankParser';
import { TransactionType } from '../core/types';

const parser = new DiamondTrustBankParser();
const ts = 1000000000000;

describe('DiamondTrustBankParser', () => {
  test('TIPS outgoing success', () => {
    const r = parser.parse(
      'Dear JOHN DOE, TIPS transaction of TZS 120000.00 from XXXXXXX to 07XXXXXXXX has been successfully processed Ref 52950397 Diamond Trust Bank',
      'DTB', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(120000);
    expect(r!.currency).toBe('TZS');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('TIPS Transfer');
    expect(r!.reference).toBe('52950397');
    expect(r!.isFromCard).toBe(false);
  });

  test('ALERT debit for mobile banking charges', () => {
    const r = parser.parse(
      'ALERT: Your account no. XXXXXXX has been debited with TZS 1000 for MOBILE BANKING TXN CHARGES on 22/06/2026.Thank you. Diamond Trust Bank',
      'DTB', ts
    );
    expect(r!.amount).toBe(1000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('Mobile Banking Txn Charges');
    expect(r!.isFromCard).toBe(false);
  });

  test('ALERT credit for internal funds transfer', () => {
    const r = parser.parse(
      'ALERT: Your account no. XXXXXXX has been credited with TZS 500000 for ONLINE INTERNAL FUNDS TRANSFER on 22/06/2026.Thank you. Diamond Trust Bank',
      'DTB', ts
    );
    expect(r!.amount).toBe(500000);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Online Internal Funds Transfer');
  });

  test('POS transaction is a card transaction', () => {
    const r = parser.parse(
      'ALERT: Your account no. XXXXXXX has been debited with TZS 49900 for POS TRANSACTION on 22/06/2026.Thank you. Diamond Trust Bank',
      'DTB', ts
    );
    expect(r!.amount).toBe(49900);
    expect(r!.merchant).toBe('Pos Transaction');
    expect(r!.isFromCard).toBe(true);
  });

  test('ATM cash withdrawal is a card transaction', () => {
    const r = parser.parse(
      'ALERT: Your account no. XXXXXXX has been debited with TZS 180000 for ATM CASH WITHDRAWAL on 06/10/2025.Thank you. Diamond Trust Bank',
      'DTB', ts
    );
    expect(r!.amount).toBe(180000);
    expect(r!.merchant).toBe('Atm Cash Withdrawal');
    expect(r!.isFromCard).toBe(true);
  });

  test('standing instruction is not a card transaction', () => {
    const r = parser.parse(
      'ALERT: Your account no. XXXXXXX has been debited with TZS 100000 for STANDING INSTRUCTION on 10/06/2026.Thank you. Diamond Trust Bank',
      'DTB', ts
    );
    expect(r!.merchant).toBe('Standing Instruction');
    expect(r!.isFromCard).toBe(false);
  });

  test('LUKU token uses TOTAL line', () => {
    const r = parser.parse(
      'LUKU\nMETER OWNER NAME\nMeter XXXXXXXXXXX\nReceipt 9006261721549334171\nUnits 56.1kWh\nToken 5376 9223 7930 4023 8001\nCOST TZS 16,393.45\nVAT 18% TZS 2,950.81\nEWURA 1% TZS 163.93\nREA 3% TZS 491.81\nTRANS FEE TZS 0.00\nTOTAL TZS 20,000\nReference 1764992079 Diamond Trust Bank',
      'DTB', ts
    );
    expect(r!.amount).toBe(20000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('LUKU');
    expect(r!.reference).toBe('1764992079');
    expect(r!.isFromCard).toBe(false);
  });

  test.each([
    'Dear JOHN DOE, your Instant Payment transfer request for TZS 120,000.00 from XXXXXXX to 07XXXXXXXX, has been received successfully and is being processed. Ref No: 52950397.Thank you.Diamond Trust Bank',
    'Dear Customer your TANQR transaction is successfully processed on 2026-06-21 10:11:56 Ref: 52942040 Diamond Trust Bank',
    'Dear Customer your GEPG transaction is successfully processed on 2026-06-21 05:43:13 Ref: 52938931 Diamond Trust Bank',
  ])('not parsed: %s', (msg) => {
    expect(parser.parse(msg, 'DTB', ts)).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('DTB')).toBe(true);
    expect(parser.canHandle('AB-DTB-S')).toBe(true);
    expect(parser.canHandle('HDFC')).toBe(false);
    expect(parser.canHandle('')).toBe(false);
  });
});
