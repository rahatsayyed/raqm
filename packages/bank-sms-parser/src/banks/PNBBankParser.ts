import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType, MandateInfo } from '../core/types';

export interface UPIMandateInfo extends MandateInfo {
  amount: number;
  nextDeductionDate: string | null;
  merchant: string;
  umn: string | null;
  dateFormat: string;
}

/**
 * Parser for Punjab National Bank (PNB) SMS messages
 */
export class PNBBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'Punjab National Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('PUNJAB NATIONAL BANK') ||
      normalizedSender.includes('PNBBNK') ||
      normalizedSender.includes('PUNBN') ||
      normalizedSender.includes('PNBSMS') ||
      /^[A-Z]{2}-PNBBNK-S$/.test(normalizedSender) ||
      /^[A-Z]{2}-PNB-S$/.test(normalizedSender) ||
      /^[A-Z]{2}-PNBBNK$/.test(normalizedSender) ||
      /^[A-Z]{2}-PNB$/.test(normalizedSender) ||
      normalizedSender === 'PNBBNK' ||
      normalizedSender === 'PNB';
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    // Normalize Unicode text for RCS messages
    const normalizedBody = this.normalizeUnicodeText(smsBody);

    // Use normalized body for parsing
    return super.parse(normalizedBody, sender, timestamp);
  }

  private normalizeUnicodeText(text: string): string {
    // Use NFKD normalization to decompose Unicode, then strip non-ASCII
    return text.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
  }

  extractAmount(message: string): number | null {
    // Handle "a/c no XX340 is debited for Rs 7519" pattern
    const debitedForPattern = /debited\s+for\s+(?:Rs\.?|INR)\s*([0-9,]+(?:\.\d{2})?)/i;
    const debitedForMatch = message.match(debitedForPattern);
    if (debitedForMatch) {
      const amount = parseFloat(debitedForMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Handle explicit debit of initial amount in auto-pay messages
    const initialDebitPattern = /initial\s+amount\s+of\s+(?:Rs\.?|INR)\s*([0-9,]+(?:\.\d{2})?)\s+has\s+been\s+debited/i;
    const initialDebitMatch = message.match(initialDebitPattern);
    if (initialDebitMatch) {
      const amount = parseFloat(initialDebitMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Handle debit patterns - both "Rs." and "INR" formats
    // "with" is optional for backward compatibility ("debited Rs. X" and "debited with Rs. X")
    const debitPattern = /debited\s+(?:with\s+)?(?:Rs\.?|INR)\s*([0-9,]+(?:\.\d{2})?)/i;
    const debitMatch = message.match(debitPattern);
    if (debitMatch) {
      const amount = parseFloat(debitMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Handle credit patterns - both "Rs." and "INR" formats
    const creditPattern = /(?:(?:Rs\.?|INR)\s*([0-9,]+(?:\.\d{2})?)\s+(?:has\s+been\s+)?credited|credited\s+(?:with\s+)?(?:Rs\.?|INR)\s*([0-9,]+(?:\.\d{2})?))/i;
    const creditMatch = message.match(creditPattern);
    if (creditMatch) {
      // Try to get the amount from either capture group (pattern 1 or pattern 2)
      const rawAmount = (creditMatch[1] && creditMatch[1].length > 0) ? creditMatch[1] : creditMatch[2];
      const amount = parseFloat(rawAmount.replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Note: Removed balance pattern - balance should never be used as transaction amount
    // Balance is extracted separately by extractBalance() method

    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (this.isUPIMandateNotification(message)) {
      return null;
    }

    // Auto-Pay activation can carry a real initial debit that should remain an expense.
    if (lowerMessage.includes('auto pay facility') && lowerMessage.includes('debited')) {
      return TransactionType.EXPENSE;
    }

    return super.extractTransactionType(message);
  }

  isUPIMandateNotification(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return (lowerMessage.includes('upi-mandate') || lowerMessage.includes('upi mandate')) &&
      lowerMessage.includes('successfully created');
  }

  parseUPIMandateSubscription(message: string): UPIMandateInfo | null {
    if (!this.isUPIMandateNotification(message)) {
      return null;
    }

    const amountPattern = /for\s+(?:Rs\.?|INR)\s*([0-9,]+(?:\.\d{2})?)/i;
    const amountMatch = message.match(amountPattern);
    let amount: number | null = null;
    if (amountMatch) {
      const parsed = parseFloat(amountMatch[1].replace(/,/g, ''));
      if (!isNaN(parsed)) amount = parsed;
    }
    if (amount === null) {
      const baseMandate = super.parseMandateSubscription(message);
      amount = baseMandate?.amount ?? null;
    }
    if (amount === null) return null;

    const towardsPattern = /towards\s+(.+?)\s+for\s+(?:Rs\.?|INR)/i;
    const towardsMatch = message.match(towardsPattern);
    let merchant: string | null = null;
    if (towardsMatch) {
      const cleaned = this.cleanMerchantName(towardsMatch[1].trim());
      if (cleaned && this.isValidMerchantName(cleaned)) {
        merchant = cleaned;
      }
    }
    if (merchant === null) {
      const baseMandate = super.parseMandateSubscription(message);
      merchant = baseMandate?.merchant ?? null;
    }
    if (merchant === null) return null;

    const umnPattern = /UMN:?\s*([^.\s]+)/i;
    const umnMatch = message.match(umnPattern);
    const umn = umnMatch ? umnMatch[1] : null;

    return {
      amount,
      nextDeductionDate: null,
      merchant,
      umn,
      dateFormat: 'dd-MMM-yy',
    };
  }

  extractMerchant(message: string, sender: string): string | null {
    // Handle IMPS transactions early to avoid base class patterns matching phone numbers
    if (/IMPS/i.test(message)) {
      return 'IMPS Transfer';
    }

    // Extract merchant from Auto-Pay activation: from Google Clouds
    const fromMerchantPattern = /auto\s+pay.*?activated.*?from\s+([^.]+?)(?:\s+An\s+initial|\.|$)/i;
    const fromMerchantMatch = message.match(fromMerchantPattern);
    if (fromMerchantMatch) {
      return fromMerchantMatch[1].trim();
    }

    // Extract merchant from UPI-Mandate: towards Google Pay
    const towardsPattern = /UPI-Mandate.*towards\s+(.+?)\s+for/i;
    const towardsMatch = message.match(towardsPattern);
    if (towardsMatch) {
      return towardsMatch[1].trim();
    }

    // Extract card info if available: thru card XX9239
    const cardPattern = /thru\s+card\s+([X*]+\d{4})/i;
    const cardMatch = message.match(cardPattern);
    if (cardMatch) {
      return `Card ${cardMatch[1]}`;
    }

    if (/PNB ATM/i.test(message)) {
      return 'PNB ATM Withdrawal';
    }

    if (/NEFT/i.test(message)) {
      return 'NEFT Transfer';
    }

    if (/UPI/i.test(message)) {
      return 'UPI Transaction';
    }

    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    // Handle "a/c no XX340" or "A/c XX1234" patterns - capture digits only
    const acNoPattern = /(?:a\/c\s+no|A\/c)\s+[X*]+(\d{2,4})/i;
    const acNoMatch = message.match(acNoPattern);
    if (acNoMatch) {
      return acNoMatch[1];
    }

    // Handle variations: Ac, Card followed by X/dots/spaces and then digits (4 to 16)
    const acPattern = /(?:A\/c(?:\s*No\.)?|Ac|Card)\s*(?:[X*]+)?(\d{4,16})/i;
    const acMatch = message.match(acPattern);
    if (acMatch) {
      return acMatch[1].slice(-4);
    }

    return super.extractAccountLast4(message);
  }

  extractReference(message: string): string | null {
    // Handle IMPS reference: "IMPS Ref no 606701245043"
    if (/IMPS/i.test(message)) {
      // More flexible pattern: IMPS followed by any word then reference number
      const impsRefPattern = /IMPS\s+\w*\s*Ref\s*(?:no\.?\s*)?(\d{6,})/i;
      const impsRefMatch = message.match(impsRefPattern);
      if (impsRefMatch) {
        return impsRefMatch[1];
      }
      // Fallback: find a 12-digit number after IMPS (IMPS refs are 12 digits)
      const impsFallback = /IMPS[^0-9]*(\d{12,})/i;
      const impsFallbackMatch = message.match(impsFallback);
      if (impsFallbackMatch) {
        return impsFallbackMatch[1];
      }
    }

    const neftRefPattern = /ref\s+no\.\s+([A-Z0-9]+)/i;
    const neftRefMatch = message.match(neftRefPattern);
    if (neftRefMatch) {
      return neftRefMatch[1];
    }

    // Handle UPI Ref ID: "(UPI Ref ID:606379499474)"
    const upiRefIdPattern = /UPI\s+Ref\s+ID:?\s*(\d+)/i;
    const upiRefIdMatch = message.match(upiRefIdPattern);
    if (upiRefIdMatch) {
      return upiRefIdMatch[1];
    }

    // Handle "UPI: <number>" format
    const upiRefPattern = /UPI:\s*([0-9]+)/i;
    const upiRefMatch = message.match(upiRefPattern);
    if (upiRefMatch) {
      return upiRefMatch[1];
    }

    // Fall back to base class, but filter out "-PNB" suffix matches
    const baseRef = super.extractReference(message);
    return (baseRef !== null && baseRef !== undefined && baseRef.toUpperCase() === 'PNB') ? null : baseRef;
  }

  extractBalance(message: string): number | null {
    // Handle "Aval Bal", "Avl Bal", "Bal" followed by currency and amount, usually ending with CR/DR
    const balPattern = /(?:Aval\s+Bal|Avl\s+Bal|Bal)\s*(?:INR\s*|Rs\.?\s*)?([0-9,]+(?:\.\d{2})?)(?:\s+(?:CR|DR))?/i;
    const balMatch = message.match(balPattern);
    if (balMatch) {
      const amount = parseFloat(balMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Fallback for just "Bal XXXX.XX CR"
    const simpleBalPattern = /Bal\s*([0-9,]+(?:\.\d{2})?)\s+(?:CR|DR)/i;
    const simpleBalMatch = message.match(simpleBalPattern);
    if (simpleBalMatch) {
      const amount = parseFloat(simpleBalMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    return super.extractBalance(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    if (this.isUPIMandateNotification(message)) {
      return false;
    }

    if (lowerMessage.includes('auto pay facility') && lowerMessage.includes('debited')) {
      return true;
    }

    if (lowerMessage.includes('register for e-statement')) {
      return true;
    }

    if (lowerMessage.includes('imps') && lowerMessage.includes('debited')) {
      return true;
    }

    return super.isTransactionMessage(message);
  }
}

export default new PNBBankParser();
