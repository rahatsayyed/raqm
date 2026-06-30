import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction } from '../core/types';

/**
 * Parser for Union Bank of India SMS messages
 *
 * Supported formats:
 * - Debit: "A/c *1234 Debited for Rs:100.00 on 11-08-2025 18:28:02 by Mob Bk ref no 123456789000 Avl Bal Rs:12345.67"
 * - Credit transactions
 * - ATM withdrawals
 * - UPI transactions
 *
 * Sender patterns: XX-UNIONB-S/T, UNIONB, UNIONBANK, etc.
 */
export class UnionBankParser extends BaseIndianBankParser {
  getBankName(): string {
    return 'Union Bank of India';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return (
      normalizedSender.includes('UNIONB') ||
      normalizedSender.includes('UNIONBANK') ||
      normalizedSender.includes('UBOI') ||
      // DLT patterns for transactions (-S, -T suffix)
      /^[A-Z]{2}-UNIONB-[ST]$/.test(normalizedSender) ||
      // Other DLT patterns
      /^[A-Z]{2}-UNIONB-[TPG]$/.test(normalizedSender) ||
      // Legacy patterns
      /^[A-Z]{2}-UNIONB$/.test(normalizedSender) ||
      /^[A-Z]{2}-UNIONBANK$/.test(normalizedSender)
    );
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Union Bank includes "Never Share OTP/PIN/CVV" warning in transaction messages
    // Check if it's actually a transaction first before rejecting due to OTP keyword
    const transactionKeywords = [
      'debited', 'credited', 'withdrawn', 'deposited',
      'spent', 'received', 'transferred', 'paid',
    ];

    if (transactionKeywords.some(keyword => lowerMessage.includes(keyword))) {
      // It's a transaction message, even if it contains OTP in warning text
      return true;
    }

    // Fall back to parent logic for non-transaction messages
    return super.isTransactionMessage(message);
  }

  extractAmount(message: string): number | null {
    // Pattern 1: "Rs:100.00" or "Rs.100.00" (Union Bank format with colon)
    const amountPattern1 = /Rs[:.]?\s*([0-9,]+(?:\.\d{2})?)/i;
    const match1 = message.match(amountPattern1);
    if (match1) {
      const amount = parseFloat(match1[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 2: "INR 500" format
    const amountPattern2 = /INR\s+([0-9,]+(?:\.\d{2})?)/i;
    const match2 = message.match(amountPattern2);
    if (match2) {
      const amount = parseFloat(match2[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: Mobile Banking - "by Mob Bk"
    if (message.toLowerCase().includes('mob bk')) {
      return 'Mobile Banking Transfer';
    }

    // Pattern 2: ATM transactions
    if (message.toUpperCase().includes('ATM')) {
      const atmPattern = /at\s+([^.\s]+(?:\s+[^.\s]+)*)(?:\s+on|\s+Avl|$)/i;
      const atmMatch = message.match(atmPattern);
      if (atmMatch) {
        return this.cleanMerchantName(atmMatch[1].trim());
      }
      return 'ATM Withdrawal';
    }

    // Pattern 3: UPI transactions - "UPI/merchant" or "VPA merchant@bank"
    if (message.toUpperCase().includes('UPI')) {
      const upiPattern = /UPI[/:]?\s*([^,.\s]+)/i;
      const upiMatch = message.match(upiPattern);
      if (upiMatch) {
        return this.cleanMerchantName(upiMatch[1].trim());
      }
    }

    if (message.toUpperCase().includes('VPA')) {
      const vpaPattern = /VPA\s+([^@\s]+)/i;
      const vpaMatch = message.match(vpaPattern);
      if (vpaMatch) {
        const vpaName = vpaMatch[1].trim();
        return this.parseUPIMerchant(vpaName);
      }
    }

    // Pattern 4: "to <merchant>" for transfers
    const toPattern = /to\s+([^.\n]+?)(?:\s+on|\s+Avl|$)/i;
    const toMatch = message.match(toPattern);
    if (toMatch) {
      const merchant = toMatch[1].trim();
      if (!merchant.toLowerCase().includes('avl')) {
        return this.cleanMerchantName(merchant);
      }
    }

    // Pattern 5: "from <sender>" for credits
    const fromPattern = /from\s+([^.\n]+?)(?:\s+on|\s+Avl|$)/i;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      const merchant = fromMatch[1].trim();
      if (!merchant.toLowerCase().includes('avl')) {
        return this.cleanMerchantName(merchant);
      }
    }

    // Fall back to base class extraction
    return super.extractMerchant(message, sender);
  }

  extractReference(message: string): string | null {
    // Union Bank format: "ref no 123456789000"
    const refPatterns = [
      /ref\s+no\s+([\w]+)/i,
      /ref[:#]?\s*([\w]+)/i,
      /reference[:#]?\s*([\w]+)/i,
      /txn[:#]?\s*([\w]+)/i,
    ];

    for (const pattern of refPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return super.extractReference(message);
  }

  extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null && parentResult !== undefined) return parentResult;

    // Union Bank format: "A/c *1234" or "A/C X1234"
    const accountPatterns = [
      /A\/[Cc]\s*[*X](\d{4})/i,
      /Account\s*[*X](\d{4})/i,
      /Acc\s*[*X](\d{4})/i,
      /A\/[Cc]\s+(\d{4})/i,
    ];

    for (const pattern of accountPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Union Bank format: "Avl Bal Rs:12345.67" or "Avl Bal Rs.12345.67"
    const balancePatterns = [
      /Avl\s+Bal\s+Rs[:.]?\s*([0-9,]+(?:\.\d{2})?)/i,
      /Available\s+Balance[:.]?\s*Rs[:.]?\s*([0-9,]+(?:\.\d{2})?)/i,
      /Balance[:.]?\s*Rs[:.]?\s*([0-9,]+(?:\.\d{2})?)/i,
      /Bal[:.]?\s*Rs[:.]?\s*([0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of balancePatterns) {
      const match = message.match(pattern);
      if (match) {
        const balance = parseFloat(match[1].replace(/,/g, ''));
        if (!isNaN(balance)) return balance;
      }
    }

    return super.extractBalance(message);
  }

  private parseUPIMerchant(vpa: string): string {
    const cleanVPA = vpa.toLowerCase();

    if (cleanVPA.includes('paytm')) return 'Paytm';
    if (cleanVPA.includes('phonepe')) return 'PhonePe';
    if (cleanVPA.includes('googlepay') || cleanVPA.includes('gpay')) return 'Google Pay';
    if (cleanVPA.includes('bharatpe')) return 'BharatPe';
    if (cleanVPA.includes('amazon')) return 'Amazon';
    if (cleanVPA.includes('flipkart')) return 'Flipkart';
    if (cleanVPA.includes('swiggy')) return 'Swiggy';
    if (cleanVPA.includes('zomato')) return 'Zomato';
    if (cleanVPA.includes('uber')) return 'Uber';
    if (cleanVPA.includes('ola')) return 'Ola';

    // Individual transfers (just numbers)
    if (/^\d+$/.test(cleanVPA)) return 'Individual';

    // Default - clean up the VPA name
    const parts = cleanVPA.split(/[.\-_]/);
    const matched = parts.find(it => it.length > 3 && !/^\d+$/.test(it)) ?? 'merchant';
    if (matched.length === 0) return matched;
    return matched.substring(0, 1).toUpperCase() + matched.substring(1);
  }
}

export default new UnionBankParser();
