import { MixxByYasParser } from '../banks/MixxByYasParser';
import { TransactionType } from '../core/types';

const parser = new MixxByYasParser();
const ts = 1000000000000;

describe('MixxByYasParser', () => {
  test('outbound P2P transfer', () => {
    const r = parser.parse(
      'Money sent successfully to  -255XXXXXXXXX. Amount TSh 52,000. Total Charges TSh 1,125, VAT TSh 172. New balance is TSh 0. TxnID: 26495371373758. Receipt: 503-DFE9B1DABO. 14/06/26 19:19. Every Transaction is a Winning Goal!',
      'MixxByYas', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(52000);
    expect(r!.currency).toBe('TZS');
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('Mobile Money Transfer');
    expect(r!.balance).toBe(0);
    expect(r!.reference).toBe('26495371373758');
    expect(r!.accountLast4).toBeNull();
  });

  test('inbound push transfer', () => {
    const r = parser.parse(
      'Transfer Successful. New balance is TSh 15,000. You have received TSh 15,000 from CRDB; JOHN DOE with TxnId: 26452334860211. 003_19ec6e42e888a9a7. 14/06/26 19:08. Every Transaction is a Winning Goal!',
      'MixxByYas', ts
    );
    expect(r!.amount).toBe(15000);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('CRDB');
    expect(r!.balance).toBe(15000);
    expect(r!.reference).toBe('26452334860211');
    expect(r!.accountLast4).toBeNull();
  });

  test('PostPaid bill payment', () => {
    const r = parser.parse(
      'Txn Amt TSh 150,000 sent to Yas PostPaid (100100). Wait for confirmation. Ref: 0676263929. New Bal: TSh 0. Total Charges TSh 0.(Fees TSh 0, Levy TSh 0), VAT TSh 0. TxnID: 26952325632986. 13/06/26 19:41',
      'MixxByYas', ts
    );
    expect(r!.amount).toBe(150000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('Yas PostPaid');
    expect(r!.balance).toBe(0);
    expect(r!.reference).toBe('26952325632986');
  });

  test('Bustisha loan repayment', () => {
    const r = parser.parse(
      'You have successfully paid your Bustisha Balance by TSh 12,366.80. Your outstanding balance: TSh 0.00. New balance: TSh 137,633. TxnID: 26307515424020. Loan ID: 202606082034582035732170597903. 13/06/26 19:39.',
      'MixxByYas', ts
    );
    expect(r!.amount).toBe(12366.8);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('Bustisha');
    expect(r!.balance).toBe(137633);
    expect(r!.reference).toBe('26307515424020');
  });

  test('agent cash-out', () => {
    const r = parser.parse(
      'Cash Out of TSh 30,000 from Agent - AGENT NAME HERE is successful. Total Charges TSh 2,201.(Fees TSh 1,850, Levy TSh 351), VAT TSh 282. TxnID: 26106452201270. 08/06/26 17:36. New balance is TSh 5,879. Every Transaction is a Winning Goal!',
      'MixxByYas', ts
    );
    expect(r!.amount).toBe(30000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('Agent Cash Out');
    expect(r!.balance).toBe(5879);
    expect(r!.reference).toBe('26106452201270');
  });

  test('GePG government payment', () => {
    const r = parser.parse(
      'Txn successful, Amt TSh 150,000 sent to Malipo ya Serikali (001001), Control No 994944606117. New Bal TSh 206. Charges TSh 2,000. TxnID: 26592309810022. 29/05/26 21:35.',
      'MixxByYas', ts
    );
    expect(r!.amount).toBe(150000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('Malipo ya Serikali');
    expect(r!.balance).toBe(206);
    expect(r!.reference).toBe('26592309810022');
  });

  test('LUKU electricity token', () => {
    const r = parser.parse(
      'Payment Successful.47300267334\n9001261411323026601\n28.0KWH\n2634 3328 1950 3176 1023\nCost 8,196.73\nVAT 18% 1475.40\nEWURA 1% 81.97\nREA 3% 245.90\nTOTAL 10,000.00 21/05/26 13:23.LKS',
      'MixxByYas', ts
    );
    expect(r!.amount).toBe(10000);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('LUKU');
  });

  test('Mixx interest reward', () => {
    const r = parser.parse(
      'Dear Customer, New balance is TSh 414. You have received TSh 414 from MIXX BY YAS as your Mixx interest. TxnId: 26406495404220. 12/06/26 12:11. Ikiingia tu Golii!',
      'MixxByYas', ts
    );
    expect(r!.amount).toBe(414);
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('Mixx Interest');
    expect(r!.balance).toBe(414);
    expect(r!.reference).toBe('26406495404220');
  });

  test('secondary outbound twin is rejected', () => {
    expect(
      parser.parse(
        'You have sent TSh 52,000 to Vodacom receiver JOHN DOE - 255XXXXXXXXX. Charges TSh 1,125. VAT TSh 172. New balance is TSh 0. TxnID: 26495371373758. 14/06/26 19:19 Please wait for confirmation. Every Transaction is a Winning Goal!',
        'MixxByYas', ts
      )
    ).toBeNull();
  });

  test('content-less success ack is rejected', () => {
    expect(
      parser.parse(
        'Payment Successful.Dear Customer your transaction is successfull. PostPaid TxnID TPIL123456789 Mixx by Yas TxnID 26952325632986 13/06/26 19:41.LKS',
        'MixxByYas', ts
      )
    ).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('MixxByYas')).toBe(true);
    expect(parser.canHandle('MIXX BY YAS')).toBe(true);
    expect(parser.canHandle('AB-MIXXBYYAS-S')).toBe(true);
    expect(parser.canHandle('HDFC')).toBe(false);
    expect(parser.canHandle('')).toBe(false);
  });
});
