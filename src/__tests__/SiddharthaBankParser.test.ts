import { SiddharthaBankParser } from '../banks/SiddharthaBankParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new SiddharthaBankParser();
const ts = 1000000000000;

describe('SiddharthaBankParser', () => {
  test('Debit - Fund Transfer (IBFT)', () => {
    const result = parser.parse(
      'Dear [NAME], AC ###XXXX1234, NPR 97.00 withdrawn on 09/12/2025 12:31:20 for Fund Trf to A/C PAYABLE IBFT (IN-670725619,222',
      'SBL_Alert', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(97);
    expect(result!.currency).toBe('NPR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('Fund Transfer (IBFT)');
    expect(result!.accountLast4).toBe('1234');
    expect(result!.reference).toBe('IN-670725619');
  });

  test('Debit - QR Payment', () => {
    const result = parser.parse(
      'Dear [NAME], AC ###XXXX1234, NPR 810.00 withdrawn on 05/12/2025 18:06:50 for QR Payment to FALCHA KHAJA GHAR - falcha',
      'SBL_Alert', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(810);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('FALCHA KHAJA GHAR');
    expect(result!.accountLast4).toBe('1234');
  });

  test('Credit - Deposit (Fund Transfer)', () => {
    const result = parser.parse(
      'Dear [NAME], AC ###XXXX1234, NPR 120,000.00 deposited on 28/11/2025 20:13:59 for Fund Trf frm A/C PAYABLE IBF-FON:IBFT:1171853',
      'SBL_Alert', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(120000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('Fund Transfer (IBFT)');
    expect(result!.accountLast4).toBe('1234');
    expect(result!.reference).toBe('1171853');
  });

  test('Debit - Utility Bill (NEA)', () => {
    const result = parser.parse(
      'Dear [NAME], AC ###XXXX1234, NPR 1,822.00 withdrawn on 09/12/2025 12:29:06 for Fund Trf to A/C PAYABLE IBFT (IN-670724040,NEA',
      'SBL_Alert', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1822);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('Nepal Electricity Authority');
    expect(result!.accountLast4).toBe('1234');
    expect(result!.reference).toBe('IN-670724040');
  });

  test('factory resolves Siddhartha Bank', () => {
    const r1 = BankParserFactory.parse(
      'Dear [NAME], AC ###XXXX1234, NPR 97.00 withdrawn on 09/12/2025 12:31:20 for Fund Trf to A/C PAYABLE IBFT (IN-670725619,222',
      'SBL_Alert', ts
    );
    expect(r1).not.toBeNull();
    expect(r1!.amount).toBe(97);
    expect(r1!.type).toBe(TransactionType.EXPENSE);

    const r2 = BankParserFactory.parse(
      'Dear Customer, AC ###XXXX5678, NPR 500.00 deposited on 01/12/2025 10:00:00 for deposit',
      'SBL-Alert', ts
    );
    expect(r2).not.toBeNull();
  });
});
