import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const ts = 1000000000000;

describe('SMS report regressions (via factory)', () => {
  test.each([
    ['Amex hyphenated One-Time Password', 'TX-MYAMEX-S', 'Your Amex SafeKey One-Time Password for INR 213.50, at X CORP- PAID FEATURES is 000000. Valid for 10 mins for Card ending  1111. Do not disclose it to anyone.'],
    ['Kotak card payment reminder', 'VM-KOTAKB-S', 'Payment of INR 1577 on Kotak Credit Card xx2222 is due on 13-07-26. Min due: INR 100. Tap to pay: https://example.invalid/pay Ignore if paid'],
    ['Axis auto-debit intimation', 'AD-AXISBK-S', 'INR 587.64 for Airtel Payments Bank Limited will be auto-debited via Axis Bank Card no. XXxxxx by 27-07-26. Please ensure sufficient limit/balance on your card/account to process the auto-debit. To deactivate the AutoPay facility for ID xxxxx, visit https://www.sihub.in/managesi/axisbank. TnC apply.'],
    ['IDFC ASBA blocking', 'AD-IDFCFB-S', 'Your ASBA application for AUGMONT is received and Application value of Rs 14972 is blocked in your registered Bank account on 25/08/2026.'],
    ['HDFC rewards e-voucher', 'TX-HDFCBK-S', 'Dear Customer, You have received Amazon Shopping E-voucher Rs.500/- from HDFC Bank My Rewards Redemption programme. Your E-Voucher [E-Voucher Code is XXXX-XXXXXX-XXX, Pin: , Valid till 02-Aug-2027 Value : INR 500.00] . For more details call 1800000000. HDFC Bank'],
  ])('%s is not a transaction', (_name, sender, message) => {
    expect(BankParserFactory.parse(message, sender, ts)).toBeNull();
  });

  test('buying a voucher is still an expense', () => {
    const r = BankParserFactory.parse(
      'Rs.500.00 debited from A/c XX1111 on 09-Aug-26 ' + 'to amazon evoucher (UPI Ref No 123456789012)',
      'TX-HDFCBK-S', ts
    );
    expect(r!.amount).toBe(500);
    expect(r!.type).toBe(TransactionType.EXPENSE);
  });

  test('ICICI sub-unit foreign amount', () => {
    const r = BankParserFactory.parse(
      'USD .28 spent using ICICI Bank Card XX3333 on 01-Jun-26 on GOOGLE*CLOUD PH. Avl Limit: INR 3,85,664.53. If not you, call 1800000000/SMS BLOCK 3333 to 1800000000.',
      'JM-ICICIT-S', ts
    );
    expect(r!.amount).toBe(0.28);
    expect(r!.currency).toBe('USD');
    expect(r!.type).toBe(TransactionType.CREDIT);
    expect(r!.merchant).toBe('GOOGLE*CLOUD PH');
    expect(r!.isFromCard).toBe(true);
  });

  test('BoB credit without leading digit takes credited amount, not balance', () => {
    const r = BankParserFactory.parse(
      'Rs..6 Credited to A/c ...4444 from:ACHCR/JIO FINANC. Total Bal:Rs.22976.31CR. Avlbl Amt:Rs.22976.31(26-08-2026 18:20:36) - Bank of Baroda',
      'VM-BOBTXN-S', ts
    );
    expect(r!.amount).toBe(0.6);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.balance).toBe(22976.31);
  });

  test('CUB transfer: credited a/c decides direction', () => {
    const r = BankParserFactory.parse(
      'Your a/c no. XXXXXXXX5555 is credited for Rs.5000.00 on 03-05-2026 and debited from a/c no. XXXXXXXX6666 (UPI Ref no 123456789012) -CUB',
      'JX-CUBANK-S', ts
    );
    expect(r!.amount).toBe(5000);
    expect(r!.type).toBe(TransactionType.INCOME);
  });

  test('Kotak NEFT credit names the sender and keeps the UTR', () => {
    const r = BankParserFactory.parse(
      'Rs. 5000 credited to your Kotak Bank a/c XX1111 via NEFT from beneficiary John Doe. UTR Ref. HDFCH00000000000',
      'VM-KOTAKB-S', ts
    );
    expect(r!.amount).toBe(5000);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('John Doe');
    expect(r!.reference).toBe('HDFCH00000000000');
    expect(r!.accountLast4).toBe('1111');
  });

  test('Kotak NEFT beneficiary keeps periods inside a name', () => {
    const r = BankParserFactory.parse(
      'Rs. 5000 credited to your Kotak Bank a/c XX1111 via NEFT from beneficiary Mr. John Doe. UTR Ref. HDFCH00000000000',
      'VM-KOTAKB-S', ts
    );
    expect(r!.merchant).toBe('Mr. John Doe');
    expect(r!.reference).toBe('HDFCH00000000000');
  });

  test('Slice NEFT credit keeps the ref, not the word No', () => {
    const r = BankParserFactory.parse(
      'Rs. 5000 received in a/c XX1111 from Person Name on 22-Sep-26 (NEFT Ref No. IDFB0000A0000000). - slice',
      'VM-SLICEIT-S', ts
    );
    expect(r!.amount).toBe(5000);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Person Name');
    expect(r!.reference).toBe('IDFB0000A0000000');
    expect(r!.accountLast4).toBe('1111');
  });

  test('Kotak card refund names the merchant', () => {
    const r = BankParserFactory.parse(
      'INR 500.00 from Amazon refunded to your Kotak Credit Card x5236',
      'VM-KOTAKB-S', ts
    );
    expect(r!.amount).toBe(500);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Amazon');
  });

  test('Huntington shortcode 446622', () => {
    const r = BankParserFactory.parse(
      'Huntington Heads Up. We processed an ATM withdrawal: $17.07 at TEST ATM. Acct CK1234 has a $500.00 bal (10/01/26 7:13 AM ET).',
      '446622', ts
    );
    expect(r!.bankName).toBe('Huntington Bank');
    expect(r!.amount).toBe(17.07);
    expect(r!.merchant).toBe('TEST ATM');
    expect(r!.accountLast4).toBe('1234');
    expect(r!.balance).toBe(500);
  });

  test('NFCU shortcode 21398', () => {
    const r = BankParserFactory.parse(
      'NFCU: Transaction for $231.72 was approved on credit card 1234 at TEST MERCHANT at 07:35 AM EDT on 09/25/26.Txt STOP to opt-out. Txt HELP for help.',
      '21398', ts
    );
    expect(r!.bankName).toBe('Navy Federal Credit Union');
    expect(r!.amount).toBe(231.72);
    expect(r!.isFromCard).toBe(true);
  });
});
