import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Huntington Bank SMS messages (USA)
 *
 * Supported formats:
 * - Debit card: "Huntington Heads Up. We processed a debit card withdrawal: $25.00 at Bob Inc. Acct CK0000 has a $10.12 bal (10/19/25 5:43 AM ET)."
 * - ATM: "Huntington Heads Up. We processed an ATM withdrawal: $162.45 at POS John Inc. Acct CK0000 has a $20.20 bal (9/03/25 12:12 PM ET)."
 * - ACH: "Huntington Heads Up. We processed an ACH withdrawal: $50.67 at GEICO           . Acct CK0000 has a $6211.32 bal (8/09/25 3:23 PM ET)."
 *
 * Common senders: Huntington Bank, HUNTINGTON
 */
export class HuntingtonBankParser extends BankParser {

  getBankName(): string {
    return 'Huntington Bank';
  }

  getCurrency(): string {
    return 'USD';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return (
      upperSender.includes('HUNTINGTON') ||
      upperSender === 'HUNTINGTON BANK' ||
      /^[A-Z]{2}-HUNTINGTON-[A-Z]$/.test(upperSender)
    );
  }

  extractAmount(message: string): number | null {
    // Pattern: "withdrawal: $25.00 at" or "withdrawal: $162.45 at"
    const withdrawalPattern = /withdrawal:\s+\$([0-9,]+(?:\.\d{2})?)\s+at/i;
    const match = message.match(withdrawalPattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const parsed = parseFloat(amount);
      return isNaN(parsed) ? null : parsed;
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Huntington uses "withdrawal" for all expense transactions
    if (lowerMessage.includes('withdrawal')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('debit card withdrawal')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('atm withdrawal')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('ach withdrawal')) return TransactionType.EXPENSE;

    return super.extractTransactionType(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern: "at Bob Inc. Acct" or "at BC *UBER CASH. Acct" or "at POS John Inc. Acct"
    // Note: Merchant name may end with a period, so we match up to ". Acct" (period + space + Acct)
    const merchantPattern = /at\s+(.+?)\.\s+Acct/i;
    const match = message.match(merchantPattern);
    if (match) {
      const merchant = this.cleanMerchantName(match[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Fall back to base class patterns
    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const fromSuper = super.extractAccountLast4(message);
    if (fromSuper !== null && fromSuper !== undefined) return fromSuper;

    // Pattern: "Acct CK0000" - extract the last 4 digits from the account number
    const accountPattern = /Acct\s+CK(\d{4})/i;
    const accountMatch = message.match(accountPattern);
    if (accountMatch) {
      return accountMatch[1];
    }

    // Generic pattern for account ending
    const endingPattern = /account\s+ending\s+(\d{4})/i;
    const endingMatch = message.match(endingPattern);
    if (endingMatch) {
      return endingMatch[1];
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern: "has a $10.12 bal" or "has a -$15.01 bal"
    const balancePattern = /has\s+a\s+(-?\$[0-9,]+(?:\.\d{2})?)\s+bal/i;
    const match = message.match(balancePattern);
    if (match) {
      const balanceStr = match[1].replace(/\$/g, '').replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      return isNaN(parsed) ? null : parsed;
    }

    // Fall back to base class patterns
    return super.extractBalance(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip non-transaction messages
    if (lowerMessage.includes('heads up') && !lowerMessage.includes('withdrawal')) {
      return false;
    }

    // Huntington specific transaction keywords
    const huntingtonTransactionKeywords = [
      'we processed a debit card withdrawal',
      'we processed an atm withdrawal',
      'we processed an ach withdrawal',
    ];

    if (huntingtonTransactionKeywords.some((kw) => lowerMessage.includes(kw))) {
      return true;
    }

    return super.isTransactionMessage(message);
  }

  detectIsCard(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Huntington sends specific alerts for different transaction types
    if (lowerMessage.includes('debit card withdrawal')) return true;
    if (lowerMessage.includes('atm withdrawal')) return true; // ATM transactions are card-based
    if (lowerMessage.includes('ach withdrawal')) return false; // ACH transactions are not card-based

    return super.detectIsCard(message);
  }
}

export default new HuntingtonBankParser();
