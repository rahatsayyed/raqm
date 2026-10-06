import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Slice payments bank transactions.
 * Handles messages from JK-SLICEIT and similar senders.
 */
export class SliceParser extends BankParser {
  getBankName(): string {
    return 'Slice';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return (
      normalizedSender.includes('SLICE') ||
      normalizedSender.includes('SLICEIT') ||
      normalizedSender.includes('SLCEIT') || // Matches JD-SLCEIT-S and similar
      normalizedSender.includes('SLCBNK') // Slice SFB sender, e.g. VA-SLCBNK-S
    );
  }

  private isSuccessMessage(message: string): boolean {
    const lower = message.toLowerCase();
    // Use word boundaries to avoid matching "unsuccessful"
    return (
      /\bsuccessful\b/.test(lower) ||
      /\bsuccess\b/.test(lower) ||
      lower.includes('approved') ||
      lower.includes('confirmed')
    );
  }

  private isFailureMessage(message: string): boolean {
    const lower = message.toLowerCase();
    return (
      lower.includes('declined') ||
      lower.includes('failed') ||
      lower.includes('rejected') ||
      lower.includes('error') ||
      lower.includes('denied') ||
      lower.includes('unsuccessful')
    );
  }

  private isDatePhrase(text: string): boolean {
    // Simple date pattern matching month names with day numbers
    const datePattern = /\b(?:\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2})\b/i;
    return datePattern.test(text);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // OTP / authorization messages are not completed transactions
    if (lowerMessage.includes('otp')) {
      return false;
    }

    // UPI AutoPay mandate lifecycle notices move no money
    if (
      lowerMessage.includes('revoked') ||
      lowerMessage.includes('is paused') ||
      lowerMessage.includes('is suspended')
    ) {
      return false;
    }

    // The base keyword list lacks "sent"; collect requests are rejected by the base guards
    if (lowerMessage.includes('sent')) {
      return true;
    }

    // For "transaction" keyword, ensure it's a successful transaction
    if (lowerMessage.includes('transaction')) {
      return this.isSuccessMessage(message) && !this.isFailureMessage(message);
    }

