import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType, MandateInfo } from '../core/types';

/**
 * Parser for State Bank of India (SBI) SMS messages
 */
export class SBIBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'State Bank of India';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('SBI') ||
      normalizedSender.includes('SBIINB') ||
      normalizedSender.includes('SBIUPI') ||
      normalizedSender.includes('SBICRD') ||
      normalizedSender.includes('ATMSBI') ||
      // Direct sender IDs
      normalizedSender === 'SBIBK' ||
      normalizedSender === 'SBIBNK' ||
      // SBI Card RCS sender
      normalizedSender.includes('SBI CARDS') ||
      // DLT patterns for transactions (-S suffix)
      /^[A-Z]{2}-SBIBK-S$/.test(normalizedSender) ||
      // Other DLT patterns (OTP, Promotional, Govt)
      /^[A-Z]{2}-SBIBK-[TPG]$/.test(normalizedSender) ||
      // Legacy patterns without suffix
      /^[A-Z]{2}-SBIBK$/.test(normalizedSender) ||
      /^[A-Z]{2}-SBI$/.test(normalizedSender);
  }

  // Check if this is a credit card message
  private isCreditCardMessage(sender: string, message: string): boolean {
    const upperSender = sender.toUpperCase();
    return upperSender.includes('SBICRD') ||
      upperSender.includes('SBI CARDS') ||
      message.toLowerCase().includes('credit card');
  }

  // Extract credit card last 4 digits
  private extractCreditCardLast4(message: string): string | null {
    const patterns = [
      /ending\s+with\s+(\d{4})/i,
      /ending\s+(\d{4})/i,
    ];
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    // Normalize Unicode text (SBI Card uses Mathematical Sans-Serif characters in RCS)
    const normalizedBody = this.normalizeUnicodeText(smsBody);

    const parsed = super.parse(normalizedBody, sender, timestamp);
    if (!parsed) return null;

    // Handle credit card messages
    if (this.isCreditCardMessage(sender, normalizedBody)) {
      // Extract credit card last 4 digits
      const cardLast4 = this.extractCreditCardLast4(normalizedBody) ?? parsed.accountLast4;

      // Extract available limit for credit card messages
      const creditLimit = this.extractAvailableLimit(normalizedBody) ?? parsed.creditLimit;

      // Determine transaction type based on message content
      let transactionType: TransactionType;
      if (
        normalizedBody.toLowerCase().includes('payment of') &&
        normalizedBody.toLowerCase().includes('credited to your sbi credit card')
      ) {
        // Payment TO credit card (reducing debt)
        transactionType = TransactionType.INCOME;
      } else if (
        normalizedBody.toLowerCase().includes('spent on') ||
        normalizedBody.toLowerCase().includes('spent')
      ) {
        // Credit card spending
        transactionType = TransactionType.CREDIT;
      } else {
        // Default for other credit card transactions
        transactionType = TransactionType.CREDIT;
      }

      // Extract merchant for credit card transactions
      let merchant: string | null | undefined;
      if (normalizedBody.toLowerCase().includes('via bbps')) {
        merchant = 'BBPS Payment';
      } else {
        merchant = this.extractCreditCardMerchant(normalizedBody) ?? parsed.merchant;
      }

      return {
        ...parsed,
        accountLast4: cardLast4,
        type: transactionType,
        merchant: merchant ?? parsed.merchant,
        creditLimit,
        isFromCard: true,
      };
    }

    return parsed;
  }

  private normalizeUnicodeText(text: string): string {
    // NFKD decomposes Unicode Math Sans-Serif characters to ASCII equivalents
    return text.normalize('NFKD').replace(/[^\x00-\x7F]/g, '');
  }

  private extractCreditCardMerchant(message: string): string | null {
    // Pattern: "at MERCHANT on DD/MM/YY"
    const atPattern = /at\s+([A-Za-z0-9\s&._-]+?)\s+on\s+\d/i;
    const match = message.match(atPattern);
    if (match) {
      const merchant = this.cleanMerchantName(match[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }
    return null;
  }

  extractAvailableLimit(message: string): number | null {
    // Pattern: "available limit is Rs.1,235.00"
    const patterns = [
      /available\s+limit\s+is\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
      /Your\s+available\s+limit\s+is\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const limitStr = match[1].replace(/,/g, '');
        const value = parseFloat(limitStr);
        if (!isNaN(value)) return value;
      }
    }

    return super.extractAvailableLimit(message);
  }

  extractAmount(message: string): number | null {
    // Pattern for transaction number format: "transaction number 1234 for Rs.383.00"
    const transactionNumberPattern = /transaction\s+number\s+\d+\s+for\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    let match = message.match(transactionNumberPattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const value = parseFloat(amount);
      if (!isNaN(value)) return value;
    }

    // Pattern for credit card payment: "payment of Rs.1,644.55"
    const paymentPattern = /payment\s+of\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    match = message.match(paymentPattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const value = parseFloat(amount);
      if (!isNaN(value)) return value;
    }

    // Pattern for credit card spending: "Rs.259.00 spent"
    const spentPattern = /Rs\.?\s*([0-9,]+(?:\.\d{2})?)\s+spent/i;
    match = message.match(spentPattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const value = parseFloat(amount);
      if (!isNaN(value)) return value;
    }

    // Pattern 0: A/C debited by 20.0 (UPI format)
    const upiDebitPattern = /debited\s+by\s+(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;
    match = message.match(upiDebitPattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const value = parseFloat(amount);
      if (!isNaN(value)) return value;
    }

    // Pattern 0a: A/c credited by Rs.500 (UPI format)
    const upiCreditPattern = /credited\s+by\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{1,2})?)/i;
    match = message.match(upiCreditPattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const value = parseFloat(amount);
      if (!isNaN(value)) return value;
    }

    // Pattern 1: Rs 500 debited
    const debitPattern1 = /Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:has\s+been\s+)?debited/i;
    match = message.match(debitPattern1);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const value = parseFloat(amount);
      if (!isNaN(value)) return value;
    }

    // Pattern 2: INR 500 debited
    const debitPattern2 = /INR\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:has\s+been\s+)?debited/i;
    match = message.match(debitPattern2);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const value = parseFloat(amount);
      if (!isNaN(value)) return value;
    }

    // Pattern 3: Rs 500 credited
    const creditPattern1 = /Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:has\s+been\s+)?credited/i;
    match = message.match(creditPattern1);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const value = parseFloat(amount);
      if (!isNaN(value)) return value;
    }

    // Pattern 4: INR 500 credited
    const creditPattern2 = /INR\s*(\d+(?:,\d{3})*(?:\.\d{2})?)\s+(?:has\s+been\s+)?credited/i;
    match = message.match(creditPattern2);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const value = parseFloat(amount);
      if (!isNaN(value)) return value;
    }

    // Pattern 5: withdrawn Rs 500
    const withdrawPattern = /withdrawn\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    match = message.match(withdrawPattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const value = parseFloat(amount);
      if (!isNaN(value)) return value;
    }

    // Pattern 6: transferred Rs 500
    const transferPattern = /transferred\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    match = message.match(transferPattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const value = parseFloat(amount);
      if (!isNaN(value)) return value;
    }

    // Pattern 7: UPI patterns - "paid to MERCHANT@upi Rs 500"
    const upiPattern = /paid\s+to\s+[\w.-]+@[\w]+\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    match = message.match(upiPattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const value = parseFloat(amount);
      if (!isNaN(value)) return value;
    }

    // Pattern 8: ATM withdrawal - "ATM withdrawal of Rs 500"
    const atmPattern = /ATM\s+withdrawal\s+of\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    match = message.match(atmPattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const value = parseFloat(amount);
      if (!isNaN(value)) return value;
    }

    // Pattern 9: YONO Cash withdrawal - "Yono Cash Rs 3000 w/d@SBI ATM"
    const yonoCashPattern = /Yono\s+Cash\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    match = message.match(yonoCashPattern);
    if (match) {
      const amount = match[1].replace(/,/g, '');
      const value = parseFloat(amount);
      if (!isNaN(value)) return value;
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // SBI-specific patterns
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('transferred')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('paid to')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('atm withdrawal')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('by sbi debit card')) return TransactionType.EXPENSE;

    // Fall back to base class for common patterns
    return super.extractTransactionType(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern for "done at <location>": "done at -string of number redacted- on"
    const doneAtPattern = /done\s+at\s+([^.\n]+?)(?:\s+on\s+|$)/i;
    let match = message.match(doneAtPattern);
    if (match) {
      const location = this.cleanMerchantName(match[1].trim());
      if (this.isValidMerchantName(location)) {
        return location;
      }
    }

    // Pattern 0: trf to Merchant (UPI format)
    const trfPattern = /trf\s+to\s+([^.\n]+?)(?:\s+Ref|\s+ref|$)/i;
    match = message.match(trfPattern);
    if (match) {
      const merchant = this.cleanMerchantName(match[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 0a: transfer from Sender (credit format)
    const transferFromPattern = /transfer\s+from\s+([^.\n]+?)(?:\s+Ref|\s+ref|$)/i;
    match = message.match(transferFromPattern);
    if (match) {
      const merchant = this.cleanMerchantName(match[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 1: paid to MERCHANT@upi
    const upiMerchantPattern = /paid\s+to\s+([\w.-]+)@[\w]+/i;
    match = message.match(upiMerchantPattern);
    if (match) {
      const merchant = this.cleanMerchantName(match[1]);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 2: YONO Cash ATM - "w/d@SBI ATM S1NW000093009"
    const yonoAtmPattern = /w\/d@SBI\s+ATM\s+([A-Z0-9]+)/i;
    match = message.match(yonoAtmPattern);
    if (match) {
      const atmId = match[1];
      return `YONO Cash ATM - ${atmId}`;
    }

    // Pattern 2a: Regular ATM location
    const atmPattern = /ATM\s+(?:withdrawal\s+)?(?:at\s+)?([^.\n]+?)(?:\s+on|\s+Avl)/i;
    match = message.match(atmPattern);
    if (match) {
      const location = this.cleanMerchantName(match[1]);
      if (this.isValidMerchantName(location)) {
        return `ATM - ${location}`;
      }
    }

    // Pattern 3: NEFT/IMPS/RTGS with beneficiary
    const neftPattern = /(?:NEFT|IMPS|RTGS)[^:]*:\s*([^.\n]+?)(?:\s+Ref|\s+on|$)/i;
    match = message.match(neftPattern);
    if (match) {
      const merchant = this.cleanMerchantName(match[1]);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Fall back to base class patterns
    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const baseResult = super.extractAccountLast4(message);
    if (baseResult !== null && baseResult !== undefined) return baseResult;

    // Pattern for debit card: "by SBI Debit Card <last4>"
    const debitCardPattern = /by\s+SBI\s+Debit\s+Card\s+([\w\-]+)/i;
    let match = message.match(debitCardPattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }

    // Pattern 1: A/c XNNNN or A/c XXNNNN
    const pattern1 = /A\/c\s+([X*\d]+)/i;
    match = message.match(pattern1);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }

    // Pattern 2: from A/c ending 1234
    const pattern2 = /A\/c\s+ending\s+(\d{4})/i;
    match = message.match(pattern2);
    if (match) {
      return match[1];
    }

    // Pattern 3: a/c no. XX1234
    const pattern3 = /a\/c\s+no\.?\s+([X*\d]+)/i;
    match = message.match(pattern3);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern for updated balance: "Your updated available balance is Rs.999999999"
    const updatedBalancePattern = /Your\s+updated\s+available\s+balance\s+is\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    let match = message.match(updatedBalancePattern);
    if (match) {
      const balanceStr = match[1].replace(/,/g, '');
      const value = parseFloat(balanceStr);
      if (!isNaN(value)) return value;
    }

    // Pattern 1: Avl Bal Rs 1000.00
    const pattern1 = /Avl\s+Bal\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    match = message.match(pattern1);
    if (match) {
      const balanceStr = match[1].replace(/,/g, '');
      const value = parseFloat(balanceStr);
      if (!isNaN(value)) return value;
    }

    // Pattern 2: Available Balance: Rs 1000
    const pattern2 = /Available\s+Balance:?\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    match = message.match(pattern2);
    if (match) {
      const balanceStr = match[1].replace(/,/g, '');
      const value = parseFloat(balanceStr);
      if (!isNaN(value)) return value;
    }

    // Pattern 3: Bal: Rs 1000
    const pattern3 = /Bal:?\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    match = message.match(pattern3);
    if (match) {
      const balanceStr = match[1].replace(/,/g, '');
      const value = parseFloat(balanceStr);
      if (!isNaN(value)) return value;
    }

    // Fall back to base class
    return super.extractBalance(message);
  }

  extractReference(message: string): string | null {
    // Pattern for transaction number: "transaction number <alphanumeric>"
    const transactionNumberPattern = /transaction\s+number\s+([\w\-]+)/i;
    let match = message.match(transactionNumberPattern);
    if (match) {
      return match[1];
    }

    // Pattern 1: Ref No 123456789
    const pattern1 = /Ref\s+No\.?\s*(\w+)/i;
    match = message.match(pattern1);
    if (match) {
      return match[1];
    }

    // Pattern 2: Txn# 123456
    const pattern2 = /Txn#\s*(\w+)/i;
    match = message.match(pattern2);
    if (match) {
      return match[1];
    }

    // Pattern 3: transaction ID 123456
    const pattern3 = /transaction\s+ID:?\s*(\w+)/i;
    match = message.match(pattern3);
    if (match) {
      return match[1];
    }

    // Fall back to base class
    return super.extractReference(message);
  }

  isTransactionMessage(message: string): boolean {
    // Normalize Unicode first (SBI Card uses Math Sans-Serif characters)
    const normalizedMessage = this.normalizeUnicodeText(message);
    const lowerMessage = normalizedMessage.toLowerCase();

    // Skip e-statement notifications
    if (lowerMessage.includes('e-statement of sbi credit card')) {
      return false;
    }

    // Skip future/pending transactions
    if (lowerMessage.includes('is due for')) {
      return false;
    }

    // Skip credit card application status messages
    if (
      lowerMessage.includes('sbi card application') ||
      lowerMessage.includes('process your app.no') ||
      lowerMessage.includes('track your application status')
    ) {
      return false;
    }

    // Skip UPI-Mandate creation notifications
    if (this.isEMandateNotification(normalizedMessage) || this.isUPIMandateNotification(normalizedMessage)) {
      return false;
    }

    // SBI Debit Card transactions
    if (lowerMessage.includes('by sbi debit card')) {
      return true;
    }

    // SBI Credit Card spending
    if (lowerMessage.includes('spent') && lowerMessage.includes('credit card')) {
      return true;
    }

    // Fall back to base class for other checks
    return super.isTransactionMessage(normalizedMessage);
  }

  // ==========================================
  // UPI-Mandate / Subscription Logic
  // ==========================================

  /**
   * Checks if this is a UPI-Mandate notification (not a transaction).
   * SBI sends specific UPI-Mandate messages for recurring payments.
   */
  isUPIMandateNotification(message: string): boolean {
    const lowerMessage = message.toLowerCase();
    return lowerMessage.includes('upi-mandate') ||
      lowerMessage.includes('upi mandate') ||
      (lowerMessage.includes('mandate') && lowerMessage.includes('created') && lowerMessage.includes('upi'));
  }

  /**
   * Parses UPI-Mandate subscription information from SBI messages.
   */
  parseUPIMandateSubscription(message: string): UPIMandateInfo | null {
    if (!this.isUPIMandateNotification(message) && !this.isEMandateNotification(message)) {
      return null;
    }

    // Extract amount - patterns like "Rs.1050.00", "INR 59.00"
    const amountPatterns = [
      /Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
      /INR\s*([0-9,]+(?:\.\d{2})?)/i,
    ];

    let amount: number | null = null;
    for (const pattern of amountPatterns) {
      const match = message.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const value = parseFloat(amountStr);
        if (!isNaN(value)) {
          amount = value;
        }
      }
      if (amount !== null) break;
    }

    if (amount === null) return null;

    // Extract merchant
    let merchant = 'Unknown Subscription';
    const merchantPatterns = [
      /towards\s+([^.\n]+?)(?:\s+from|\s+A\/c|\s+UMRN|\s+ID:|\s+Alert:|\s*\.|$)/i,
      /for\s+([^.\n]+?)(?:\s+ID:|\s+Act:|\s*\.|$)/i,
      /mandate\s+created\s+for\s+([^.\n]+?)(?:\s+UMN|\s+of|\s*\.|$)/i,
    ];

    for (const pattern of merchantPatterns) {
      const match = message.match(pattern);
      if (match) {
        const m = this.cleanMerchantName(match[1].trim());
        if (this.isValidMerchantName(m)) {
          merchant = m;
        }
      }
      if (merchant !== 'Unknown Subscription') break;
    }

    // Extract next deduction date
    const datePatterns = [
      /on\s+(\d{2}-\w{3}-\d{2,4})/i,
      /date[:\s]+(\d{2}\/\d{2}\/\d{2,4})/i,
      /(\d{2}-\d{2}-\d{4})/i,
    ];

    let nextDeductionDate: string | null = null;
    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        nextDeductionDate = match[1];
      }
      if (nextDeductionDate !== null) break;
    }

    // Extract UMN (Unique Mandate Number)
    const umnPattern = /UMN[:\s]+([^.\s]+)/i;
    const umnMatch = message.match(umnPattern);
    const umn = umnMatch ? umnMatch[1] : null;

    return {
      amount,
      nextDeductionDate,
      merchant,
      umn,
      dateFormat: 'dd-MMM-yy',
    };
  }
}

/**
 * UPI-Mandate information for SBI Bank
 */
export interface UPIMandateInfo extends MandateInfo {
  amount: number;
  nextDeductionDate: string | null;
  merchant: string;
  umn: string | null;
  dateFormat: string;
}

export default new SBIBankParser();
