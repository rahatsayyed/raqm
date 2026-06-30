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
