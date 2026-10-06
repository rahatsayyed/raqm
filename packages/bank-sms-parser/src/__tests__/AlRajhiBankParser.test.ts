import { AlRajhiBankParser } from '../banks/AlRajhiBankParser';
import { TransactionType } from '../core/types';

const parser = new AlRajhiBankParser();
const ts = 1000000000000;

describe('AlRajhiBankParser', () => {
  test('English PoS purchase', () => {
    const r = parser.parse('PoS Purchase\nBy:1234567890;mada\nAmount:SR 4.50\nAt:170658 TEST SHOP\n10/7/26 10:00', 'AlRajhiBank', ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(4.5);
    expect(r!.currency).toBe('SAR');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('TEST SHOP');
    expect(r!.accountLast4).toBe('7890');
    expect(r!.isFromCard).toBe(true);
  });

  test('Arabic purchase', () => {
    const r = parser.parse('شراء\nبـSAR 5.75\nلـTEST MERCHANT\n12/07/26', 'AlRajhiBank', ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(5.75);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('TEST MERCHANT');
  });

  test('Arabic purchase with spaced SR amount', () => {
    const r = parser.parse('شراء\nبـ: SR 12.00\nلـTEST MERCHANT\n', 'AlRajhiBank', ts);
    expect(r!.amount).toBe(12);
  });

  test('incoming local transfer', () => {
    const r = parser.parse('حوالة محلية واردة\nمبلغ:SAR 7714.80\nمن:TEST SENDER\n12/07/26', 'AlRajhiBank', ts);
    expect(r!.amount).toBe(7714.8);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('TEST SENDER');
  });

  test('current balance line', () => {
    const r = parser.parse('شراء\nبـSAR 5\nلـTEST MERCHANT\nرصيد: 1.55 SR', 'AlRajhiBank', ts);
    expect(r!.balance).toBe(1.55);
  });

  test('English refund with labelled amount and merchant', () => {
    const r = parser.parse('Purchase Refund\nAmount: SR 30.00\nAt: TEST SHOP\n', 'AlRajhiBank', ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(30);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('TEST SHOP');
  });

  test('cashback is income', () => {
    const r = parser.parse('Cashback\nAmount: 12.50 SAR\nAt: TEST SHOP\n', 'AlRajhiBank', ts);
    expect(r!.amount).toBe(12.5);
    expect(r!.type).toBe(TransactionType.INCOME);
  });

  test('declined and OTP are rejected', () => {
    expect(parser.parse('PoS Purchase\nAmount:SR 4.50\nAt:TEST SHOP\nDeclined', 'AlRajhiBank', ts)).toBeNull();
    expect(parser.parse('رمز التحقق 123456 SAR', 'AlRajhiBank', ts)).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('AlRajhiBank')).toBe(true);
    expect(parser.canHandle('الراجحي')).toBe(true);
    expect(parser.canHandle('STC')).toBe(false);
  });
});
