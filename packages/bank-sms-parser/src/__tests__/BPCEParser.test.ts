import { BPCEParser } from '../banks/BPCEParser';
import { TransactionType } from '../core/types';

const parser = new BPCEParser();
const ts = 1000000000000;

describe('BPCEParser', () => {
  test('Instant transfer', () => {
    const result = parser.parse(
      "Caisse d'Epargne: nous vous confirmons la réalisation de votre virement instantané de 1000,00 EUR du 01/12/2025 à 00h00m00s vers NAME FIRST NAME",
      '38015', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1000);
    expect(result!.currency).toBe('EUR');
    expect(result!.type).toBe(TransactionType.EXPENSE);
    expect(result!.merchant).toBe('NAME FIRST NAME');
  });

  test('Instant transfer to PayPal', () => {
    const result = parser.parse(
      "Caisse d'Epargne: nous vous confirmons la réalisation de votre virement instantané de 1000,00 EUR du 03/12/2025 à 18h46m18s vers PAYPAL",
      '38015', ts
    );
    expect(result).not.toBeNull();
    expect(result!.amount).toBe(1000);
    expect(result!.merchant).toBe('PAYPAL');
    expect(result!.type).toBe(TransactionType.EXPENSE);
  });

  test('Ignore addition of beneficiary', () => {
    const result = parser.parse(
      "Caisse d'Epargne : Virements - Ajout d'un bénéficiaire le 02/12/2025 sur internet. Si vous n'avez pas initié cette opération, contactez votre agence.",
      '38015', ts
    );
    expect(result).toBeNull();
  });

  test('canHandle senders', () => {
    expect(parser.canHandle('38015')).toBe(true);
    expect(parser.canHandle('UNKNOWN')).toBe(false);
  });
});