    return super.isTransactionMessage(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    const lowerMessage = message.toLowerCase();

    // Slice SFB card spend: "transaction of Rs. 2.07 at MERCHANT from a/c ... is successful"
    const atMerchantMatch = message.match(/\bat\s+(.+?)(?:\s+from\b|\s+on\b|\s+is\b|\.\s|$)/i);
    if (atMerchantMatch) {
      const merchant = this.cleanMerchantName(atMerchantMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Slice SFB account flows always carry an a/c reference; "in your" ends the payer in app notifications
    if (/\ba\/c\b/i.test(message)) {
      const payeeKeyword = lowerMessage.includes('received') ? 'from' : 'to';
      const payeePattern = new RegExp(
        `\\b${payeeKeyword}\\s+(.+?)(?:\\s+in\\s+your\\b|\\s+on\\b|\\s+via\\b|\\s+is\\b|\\s*\\(|\\.\\s|$)`,
        'i'
      );
      const payeeMatch = message.match(payeePattern);
      if (payeeMatch) {
        const merchant = this.cleanMerchantName(payeeMatch[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    // Look for "sent to NAME" pattern for UPI transfers
    const sentToPattern = /sent.*to\s+([A-Z][A-Z0-9\s./&-]+?)\s*\(/i;
    const sentToMatch = message.match(sentToPattern);
    if (sentToMatch) {
      const merchant = sentToMatch[1].trim();
      if (merchant.length > 0) {
        return this.cleanMerchantName(merchant);
      }
    }

    // Look for "from MERCHANT" pattern
    const fromPattern = /from\s+([A-Z][A-Z0-9\s]+?)(?:\s+on|\s+\(|$)/i;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      const merchant = fromMatch[1].trim();
      if (merchant.length > 0 && merchant.toLowerCase() !== 'neft') {
        return this.cleanMerchantName(merchant);
      }
    }

    // Look for "on MERCHANT" pattern for credit card transactions
    const onPattern = /\bon\s+([A-Za-z0-9\s./&-]+?)(?:\s+is|$)/i;
    const onMatch = message.match(onPattern);
    if (onMatch) {
      const merchant = onMatch[1].trim();
      if (
        merchant.length > 0 &&
        merchant.toLowerCase() !== 'slice' &&
        merchant.toLowerCase() !== 'rs' &&
        !this.isDatePhrase(merchant)
      ) {
        return this.cleanMerchantName(merchant);
      }
    }

    // Check for specific patterns
    if (lowerMessage.includes('paypal')) {
      return 'PayPal';
    }
    if (lowerMessage.includes('slice') && lowerMessage.includes('credited')) {
      return 'Slice Credit';
    }
    return super.extractMerchant(message, sender) ?? 'Slice';
  }

  detectIsCard(message: string): boolean {
    const lower = message.toLowerCase();
    // SFB card-spend text carries an a/c reference, which the base detector treats as non-card
    if (
      lower.includes('transaction of') &&
      /\bat\s/i.test(message) &&
      !lower.includes('sent') &&
      !lower.includes('received') &&
      !lower.includes('paid')
    ) {
      return true;
    }
    return super.detectIsCard(message);
  }

  extractBalance(message: string): number | null {
    // Dots after Avl/Bal ("Avl. Bal. Rs. 2,203.56") break the base patterns
    const match = message.match(/Avl\.?\s*Bal\.?\s*(?:Rs\.?|INR|₹)?\s*([0-9,]+(?:\.\d{2})?)/i);
    if (match) {
      const parsed = parseFloat(match[1].replace(/,/g, ''));
      return isNaN(parsed) ? null : parsed;
    }
    return super.extractBalance(message);
  }

  extractReference(message: string): string | null {
    const upiRef = message.match(/UPI\s+Ref(?:\s+ID)?[:\s]+([0-9]+)/i);
    if (upiRef) return upiRef[1];

    const refId = message.match(/Ref\s+ID[:\s]+([0-9]+)/i);
    if (refId) return refId[1];

    return super.extractReference(message);
  }

  /**
   * Returns true when the message clearly references a Slice credit-card product
   * (legacy, pre-2022 RBI PPI pivot). Modern Slice is a UPI / savings-account
   * product, so without explicit card context we treat debits as EXPENSE, not
   * CREDIT (which downstream is interpreted as "credit card account").
   */
  private hasCardContext(lowerMessage: string): boolean {
    return (
      lowerMessage.includes('credit card') ||
      lowerMessage.includes('credit limit') ||
      lowerMessage.includes('available limit') ||
      lowerMessage.includes('card ending') ||
      lowerMessage.includes('card xx') ||
      lowerMessage.includes('card no') ||
      lowerMessage.includes('on your slice card') ||
      lowerMessage.includes('slice card')
    );
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();
    const cardContext = this.hasCardContext(lowerMessage);

    // Slice credits/cashbacks (income side unchanged)
    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('received')) return TransactionType.INCOME;
    if (lowerMessage.includes('cashback')) return TransactionType.INCOME;
    if (lowerMessage.includes('refund')) return TransactionType.INCOME;

    // Slice payments/debits.
    // After RBI's 2022 PPI guidelines, Slice pivoted from a credit-card
    // product to a UPI / savings-account product (Slice Bank). Debits
    // from the bank account must be EXPENSE so that downstream code
    // does not classify the account as a credit card. Only fall back
    // to CREDIT when the message explicitly mentions card context.
    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('sent')) return TransactionType.EXPENSE; // UPI transfer
    if (lowerMessage.includes('spent')) {
      return cardContext ? TransactionType.CREDIT : TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('paid')) {
      return cardContext ? TransactionType.CREDIT : TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('payment') && !lowerMessage.includes('received')) {
      return cardContext ? TransactionType.CREDIT : TransactionType.EXPENSE;
    }
    // Only map bare "transaction" word to a type if it's a successful
    // transaction; default to EXPENSE unless clearly card-context.
    if (
      lowerMessage.includes('transaction') &&
      !lowerMessage.includes('credited') &&
      this.isSuccessMessage(message) &&
      !this.isFailureMessage(message)
    ) {
      return cardContext ? TransactionType.CREDIT : TransactionType.EXPENSE;
    }

    return super.extractTransactionType(message);
  }
}

export default new SliceParser();
