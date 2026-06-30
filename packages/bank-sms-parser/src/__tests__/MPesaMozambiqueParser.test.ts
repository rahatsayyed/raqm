import { MPesaMozambiqueParser } from '../banks/MPesaMozambiqueParser';
import { BankParserFactory } from '../BankParserFactory';
import { TransactionType } from '../core/types';

const parser = new MPesaMozambiqueParser();
const ts = 1000000000000;

describe('MPesaMozambiqueParser', () => {
  test('Transfer out (EXPENSE)', () => {
    const result = parser.parse(
      'Confirmado DF50KDFDHWK. Transferiste 1,234.56MT e a taxa foi de 1.23MT para 258841234567 - JOHNDOE aos 5/6/26 as 4:15 PM. O teu novo saldo M-Pesa e de 12,345.67MT. Continua a transferir SEM TAXAS de M-Pesa para M-Pesa. Em caso de duvida, liga 100.',
      'M-Pesa', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1234.56);
    expect(result!.currency).toBe('MZN');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('JOHNDOE');
    expect(result!.balance).toBe(12345.67);
    expect(result!.reference).toBe('DF50KDFDHWK');
  });

  test('Purchase at entity (EXPENSE)', () => {
    const result = parser.parse(
      'Confirmado DF36KCPECLC. Registamos uma operacao de compra no valor de 1,234.56MT e a taxa foi de 0.00MT na entidade EDM com referencia  aos 3/6/26 as 10:37 PM. O teu novo saldo M-Pesa e de 1,234.56MT. Em caso de duvida, liga 100. M-Pesa e facil!',
      'M-Pesa', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1234.56);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('EDM');
    expect(result!.balance).toBe(1234.56);
    expect(result!.reference).toBe('DF36KCPECLC');
  });

  test('Agent withdrawal (EXPENSE)', () => {
    const result = parser.parse(
      'Confirmado DF30KCJDIIA. Aos 3/6/26  as 3:57 PM levantaste 1,234.56MT no agente 425300 - BENJAMIM FERAGE. O novo saldo M-Pesa e de 1,234.56MT e a taxa foi de 12.34MT. Em caso de duvida, liga 100. M-Pesa e facil!',
      'M-Pesa', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1234.56);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('BENJAMIM FERAGE');
    expect(result!.reference).toBe('DF30KCJDIIA');
  });

  test('Deposit at agent (INCOME)', () => {
    const result = parser.parse(
      'Confirmado DEV6KB6GAUI. Depositaste o valor de 12,345.67MT no agente JOHN DOE aos  31/5/26 as 12:04 PM. O teu novo saldo  M-Pesa e de 12,345.67MT. Aproveita e transfere SEM TAXAS de M-Pesa para M-Pesa. Em caso de duvida, liga 100.',
      'M-Pesa', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(12345.67);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('JOHN DOE');
    expect(result!.balance).toBe(12345.67);
    expect(result!.reference).toBe('DEV6KB6GAUI');
  });

  test('Received money (INCOME)', () => {
    const result = parser.parse(
      'Confirmado DET0KAIXP5E. Recebeste  12,345.67MT de 123456 - SIMO aos 29/5/26  as 6:22 PM o novo saldo  M-Pesa e de 1,234.56MT. Aproveita e transfere SEM TAXAS de M-Pesa para M-Pesa. Em caso de duvida, liga 100.',
      'M-Pesa', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(12345.67);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('SIMO');
    expect(result!.balance).toBe(1234.56);
    expect(result!.reference).toBe('DET0KAIXP5E');
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('M-Pesa')).toBe(true);
    expect(parser.canHandle('MPESA')).toBe(true);
    expect(parser.canHandle('UNKNOWN')).toBe(false);
  });

  test('dispatch routes shared M-Pesa sender to correct country parser', () => {
    const mozMsg = 'Confirmado DET0KAIXP5E. Recebeste  12,345.67MT de 123456 - SIMO aos 29/5/26  as 6:22 PM o novo saldo  M-Pesa e de 1,234.56MT. Aproveita e transfere SEM TAXAS de M-Pesa para M-Pesa. Em caso de duvida, liga 100.';
    const moz = BankParserFactory.parse(mozMsg, 'M-Pesa', ts);
    expect(moz).not.toBeNull();
    expect(moz!.bankName).toBe('M-Pesa Mozambique');
    expect(moz!.currency).toBe('MZN');

    const tzMsg = 'SGR1234567 Confirmed. You have received TZS 50,000.00 from JOHN DOE (255754XXXXXX) on 2025-05-12 at 10:30 AM. New M-Pesa balance is TZS 150,000.00.';
    const tz = BankParserFactory.parse(tzMsg, 'M-PESA', ts);
    expect(tz).not.toBeNull();
    expect(tz!.bankName).toBe('M-Pesa Tanzania');
    expect(tz!.currency).toBe('TZS');

    const keMsg = 'TJK6H7T3GA Confirmed. Ksh70.00 paid to person 1. on 20/10/24 at 4:21 PM.New M-PESA balance is Ksh123.12. Transaction cost, Ksh0.00. Amount you can transact within the day is 499,895.00.';
    const ke = BankParserFactory.parse(keMsg, 'M-PESA', ts);
    expect(ke).not.toBeNull();
    expect(ke!.bankName).toBe('M-PESA');
    expect(ke!.currency).toBe('KES');
  });
});
