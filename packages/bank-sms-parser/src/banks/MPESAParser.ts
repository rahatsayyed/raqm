import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for M-PESA (Kenya) mobile money SMS messages
 *
 * Handles formats like:
 * - "Ksh70.00 paid to Person Name on 20/10/24"
 * - "Ksh1000.00 sent to Equity Paybill Account for account 123123"
 * - "You have received Ksh300.00 from Person Name"
 * - "Ksh50.00 sent to Person Name 0711 111 111"
 *
 * Common patterns:
 * - Transaction ID: 10-character alphanumeric (e.g., TJK6H7T3GA)
 * - "Confirmed." at start
 * - "New M-PESA balance is Ksh..."
 * Currency: KES (Kenyan Shilling)
 */
export class MPESAParser extends BankParser {

  getBankName(): string {
    return 'M-PESA';
  }

  getCurrency(): string {
    return 'KES';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('MPESA') ||
      normalizedSender.includes('M-PESA') ||
      normalizedSender === 'MPESA' ||
      normalizedSender === 'M-PESA';
  }

  protected extractAmount(message: string): number | null {
    // Pattern 1: "Ksh70.00 paid" or "Ksh1,120.00 paid" or "Ksh1000.00 sent"
    const amountPattern = /Ksh([0-9,]+(?:\.[0-9]{2})?)\s+(?:paid|sent|received)/i;
    const amountMatch = message.match(amountPattern);
    if (amountMatch) {
      const amountStr = amountMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    // Pattern 2: "received Ksh300.00 from"
    const receivedPattern = /received\s+Ksh([0-9,]+(?:\.[0-9]{2})?)/i;
    const receivedMatch = message.match(receivedPattern);
    if (receivedMatch) {
      const amountStr = receivedMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // "You have received" = income
    if (lowerMessage.includes('you have received') ||
      lowerMessage.includes('received ksh')
    ) {
      return TransactionType.INCOME;
    }

    // "paid to" or "sent to" = expense
    if (lowerMessage.includes('paid to') ||
      lowerMessage.includes('sent to')
    ) {
      return TransactionType.EXPENSE;
    }

    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Pattern 1: "paid to Person Name. on DATE" or "paid to Person 4 1. on DATE"
    // Capture everything before " number. on" pattern
    const paidToPattern = /paid to\s+(.+?)\s+\d+\.\s+on/i;
    const paidToMatch = message.match(paidToPattern);
    if (paidToMatch) {
      let merchant = paidToMatch[1].trim();
      merchant = this.cleanMerchantName(merchant);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2: "sent to Person 2 0711 111 111" (with phone number - spaced format)
    const sentToPhonePattern = /sent to\s+(.+?)\s+0\d{3}\s+\d{3}\s+\d{3}/i;
    const sentToPhoneMatch = message.match(sentToPhonePattern);
    if (sentToPhoneMatch) {
      let merchant = sentToPhoneMatch[1].trim();
      merchant = this.cleanMerchantName(merchant);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 3: "sent to PAYBILL_NAME for account NUMBER" or "sent to Equity Paybill Account for account"
    const sentToAccountPattern = /sent to\s+(.+?)\s+for account/i;
    const sentToAccountMatch = message.match(sentToAccountPattern);
    if (sentToAccountMatch) {
      let merchant = sentToAccountMatch[1].trim();
      merchant = this.cleanMerchantName(merchant);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 4: "received from Person 3 0712121212" or "from BANK OF BARODA KENYA LIMITED 123123"
    // Use greedy match, then remove phone/account numbers BEFORE cleanMerchantName (which removes "LIMITED")
    // Also handle "from LOOP B2C. on" by removing trailing period
    const receivedFromPattern = /received\s+(?:Ksh[0-9,]+(?:\.[0-9]{2})?\s+)?from\s+(.+?)\s+on/i;
    const receivedFromMatch = message.match(receivedFromPattern);
    if (receivedFromMatch) {
      let merchant = receivedFromMatch[1].trim();
      // Remove trailing period (for "LOOP B2C.")
      merchant = merchant.endsWith('.') ? merchant.slice(0, -1).trim() : merchant;
      // Remove phone numbers at the end (10 digits without country code)
      merchant = merchant.replace(/\s+0\d{10}$/, '');
      // Remove account numbers at the end (6+ digits) - BEFORE cleanMerchantName
      merchant = merchant.replace(/\s+\d{6,}$/, '').trim();

      merchant = this.cleanMerchantName(merchant);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 5: "from COMPANY NAME. on DATE" (period before "on")
    const fromPattern = /from\s+([^.]+)\.\s+on/i;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      let merchant = fromMatch[1].trim();
      // Remove phone numbers at the end
      merchant = merchant.replace(/\s+0\d{10}$/, '');

      merchant = this.cleanMerchantName(merchant);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    // Pattern: "New M-PESA balance is Ksh123.12"
    const balancePattern = /New M-PESA balance is Ksh([0-9,]+(?:\.[0-9]{2})?)/i;
    const balanceMatch = message.match(balancePattern);
    if (balanceMatch) {
      const balanceStr = balanceMatch[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  protected extractReference(message: string): string | null {
    // Pattern 1: Transaction ID at the start (e.g., "TJK6H7T3GA Confirmed")
    const txnIdPattern = /^([A-Z0-9]{10})\s+Confirmed/i;
    const txnIdMatch = message.match(txnIdPattern);
    if (txnIdMatch) {
      return txnIdMatch[1];
    }

    // Pattern 2: Alternative pattern: "TJF987E58C Confirmed.You"
    const txnIdAltPattern = /^([A-Z0-9]{10})\s+Confirmed\./i;
    const txnIdAltMatch = message.match(txnIdAltPattern);
    if (txnIdAltMatch) {
      return txnIdAltMatch[1];
    }

    // Pattern 3: After "Congratulations! " (e.g., "Congratulations! TJ56H6J1WU confirmed")
    const congratsPattern = /Congratulations!\s+([A-Z0-9]{10})\s+confirmed/i;
    const congratsMatch = message.match(congratsPattern);
    if (congratsMatch) {
      return congratsMatch[1];
    }

    return null;
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip promotional messages that don't have "Confirmed"
    if (!lowerMessage.includes('confirmed')) {
      return false;
    }

    // Must contain transaction keywords
    const transactionKeywords = [
      'paid to',
      'sent to',
      'received',
      'new m-pesa balance',
    ];

    return transactionKeywords.some((kw) => lowerMessage.includes(kw));
  }

  cleanMerchantName(merchant: string): string {
    // For M-PESA, we want to keep "LIMITED" in company names like "BANK OF BARODA KENYA LIMITED"
    // So we only apply basic cleaning, not the LTD/LIMITED removal
    return merchant
      .replace(/\s*\(.*?\)\s*$/g, '')           // Remove trailing parentheses
      .replace(/\s+Ref\s+No.*/gi, '')            // Remove ref numbers
      .replace(/\s+on\s+\d{2}.*/g, '')           // Remove date suffixes
      .replace(/\s+UPI.*/gi, '')                  // Remove UPI suffixes
      .replace(/\s+at\s+\d{2}:\d{2}.*/g, '')    // Remove time suffixes
      .replace(/\s*-\s*$/g, '')                   // Remove trailing dash
      .trim();
  }
}

export default new MPESAParser();
