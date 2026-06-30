import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for M-Pesa Mozambique (Vodacom) mobile money SMS messages.
 *
 * Language: Portuguese. Currency: MZN (written "MT" in messages).
 * Number format: US style (comma thousands, dot decimal e.g. 12,345.67). Dates D/M/YY.
 *
 * Handles formats like (names/numbers below are masked example values):
 * - "Confirmado DF50KDFDHWK. Transferiste 1,234.56MT e a taxa foi de 1.23MT para 258841234567 - JOHNDOE ..."
 * - "Confirmado DF36KCPECLC. Registamos uma operacao de compra no valor de 1,234.56MT ... na entidade EDM ..."
 * - "Confirmado DF30KCJDIIA. Aos ... levantaste 1,234.56MT no agente 425300 - BENJAMIM FERAGE ..."
 * - "Confirmado DEV6KB6GAUI. Depositaste o valor de 12,345.67MT no agente JOHN DOE ..."
 * - "Confirmado DET0KAIXP5E. Recebeste 12,345.67MT de 123456 - SIMO ..."
 *
 * Gating: Mozambique messages start with "Confirmado" (Portuguese), whereas Kenya/Tanzania
 * use "Confirmed" (English). parse()/isTransactionMessage are gated on "Confirmado" AND the
 * presence of "MT", so Kenyan/Tanzanian SMS fall through to their parsers under the
 * content-aware dispatch in BankParserFactory.
 *
 * Country: Mozambique
 */
export class MPesaMozambiqueParser extends BankParser {

  getBankName(): string {
    return 'M-Pesa Mozambique';
  }

  getCurrency(): string {
    return 'MZN';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    // M-Pesa Mozambique uses the same sender ID; differentiation is by content.
    return normalizedSender.includes('MPESA') ||
      normalizedSender.includes('M-PESA');
  }

  /**
   * Only parse Mozambique M-Pesa messages: Portuguese "Confirmado" + "MT" currency token.
   * Returning null lets Kenya/Tanzania parsers handle their own SMS under the dispatch.
   */
  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    if (!this.isMozambiqueMessage(smsBody)) {
      return null;
    }
    return super.parse(smsBody, sender, timestamp);
  }

  private isMozambiqueMessage(message: string): boolean {
    return /confirmado/i.test(message) &&
      message.includes('MT');
  }

  private parseAmountRaw(raw: string): number | null {
    const amountStr = raw.replace(/,/g, '');
    const parsed = parseFloat(amountStr);
    return isNaN(parsed) ? null : parsed;
  }

  protected extractAmount(message: string): number | null {
    // Purchase: "operacao de compra no valor de 1,234.56MT"
    // Deposit: "Depositaste o valor de 12,345.67MT"
    const valorPattern = /no\s+valor\s+de\s+([0-9,]+(?:\.[0-9]{2})?)\s*MT/i;
    const valorMatch = message.match(valorPattern);
    if (valorMatch) {
      return this.parseAmountRaw(valorMatch[1]);
    }

    const oValorPattern = /o\s+valor\s+de\s+([0-9,]+(?:\.[0-9]{2})?)\s*MT/i;
    const oValorMatch = message.match(oValorPattern);
    if (oValorMatch) {
      return this.parseAmountRaw(oValorMatch[1]);
    }

    // Verb-led amounts: "Transferiste X MT", "levantaste X MT", "Recebeste X MT"
    const verbPattern = /(?:Transferiste|levantaste|Recebeste)\s+([0-9,]+(?:\.[0-9]{2})?)\s*MT/i;
    const verbMatch = message.match(verbPattern);
    if (verbMatch) {
      return this.parseAmountRaw(verbMatch[1]);
    }

    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('transferiste')) return TransactionType.EXPENSE;
    if (lower.includes('operacao de compra')) return TransactionType.EXPENSE;
    if (lower.includes('levantaste')) return TransactionType.EXPENSE;
    if (lower.includes('depositaste')) return TransactionType.INCOME;
    if (lower.includes('recebeste')) return TransactionType.INCOME;
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Transfer: "para 258841234567 - JOHNDOE aos ..."
    const paraPattern = /para\s+\S+\s+-\s+(.+?)\s+aos\b/i;
    const paraMatch = message.match(paraPattern);
    if (paraMatch) {
      const merchant = this.cleanMerchantName(paraMatch[1].trim());
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    // Received: "de 123456 - SIMO aos ..."
    const dePattern = /\bde\s+\S+\s+-\s+(.+?)\s+aos\b/i;
    const deMatch = message.match(dePattern);
    if (deMatch) {
      const merchant = this.cleanMerchantName(deMatch[1].trim());
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    // Withdrawal: "no agente 425300 - BENJAMIM FERAGE." (number + name)
    const agenteNumNamePattern = /no\s+agente\s+\S+\s+-\s+(.+?)(?:\.|\s+O\s+novo\s+saldo|\s+aos\b)/i;
    const agenteNumNameMatch = message.match(agenteNumNamePattern);
    if (agenteNumNameMatch) {
      const merchant = this.cleanMerchantName(agenteNumNameMatch[1].trim());
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    // Deposit: "no agente JOHN DOE aos ..." (name only, no leading number/dash)
    const agenteNamePattern = /no\s+agente\s+(.+?)\s+aos\b/i;
    const agenteNameMatch = message.match(agenteNamePattern);
    if (agenteNameMatch) {
      const merchant = this.cleanMerchantName(agenteNameMatch[1].trim());
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    // Purchase: "na entidade EDM com referencia ..."
    const entidadePattern = /na\s+entidade\s+(.+?)(?:\s+com\s+referencia|\s+aos\b)/i;
    const entidadeMatch = message.match(entidadePattern);
    if (entidadeMatch) {
      const merchant = this.cleanMerchantName(entidadeMatch[1].trim());
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    // "novo saldo M-Pesa e de X MT" — tolerate extra/irregular spacing around words.
    const balancePattern = /novo\s+saldo\s+M-Pesa\s+e\s+de\s+([0-9,]+(?:\.[0-9]{2})?)\s*MT/i;
    const balanceMatch = message.match(balancePattern);
    if (balanceMatch) {
      return this.parseAmountRaw(balanceMatch[1]);
    }
    return null;
  }

  protected extractReference(message: string): string | null {
    // Reference is the code after "Confirmado " (e.g. DF50KDFDHWK).
    const refPattern = /Confirmado\s+([A-Z0-9]+)/i;
    const refMatch = message.match(refPattern);
    if (refMatch) {
      return refMatch[1];
    }
    return null;
  }

  protected isTransactionMessage(message: string): boolean {
    if (!this.isMozambiqueMessage(message)) {
      return false;
    }
    const lower = message.toLowerCase();
    const keywords = [
      'transferiste',
      'operacao de compra',
      'levantaste',
      'depositaste',
      'recebeste',
    ];
    return keywords.some((kw) => lower.includes(kw));
  }

  protected cleanMerchantName(merchant: string): string {
    return merchant
      .replace(/\s*\(.*?\)\s*$/, '')   // Remove trailing parentheses
      .replace(/\.\s*$/, '')            // Remove trailing period
      .replace(/\s*-\s*$/, '')          // Remove trailing dash
      .trim();
  }
}

export default new MPesaMozambiqueParser();
