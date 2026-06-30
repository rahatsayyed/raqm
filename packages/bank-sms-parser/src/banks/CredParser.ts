import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for CRED credit card payment SMS messages.
 * CRED is a credit card payment service that facilitates bill payments.
 * Example: "Payment of Rs.XX,XXX has been successfully credited towards your ICICI Bank Credit Card. Your payment was settled in 3 seconds - CRED"
 * Sender: JK-CREDIN-S, etc.
 *
 * These messages represent credit card bill payments, which should be treated as transfers
 * from the user's bank account to their credit card account.
 */
export class CredParser extends BankParser {

  getBankName(): string {
    return 'CRED';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    // DLT patterns: JK-CREDIN-S, AX-CREDIN-S, etc.
    return /^[A-Z]{2}-CREDIN-S$/.test(normalizedSender) ||
      /^[A-Z]{2}-CRED-[TPG]$/.test(normalizedSender) ||
      /^[A-Z]{2}-CRED-S$/.test(normalizedSender) ||
      normalizedSender === 'CRED' ||
      normalizedSender === 'CREDIN';
  }

  extractAmount(message: string): number | null {
    // Pattern: "Rs.XX,XXX" or "Rs. XX,XXX"
    const amountPattern = /Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const match = message.match(amountPattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }
    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Extract the credit card name after "towards your"
    const towardsPattern = /towards\s+your\s+(.+?)\s+Credit\s+Card/i;
    const match = message.match(towardsPattern);
    if (match) {
      const cardName = match[1].trim();
      if (cardName.length > 0) {
        // Return something like "ICICI Bank Credit Card"
        return `${cardName} Credit Card`;
      }
    }
    // Default to "CRED"
    return super.extractMerchant(message, sender) ?? 'CRED';
  }

  extractTransactionType(message: string): TransactionType {
    // Credit card bill payments are transfers from bank account to credit card account
    return TransactionType.TRANSFER;
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    // Must contain "payment of" and "credited towards your" to be a CRED transaction
    return lowerMessage.includes('payment of') &&
      lowerMessage.includes('credited towards your');
  }
}

export default new CredParser();
