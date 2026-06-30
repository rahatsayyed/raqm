import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType, createParsedTransaction } from '../core/types';

/**
 * Parser for CIB (Commercial International Bank) Egypt SMS messages
 *
 * Supported formats:
 * - Credit card charges: "Your credit card ending with#8016 was charged for EGP 118.00 at SAOOD MARKET on 24/11/25 at 18:27"
 * - Credit card refunds: "The transaction on your credit card#8016 from ORACLE IRELAND with EUR .93 on 15/11/25 at 05:14 has been refunded"
 *
 * Sender patterns: CIB
 */
export class CIBEgyptParser extends BankParser {

  getBankName(): string {
    return 'CIB Egypt';
  }

  getCurrency(): string {
    return 'EGP';
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    // Skip non-transaction messages
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

    // CIB supports international transactions, so extract currency from message
    const currency = this.extractCurrency(smsBody) ?? this.getCurrency();

    return createParsedTransaction({
      amount,
      type,
      merchant: this.extractMerchant(smsBody, sender),
      reference: this.extractReference(smsBody),
      accountLast4: this.extractAccountLast4(smsBody),
      balance: this.extractBalance(smsBody),
      creditLimit: this.extractAvailableLimit(smsBody),
      smsBody,
      sender,
      timestamp,
      bankName: this.getBankName(),
      isFromCard: this.detectIsCard(smsBody),
      currency,
    });
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender === 'CIB' ||
      normalizedSender.includes('CIB') ||
      /^[A-Z]{2}-CIB$/.test(normalizedSender) ||
      /^[A-Z]{2}-CIB-[A-Z]$/.test(normalizedSender);
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP and promotional messages
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code')
    ) {
      return false;
    }

    // CIB specific transaction keywords
    const cibKeywords = [
      'was charged',
      'was debited',
      'was spent',
      'has been refunded',
      'credited',
    ];

    return cibKeywords.some((kw) => lowerMessage.includes(kw));
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Refund is income
    if (lowerMessage.includes('has been refunded')) return TransactionType.INCOME;
    if (lowerMessage.includes('refunded')) return TransactionType.INCOME;

    // Charges are expenses
    if (lowerMessage.includes('was charged')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('was debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('was spent')) return TransactionType.EXPENSE;

    // Credits are income
    if (lowerMessage.includes('credited')) return TransactionType.INCOME;

    return super.extractTransactionType(message);
  }

  protected extractAmount(message: string): number | null {
    // Pattern 1: Credit card charge - "for EGP 118.00" or "for EUR 1,234.56"
    const chargePattern = /(?:for|with)\s+([A-Z]{3})\s+([0-9,]*\.?\d+)/i;
    const match = message.match(chargePattern);
    if (match) {
      const amountStr = match[2].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return super.extractAmount(message);
  }

  protected extractCurrency(message: string): string | null {
    // Pattern: "for EGP 118.00" or "with EUR .93"
    const currencyPattern = /(?:for|with)\s+([A-Z]{3})\s+[0-9,]*\.?\d+/i;
    const match = message.match(currencyPattern);
    if (match) {
      return match[1].toUpperCase();
    }

    return super.extractCurrency(message);
  }

  protected extractAccountLast4(message: string): string | null {
    const base = super.extractAccountLast4(message);
    if (base !== null) return base;

    // Pattern 1: "credit card ending with#8016" or "credit card#8016"
    const cardEndingPattern = /(?:credit\s+card|card)\s*(?:ending\s+with)?#(\d{4})/i;
    const match = message.match(cardEndingPattern);
    if (match) {
      return match[1];
    }

    return null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    const lowerMessage = message.toLowerCase();

    // Pattern 1: Charge transaction - "at SAOOD MARKET on"
    if (
      lowerMessage.includes('was charged') ||
      lowerMessage.includes('was debited') ||
      lowerMessage.includes('was spent')
    ) {
      const atMerchantPattern = /at\s+([A-Z0-9\s\/&\-]+?)\s+on\s+\d/i;
      const match = message.match(atMerchantPattern);
      if (match) {
        const merchant = this.cleanMerchantName(match[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    // Pattern 2: Refund transaction - "from ORACLE IRELAND with"
    if (lowerMessage.includes('refunded')) {
      const fromMerchantPattern = /from\s+([A-Z0-9\s\/&\-]+?)\s+with\s+[A-Z]{3}/i;
      const match = message.match(fromMerchantPattern);
      if (match) {
        const merchant = this.cleanMerchantName(match[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    return super.extractMerchant(message, sender);
  }

  protected extractAvailableLimit(message: string): number | null {
    // Pattern: "Card available limit is EGP  10000.21"
    const limitPattern = /(?:Card\s+)?available\s+limit\s+is\s+[A-Z]{3}\s+([0-9,]+(?:\.\d{2})?)/i;
    const match = message.match(limitPattern);
    if (match) {
      const limitStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(limitStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return super.extractAvailableLimit(message);
  }

  protected detectIsCard(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // CIB messages explicitly mention credit card
    return lowerMessage.includes('credit card') ||
      lowerMessage.includes('debit card') ||
      lowerMessage.includes('card ending') ||
      lowerMessage.includes('card#');
  }
}

export default new CIBEgyptParser();
