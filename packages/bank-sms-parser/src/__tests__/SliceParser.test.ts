import { SliceParser } from '../banks/SliceParser';
import { TransactionType } from '../core/types';

const parser = new SliceParser();
const ts = 1000000000000;

describe('SliceParser', () => {
  test('Modern Slice UPI transfer should be EXPENSE', () => {
    const result = parser.parse(
      'Sent Rs.500 to MERCHANT NAME (UPI transaction success). Sent from slice.',
      'JK-SLICEIT', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500);
    expect(result!.currency).toBe('INR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('MERCHANT NAME');
    expect(result!.accountLast4).toBeNull();
    // reference may be null or contain partial text depending on parser
  });

  test('Modern Slice debited (bank account)', () => {
    const result = parser.parse(
      'Rs.250 debited from your slice account via UPI. Txn ID 1234567890.',
      'AD-SLCEIT-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(250);
    expect(result!.type).toBe(TransactionType.EXPENSE);
  });

  test('Modern Slice paid via UPI (no card context) is EXPENSE', () => {
    const result = parser.parse(
      'Rs.100 paid to MERCHANT via slice UPI. Txn ID 9876543210.',
      'AD-SLCEIT-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(100);
    expect(result!.type).toBe(TransactionType.EXPENSE);
  });

  test('Legacy slice credit card transaction on amazon.in (CREDIT)', () => {
    const result = parser.parse(
      'Your slice credit card transaction of RS. 50000 on amazon.in is successful. If not you, call 08048329999 - slice',
      'AD-SLCEIT-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50000);
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('amazon.in');
  });

  test('Legacy slice credit card transaction with decimal amount (CREDIT)', () => {
    const result = parser.parse(
      'Your slice credit card transaction of RS. 1234.56 on flipkart.com is successful.',
      'AX-SLICEIT-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1234.56);
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('flipkart.com');
  });

  test("Slice card 'spent' wording with card context stays CREDIT", () => {
    const result = parser.parse(
      'Rs.350 spent on your slice credit card at MERCHANT. Available limit: Rs.10000.',
      'AD-SLCEIT-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(350);
    expect(result!.type).toBe(TransactionType.CREDIT);
  });

  test('Cashback credited to slice account (INCOME)', () => {
    const result = parser.parse(
      'Rs.1000 credited to your slice account as cashback.',
      'AD-SLCEIT-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('Slice Credit');
  });

  test('Non-transaction message (OTP) should not parse', () => {
    const result = parser.parse('Your OTP for slice transaction is 123456. Do not share.', 'AD-SLCEIT-S', ts);
    expect(result).toBeNull();
  });

  test('Declined transaction should NOT be parsed', () => {
    const result = parser.parse(
      'Your slice credit card transaction of RS. 50000 on amazon.in was declined.',
      'AD-SLCEIT-S', ts
    );
    expect(result).toBeNull();
  });

  test('Failed transaction should NOT be parsed', () => {
    const result = parser.parse(
      'Your slice credit card transaction of RS. 1234.56 on flipkart.com failed.',
      'AX-SLICEIT-S', ts
    );
    expect(result).toBeNull();
  });

  test('Unsuccessful transaction should NOT be parsed', () => {
    const result = parser.parse(
      'Your slice credit card transaction of RS. 50000 on amazon.in was unsuccessful.',
      'AD-SLCEIT-S', ts
    );
    expect(result).toBeNull();
  });

  test('Date phrase should not be extracted as merchant', () => {
    const result = parser.parse(
      'Your slice credit card transaction of RS. 50000 on Feb 15 is successful.',
      'AD-SLCEIT-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50000);
    expect(result!.type).toBe(TransactionType.CREDIT);
    // merchant extraction may vary — just verify no full date string is captured
    expect(result!.merchant).not.toContain('Feb 15');
  });

  describe('Slice SFB formats', () => {
    test('spent on credit card from SLCBNK sender', () => {
      const r = parser.parse(
        'Rs. 124 spent on your credit card xx1234 at Sample Merchant on 18-Jun-26 (UPI Ref: 100000000000). Not you? Call 080-0000-0000 - slice',
        'VA-SLCBNK-S', ts
      );
      expect(r!.amount).toBe(124);
      expect(r!.type).toBe(TransactionType.CREDIT);
      expect(r!.merchant).toBe('Sample Merchant');
      expect(r!.accountLast4).toBe('1234');
      expect(r!.reference).toBe('100000000000');
    });

    test('UPI debit names payee and keeps ref', () => {
      const r = parser.parse(
        'Rs. 100 sent from a/c xx2743 on 17-Jun-26 to Hussain Shaikh (UPI Ref: 616851070000). Not you? Call 08048329999 - slice',
        'slice', ts
      );
      expect(r!.type).toBe(TransactionType.EXPENSE);
      expect(r!.merchant).toBe('Hussain Shaikh');
      expect(r!.accountLast4).toBe('2743');
      expect(r!.reference).toBe('616851070000');
    });

    test('payee name containing request still parses', () => {
      const r = parser.parse(
        'Rs. 250 sent from a/c xx2743 on 17-Jun-26 to Request Foods (UPI Ref: 616851070099). Not you? Call 08048329999 - slice',
        'slice', ts
      );
      expect(r!.merchant).toBe('Request Foods');
      expect(r!.reference).toBe('616851070099');
    });

    test('UPI AutoPay paid', () => {
      const r = parser.parse(
        'Successfully paid Rs.1 from slice a/c XX2743 to OpenAI LLC on 25-May-26 via UPI AutoPay. UMN - 019e5exxxa1679b6aee8ae4f0ff88d19@slc - slice',
        'slice', ts
      );
      expect(r!.amount).toBe(1);
      expect(r!.type).toBe(TransactionType.EXPENSE);
      expect(r!.merchant).toBe('OpenAI LLC');
      expect(r!.accountLast4).toBe('2743');
    });

    test('UPI credit with balance', () => {
      const r = parser.parse(
        'Rs. 2,000 received in slice A/c xx2743 on 15-Jun-26 from NASIMUDDIN NAJAMUDDIN SHAIKH via UPI (Ref ID: 212756500000). Avl. Bal. Rs. 2,203.56 - slice',
        'slice', ts
      );
      expect(r!.amount).toBe(2000);
      expect(r!.type).toBe(TransactionType.INCOME);
      expect(r!.merchant).toBe('NASIMUDDIN NAJAMUDDIN SHAIKH');
      expect(r!.balance).toBe(2203.56);
      expect(r!.reference).toBe('212756500000');
    });

    test('card transaction success', () => {
      const r = parser.parse(
        'Your transaction of Rs. 2.07 at FamAppbyTriO from a/c xx2743 is successful. If not you, call 080-4832-9999 - slice',
        'slice', ts
      );
      expect(r!.amount).toBe(2.07);
      expect(r!.type).toBe(TransactionType.EXPENSE);
      expect(r!.merchant).toBe('FamAppbyTriO');
      expect(r!.accountLast4).toBe('2743');
      expect(r!.isFromCard).toBe(true);
    });

    test.each([
      '5738xx is your OTP for txn of Rs. INR 2.07 at FamApp by TriO on slice card ending with 2887. Do not share OTP for security reasons. - slice',
      'UPI AutoPay for OpenAI from slice a/c XX2743 for Rs. 1,999 is revoked. UMN - 019e5ebb3a1679b6aee8a0000ff88d19@slc - slice',
      'You have received a collect request of Rs. 500 from someone@slc on slice. Approve or decline in the app. - slice',
    ])('not a transaction: %s', (msg) => {
      expect(parser.parse(msg, 'slice', ts)).toBeNull();
    });
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('VA-SLCBNK-S')).toBe(true);
    expect(parser.canHandle('slice')).toBe(true);
    expect(parser.canHandle('AD-SLCEIT-S')).toBe(true);
    expect(parser.canHandle('AX-SLICEIT-S')).toBe(true);
    expect(parser.canHandle('JK-SLICEIT')).toBe(true);
    expect(parser.canHandle('SLICEIT')).toBe(true);
    expect(parser.canHandle('SLCEIT')).toBe(true);
    expect(parser.canHandle('HDFCBK')).toBe(false);
    expect(parser.canHandle('VK-JTEDGE-S')).toBe(false);
  });
});
