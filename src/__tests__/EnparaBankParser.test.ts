import { EnparaBankParser } from '../banks/EnparaBankParser';
import { TransactionType } from '../core/types';

const parser = new EnparaBankParser();
const ts = 1000000000000;

describe('EnparaBankParser', () => {
  test('Card spend (Encard) - simple merchant', () => {
    const result = parser.parse(
      "Vadesiz TL hesabınıza bağlı 2589 ile biten Encard'ınızla 10/05/2026 tarihinde 105100000024364-OBILET ISTANBUL TR firmasında 520,00 TL tutarında harcama yapıldı.",
      'Enpara', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(520);
    expect(result!.currency).toBe('TRY');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('OBILET ISTANBUL');
    expect(result!.accountLast4).toBe('2589');
    expect(result!.isFromCard).toBe(true);
  });

  test('Card spend (Encard) - hyphenated merchant', () => {
    const result = parser.parse(
      "Vadesiz TL hesabınıza bağlı 2589 ile biten Encard'ınızla 11/05/2026 tarihinde 105100000248567-Trendyol - Yemek ISTANBUL TR firmasında 350,00 TL tutarında harcama yapıldı.",
      'Enpara', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(350);
    expect(result!.merchant).toBe('Trendyol - Yemek ISTANBUL');
    expect(result!.accountLast4).toBe('2589');
    expect(result!.isFromCard).toBe(true);
  });

  test('Card spend (Encard) - space before dash in reference', () => {
    const result = parser.parse(
      "Vadesiz TL hesabınıza bağlı 2589 ile biten Encard'ınızla 11/05/2026 tarihinde 2288088 -SBUX KRK KIRIKKALE PODIU KIRIKKALE TR firmasında 465,00 TL tutarında harcama yapıldı.",
      'Enpara', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(465);
    expect(result!.merchant).toBe('SBUX KRK KIRIKKALE PODIU KIRIKKALE');
    expect(result!.isFromCard).toBe(true);
  });

  test('Card spend (Encard) - merchant with slash', () => {
    const result = parser.parse(
      "Vadesiz TL hesabınıza bağlı 2589 ile biten Encard'ınızla 11/05/2026 tarihinde 000000003718799-NKOLAY/DIRK ROSSMANN ISTANBUL TR firmasında 528,00 TL tutarında harcama yapıldı.",
      'Enpara', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(528);
    expect(result!.merchant).toBe('NKOLAY/DIRK ROSSMANN ISTANBUL');
    expect(result!.isFromCard).toBe(true);
  });

  test('Outgoing FAST transfer with balanceAfter', () => {
    const result = parser.parse(
      '13/05/2026 tarihinde vadesiz TL hesabınızdan Hakan G adlı alıcıya 500,00 TL tutarında para transferi (FAST) yapıldı. İşlem sonrası hesap bakiyesi: 1.175,28 TL',
      'Enpara', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(500);
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('Hakan G');
    expect(result!.balance).toBe(1175.28);
    expect(result!.isFromCard).toBe(false);
  });

  test('Incoming FAST transfer with balanceAfter', () => {
    const result = parser.parse(
      'Vadesiz TL hesabınıza 11/05/2026 tarihinde Ismail U tarafından yapılan para transferi (FAST) sonucunda 200,00 TL giriş oldu. İşlem sonrası hesap bakiyesi: 3.231,27 TL',
      'Enpara', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(200);
    expect(result!.type).toBe(TransactionType.INCOME);
    expect(result!.merchant).toBe('Ismail U');
    expect(result!.balance).toBe(3231.27);
    expect(result!.isFromCard).toBe(false);
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('Enpara')).toBe(true);
    expect(parser.canHandle('UNKNOWN')).toBe(false);
  });
});
