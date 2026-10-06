import { SelcomPesaParser } from '../banks/SelcomPesaParser';
import { MPesaTanzaniaParser } from '../banks/MPesaTanzaniaParser';
import { TigoPesaParser } from '../banks/TigoPesaParser';
import { TransactionType } from '../core/types';

const ts = 1000000000000;

describe('SelcomPesaParser', () => {
  const parser = new SelcomPesaParser();

  test('incoming transfer', () => {
    const r = parser.parse(
      '0426JXCX Confirmed. You have received TZS 175,000.00 from PERSON ONE - NMB (201XXXXXXXX) on 2025-04-26 11:50. Updated balance is TZS 175,000.00. Help 0800 714 888 / 0800 784 888',
      'Selcom Pesa', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(175000);
    expect(r!.currency).toBe('TZS');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('PERSON ONE');
    expect(r!.balance).toBe(175000);
    expect(r!.reference).toBe('0426JXCX');
    expect(r!.accountLast4).toBeNull();
  });

  test('outgoing transfer with tax breakdown', () => {
    const r = parser.parse(
      '0426JXGC Accepted. You have sent TZS 50,000.00 to PERSON TWO - Mixx by Yas (Tigo Pesa) (255XXXXXXXXX) on 2025-04-26 11:56. Total charges TZS 550.00 (Fee 424, VAT 84, Ex Duty 42). Updated balance is TZS 124,450.00. Help 0800 714 888 / 0800 784 888',
      'Selcom Pesa', ts
    );
    expect(r!.amount).toBe(50000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('PERSON TWO');
    expect(r!.balance).toBe(124450);
    expect(r!.reference).toBe('0426JXGC');
    expect(r!.accountLast4).toBeNull();
  });

  test('ATM withdrawal', () => {
    const r = parser.parse(
      '10234C2WQ Confirmed. You have withdrawn TZS 200,000.00 at ATM - TEMEKE BRANCH using your card ending with XXXX on 2025-10-23 18:00. Total charges TZS 2,500.00 (Fee 1,926, VAT 381, Ex Duty 193). Govt Levy TZS ( (resp govtLevy ) ). Updated balance is TZS 2,264,749.05. Help 0800 714 888 / 0800 784 888',
      'Selcom Pesa', ts
    );
    expect(r!.amount).toBe(200000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('ATM - TEMEKE BRANCH');
    expect(r!.balance).toBe(2264749.05);
    expect(r!.reference).toBe('10234C2WQ');
    expect(r!.isFromCard).toBe(true);
    expect(r!.accountLast4).toBeNull();
  });

  test('merchant card payment', () => {
    const r = parser.parse(
      '0428KRRY Confirmed. You have paid TZS 8,900.00 to APPLECOMBILL using your card ending XXXX on 2025-04-28 11:36. Updated balance is TZS 1,650.00. Help 0800 714 888 / 0800 784 888',
      'Selcom Pesa', ts
    );
    expect(r!.amount).toBe(8900);
    expect(r!.merchant).toBe('APPLECOMBILL');
    expect(r!.balance).toBe(1650);
    expect(r!.isFromCard).toBe(true);
    expect(r!.accountLast4).toBeNull();
  });

  test('free promotional transaction', () => {
    const r = parser.parse(
      '0426JXSG Accepted. You have sent TZS 80,000.00 to PERSON THREE - Airtel Money (255XXXXXXXXX) for Taka April 2025 on 2025-04-26 12:10. Charge is FREE. Transaction 1 of 5 kwa Jero. Updated balance is TZS 550.00. Help 0800 714 888 / 0800 784 888',
      'Selcom Pesa', ts
    );
    expect(r!.amount).toBe(80000);
    expect(r!.merchant).toBe('PERSON THREE');
    expect(r!.balance).toBe(550);
    expect(r!.reference).toBe('0426JXSG');
  });
});

describe('MPesaTanzaniaParser', () => {
  const parser = new MPesaTanzaniaParser();

  test.each([
    [
      'SGR1234567 Confirmed. You have received TZS 50,000.00 from PERSON ONE (255XXXXXXXXX) on 2025-05-12 at 10:30 AM. New M-Pesa balance is TZS 150,000.00.',
      50000, TransactionType.INCOME, 'PERSON ONE', 150000, 'SGR1234567',
    ],
    [
      'SGR9876543 Confirmed. TZS 20,000.00 sent to PERSON TWO (255XXXXXXXXX) on 2025-05-12 at 11:45 AM. Transaction cost TZS 500.00. New M-Pesa balance is TZS 129,500.00.',
      20000, TransactionType.EXPENSE, 'PERSON TWO', 129500, 'SGR9876543',
    ],
    [
      'SGR5544332 Confirmed. TZS 15,000.00 paid to SUPERMARKET X (Merchant ID: XXXXXX) on 2025-05-13 at 08:20 PM. Transaction cost TZS 0.00. New M-Pesa balance is TZS 114,500.00.',
      15000, TransactionType.EXPENSE, 'SUPERMARKET X', 114500, 'SGR5544332',
    ],
    [
      'SGR1122334 Confirmed. TZS 10,000.00 paid to LUKU for account 1423XXXXXXX. Token: 1234-5678-9012-3456-7890. Transaction cost TZS 0.00. New M-Pesa balance is TZS 104,500.00.',
      10000, TransactionType.EXPENSE, 'LUKU', 104500, 'SGR1122334',
    ],
    [
      'DFJ9B1FPQ8 Confirmed. Tsh5,000.00 sent to business VODACOM-BUNDLES 2 on 19/6/26 at 10:56 pm. New M-Pesa balance is Tsh0.36.',
      5000, TransactionType.EXPENSE, 'VODACOM-BUNDLES 2', 0.36, 'DFJ9B1FPQ8',
    ],
    [
      'DFJ9B1FU69 Confirmed. Tsh4,000.00 has been deducted from your M-Pesa account on 19/6/26 at 10:38 pm as a repayment of M-Pesa Overdraft service. New M-Pesa balance is Tsh0.36.',
      4000, TransactionType.EXPENSE, 'M-Pesa Overdraft', 0.36, 'DFJ9B1FU69',
    ],
    [
      'DFJ9B1FX2B confirmed. You have received a payment of Tsh4,000.00 from 922756 - TIPS-SELCOM MF on 19/6/26 at 10:38 pm. New M-Pesa balance is Tsh4,000.36',
      4000, TransactionType.INCOME, 'TIPS-SELCOM MF', 4000.36, 'DFJ9B1FX2B',
    ],
    [
      'DFF9B1DPIJ Confirmed. On 15/6/26 at 8:08 pm Withdraw Tsh100,000.00 from 431836 - AGENT NAME OUTLET Total fee Tsh4,357.00 (M-Pesa fee Tsh3,650.00 + Government levy Tsh707.00). Balance is Tsh0.36. Your Songesha limit is Tsh4836',
      100000, TransactionType.EXPENSE, 'Agent Withdrawal', 0.36, 'DFF9B1DPIJ',
    ],
    [
      'DFF9B1DSI4 Confirmed. Tsh5,000.00 sent to M-KOBA for account i2ZCoANa3yFQGHNN on 15/6/26 at 7:53 pm Total fee Tsh0.00 (M-Pesa fee Tsh0.00 + Government Levy Tsh0.00). Balance is Tsh493.36.',
      5000, TransactionType.EXPENSE, 'M-KOBA', 493.36, 'DFF9B1DSI4',
    ],
    [
      'DFE9B1D5UM Confirmed. Tsh40,000.00 sent to TIPS-SELCOM MF for account 06XXXXXXXX on 14/6/26 at 7:20 pm Total fee Tsh2,000.00 (M-Pesa fee Tsh2,000.00 + Government Levy Tsh0.00). Balance is Tsh1,151.36.',
      40000, TransactionType.EXPENSE, 'TIPS-SELCOM MF', 1151.36, 'DFE9B1D5UM',
    ],
    [
      'DES9B14S4R Confirmed. Tsh7,000.00 paid to LIPA KIBUGUMO PHARMACY on 28/5/26 at 4:48 pm and charged Tsh500.00.New M-Pesa balance is Tsh9,583.36.',
      7000, TransactionType.EXPENSE, 'LIPA KIBUGUMO PHARMACY', 9583.36, 'DES9B14S4R',
    ],
  ])('%s', (msg, amount, type, merchant, balance, reference) => {
    const r = parser.parse(msg, 'M-Pesa', ts);
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(amount);
    expect(r!.currency).toBe('TZS');
    expect(r!.type).toBe(type);
    expect(r!.merchant).toBe(merchant);
    expect(r!.balance).toBe(balance);
    expect(r!.reference).toBe(reference);
    expect(r!.accountLast4).toBeNull();
  });

  test('Swahili TIPS twin parses and shares the dedup hash with the English twin', () => {
    const english = parser.parse(
      'DFJ9B1FX2B confirmed. You have received a payment of Tsh4,000.00 from 922756 - TIPS-SELCOM MF on 19/6/26 at 10:38 pm. New M-Pesa balance is Tsh4,000.36',
      'M-Pesa', ts
    );
    const swahili = parser.parse(
      'DFJ9B1FX2B imethibitishwa. Umepokea Tshs 4,000.00 kutoka SELCOM MF, Akaunti ****1234 - PERSON ONE tarehe 19/06/2026 saa 22:38:24.',
      'M-Pesa', ts
    );
    expect(swahili).not.toBeNull();
    expect(swahili!.amount).toBe(4000);
    expect(swahili!.type).toBe(TransactionType.INCOME);
    expect(swahili!.merchant).toBe('SELCOM MF');
    expect(swahili!.reference).toBe('DFJ9B1FX2B');
    expect(english!.transactionHash).toBe('mpesa-tz:DFJ9B1FX2B');
    expect(swahili!.transactionHash).toBe(english!.transactionHash);
  });

  test('thin receipt duplicate is rejected', () => {
    expect(
      parser.parse(
        'DFE9B1D5UM Confirmed. PERSON SIX has received Tsh 40000 on 2026-06-14 19:20:55.',
        'M-Pesa', ts
      )
    ).toBeNull();
  });

  test('Kenyan Ksh message is not claimed', () => {
    expect(
      parser.parse('QJK1234567 Confirmed. Ksh500.00 sent to JOHN on 1/1/26. New M-PESA balance is Ksh100.00.', 'MPESA', ts)
    ).toBeNull();
  });
});

describe('TigoPesaParser', () => {
  const parser = new TigoPesaParser();

  test('cash-in from agent', () => {
    const r = parser.parse(
      'Cash-In of TSh 100,000 from Agent - PERSON FIVE is successful. New balance is TSh 100,000. TxnId: 13411949026. 16/08/23 15:19. Dial150 01# or use Tigo Pesa App. No Levy while sending money with Tigo Pesa',
      'TIGOPESA(smsfp)', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(100000);
    expect(r!.currency).toBe('TZS');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Agent - PERSON FIVE');
    expect(r!.balance).toBe(100000);
    expect(r!.reference).toBe('13411949026');
    expect(r!.accountLast4).toBeNull();
  });

  test('sent money with detailed charges', () => {
    const r = parser.parse(
      'You have sent TSh 25,000 with CashOut fee TSh 2,156 to 255XXXXXXXXX - PERSON FOUR. Total Charges TSh 380.(Fees TSh 380, Levy TSh 0), VAT TSh 58. TxnID: 27755640833. 14/08/23 14:55. New balance is TSh 481,801. Thank you for using Tigo Pesa.',
      'TIGOPESA(smsfp)', ts
    );
    expect(r!.amount).toBe(25000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('PERSON FOUR');
    expect(r!.balance).toBe(481801);
    expect(r!.reference).toBe('27755640833');
  });

  test('merchant payment', () => {
    const r = parser.parse(
      'You have paid TSh 131,000 to DIAPERS AND WIPES SUPPLIERS. Charges TSh 2,000. VAT TSh 305. Trnx ID: 63425443091. 19/08/23 11:20. Your New balance is TSh 467,372. Thank you for using Tigo Pesa.',
      'TIGOPESA(smsfp)', ts
    );
    expect(r!.amount).toBe(131000);
    expect(r!.merchant).toBe('DIAPERS AND WIPES SUPPLIERS');
    expect(r!.balance).toBe(467372);
    expect(r!.reference).toBe('63425443091');
  });

  test('Mixx by Yas secondary twin is rejected', () => {
    expect(
      parser.parse(
        'You have sent TSh 52,000 to Vodacom receiver JOHN DOE - 255XXXXXXXXX. Charges TSh 1,125. VAT TSh 172. New balance is TSh 0. TxnID: 26495371373758. 14/06/26 19:19 Please wait for confirmation.',
        'MIXX BY YAS', ts
      )
    ).toBeNull();
  });

  test('incoming TIPS bank transfer', () => {
    const r = parser.parse(
      'Transfer Successful. New balance is TSh 97,000. You have received TSh 97,000 from TIPS.Selcom_MFB.2.Tigo, with TxnId: 25693126312543. 035_12307E6LF. 30/12/25 12:57.',
      'MIXX BY YAS', ts
    );
    expect(r!.amount).toBe(97000);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Selcom (TIPS Transfer)');
    expect(r!.balance).toBe(97000);
    expect(r!.reference).toBe('25693126312543');
  });
});
