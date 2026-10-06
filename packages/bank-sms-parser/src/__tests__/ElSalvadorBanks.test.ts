import { BancoAgricolaParser } from '../banks/BancoAgricolaParser';
import { BancoCuscatlanParser } from '../banks/BancoCuscatlanParser';
import { BancoPromericaParser } from '../banks/BancoPromericaParser';
import { TransactionType } from '../core/types';

const ts = 1000000000000;

describe('BancoAgricolaParser', () => {
  const parser = new BancoAgricolaParser();

  test('credit from the bank sender', () => {
    const r = parser.parse(
      'B.AGRICOLA-TRANSFER365: ha recibido un Abono a Cuenta de GIVEN NAME SURNAME por USD6.91 desde ANOTHER BANK NAME',
      'Agricola', ts
    );
    expect(r).not.toBeNull();
    expect(r!.amount).toBe(6.91);
    expect(r!.currency).toBe('USD');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBe('ANOTHER BANK NAME');
    expect(r!.isFromCard).toBe(false);
  });

  test('credit from the shared Transfer365 sender', () => {
    const r = parser.parse(
      'B.AGRICOLA-TRANSFER365: ha recibido un Abono a Cuenta de GIVEN NAME SURNAME por USD20.00 desde ANOTHER BANK NAME',
      'Transfer365', ts
    );
    expect(r!.amount).toBe(20);
    expect(r!.merchant).toBe('ANOTHER BANK NAME');
  });

  test('Transfer365 body of another bank is not claimed', () => {
    expect(
      parser.parse(
        'OTHER BANK-TRANSFER365: ha recibido un Abono a Cuenta de GIVEN NAME SURNAME por USD20.00 desde ANOTHER BANK NAME',
        'Transfer365', ts
      )
    ).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('Agricola')).toBe(true);
    expect(parser.canHandle('Transfer365')).toBe(true);
    expect(parser.canHandle('Promerica')).toBe(false);
    expect(parser.canHandle('UNKNOWN')).toBe(false);
  });
});

describe('BancoCuscatlanParser', () => {
  const parser = new BancoCuscatlanParser();

  test('credit to account', () => {
    const r = parser.parse(
      'Ha recibido un Credito en su Cuenta B. CUSCATLAN 1234 por USD10.00 el dia 2025-12-25 15:45. Mas inf. 22122000.',
      'B.CUSCATLAN', ts
    );
    expect(r!.amount).toBe(10);
    expect(r!.currency).toBe('USD');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.accountLast4).toBe('1234');
    expect(r!.isFromCard).toBe(false);
  });

  test('debit card purchase', () => {
    const r = parser.parse(
      'Alerta de consumo con Tarjeta de Debito con Cuenta B.CUSCATLAN 1234 por USD10.00 en PAYPAL *STEAM GAMES el 2026-07-22 23:03. Mas inf. 22122000',
      'B.CUSCATLAN', ts
    );
    expect(r!.amount).toBe(10);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('PAYPAL *STEAM GAMES');
    expect(r!.accountLast4).toBe('1234');
    expect(r!.isFromCard).toBe(true);
  });

  test('outgoing Transfer365', () => {
    const r = parser.parse(
      'Su Op. Transfer365 CORRIENTE XXXXXX1234 a GIVEN NAME SUR NAME por USD 5.00 ha sido aplicada el dia 28/04/2026 03:04:53 P.M.',
      'B.CUSCATLAN', ts
    );
    expect(r!.amount).toBe(5);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('GIVEN NAME SUR NAME');
    expect(r!.accountLast4).toBe('1234');
    expect(r!.isFromCard).toBe(false);
  });

  test('debit withdrawal', () => {
    const r = parser.parse(
      'Se hizo un Debito en su Cuenta B. CUSCATLAN 1234 por USD15.00 el dia 2025-11-02 13:40. Mas inf. 22122000.',
      'B.CUSCATLAN', ts
    );
    expect(r!.amount).toBe(15);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.accountLast4).toBe('1234');
  });

  test('verification code is ignored', () => {
    expect(
      parser.parse('Su codigo de verificacion B. CUSCATLAN es 123456. No lo comparta.', 'B.CUSCATLAN', ts)
    ).toBeNull();
  });

  test('canHandle', () => {
    expect(parser.canHandle('B.CUSCATLAN')).toBe(true);
    expect(parser.canHandle('CUSCATLAN')).toBe(true);
    expect(parser.canHandle('Promerica')).toBe(false);
    expect(parser.canHandle('UNKNOWN')).toBe(false);
  });
});

describe('BancoPromericaParser', () => {
  const parser = new BancoPromericaParser();

  test('rejected transfer is ignored', () => {
    expect(
      parser.parse(
        'Su Op. Transfer365 de Transferencia de Fondos a GIVEN NAME SUR NAME por $ 26.00 ha sido rechazada',
        'Promerica', ts
      )
    ).toBeNull();
  });

  test('payment request is ignored', () => {
    expect(
      parser.parse('Ha recibido una solicitud de pago de GIVEN NAME por $ 15.00', 'Promerica', ts)
    ).toBeNull();
  });

  test('incoming Transfer365 credit names no payer', () => {
    const r = parser.parse(
      'Ha recibido un abono Transferencia de Fondos a cuenta corriente de GIVEN NAME SURNAME por $ 80.00 a traves de Transfer365 el 15/07/2026 20:37:06',
      'Promerica', ts
    );
    expect(r!.amount).toBe(80);
    expect(r!.currency).toBe('USD');
    expect(r!.type).toBe(TransactionType.INCOME);
    expect(r!.merchant).toBeNull();
    expect(r!.isFromCard).toBe(false);
  });

  test('outgoing Transfer365 transfer', () => {
    const r = parser.parse(
      'Su Op. Transfer365 de Transferencia de Fondos a GIVEN NAME SUR NAME por $ 26.00 ha sido aplicada exitosamente',
      'Promerica', ts
    );
    expect(r!.amount).toBe(26);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('GIVEN NAME SUR NAME');
    expect(r!.isFromCard).toBe(false);
  });

  test('card purchase', () => {
    const r = parser.parse(
      'Promerica te informa que tu TTA *1234: ha realizado una compra por USD 2.50 en NAME OF THE STORE AND CITY. Consulta al 25135000',
      'Promerica', ts
    );
    expect(r!.amount).toBe(2.5);
    expect(r!.type).toBe(TransactionType.EXPENSE);
    expect(r!.merchant).toBe('NAME OF THE STORE AND CITY');
    expect(r!.accountLast4).toBe('1234');
    expect(r!.isFromCard).toBe(true);
  });

  test('canHandle', () => {
    expect(parser.canHandle('Promerica')).toBe(true);
    expect(parser.canHandle('PROMERICA')).toBe(true);
    expect(parser.canHandle('B.CUSCATLAN')).toBe(false);
    expect(parser.canHandle('UNKNOWN')).toBe(false);
  });
});
