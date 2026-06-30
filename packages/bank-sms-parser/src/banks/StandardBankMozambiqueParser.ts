import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType, createParsedTransaction } from '../core/types';

/**
 * Parser for Standard Bank Mozambique SMS messages (Portuguese).
 *
 * Amounts use European decimal formatting (thousands separator '.', decimal ',')
 * e.g. "1.234,56". Currency can be MZN (also written "MT") or USD.
 *
 * Supported formats:
 * - Credit (income):
 *   "Caro Cliente, ocorreu um credito de 1.234,56 MZN na sua conta 9999999999999 a 22/05/2026, 14:54, disponivel em 22/05/2026. Mais info: ..."
 * - Purchase (expense):
 *   "Caro Cliente, ocorreu uma operacao de compra de 1.234,56, MT na sua conta 9999999999999 a 09/05/2026, 13:41, MM INVESTMENTS S. Comissao: 0.00MT e Imposto de selo: 0.00MT. Mais info: ..."
 * - Debit (expense):
 *   "Caro Cliente, ocorreu um debito de 1.234,56 USD na sua conta 9999999999999 a 15/05/2026, 13:30, C01 AGENCIA DA BEIRA. Comissao: 0.00USD e Imposto de selo: 0.00USD. Mais info: ..."
 *
 * Portuguese keys:
 * - "credito"            = credit  (INCOME)
 * - "debito"             = debit   (EXPENSE)
 * - "operacao de compra" = purchase (EXPENSE)
 * - "na sua conta <digits>" = account number
 *
 * Sender patterns: "STDBank" (case-insensitive) and short code "7832265".
 */
export class StandardBankMozambiqueParser extends BankParser {

  getBankName(): string {
    return 'Standard Bank Mozambique';
  }

  getCurrency(): string {
    return 'MZN';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('STDBANK') ||
      normalizedSender === '7832265';
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    if (!this.isTransactionMessage(smsBody)) {
      return null;
    }

    const amount = this.extractAmount(smsBody);
    if (amount === null) {
      return null;
    }

    const type = this.extractTransactionType(smsBody);
    if (type === null) {
      return null;
    }

    const currency = this.extractCurrency(smsBody) ?? this.getCurrency();

    return createParsedTransaction({
      amount,
      type,
      merchant: this.extractMerchant(smsBody, sender),
      reference: this.extractReference(smsBody),
      accountLast4: this.extractAccountLast4(smsBody),
      balance: this.extractBalance(smsBody),
      smsBody,
      sender,
      timestamp,
      bankName: this.getBankName(),
      isFromCard: this.detectIsCard(smsBody),
      currency,
    });
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    return lower.includes('credito') ||
      lower.includes('debito') ||
      lower.includes('operacao de compra');
  }

  protected extractAmount(message: string): number | null {
    // "credito de 1.234,56 MZN", "compra de 1.234,56, MT", "debito de 1.234,56 USD"
    const pattern = /de\s+([0-9.]+,[0-9]{2})/i;
    const match = message.match(pattern);
    if (match) {
      return this.parseEuropeanAmount(match[1]);
    }
    return null;
  }

  /**
   * Converts a European-formatted amount string (e.g. "1.234,56") to number.
   */
  private parseEuropeanAmount(raw: string): number | null {
    const normalized = raw.replace(/\./g, '').replace(',', '.');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  }

  protected extractCurrency(message: string): string | null {
    // Currency follows the amount: "1.234,56 MZN", "1.234,56, MT", "1.234,56 USD".
    // Anchor to a standalone token and accept only known codes so a Portuguese
    // word (e.g. "na") is never mistaken for a currency when the code is absent;
    // callers fall back to getCurrency() (MZN) when this returns null.
    const pattern = /de\s+[0-9.]+,[0-9]{2},?\s+([A-Za-z]{2,3})(?=\s|,|$)/i;
    const match = message.match(pattern);
    const token = match?.[1]?.toUpperCase() ?? null;
    if (token === null) {
      return null;
    }
    switch (token) {
      case 'MT':
      case 'MZN':
        return 'MZN';
      case 'USD':
        return 'USD';
      default:
        return null;
    }
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('credito')) return TransactionType.INCOME;
    if (lower.includes('debito')) return TransactionType.EXPENSE;
    if (lower.includes('operacao de compra')) return TransactionType.EXPENSE;
    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    // "na sua conta 9999999999999"
    const pattern = /na\s+sua\s+conta\s+(\d+)/i;
    const match = message.match(pattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Merchant/location appears after the time stamp "HH:MM, " and before the
    // next ". Comissao" (purchase/debit) or ". " segment.
    // Examples:
    //   "..., 13:41, MM INVESTMENTS S. Comissao: ..."
    //   "..., 13:30, C01 AGENCIA DA BEIRA. Comissao: ..."
    const pattern = /\d{2}:\d{2},\s+([^.]+?)\.\s*Comissao/i;
    const match = message.match(pattern);
    if (match) {
      const merchant = match[1].trim();
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }
    return null;
  }

  protected extractBalance(_message: string): number | null {
    return null;
  }

  protected extractReference(_message: string): string | null {
    return null;
  }
}

export default new StandardBankMozambiqueParser();
