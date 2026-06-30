import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Kotak Bank specific parser.
 * Handles Kotak Bank's unique message formats including:
 * - UPI transactions with recipient details
 * - Standard debit/credit messages
 * - Card transactions
 */
export class KotakBankParser extends BankParser {

  getBankName(): string {
    return 'Kotak Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();

    // DLT patterns for Kotak Bank — covers KOTAKB, KOTAKD, and similar variants
    if (/^[A-Z]{2}-KOTAK[A-Z]-[ST]$/.test(normalizedSender)) {
      return true;
    }

    // RCS senders arrive with a decoded display name (e.g. "Kotak",
    // "Kotak Mahindra Bank", "Kotak811") instead of the DLT header, so match
    // any sender that contains the brand token.
    return normalizedSender.includes('KOTAK');
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // IMPS credit from mobile: "linked to mobile xNNNN"
    const mobileLinkedPattern = /linked\s+to\s+mobile\s+([xX*]+\d{2,})/i;
    const mobileLinkedMatch = message.match(mobileLinkedPattern);
    if (mobileLinkedMatch) {
      return mobileLinkedMatch[1];
    }

    // Credit card merchant pattern: "on DD-MON-YYYY at MERCHANT. Avl limit"
    const cardMerchantPattern = /on\s+\d{1,2}-\w{3}-\d{2,4}\s+at\s+([^.]+?)(?:\.|\s+Avl|$)/i;
    const cardMerchantMatch = message.match(cardMerchantPattern);
    if (cardMerchantMatch) {
      const rawMerchant = cardMerchantMatch[1].trim();
      const merchant = this.cleanKotakCardMerchant(rawMerchant);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 1: "Sent Rs.X from Kotak Bank AC XXXX to merchant@bank on"
    // Pattern 2: "Received Rs.X in your Kotak Bank AC XXXX from merchant@bank on"

    // Try "to" pattern for sent transactions
    const toPattern = /to\s+([^\s]+@[^\s]+)\s+on/i;
    const fromPattern = /from\s+([^\s]+@[^\s]+)\s+on/i;

    // Check both patterns
    const upiMatch = message.match(toPattern) ?? message.match(fromPattern);

    if (upiMatch) {
      const upiId = upiMatch[1].trim();

      // Extract merchant name from UPI ID
      let merchantName: string | null = null;

      if (upiId.toLowerCase().startsWith('upi')) {
        // Handle "upiXXX@bank" format - remove "upi" prefix
        const name = upiId.substring(3).split('@')[0];
        merchantName = name.length > 0 ? this.cleanMerchantName(name) : null;
      } else {
        // Handle other UPI IDs - extract username part
        const name = upiId.split('@')[0];
        const bankCode = upiId.split('@')[1] ?? '';

        if (this.isPaymentAppGeneratedId(name)) {
          // For generated IDs like "paytmqr...", extract merchant from domain
          merchantName = this.extractMerchantFromBankCode(bankCode) ?? this.cleanMerchantName(name);
        } else if (
          name.length > 0 &&
          (!/^\d+$/.test(name) || name.includes('-') || name.includes('_'))
        ) {
          // For phone numbers or IDs with separators, try to get meaningful merchant name
          if (/^[\d\-_]+$/.test(name)) {
            // This looks like a phone number or ID, try to extract merchant from bank code
            merchantName = this.extractMerchantFromBankCode(bankCode) ?? name;
          } else {
            merchantName = this.cleanMerchantName(name);
          }
        } else if (name.length > 0 && /^\d+$/.test(name)) {
          // Pure phone numbers - always return the phone number
          // For person-to-person transfers, always show the phone number
          // not the bank/app name (users want to see WHO they sent to, not HOW)
          merchantName = name;
        }
      }

      if (merchantName !== null) {
        // For other merchants, check validation
        if (this.isValidMerchantName(merchantName)) {
          return merchantName;
        }
        // If validation fails but we have a merchant name, still return it
        // This handles edge cases where the extracted name doesn't pass standard validation
        return merchantName;
      }
    }

    // Fall back to generic extraction
    return super.extractMerchant(message, sender);
  }

  /**
   * Cleans merchant name from Kotak credit card SMS format.
   * Handles UPI reference format "UPI-<ref_number>-<MERCHANT_NAME>"
   * by extracting just the merchant name part.
   */
  private cleanKotakCardMerchant(rawMerchant: string): string {
    const upiRefPattern = /^UPI-\d+-(.+)$/i;
    const match = rawMerchant.match(upiRefPattern);
    if (match) {
      return this.cleanMerchantName(match[1].trim());
    }
    return this.cleanMerchantName(rawMerchant);
  }

  /**
   * Checks if the UPI username looks like a generated ID from a payment app
   * rather than a human-readable username or phone number.
   */
  private isPaymentAppGeneratedId(name: string): boolean {
    const lowerName = name.toLowerCase();

    // Common patterns for generated QR code IDs
    const generatedIdPrefixes = [
      'paytmqr',        // Paytm QR codes: paytmqr288005050101t74afkchmxjd
      'phonepeqr',      // PhonePe QR codes
      'phonepe.qr',     // PhonePe QR codes (alternative)
      'gpay',           // Google Pay generated IDs
      'amazonpayqr',    // Amazon Pay QR codes
      'bhimqr',         // BHIM QR codes
      'bharatpeqr',     // BharatPe QR codes
      'freechargeqr',   // Freecharge QR codes
      'mobikwikqr',     // MobiKwik QR codes
    ];

    // Check if name starts with any known generated ID prefix
    if (generatedIdPrefixes.some((prefix) => lowerName.startsWith(prefix))) {
      return true;
    }

    // Check if name looks like a random generated ID (mix of letters and numbers, long length)
    // Typical pattern: starts with a known prefix or is very long with random alphanumeric characters
    if (name.length > 20 && /[a-zA-Z]/.test(name) && /\d/.test(name)) {
      // This looks like a generated ID rather than a meaningful name
      return true;
    }

    return false;
  }

  /**
   * Extract meaningful merchant name from UPI bank codes
   */
  private extractMerchantFromBankCode(bankCode: string): string | null {
    switch (bankCode.toLowerCase()) {
      case 'okaxis': return 'Axis Bank';
      case 'okbizaxis': return 'Axis Bank Business';
      case 'okhdfcbank': return 'HDFC Bank';
      case 'okicici': return 'ICICI Bank';
      case 'oksbi': return 'State Bank of India';
      case 'paytm': return 'Paytm';
      case 'ybl': return 'PhonePe';
      case 'amazonpay': return 'Amazon Pay';
      case 'googlepay': return 'Google Pay';
      case 'airtel': return 'Airtel Money';
      case 'freecharge': return 'Freecharge';
      case 'mobikwik': return 'MobiKwik';
      case 'jupiteraxis': return 'Jupiter';
      case 'razorpay': return 'Razorpay';
      case 'bharatpe': return 'BharatPe';
      default: return null;
    }
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Credit card transactions: "Avl limit" indicates credit card usage
    if (lowerMessage.includes('avl limit') || lowerMessage.includes('avl lmt')) {
      return TransactionType.CREDIT;
    }

    // Explicit credit card mention with spending keywords
    if (
      lowerMessage.includes('credit card') &&
      (lowerMessage.includes('spent') || lowerMessage.includes('debited'))
    ) {
      return TransactionType.CREDIT;
    }

    // Kotak specific: "Sent Rs.X ..." - money going OUT (EXPENSE)
    // Anchored on "sent rs" so unrelated uses of the word "sent" (e.g. a
    // refund/cashback notification reading "...has been sent to your A/c...")
    // don't get misclassified as expense before the INCOME branches run.
    if (lowerMessage.includes('sent rs')) return TransactionType.EXPENSE;

    // Standard expense keywords
    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('spent')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('charged')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('paid')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('purchase')) return TransactionType.EXPENSE;

    // Income keywords
    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;
    if (lowerMessage.includes('received')) return TransactionType.INCOME;
    if (lowerMessage.includes('refund')) return TransactionType.INCOME;
    if (lowerMessage.includes('cashback') && !lowerMessage.includes('earn cashback')) {
      return TransactionType.INCOME;
    }

    return null;
  }

