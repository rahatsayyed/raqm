import { FaysalBankParser } from '../banks/FaysalBankParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new FaysalBankParser();
const ts = 1000000000000;

describe('FaysalBankParser', () => {
  test('Outgoing IBFT to Demo Recipient', () => {
    const result = parser.parse(
      'PKR 55.000.00 sent to DEMO RECIPIENT A/C *9901 via IBFT from FBL A/C *1234 on 06-FEB-2026 02:22 PM Ref # 960855.',
      'com.avanza.ambitwizfbl', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(55000);
    expect(result!.currency).toBe('PKR');
    expect(result!.type).toBe(TransactionType.TRANSFER);
    expect(result!.merchant).toBe('DEMO RECIPIENT');
    expect(result!.accountLast4).toBe('1234');
    expect(result!.reference).toBe('960855');
  });

  test('Outgoing IBFT to Sample Beneficiary', () => {
    const result = parser.parse(
      'PKR 70.000.00 sent to SAMPLE BENEFICIARY A/C *8518 via IBFT from FBL A/C *1234 on 06-FEB-2026 02:20 PM Ref # 950900.',
      'FBL', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(70000);
    expect(result!.type).toBe(TransactionType.TRANSFER);
    expect(result!.merchant).toBe('SAMPLE BENEFICIARY');
    expect(result!.accountLast4).toBe('1234');
    expect(result!.reference).toBe('950900');
  });

  test('Incoming via RAAST', () => {
    const result = parser.parse(
      'ACCOUNT HOLDER A/c # *1234 received PKR 500.00 via RAAST from SENDER ALIAS IBAN *3867 on 06-Feb-26 at 04:22 PM Ref#:121621592909 Info:111060606',
      'com.avanza.ambitwizfbl', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('SENDER ALIAS');
    expect(result!.accountLast4).toBe('1234');
    expect(result!.reference).toBe('121621592909');
  });

  test('Incoming IBFT from ACME Services', () => {
    const result = parser.parse(
      'PKR 250,000.00 received from ACME SERVICES  A/C *4388 in FBL A/C *1234 on 06/FEB/2026 at 02:19 PM',
      'FBL', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(250000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('ACME SERVICES');
    expect(result!.accountLast4).toBe('1234');
  });

  test('Debit card purchase', () => {
    const result = parser.parse(
      'PKR 16738.79 Debit Card purchase at Sample Delivery Karachi from FBL A/C *1234 on 02/FEB/2026 at 09:14:51 PM',
      'FBL', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(16738.79);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('Sample Delivery Karachi');
    expect(result!.accountLast4).toBe('1234');
    expect(result!.isFromCard).toBe(true);
  });

  test('ATM cash withdrawal', () => {
    const result = parser.parse(
      'PKR 10,000.00 ATM cash withdrawal from FBL A/C *1234 on 01/FEB/2026 at 02:52 PM',
      'FBL', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(10000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('ATM Cash Withdrawal');
    expect(result!.accountLast4).toBe('1234');
  });

  test('Incoming IBFT from BAFL', () => {
    const result = parser.parse(
      'PKR 135,327.46 received from Demo Sender BAFL A/C*2050 via IBFT in FBL A/C *1234 on 29/JAN/2026 at 01:13 PM',
      'FBL', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(135327.46);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('Demo Sender BAFL');
    expect(result!.accountLast4).toBe('1234');
  });

  test('Incoming FT with sender and receiver accounts', () => {
    const result = parser.parse(
      'PKR 200,000.00 received from Sender Name FBL A/C *4613 via FT in FBL A/C *1234 on 24/JAN/2026 at 12:50 PM',
      'FBL', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(200000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('Sender Name FBL');
    expect(result!.accountLast4).toBe('1234');
  });

  test('Incoming FT with different receiver', () => {
    const result = parser.parse(
      'PKR 950,000.00 received from Demo Sender FBL A/C *4646 via FT in FBL A/C *4388 on 05/JAN/2026 at 02:44 PM',
      'FBL', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(950000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('Demo Sender FBL');
    expect(result!.accountLast4).toBe('4388');
  });

  test('factory resolves Faysal Bank senders', () => {
    const r1 = BankParserFactory.parse(
      'PKR 55.000.00 sent to DEMO RECIPIENT A/C *9901 via IBFT from FBL A/C *1234 on 06-FEB-2026 02:22 PM Ref # 960855.',
      'com.avanza.ambitwizfbl', ts
    );
    expect(r1).not.toBeNull();
    expect(r1!.amount).toBe(55000);
    expect(r1!.type).toBe(TransactionType.TRANSFER);

    const r2 = BankParserFactory.parse(
      'PKR 70.000.00 sent to SAMPLE BENEFICIARY A/C *8518 via IBFT from FBL A/C *1234 on 06-FEB-2026 02:20 PM Ref # 950900.',
      'FBL', ts
    );
    expect(r2).not.toBeNull();
    expect(r2!.type).toBe(TransactionType.TRANSFER);
  });
});
