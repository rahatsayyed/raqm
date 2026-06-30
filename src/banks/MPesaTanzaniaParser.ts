import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for M-Pesa Tanzania (Vodacom) mobile money SMS messages
 *
 * Handles formats like:
 * - "SGR1234567 Confirmed. You have received TZS 50,000.00 from JOHN DOE (255754XXXXXX)"
 * - "SGR9876543 Confirmed. TZS 20,000.00 sent to JANE SMITH (255762XXXXXX)"
 * - "SGR5544332 Confirmed. TZS 15,000.00 paid to SUPERMARKET X (Merchant ID: 556677)"
 * - "SGR1122334 Confirmed. TZS 10,000.00 paid to LUKU for account 1423XXXXXXX. Token: ..."
 *
 * Key patterns:
 * - Transaction ID: 10 character alphanumeric starting with SGR (e.g., SGR1234567)
 * - Status: "Confirmed." at start after transaction ID
 * - Balance: "New M-Pesa balance is TZS X"
 * - Currency: TZS (Tanzanian Shilling)
 *
 * Note: This is distinct from Kenya M-Pesa which uses KES currency
 * Country: Tanzania
 */
export class MPesaTanzaniaParser extends BankParser {

  getBankName(): string {
    return 'M-Pesa Tanzania';
  }

  getCurrency(): string {
    return 'TZS';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    // M-Pesa Tanzania uses same sender IDs but we differentiate by content
    return normalizedSender.includes('MPESA') ||
      normalizedSender.includes('M-PESA') ||
      normalizedSender === 'MPESA' ||
      normalizedSender === 'M-PESA' ||
      normalizedSender.includes('VODACOM');
  }

  /**
   * Override parse to check for TZS currency (Tanzania)
   * This helps differentiate from Kenya M-Pesa which uses KES
   */
  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    // Only parse if message contains TZS (Tanzanian Shilling)
    // This differentiates from Kenya M-Pesa which uses Ksh/KES
    if (!smsBody.toLowerCase().includes('tzs')) {
      return null;
    }

    return super.parse(smsBody, sender, timestamp);
  }

  extractAmount(message: string): number | null {
    // Pattern 1: "TZS 50,000.00" with space
    const tzsSpacePattern = /TZS\s+([0-9,]+(?:\.[0-9]{2})?)/i;
    const spaceMatch = message.match(tzsSpacePattern);
    if (spaceMatch) {
      const amountStr = spaceMatch[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        return amount;
      }
    }

    // Pattern 2: "TZS50,000.00" without space
    const tzsNoSpacePattern = /TZS([0-9,]+(?:\.[0-9]{2})?)/i;
    const noSpaceMatch = message.match(tzsNoSpacePattern);
    if (noSpaceMatch) {
      const amountStr = noSpaceMatch[1].replace(/,/g, '');
      const amount = parseFloat(amountStr);
      if (!isNaN(amount)) {
        return amount;
      }
    }

    return null;
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Received money = income
    if (
      lowerMessage.includes('you have received') ||
      lowerMessage.includes('received tsh') ||
      lowerMessage.includes('received tzs')
    ) {
      return TransactionType.INCOME;
    }

    // Sent/paid money = expense
    if (lowerMessage.includes('sent to')) {
      return TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('paid to')) {
      return TransactionType.EXPENSE;
    }
    if (lowerMessage.includes('withdrawn')) {
      return TransactionType.EXPENSE;
    }

    return null;
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: "received TZS X from NAME (phone)"
    const fromPattern = /from\s+([A-Z][A-Za-z\s]+?)(?:\s*\(|$)/i;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      const merchant = this.cleanMerchantName(fromMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2: "sent to NAME (phone)" or "TZS X sent to NAME"
    const sentToPattern = /sent to\s+([A-Z][A-Za-z\s]+?)(?:\s*\(|$)/i;
    const sentToMatch = message.match(sentToPattern);
    if (sentToMatch) {
      const merchant = this.cleanMerchantName(sentToMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 3: "paid to MERCHANT (Merchant ID: X)"
    const paidToMerchantPattern = /paid to\s+([A-Za-z0-9\s]+?)(?:\s*\(Merchant|\s+on|\s*$)/i;
    const paidToMatch = message.match(paidToMerchantPattern);
    if (paidToMatch) {
      const merchant = this.cleanMerchantName(paidToMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 4: "paid to LUKU for account X" (utility payment)
    const utilityPattern = /paid to\s+(\w+)\s+for\s+account/i;
    const utilityMatch = message.match(utilityPattern);
    if (utilityMatch) {
      return utilityMatch[1].trim();
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern: "New M-Pesa balance is TZS 150,000.00"
    const balancePattern = /New M-Pesa balance is TZS\s*([0-9,]+(?:\.[0-9]{2})?)/i;
    const balanceMatch = message.match(balancePattern);
    if (balanceMatch) {
      const balanceStr = balanceMatch[1].replace(/,/g, '');
      const balance = parseFloat(balanceStr);
      if (!isNaN(balance)) {
        return balance;
      }
    }

    return null;
  }

  extractReference(message: string): string | null {
    // Pattern 1: Transaction ID at start (10-char alphanumeric, typically starts with SGR)
    // e.g., "SGR1234567 Confirmed"
    const txnIdPattern = /^([A-Z0-9]{10})\s+Confirmed/i;
    const txnIdMatch = message.match(txnIdPattern);
    if (txnIdMatch) {
      return txnIdMatch[1];
    }

    // Pattern 2: Alternative pattern without space
    const txnIdAltPattern = /^([A-Z0-9]{10})\s+Confirmed\./i;
    const txnIdAltMatch = message.match(txnIdAltPattern);
    if (txnIdAltMatch) {
      return txnIdAltMatch[1];
    }

    // Pattern 3: TIPS Reference for inter-operator transfers
    const tipsPattern = /TIPS\s+Reference[:\s]+([A-Z0-9]+)/i;
    const tipsMatch = message.match(tipsPattern);
    if (tipsMatch) {
      return tipsMatch[1];
    }

    return null;
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Must contain "Confirmed" (M-Pesa Tanzania standard)
    if (!lowerMessage.includes('confirmed')) {
      return false;
    }

    // Must contain TZS currency indicator
    if (!lowerMessage.includes('tzs')) {
      return false;
    }

    // Must contain transaction keywords
    const transactionKeywords = [
      'received',
      'sent to',
      'paid to',
      'withdrawn',
      'new m-pesa balance',
    ];

    return transactionKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  cleanMerchantName(merchant: string): string {
    return merchant
      .replace(/\s*\(.*?\)\s*$/, '')    // Remove trailing parentheses
      .replace(/\s+on\s+\d{4}.*/, '')   // Remove date suffix
      .replace(/\s+at\s+\d{2}:\d{2}.*/, '') // Remove time suffix
      .replace(/\s*-\s*$/, '')          // Remove trailing dash
      .trim();
  }
}

export default new MPesaTanzaniaParser();