  protected extractReference(message: string): string | null {
    // Kotak specific UPI reference patterns
    const upiRefPatterns = [
      /UPI\s+Ref\s+([0-9]+)/i,
      // New short-SMS format: "UPI ref no. 648604626824"
      /UPI\s+ref\s+no\.?\s+([0-9]+)/i,
    ];

    for (const pattern of upiRefPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Fall back to generic extraction
    return super.extractReference(message);
  }

  protected extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null) return parentResult;

    // Kotak credit card pattern: "Credit Card x5236" or "Credit Card XX5236"
    const kotakCardPattern = /Credit\s+Card\s+[xX*]*(\d{4})/i;
    const kotakCardMatch = message.match(kotakCardPattern);
    if (kotakCardMatch) {
      return kotakCardMatch[1];
    }

    // Kotak specific pattern: "AC X0000" or "AC XXXX0000"
    const kotakAccountPattern = /AC\s+[X*]*([0-9]{4})(?:\s|,|\.)/i;
    const kotakAccountMatch = message.match(kotakAccountPattern);
    if (kotakAccountMatch) {
      return kotakAccountMatch[1];
    }

    // Short-SMS format: "Sent Rs.X from XXXXXX9722 to ..."
    const kotakMaskedAccountPattern = /from\s+[xX*]{2,}(\d{4})\b/i;
    const kotakMaskedAccountMatch = message.match(kotakMaskedAccountPattern);
    if (kotakMaskedAccountMatch) {
      return kotakMaskedAccountMatch[1];
    }

    return null;
  }

  protected extractAvailableLimit(message: string): number | null {
    const kotakCreditLimitPatterns = [
      // "Avl limit INR 73733.02"
      /Avl\s+limit:?\s*INR\s+([0-9,]+(?:\.\d{2})?)/i,
      // "Avl Lmt INR 73733.02"
      /Avl\s+Lmt:?\s*INR\s+([0-9,]+(?:\.\d{2})?)/i,
      // "Available limit INR 73733.02"
      /Available\s+limit:?\s*INR\s+([0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of kotakCreditLimitPatterns) {
      const match = message.match(pattern);
      if (match) {
        const limitStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(limitStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }

    return super.extractAvailableLimit(message);
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP and promotional messages
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code') ||
      lowerMessage.includes('offer') ||
      lowerMessage.includes('discount') ||
      lowerMessage.includes('cashback offer') ||
      lowerMessage.includes('win ')
    ) {
      return false;
    }

    // Skip payment request messages
    if (
      lowerMessage.includes('has requested') ||
      lowerMessage.includes('payment request') ||
      lowerMessage.includes('collect request') ||
      lowerMessage.includes('requesting payment') ||
      lowerMessage.includes('requests rs') ||
      lowerMessage.includes('ignore if already paid')
    ) {
      return false;
    }

    // Kotak specific transaction keywords
    const kotakTransactionKeywords = [
      'sent', // Kotak uses "Sent Rs.X from Kotak Bank"
      'debited', 'credited', 'withdrawn', 'deposited',
      'spent', 'received', 'transferred', 'paid',
    ];

    return kotakTransactionKeywords.some((kw) => lowerMessage.includes(kw));
  }
}

export default new KotakBankParser();
