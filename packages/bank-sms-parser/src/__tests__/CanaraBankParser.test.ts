import { CanaraBankParser } from '../banks/CanaraBankParser';
import { TransactionType } from '../core/types';

const parser = new CanaraBankParser();
const ts = 1000000000000;

describe('CanaraBankParser', () => {
  test('RTGS MF redemption credit typed as INCOME', () => {
    const result = parser.parse(
      'An amount of INR 13,30,614.75 has been credited to XXXX6785 on 02/12/2025 towards RTGS by Sender AXIS MUTUAL FUND REDEMPTION PO, IFSC UTIB0000004, Sender A/c XXXX9108, AXIS BANK, MUMBAI BRANCH, UTR UTIBR72025120200011461, Total Avail. Bal INR 2679815.88- Canara Bank',
      'VA-CANBNK-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1330614.75);
    expect(result!.currency).toBe('INR');
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('AXIS MUTUAL FUND REDEMPTION PO');
    expect(result!.accountLast4).toBe('9108');
  });
});

describe('CanaraBankParser semicolon-terminated payee', () => {
  test('UPI payee stops at ; UPI', () => {
    const r = parser.parse(
      'Rs.23.00 paid thru A/C XX1234 on 08-8-25 16:41:00 to BMTC BUS KA57F6; UPI Ref 123456789012. -Canara Bank',
      'VM-CANBNK-S', ts
    );
    expect(r!.amount).toBe(23);
    expect(r!.merchant).toBe('BMTC BUS KA57F6');
    expect(r!.reference).toBe('123456789012');
  });
});
