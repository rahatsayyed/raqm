import { SelcomPesaParser } from '../banks/SelcomPesaParser';
import { MPesaTanzaniaParser } from '../banks/MPesaTanzaniaParser';
import { TigoPesaParser } from '../banks/TigoPesaParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const ts = 1000000000000;

describe('SelcomPesaParser', () => {
  const parser = new SelcomPesaParser();

  test('Incoming Transfer / Cash-In', () => {
    const result = parser.parse(
      '0426JXCX Confirmed. You have received TZS 175,000.00 from MICHAEL EMIL LUYANGI - NMB (201100XXXXX) on 2025-04-26 11:50. Updated balance is TZS 175,000.00. Help 0800 714 888 / 0800 784 888',
      'Selcom Pesa', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(175000);
    expect(result!.currency).toBe('TZS');
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('MICHAEL EMIL LUYANGI');
    expect(result!.balance).toBe(175000);
    expect(result!.reference).toBe('0426JXCX');
  });

  test('Outgoing Transfer with Tax Breakdown', () => {
    const result = parser.parse(
      '0426JXGC Accepted. You have sent TZS 50,000.00 to NURU ISSA - Mixx by Yas (Tigo Pesa) (25571XXXXXXX) on 2025-04-26 11:56. Total charges TZS 550.00 (Fee 424, VAT 84, Ex Duty 42). Updated balance is TZS 124,450.00. Help 0800 714 888 / 0800 784 888',
      'Selcom Pesa', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('NURU ISSA');
    expect(result!.balance).toBe(124450);
    expect(result!.reference).toBe('0426JXGC');
  });

  test('ATM Withdrawal', () => {
    const result = parser.parse(
      '10234C2WQ Confirmed. You have withdrawn TZS 200,000.00 at ATM - TEMEKE BRANCH using your card ending with 8318 on 2025-10-23 18:00. Total charges TZS 2,500.00 (Fee 1,926, VAT 381, Ex Duty 193). Govt Levy TZS ( (resp govtLevy ) ). Updated balance is TZS 2,264,749.05. Help 0800 714 888 / 0800 784 888',
      'Selcom Pesa', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(200000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('ATM - TEMEKE BRANCH');
    expect(result!.accountLast4).toBe('8318');
    expect(result!.balance).toBe(2264749.05);
    expect(result!.reference).toBe('10234C2WQ');
    expect(result!.isFromCard).toBe(true);
  });

  test('Merchant Card Payment', () => {
    const result = parser.parse(
      '0428KRRY Confirmed. You have paid TZS 8,900.00 to APPLECOMBILL using your card ending 1915 on 2025-04-28 11:36. Updated balance is TZS 1,650.00. Help 0800 714 888 / 0800 784 888',
      'Selcom Pesa', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(8900);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('APPLECOMBILL');
    expect(result!.accountLast4).toBe('1915');
    expect(result!.balance).toBe(1650);
    expect(result!.reference).toBe('0428KRRY');
    expect(result!.isFromCard).toBe(true);
  });

  test('Promotional / Free Transaction', () => {
    const result = parser.parse(
      '0426JXSG Accepted. You have sent TZS 80,000.00 to CATHERINE MINJA - Airtel Money (255694XXXXXX) for Taka April 2025 on 2025-04-26 12:10. Charge is FREE. Transaction 1 of 5 kwa Jero. Updated balance is TZS 550.00. Help 0800 714 888 / 0800 784 888',
      'Selcom Pesa', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(80000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('CATHERINE MINJA');
    expect(result!.balance).toBe(550);
    expect(result!.reference).toBe('0426JXSG');
  });
});

describe('MPesaTanzaniaParser', () => {
  const parser = new MPesaTanzaniaParser();

  test('Received Money', () => {
    const result = parser.parse(
      'SGR1234567 Confirmed. You have received TZS 50,000.00 from JOHN DOE (255754XXXXXX) on 2025-05-12 at 10:30 AM. New M-Pesa balance is TZS 150,000.00.',
      'M-PESA', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(50000);
    expect(result!.currency).toBe('TZS');
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('JOHN DOE');
    expect(result!.balance).toBe(150000);
    expect(result!.reference).toBe('SGR1234567');
  });

  test('Sent Money / P2P', () => {
    const result = parser.parse(
      'SGR9876543 Confirmed. TZS 20,000.00 sent to JANE SMITH (255762XXXXXX) on 2025-05-12 at 11:45 AM. Transaction cost TZS 500.00. New M-Pesa balance is TZS 129,500.00.',
      'M-PESA', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(20000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('JANE SMITH');
    expect(result!.balance).toBe(129500);
    expect(result!.reference).toBe('SGR9876543');
  });

  test('Lipa kwa M-Pesa / Merchant', () => {
    const result = parser.parse(
      'SGR5544332 Confirmed. TZS 15,000.00 paid to SUPERMARKET X (Merchant ID: 556677) on 2025-05-13 at 08:20 PM. Transaction cost TZS 0.00. New M-Pesa balance is TZS 114,500.00.',
      'M-PESA', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(15000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('SUPERMARKET X');
    expect(result!.balance).toBe(114500);
    expect(result!.reference).toBe('SGR5544332');
  });

  test('LUKU / Utility Payment', () => {
    const result = parser.parse(
      'SGR1122334 Confirmed. TZS 10,000.00 paid to LUKU for account 1423XXXXXXX. Token: 1234-5678-9012-3456-7890. Transaction cost TZS 0.00. New M-Pesa balance is TZS 104,500.00.',
      'M-PESA', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(10000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('LUKU');
    expect(result!.balance).toBe(104500);
    expect(result!.reference).toBe('SGR1122334');
  });
});

describe('TigoPesaParser', () => {
  const parser = new TigoPesaParser();

  test('Cash-In from Agent', () => {
    const result = parser.parse(
      'Cash-In of TSh 100,000 from Agent - LUCY SUKUM is successful. New balance is TSh 100,000. TxnId: 13411949026. 16/08/23 15:19. Dial150 01# or use Tigo Pesa App. No Levy while sending money with Tigo Pesa',
      'TIGOPESA(smsfp)', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(100000);
    expect(result!.currency).toBe('TZS');
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('Agent - LUCY SUKUM');
    expect(result!.balance).toBe(100000);
    expect(result!.reference).toBe('13411949026');
  });

  test('Sent Money with Detailed Charges', () => {
    const result = parser.parse(
      'You have sent TSh 25,000 with CashOut fee TSh 2,156 to 255713XXXXXX - BENEDICTA MREMA. Total Charges TSh 380.(Fees TSh 380, Levy TSh 0), VAT TSh 58. TxnID: 27755640833. 14/08/23 14:55. New balance is TSh 481,801. Thank you for using Tigo Pesa.',
      'TIGOPESA(smsfp)', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(25000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('BENEDICTA MREMA');
    expect(result!.balance).toBe(481801);
    expect(result!.reference).toBe('27755640833');
  });

  test('Merchant Payment / Lipa', () => {
    const result = parser.parse(
      'You have paid TSh 131,000 to DIAPERS AND WIPES SUPPLIERS. Charges TSh 2,000. VAT TSh 305. Trnx ID: 63425443091. 19/08/23 11:20. Your New balance is TSh 467,372. Thank you for using Tigo Pesa.',
      'TIGOPESA(smsfp)', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(131000);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('DIAPERS AND WIPES SUPPLIERS');
    expect(result!.balance).toBe(467372);
    expect(result!.reference).toBe('63425443091');
  });

  test('Incoming TIPS / Bank Transfer', () => {
    const result = parser.parse(
      'Transfer Successful. New balance is TSh 97,000. You have received TSh 97,000 from TIPS.Selcom_MFB.2.Tigo, with TxnId: 25693126312543. 035_12307E6LF. 30/12/25 12:57.',
      'MIXX BY YAS', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(97000);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('Selcom (TIPS Transfer)');
    expect(result!.balance).toBe(97000);
    expect(result!.reference).toBe('25693126312543');
  });
});

describe('Tanzania Mobile Money Factory', () => {
  test('factory resolves Selcom Pesa', () => {
    const result = BankParserFactory.parse(
      '0426JXCX Confirmed. You have received TZS 175,000.00 from MICHAEL EMIL LUYANGI - NMB (201100XXXXX) on 2025-04-26 11:50. Updated balance is TZS 175,000.00.',
      'Selcom Pesa', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(175000);
    expect(result!.type).toBe(TransactionType.INCOME);
  });

  test('factory resolves Tigo Pesa', () => {
    const result = BankParserFactory.parse(
      'Cash-In of TSh 100,000 from Agent - LUCY SUKUM is successful. New balance is TSh 100,000. TxnId: 13411949026.',
      'TIGOPESA(smsfp)', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(100000);
    expect(result!.type).toBe(TransactionType.INCOME);
  });

  test('factory resolves Mixx by Yas (Tigo Pesa rebranding)', () => {
    const result = BankParserFactory.parse(
      'Transfer Successful. New balance is TSh 97,000. You have received TSh 97,000 from TIPS.Selcom_MFB.2.Tigo, with TxnId: 25693126312543.',
      'MIXX BY YAS', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(97000);
    expect(result!.type).toBe(TransactionType.INCOME);
  });
});
