import { NabilBankParser } from '../banks/NabilBankParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new NabilBankParser();
const ts = 1000000000000;

describe('NabilBankParser', () => {
  test('Withdrawn example with reference', () => {
    const result = parser.parse(
      'Dear Customer, Your 091##04118 has been withdrawn by NPR 20,008.00 on 17/04/2026 07:58:06, Remarks: MTXN0000517374-130\nDownload App: https://rebrand.ly/nBank',
      'NABIL_ALERT', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(20008);
    expect(result!.currency).toBe('NPR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.accountLast4).toBe('4118');
    expect(result!.reference).toBe('MTXN0000517374-130');
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('NABIL_ALERT')).toBe(true);
    expect(parser.canHandle('NABIL')).toBe(true);
    expect(parser.canHandle('NMB_ALERT')).toBe(false);
  });

  test('factory resolves Nabil Bank', () => {
    const result = BankParserFactory.parse(
      'Dear Customer, Your 091##04118 has been withdrawn by NPR 20,008.00 on 17/04/2026 07:58:06, Remarks: MTXN0000517374-130',
      'NABIL_ALERT', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(20008);
    expect(result!.type).toBe(TransactionType.EXPENSE);
  });
});
