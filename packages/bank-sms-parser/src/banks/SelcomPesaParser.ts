import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Selcom Pesa (Tanzania) mobile money SMS messages
 *
 * Handles formats like:
 * - "0426JXCX Confirmed. You have received TZS 175,000.00 from MICHAEL EMIL LUYANGI - NMB"
 * - "0426JXGC Accepted. You have sent TZS 50,000.00 to NURU ISSA - Mixx by Yas"
 * - "10234C2WQ Confirmed. You have withdrawn TZS 200,000.00 at ATM"
 * - "0428KRRY Confirmed. You have paid TZS 8,900.00 to APPLECOMBILL"
 *
 * Key patterns:
 * - Transaction ID: 8-9 character alphanumeric at start (e.g., 0426JXCX, 10234C2WQ)
 * - Status: "Confirmed." or "Accepted."
 * - Balance: "Updated balance is TZS X"
 * - Fee breakdown: "Total charges TZS X (Fee X, VAT X, Ex Duty X)"
 *
 * Currency: TZS (Tanzanian Shilling)
 * Country: Tanzania
 */
export class SelcomPesaParser extends BankParser {

  getBankName(): string {
    return 'Selcom Pesa';
  }

  getCurrency(): string {
    return 'TZS';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('SELCOM') ||
      normalizedSender.includes('SELCOMPESA') ||
      normalizedSender === 'SELCOM PESA' ||
      normalizedSender === 'SELCOM';
  }

  protected extractAmount(message: string): number | null {
    // Pattern 1: "TZS 175,000.00" or "TZS 50,000.00"
    const tzsPattern = /TZS\s+([0-9,]+(?:\.[0-9]{2})?)/i;
    const match = message.match(tzsPattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('you have received')) return TransactionType.INCOME;
    if (lowerMessage.includes('you have sent')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('you have paid')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('you have withdrawn')) return TransactionType.EXPENSE;

    return null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: "from NAME - BANK/SERVICE (account/phone)"
    // e.g., "from MICHAEL EMIL LUYANGI - NMB (201100XXXXX)"
    const fromPattern = /from\s+([A-Z][A-Za-z\s]+?)(?:\s+-\s+[^(]+)?\s*\([^)]+\)/i;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      const merchant = this.cleanMerchantName(fromMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2: "to NAME - SERVICE (phone)" for sent money
    // e.g., "to NURU ISSA - Mixx by Yas (Tigo Pesa) (25571XXXXXXX)"
    const toNamePattern = /to\s+([A-Z][A-Za-z\s]+?)(?:\s+-\s+[^(]+)?\s*\([^)]+\)/i;
    const toNameMatch = message.match(toNamePattern);
    if (toNameMatch) {
      const merchant = this.cleanMerchantName(toNameMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 3: "paid TZS X to MERCHANT using" (card payment)
    // e.g., "paid TZS 8,900.00 to APPLECOMBILL using"
    const paidToPattern = /paid\s+TZS\s+[0-9,]+(?:\.[0-9]{2})?\s+to\s+([A-Za-z0-9\s]+?)(?:\s+using|\s+on)/i;
    const paidToMatch = message.match(paidToPattern);
    if (paidToMatch) {
      const merchant = this.cleanMerchantName(paidToMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 4: ATM withdrawal - "at ATM - LOCATION"
    if (message.toLowerCase().includes('withdrawn') && message.toLowerCase().includes('atm')) {
      const atmPattern = /at\s+ATM\s+-?\s*([^u]+?)(?:\s+using|$)/i;
      const atmMatch = message.match(atmPattern);
      if (atmMatch) {
        const location = atmMatch[1].trim();
        return location.length > 0 ? `ATM - ${location}` : 'ATM Withdrawal';
      }
      return 'ATM Withdrawal';
    }

    // Pattern 5: Simple "to NAME" without service info
    const simpleToPattern = /to\s+([A-Z][A-Za-z\s]+?)(?:\s+on\s+|\s*$)/i;
    const simpleToMatch = message.match(simpleToPattern);
    if (simpleToMatch) {
      const merchant = this.cleanMerchantName(simpleToMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    // Pattern: "Updated balance is TZS 175,000.00"
    const balancePattern = /Updated balance is TZS\s+([0-9,]+(?:\.[0-9]{2})?)/i;
    const match = message.match(balancePattern);
    if (match) {
      const balanceStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  protected extractReference(message: string): string | null {
    // Pattern 1: Transaction ID at start (8-9 alphanumeric characters)
    // e.g., "0426JXCX Confirmed" or "10234C2WQ Confirmed"
    const txnIdPattern = /^([A-Z0-9]{8,9})\s+(?:Confirmed|Accepted)/i;
    const txnIdMatch = message.match(txnIdPattern);
    if (txnIdMatch) {
      return txnIdMatch[1];
    }

    // Pattern 2: TIPS reference in double notification
    const tipsPattern = /TIPS\s+Reference[:\s]+([A-Z0-9]+)/i;
    const tipsMatch = message.match(tipsPattern);
    if (tipsMatch) {
      return tipsMatch[1];
    }

    return null;
  }

  protected extractAccountLast4(message: string): string | null {
    const superResult = super.extractAccountLast4(message);
    if (superResult !== null) return superResult;

    // Pattern: "card ending with 8318" or "card ending 1915"
    const cardPattern = /card\s+ending\s+(?:with\s+)?(\d{4})/i;
    const match = message.match(cardPattern);
    if (match) {
      return match[1];
    }

    return null;
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Must contain "Confirmed" or "Accepted"
    if (!lowerMessage.includes('confirmed') && !lowerMessage.includes('accepted')) {
      return false;
    }

    // Must contain transaction keywords
    const transactionKeywords = [
      'you have received',
      'you have sent',
      'you have paid',
      'you have withdrawn',
      'updated balance',
    ];

    return transactionKeywords.some((kw) => lowerMessage.includes(kw));
  }

  protected detectIsCard(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Card transactions mention "card ending with" or "using your card"
    return lowerMessage.includes('card ending') ||
      lowerMessage.includes('using your card');
  }

  protected cleanMerchantName(merchant: string): string {
    return merchant
      .replace(/\s*\(.*?\)\s*$/g, '')   // Remove trailing parentheses
      .replace(/\s+-\s+.*$/g, '')        // Remove " - Service" suffix
      .replace(/\s+on\s+\d{4}.*/g, '')   // Remove date suffix
      .replace(/\s*-\s*$/g, '')          // Remove trailing dash
      .trim();
  }
}

export default new SelcomPesaParser();
