import { PunjabSindBankParser } from '../banks/PunjabSindBankParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new PunjabSindBankParser();
const ts = 1000000000000;

describe('PunjabSindBankParser', () => {
  test('Generic credit with free-text description', () => {
    const result = parser.parse(
      'PSB000000000000001\nA/C No **1111 Credited with Rs 500--Vendor Amount (CLR BAL 1250.63CR)(18-03-2026 16:51:51) Punjab&Sind Bank',
      'VM-PSBANK-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500);
    expect(result!.currency).toBe('INR');
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('Vendor Amount');
    expect(result!.accountLast4).toBe('1111');
    expect(result!.balance).toBe(1250.63);
  });

  test('NEFT credit extracts sender name and UTR', () => {
    const result = parser.parse(
      'PSB000000000000002\nA/C No **1111 Credited with Rs 500--NEFT/AXPS260760067935/ACME SCHOOL (CLR BAL 1800.63CR)(19-03-2026 06:51:51) Punjab&Sind Bank',
      'AX-PSBANK-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('ACME SCHOOL');
    expect(result!.reference).toBe('AXPS260760067935');
    expect(result!.accountLast4).toBe('1111');
    expect(result!.balance).toBe(1800.63);
  });

  test('UPI credit extracts counterparty name and UTR', () => {
    const result = parser.parse(
      'PSB000000000000003\nA/c No **2222 Credited with Rs 5500--UPI/CR/121888265852/JOHN/HDFC/00000000000000/U (CLR BAL 30987.99CR)(13-04-2026 17:22:34)-Punjab&Sind Bank',
      'JD-PSBANK-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(5500);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('JOHN');
    expect(result!.reference).toBe('121888265852');
    expect(result!.accountLast4).toBe('2222');
    expect(result!.balance).toBe(30987.99);
  });

  test('Cheque clearing credit maps to Cheque Credit merchant', () => {
    const result = parser.parse(
      'PSB000000000000004\nA/c No **3333 Credited with Rs 700--Credit of 045252 (CLR BAL 11064.24CR)(13-04-2026 19:16:15)-Punjab&Sind Bank',
      'VM-PSBANK-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(700);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('Cheque Credit');
    expect(result!.reference).toBe('045252');
    expect(result!.accountLast4).toBe('3333');
    expect(result!.balance).toBe(11064.24);
  });

  test('factory resolves Punjab & Sind Bank', () => {
    const result = BankParserFactory.parse(
      'PSB000000000000005\nA/c No **4444 Credited with Rs 100--Test (CLR BAL 200.00CR)(13-04-2026 19:16:15)-Punjab&Sind Bank',
      'VM-PSBANK-S', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(100);
    expect(result!.type).toBe(TransactionType.INCOME);
  });
});
