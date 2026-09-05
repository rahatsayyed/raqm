import { BankParserFactory } from '../BankParserFactory';
import { UPI_APP_PARSERS, BUILT_IN_NOTIFICATION_APPS } from '../apps';
import { UpiAppNotificationParser } from '../apps/UpiAppNotificationParser';
import { TransactionType } from '../core/types';

const GPAY = 'com.google.android.apps.nbu.paisa.user';
const PHONEPE = 'com.phonepe.app';
const PAYTM = 'net.one97.paytm';
const BHIM = 'in.org.npci.upiapp';
const ts = 1_757_000_000_000;

describe('UpiAppNotificationParser — debits', () => {
  test('GPay "₹500 paid to Swiggy"', () => {
    const r = BankParserFactory.parse('₹500 paid to Swiggy', GPAY, ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(500);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('Swiggy');
    expect(r!.bankName).toBe('Google Pay');
    expect(r!.sender).toBe(GPAY);
    expect(r!.currency).toBe('INR');
    expect(r!.accountLast4).toBeNull();
    expect(r!.timestamp).toBe(ts);
  });

  test('GPay "You paid ₹1,234.50 to Blue Tokai Coffee"', () => {
    const r = BankParserFactory.parse('You paid ₹1,234.50 to Blue Tokai Coffee', GPAY, ts);
    expect(r!.amount).toBe(1234.5);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('Blue Tokai Coffee');
  });

  test('PhonePe "Payment of ₹250 to Zomato is successful."', () => {
    const r = BankParserFactory.parse('Payment of ₹250 to Zomato is successful.', PHONEPE, ts);
    expect(r!.amount).toBe(250);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('Zomato');
    expect(r!.bankName).toBe('PhonePe');
  });

  test('Paytm "Paid Rs.99 to Airtel Prepaid"', () => {
    const r = BankParserFactory.parse('Paid Rs.99 to Airtel Prepaid', PAYTM, ts);
    expect(r!.amount).toBe(99);
    expect(r!.merchant).toBe('Airtel Prepaid');
    expect(r!.bankName).toBe('Paytm');
  });

  test('BHIM "₹75 sent to Kirana Store via UPI"', () => {
    const r = BankParserFactory.parse('₹75 sent to Kirana Store via UPI', BHIM, ts);
    expect(r!.amount).toBe(75);
    expect(r!.merchant).toBe('Kirana Store');
    expect(r!.bankName).toBe('BHIM');
  });
});

describe('UpiAppNotificationParser — credits', () => {
  test('GPay "₹2,000 received from Rahat Sayyed"', () => {
    const r = BankParserFactory.parse('₹2,000 received from Rahat Sayyed', GPAY, ts);
    expect(r!.amount).toBe(2000);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Rahat Sayyed');
  });

  test('PhonePe "You received ₹500 from Aisha."', () => {
    const r = BankParserFactory.parse('You received ₹500 from Aisha.', PHONEPE, ts);
    expect(r!.amount).toBe(500);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Aisha');
  });
});

describe('UpiAppNotificationParser — non-transactions', () => {
  test.each([
    ['GPay promo', '₹50 cashback offer just for you', GPAY],
    ['GPay reminder', 'Rahat is requesting ₹300', GPAY],
    ['PhonePe marketing', 'Recharge and win up to ₹1000', PHONEPE],
    ['empty text', '   ', PAYTM],
    ['no amount', 'Payment to Swiggy is successful', PHONEPE],
  ])('%s produces no transaction', (_label, body, pkg) => {
    expect(BankParserFactory.parse(body, pkg, ts)).toBeNull();
  });

  test('a package name never matches a real SMS sender ID, and vice versa', () => {
    expect(BankParserFactory.parse('₹500 paid to Swiggy', 'XX-NOTREAL-Z', ts)).toBeNull();
    const parsers = BankParserFactory.getParsers(GPAY);
    expect(parsers).toHaveLength(1);
    expect(parsers[0]).toBeInstanceOf(UpiAppNotificationParser);
  });
});

describe('registry', () => {
  test('every built-in app has exactly one registered parser', () => {
    for (const app of BUILT_IN_NOTIFICATION_APPS) {
      const found = BankParserFactory.getParsers(app.packageName);
      expect(found).toHaveLength(1);
      expect(found[0].getBankName()).toBe(app.appName);
    }
  });

  test('BUILT_IN_NOTIFICATION_APPS mirrors UPI_APP_PARSERS', () => {
    expect(BUILT_IN_NOTIFICATION_APPS.map((a) => a.packageName)).toEqual(
      UPI_APP_PARSERS.map((p) => p.getPackageName()),
    );
  });

  test('app display names do not collide with existing bank parser names', () => {
    for (const app of BUILT_IN_NOTIFICATION_APPS) {
      const byName = BankParserFactory.getParserByName(app.appName);
      expect(byName).toBeInstanceOf(UpiAppNotificationParser);
    }
  });
});
