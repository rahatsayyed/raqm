import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Priorbank (Belarus) SMS messages
 *
 * Handles formats like:
 * - "Karta 6***6666 29-10-25 18:34:25. Oplata 12.90 BYN. BLR RBO N77 "KFC Zavod". Dostupno: 947.09 BYN."
 *
 * Common keywords:
 * - "Karta" = Card
 * - "Oplata" = Payment (expense)
 * - "Dostupno" = Available (balance)
 * - Currency: BYN (Belarusian Ruble)
 */
export class PriorbankParser extends BankParser {

  getBankName(): string {
    return 'Priorbank';
  }

  getCurrency(): string {
    return 'BYN';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('PRIORBANK') ||
      normalizedSender === 'PRIORBANK';
  }

  extractAmount(message: string): number | null {
    // Pattern: "Oplata 12.90 BYN" or "Oplata 8.00 BYN"
    const oplataPattern = /Oplata\s+([0-9]+(?:\.\d{2})?)\s+BYN/i;
    const match = message.match(oplataPattern);
    if (match) {
      const amountStr = match[1];
      const parsed = parseFloat(amountStr);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // "Oplata" means payment/expense in Belarusian/Russian
    if (lowerMessage.includes('oplata')) {
      return TransactionType.EXPENSE;
    }

    // For future: could add support for income transactions
    // "Popolnenie" or "Zachislenie" typically mean credit/income
    if (lowerMessage.includes('popolnenie') || lowerMessage.includes('zachislenie')) {
      return TransactionType.INCOME;
    }

    return null;
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: Merchant in quotes "KFC Zavod"
    const quotedPattern = /"([^"]+)"/i;
    const quotedMatch = message.match(quotedPattern);
    if (quotedMatch) {
      const merchant = this.cleanMerchantName(quotedMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2: Location/merchant after "BYN. " and before ". Dostupno"
    // Example: "BYN. BLR AZS N55. Dostupno"
    const locationPattern = /BYN\.\s+([^.]+?)\.\s+Dostupno/i;
    const locationMatch = message.match(locationPattern);
    if (locationMatch) {
      let merchant = locationMatch[1].trim();

      // Clean up common prefixes
      merchant = merchant.replace(/^BLR\s+/, ''); // Remove "BLR " prefix

      merchant = this.cleanMerchantName(merchant);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    return null;
  }

  extractAccountLast4(message: string): string | null {
    const superResult = super.extractAccountLast4(message);
    if (superResult !== null && superResult !== undefined) {
      return superResult;
    }
    // Pattern: "Karta 6***6666" - extract digits only
    const kartaPattern = /Karta\s+[6-9][\*]+(\d{4})/i;
    const match = message.match(kartaPattern);
    if (match) {
      return match[1];
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern: "Dostupno: 947.09 BYN" or "Dostupno: 250.70 BYN"
    const dostupnoPattern = /Dostupno:\s+([0-9]+(?:\.\d{2})?)\s+BYN/i;
    const match = message.match(dostupnoPattern);
    if (match) {
      const balanceStr = match[1];
      const parsed = parseFloat(balanceStr);
      return isNaN(parsed) ? null : parsed;
    }

    return null;
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP messages
    if (lowerMessage.includes('otp') ||
      lowerMessage.includes('kod') || // "kod" = code in Russian
      lowerMessage.includes('parol')) { // "parol" = password in Russian
      return false;
    }

    // Must contain transaction keywords
    const transactionKeywords = [
      'oplata',    // payment
      'karta',     // card
      'dostupno'   // available balance
    ];

    return transactionKeywords.some(keyword => lowerMessage.includes(keyword));
  }
}

export default new PriorbankParser();
