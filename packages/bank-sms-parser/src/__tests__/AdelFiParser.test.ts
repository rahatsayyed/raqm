import { AdelFiParser } from '../banks/AdelFiParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new AdelFiParser();
const ts = 1000000000000;

describe('AdelFiParser', () => {
  test('Transaction - Tax Service', () => {
    const result = parser.parse(
      'Transaction Alert from AdelFi.\n**1234 had a transaction of ($15.00). Description: 8042999971 P AND F TAX INC        CITY        CAUS. Date: Dec 19, 2025',
      '42141', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(15);
    expect(result!.currency).toBe('USD');
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('P AND F TAX INC        CITY        CAUS');
    expect(result!.accountLast4).toBe('1234');
  });

  test('Transaction - Amazon Purchase', () => {
    const result = parser.parse(
      'Transaction Alert from AdelFi.\n**1234 had a transaction of ($33.79). Description: 235251000999657 AMAZON MKTPL*ZX0Q15PH2 Amzn.com/billWAUS. Date: Dec 19, 2025',
      '42141', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(33.79);
    expect(result!.currency).toBe('USD');
    expect(result!.type).toBe(TransactionType.CREDIT);
    expect(result!.merchant).toBe('AMAZON MKTPL*ZX0Q15PH2 Amzn.com/billWAUS');
    expect(result!.accountLast4).toBe('1234');
  });

  test('canHandle returns true for sender 42141', () => {
    expect(parser.canHandle('42141')).toBe(true);
  });

  test('factory resolves AdelFi sender', () => {
    const result = BankParserFactory.parse(
      'Transaction Alert from AdelFi.\n**1234 had a transaction of ($15.00). Description: 8042999971 P AND F TAX INC        CITY        CAUS. Date: Dec 19, 2025',
      '42141', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(15);
    expect(result!.type).toBe(TransactionType.CREDIT);
  });
});
