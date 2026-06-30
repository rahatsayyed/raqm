import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType, MandateInfo } from '../core/types';

export interface EMandateInfo extends MandateInfo {
  amount: number;
  nextDeductionDate: string | null;
  merchant: string;
  umn: string | null;
  dateFormat: string;
}

export class FederalBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'Federal Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return (
      normalizedSender.includes('FEDBNK') ||
      normalizedSender.includes('FEDERAL') ||
      normalizedSender.includes('FEDFIB') ||
      normalizedSender.includes('FEDSCP') ||
      // DLT patterns for transactions (-S suffix)
      /^[A-Z]{2}-FEDBNK-S$/.test(normalizedSender) ||
      /^[A-Z]{2}-FEDSCP-S$/.test(normalizedSender) ||
      // FedFiB patterns
      /^[A-Z]{2}-FedFiB-[A-Z]$/.test(normalizedSender) ||
      // Other DLT patterns
      /^[A-Z]{2}-FEDBNK-[TPG]$/.test(normalizedSender) ||
      // Legacy patterns
      /^[A-Z]{2}-FEDBNK$/.test(normalizedSender)
    );
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    // Check for balance inquiry message first
    if (this.isBalanceInquiryMessage(smsBody)) {
      return this.parseBalanceInquiry(smsBody, sender, timestamp);
    }

    // Otherwise, use the default parsing logic
    return super.parse(smsBody, sender, timestamp);
  }

  /**
   * Detects balance inquiry messages from missed call banking
   * Format: "Your available balance for a/c no(s) SBA1234 is INR 1xxx,SBA5678 is INR 9xxx.9 ..."
   */
  private isBalanceInquiryMessage(message: string): boolean {
    return message.toLowerCase().includes('your available balance for a/c');
  }

  /**
   * Parses balance inquiry message and extracts the balance
   */
  private parseBalanceInquiry(message: string, sender: string, timestamp: number): ParsedTransaction | null {
    // Pattern: "SBA1234 is INR 1,234.56" - must be followed by comma (next account) or period (sentence end)
    // This ensures we don't match masked balances like "INR 1xxx"
    const balancePattern = /([A-Z]{2,3}\d{4})\s+is\s+INR\s+([0-9,]+(?:\.\d{1,2})?)(?=[,.]|\s+\.)/i;

    const match = message.match(balancePattern);
    if (!match) return null;

    const accountNumber = match[1];
    const balanceStr = match[2].replace(/,/g, '');

    // Additional check: reject if the balance area contains masking characters
    const balanceAreaPattern = /([A-Z]{2,3}\d{4})\s+is\s+INR\s+[0-9,x.]+/i;
    const balanceAreaMatch = message.match(balanceAreaPattern);
    const balanceArea = balanceAreaMatch ? balanceAreaMatch[0] : '';
    if (balanceArea.toLowerCase().includes('x')) {
      return null;
    }

    const balance = parseFloat(balanceStr);
    if (isNaN(balance)) {
      return null;
    }

    return {
      amount: 0,
      type: TransactionType.BALANCE_UPDATE,
      merchant: 'Balance Inquiry',
      reference: null,
      accountLast4: accountNumber.slice(-4),
      balance: balance,
      smsBody: message,
      sender: sender,
      timestamp: timestamp,
      bankName: this.getBankName(),
      isFromCard: false,
      currency: 'INR',
    };
  }

  detectIsCreditCard(message: string): boolean {
    return message.toLowerCase().includes('credit card');
  }

  /**
   * Detects if the transaction is from a card (credit/debit) based on Federal Bank specific patterns.
   */
  detectIsCard(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    if (this.detectIsCreditCard(message)) return true;
    if (lowerMessage.includes('debit card')) return true;
    if (lowerMessage.includes('card xx**')) return true;
    if (lowerMessage.includes('card ending with')) return true;

    // INR spent pattern (typically credit card)
    if (/.*inr\s+[\d,]+(?:\.\d{2})?\s+spent.*/.test(lowerMessage)) return true;

    // "at <merchant> on <date>" pattern (credit card transactions)
    if (lowerMessage.includes(' spent ') && lowerMessage.includes(' at ') && lowerMessage.includes(' on ')) return true;

    // E-mandate on card patterns
    if (
      (lowerMessage.includes('e-mandate') || lowerMessage.includes('payment of')) &&
      (lowerMessage.includes('federal bank debit card') || lowerMessage.includes('federal bank credit card'))
    ) return true;

    // Exclude UPI transactions (these are not card transactions)
    if (lowerMessage.includes('via upi')) return false;
    if (lowerMessage.includes('to vpa')) return false;

    // Exclude ATM withdrawals from being categorized as card transactions
    if (lowerMessage.includes('atm')) return false;
    if (lowerMessage.includes('withdrawn') && !lowerMessage.includes('card')) return false;

    // Exclude IMPS/NEFT/RTGS transfers
    if (lowerMessage.includes('via imps')) return false;
    if (lowerMessage.includes('via neft')) return false;
    if (lowerMessage.includes('via rtgs')) return false;

    return false;
  }

  extractAmount(message: string): number | null {
    // Pattern 1: ₹882.00 (rupee symbol format for Scapia card)
    const rupeeSymbolPattern = /₹\s*([0-9,]+(?:\.\d{2})?)/i;
    const rupeeMatch = message.match(rupeeSymbolPattern);
    if (rupeeMatch) {
      const amount = parseFloat(rupeeMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 2: INR 506.52 spent (credit card format)
    const inrSpentPattern = /INR\s+([0-9,]+(?:\.\d{2})?)\s+spent/i;
    const inrSpentMatch = message.match(inrSpentPattern);
    if (inrSpentMatch) {
      const amount = parseFloat(inrSpentMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 3: "you've received INR 10,509.09"
    const receivedPattern = /you've received INR\s+([0-9,]+(?:\.\d{2})?)/i;
    const receivedMatch = message.match(receivedPattern);
    if (receivedMatch) {
      const amount = parseFloat(receivedMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 4: Rs 34.51 debited via UPI
    const debitPattern = /Rs\s+([0-9,]+(?:\.\d{2})?)\s+debited/i;
    const debitMatch = message.match(debitPattern);
    if (debitMatch) {
      const amount = parseFloat(debitMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 5: Rs 70.00 sent via UPI
    const sentPattern = /Rs\s+([0-9,]+(?:\.\d{2})?)\s+sent/i;
    const sentMatch = message.match(sentPattern);
    if (sentMatch) {
      const amount = parseFloat(sentMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 6: Rs 500.00 credited
    const creditPattern = /Rs\s+([0-9,]+(?:\.\d{2})?)\s+credited/i;
    const creditMatch = message.match(creditPattern);
    if (creditMatch) {
      const amount = parseFloat(creditMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 7: "has received Rs 21.00 from" (outgoing transfer to company)
    const hasReceivedPattern = /has\s+received\s+Rs\s+([0-9,]+(?:\.\d{2})?)\s+from/i;
    const hasReceivedMatch = message.match(hasReceivedPattern);
    if (hasReceivedMatch) {
      const amount = parseFloat(hasReceivedMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    // Pattern 8: withdrawn Rs 500
    const withdrawnPattern = /withdrawn\s+Rs\s+([0-9,]+(?:\.\d{2})?)/i;
    const withdrawnMatch = message.match(withdrawnPattern);
    if (withdrawnMatch) {
      const amount = parseFloat(withdrawnMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
    }

    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Priority 0: ATM/Cash withdrawal - check early to avoid matching phone numbers
    if (message.toLowerCase().includes('withdrawn')) {
      return 'Cash Withdrawal';
    }

    // Priority 1: "[Company] has received Rs X from your A/c" pattern (outgoing transfers)
    // Extract the company name at the start of the message
    const hasReceivedPattern = /^([A-Z][A-Za-z0-9\s]+?)\s+has\s+received\s+Rs/i;
    const hasReceivedMatch = message.match(hasReceivedPattern);
    if (hasReceivedMatch) {
      const merchant = this.cleanMerchantName(hasReceivedMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Priority 2: IMPS credits - show "IMPS Credit" instead of parsing description
    if (
      message.toLowerCase().includes('credited to your a/c') &&
      message.toLowerCase().includes('via imps')
    ) {
      return 'IMPS Credit';
    }

    // Priority 2: Card transactions - use detectIsCard to avoid duplication
    if (this.detectIsCard(message)) {
      // Credit card transactions - "at <merchant> on date" or "at <merchant> on your"
      if (message.toLowerCase().includes(' at ')) {
        // Pattern 1: "at <merchant> on your" (Scapia format)
        const scapiaPattern = /at\s+([^.\n]+?)\s+on\s+your/i;
        const scapiaMatch = message.match(scapiaPattern);
        if (scapiaMatch) {
          const merchant = this.cleanMerchantName(scapiaMatch[1].trim());
          if (this.isValidMerchantName(merchant)) {
            const cleanedMerchant = merchant
              .replace(/\s+(limited|ltd|pvt\s+ltd|private\s+limited)$/i, '')
              .trim();
            return cleanedMerchant.length > 0 ? cleanedMerchant : merchant;
          }
        }

        // Pattern 2: "at <merchant> on date" (traditional format)
        const creditCardPattern = /at\s+([^.\n]+?)\s+on\s+\d/i;
        const creditCardMatch = message.match(creditCardPattern);
        if (creditCardMatch) {
          const merchant = this.cleanMerchantName(creditCardMatch[1].trim());
          if (this.isValidMerchantName(merchant)) {
            const cleanedMerchant = merchant
              .replace(/\s+(limited|ltd|pvt\s+ltd|private\s+limited)$/i, '')
              .trim();
            return cleanedMerchant.length > 0 ? cleanedMerchant : merchant;
          }
        }
      }
    }

    // Priority 3: E-mandate transactions
    if (
      message.toLowerCase().includes('e-mandate') ||
      message.toLowerCase().includes('payment of')
    ) {
      const emandatePattern = /payment of\s+[^.]+?\s+for\s+([^.\n]+?)\s+via\s+e-mandate/i;
      const emandateMatch = message.match(emandatePattern);
      if (emandateMatch) {
        const merchant = this.cleanMerchantName(emandateMatch[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }

      const emandateDeclinedPattern = /payment via e-mandate\s+declined\s+for\s+ID:\s*[^.]+?\s+on\s+Federal Bank\s+Debit Card\s+\d+/i;
      if (emandateDeclinedPattern.test(message)) {
        return 'E-Mandate Declined';
      }
    }

    // Priority 4: UPI transactions - "to VPA merchant@bank"
    if (message.toLowerCase().includes('vpa')) {
      const vpaPattern = /to\s+VPA\s+([^\s]+?)(?:\.\s*Ref\s+No|\s*Ref\s+No|$)/i;
      const vpaMatch = message.match(vpaPattern);
      if (vpaMatch) {
        const vpa = vpaMatch[1].trim();
        return this.parseUPIMerchant(vpa);
      }
    }

    // Priority 5: "to <merchant name>" (general)
    const toPattern = /to\s+([^.\n]+?)(?:\.\s*Ref|Ref\s+No|$)/i;
    const toMatch = message.match(toPattern);
    if (toMatch) {
      const merchant = toMatch[1].trim();
      if (!merchant.toLowerCase().includes('vpa')) {
        const cleaned = this.cleanMerchantName(merchant);
        if (this.isValidMerchantName(cleaned)) {
          return cleaned;
        }
      }
    }

    // Priority 6: "you've received INR" transactions
    if (message.toLowerCase().includes("you've received")) {
      const sentByPattern = /It was sent by\s+([^.\n]+?)(?:\s+on|$)/i;
      const sentByMatch = message.match(sentByPattern);
      if (sentByMatch) {
        const senderName = sentByMatch[1].trim();
        if (/^0+$/.test(senderName) || senderName.length <= 4) {
          return 'Bank Transfer';
        }
        const merchant = this.cleanMerchantName(senderName);
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    // Priority 7: "from <sender name>"
    const fromPattern = /from\s+([^.\n]+?)(?:\.\s*|$)/i;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      const merchant = this.cleanMerchantName(fromMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Priority 8: Cash Deposit / CDM transactions
    if (
      message.toLowerCase().includes('cash deposit') ||
      message.toLowerCase().includes('deposited') ||
      message.includes('CDM') ||
      message.toLowerCase().includes('cash credited')
    ) {
      return 'Cash Deposit';
    }

    return super.extractMerchant(message, sender);
  }

  private parseUPIMerchant(vpa: string): string {
    const cleanVPA = vpa.split('@')[0].toLowerCase();

    // Airlines & Travel
    if (cleanVPA.includes('indigo')) return 'Indigo';
    if (cleanVPA.includes('spicejet')) return 'SpiceJet';
    if (cleanVPA.includes('airasia')) return 'AirAsia';
    if (cleanVPA.includes('vistara')) return 'Vistara';
    if (cleanVPA.includes('airindia')) return 'Air India';

    // Ride-hailing
    if (cleanVPA.includes('uber')) return 'Uber';
    if (cleanVPA.includes('ola')) return 'Ola';
    if (cleanVPA.includes('rapido')) return 'Rapido';

    // E-commerce
    if (cleanVPA.includes('amazon')) return 'Amazon';
    if (cleanVPA.includes('flipkart')) return 'Flipkart';
    if (cleanVPA.includes('myntra')) return 'Myntra';
    if (cleanVPA.includes('meesho')) return 'Meesho';

    // Payment apps
    if (cleanVPA.includes('paytm')) return 'Paytm';
    if (cleanVPA.includes('bharatpe')) return 'BharatPe';
    if (cleanVPA.includes('phonepe')) return 'PhonePe';
    if (cleanVPA.includes('googlepay') || cleanVPA.includes('gpay')) return 'Google Pay';

    // Food delivery
    if (cleanVPA.includes('swiggy')) return 'Swiggy';
    if (cleanVPA.includes('zomato')) return 'Zomato';

    // Entertainment
    if (cleanVPA.includes('netflix')) return 'Netflix';
    if (cleanVPA.includes('spotify')) return 'Spotify';
    if (cleanVPA.includes('hotstar') || cleanVPA.includes('disney')) return 'Disney+ Hotstar';
    if (cleanVPA.includes('prime')) return 'Amazon Prime';
    if (cleanVPA.includes('pvr') || cleanVPA.includes('inox')) return 'PVR Inox';
    if (cleanVPA.includes('bookmyshow') || cleanVPA.includes('bms')) return 'BookMyShow';

    // Telecom
    if (cleanVPA.includes('jio')) return 'Jio';
    if (cleanVPA.includes('airtel')) return 'Airtel';
    if (cleanVPA.includes('vodafone') || cleanVPA.includes('vi')) return 'Vi';
    if (cleanVPA.includes('bsnl')) return 'BSNL';

    // Travel
    if (cleanVPA.includes('irctc')) return 'IRCTC';
    if (cleanVPA.includes('redbus')) return 'RedBus';
    if (cleanVPA.includes('makemytrip') || cleanVPA.includes('mmt')) return 'MakeMyTrip';
    if (cleanVPA.includes('goibibo')) return 'Goibibo';
    if (cleanVPA.includes('oyo')) return 'OYO';
    if (cleanVPA.includes('airbnb')) return 'Airbnb';

    // Payment gateways
    if (cleanVPA.includes('razorpay') || cleanVPA.includes('razorp') || cleanVPA.includes('rzp')) {
      if (cleanVPA.includes('pvr')) return 'PVR';
      if (cleanVPA.includes('inox')) return 'PVR Inox';
      if (cleanVPA.includes('swiggy')) return 'Swiggy';
      if (cleanVPA.includes('zomato')) return 'Zomato';
      return 'Online Payment';
    }

    if (cleanVPA.includes('payu') || cleanVPA.includes('billdesk') || cleanVPA.includes('ccavenue')) {
      return 'Online Payment';
    }

    // Individual transfers
    if (/^\d+$/.test(cleanVPA)) return 'Individual';

    return vpa.trim();
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP and promotional messages
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code')
    ) {
      return false;
    }

    // Skip mandate creation notifications and declined payments
    if (this.isMandateCreationNotification(message) || this.isDeclinedMandatePayment(message)) {
      return false;
    }

    // Federal Bank specific transaction keywords
    const federalKeywords = [
      'sent via upi',
      'debited via upi',
      'credited',
      'withdrawn',
      'received',
      'transferred',
      'spent on your credit card',
      'credit card was successful',
      'payment of',
      'payment via e-mandate',
    ];

    if (federalKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return true;
    }

    return super.isTransactionMessage(message);
  }

  extractAccountLast4(message: string): string | null {
    const parentResult = super.extractAccountLast4(message);
    if (parentResult !== null && parentResult !== undefined) return parentResult;

    // Card-specific patterns
    if (this.detectIsCard(message)) {
      // Pattern 1: "credit card ending with 1234"
      const endingWithPattern = /(?:credit|debit)\s+card\s+ending\s+with\s+(\d{4})/i;
      const endingWithMatch = message.match(endingWithPattern);
      if (endingWithMatch) return endingWithMatch[1];

      // Pattern 2: "card XX**9747"
      const cardPattern = /card\s+XX\*\*?(\d{4})/i;
      const cardMatch = message.match(cardPattern);
      if (cardMatch) return cardMatch[1];

      // Pattern 3: "Federal Bank Debit Card 3456" (e-mandate format)
      const emandateCardPattern = /(?:Federal\s+Bank\s+)?(?:Debit|Credit)\s+Card\s+(\d{4})/i;
      const emandateCardMatch = message.match(emandateCardPattern);
      if (emandateCardMatch) return emandateCardMatch[1];
    }

    // Non-card: A/c XX4567
    const acPattern = /A\/c\s+([X*\d]+)/i;
    const acMatch = message.match(acPattern);
    if (acMatch) return this.extractLast4Digits(acMatch[1]);

    // Non-card: Account XXXXXXXX1896
    const accountPattern = /Account\s+([X*\d]+)/i;
    const accountMatch = message.match(accountPattern);
    if (accountMatch) return this.extractLast4Digits(accountMatch[1]);

    return null;
  }

  extractBalance(message: string): number | null {
    // Don't extract credit limit as balance
    return super.extractBalance(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // "[Company] has received Rs X from your A/c" - outgoing transfer (EXPENSE or INVESTMENT)
    if (this.isOutgoingHasReceivedPattern(message)) {
      if (this.isInvestmentTransaction(lowerMessage)) {
        return TransactionType.INVESTMENT;
      }
      return TransactionType.EXPENSE;
    }

    // Credit card bill payment - "received your payment towards credit card"
    if (lowerMessage.includes('received your payment') && lowerMessage.includes('credit card')) {
      return TransactionType.TRANSFER;
    }

    // Credit card transactions - now using detectIsCard
    if (
      this.detectIsCreditCard(message) &&
      (lowerMessage.includes('spent') ||
        lowerMessage.includes('was successful') ||
        lowerMessage.includes('txn of'))
    ) {
      return TransactionType.CREDIT;
    }

    // E-mandate payments (only successful ones)
    if (
      (lowerMessage.includes('e-mandate') || lowerMessage.includes('payment of')) &&
      lowerMessage.includes('processed successfully')
    ) {
      return TransactionType.EXPENSE;
    }

    // Expense keywords
    if (lowerMessage.includes('sent via upi')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('spent') && !this.detectIsCreditCard(message)) return TransactionType.EXPENSE;
    if (lowerMessage.includes('paid')) return TransactionType.EXPENSE;

    // Income keywords
    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('received')) return TransactionType.INCOME;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;
    if (lowerMessage.includes('refund')) return TransactionType.INCOME;

    return super.extractTransactionType(message);
  }

  /**
   * Detects "[Company] has received Rs X from your A/c" pattern
   * This indicates money going OUT of the user's account to a company
   */
  private isOutgoingHasReceivedPattern(message: string): boolean {
    const pattern = /has\s+received\s+Rs\s+[\d,.]+\s+from\s+your\s+A\/c/i;
    return pattern.test(message);
  }

  isMandateCreationNotification(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    return (
      (lowerMessage.includes('mandate') || lowerMessage.includes('e-mandate')) &&
      (lowerMessage.includes('successfully created a mandate') ||
        lowerMessage.includes('you have successfully created') ||
        lowerMessage.includes('successfully created') ||
        lowerMessage.includes('has been initiated') ||
        lowerMessage.includes('registration has been initiated'))
    );
  }

  isDeclinedMandatePayment(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    return (
      (lowerMessage.includes('e-mandate') || lowerMessage.includes('payment of')) &&
      lowerMessage.includes('declined')
    );
  }

  parseEMandateSubscription(message: string): EMandateInfo | null {
    if (!this.isMandateCreationNotification(message)) {
      return null;
    }

    const amountPattern = /(?:for\s+a\s+)?maximum\s+amount\s+of\s+Rs\.?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const amountMatch = message.match(amountPattern);
    if (!amountMatch) return null;
    const amountStr = amountMatch[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return null;

    const datePattern = /starting\s+from\s+(\d{2}-\d{2}-\d{4})/i;
    const dateMatch = message.match(datePattern);
    const startDate = dateMatch ? dateMatch[1] : null;

    const merchantPattern = /(?:created\s+a\s+mandate\s+on|mandate\s+on)\s+([^.\n]+?)(?:\s+for|\s*$)/i;
    const merchantMatch = message.match(merchantPattern);
    const merchant = merchantMatch
      ? this.cleanMerchantName(merchantMatch[1].trim())
      : 'Unknown Subscription';

    const umnPattern = /Mandate\s+Ref\s+No-?\s*([^.\s]+)/i;
    const umnMatch = message.match(umnPattern);
    const umn = umnMatch ? umnMatch[1] : null;

    return {
      amount,
      nextDeductionDate: startDate,
      merchant,
      umn,
      dateFormat: 'dd-MM-yyyy',
    };
  }

  parseFutureDebit(message: string): EMandateInfo | null {
    const lowerMessage = message.toLowerCase();

    if (!lowerMessage.includes('payment due') || !lowerMessage.includes('will be processed')) {
      return null;
    }

    const amountPattern = /INR\s+(\d+(?:,\d{3})*(?:\.\d{2})?)/i;
    const amountMatch = message.match(amountPattern);
    if (!amountMatch) return null;
    const amountStr = amountMatch[1].replace(/,/g, '');
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) return null;

    const datePattern = /on\s+(\d{2}\/\d{2}\/\d{4})/i;
    const dateMatch = message.match(datePattern);
    let dueDate: string | null = null;
    if (dateMatch) {
      const dateStr = dateMatch[1];
      try {
        const parts = dateStr.split('/');
        if (parts.length === 3) {
          dueDate = `${parts[0]}/${parts[1]}/${parts[2].slice(-2)}`;
        } else {
          dueDate = dateStr;
        }
      } catch {
        dueDate = dateStr;
      }
    }

    const merchantPattern = /for\s+([^.\n]+?)\s*,\s*INR/i;
    const merchantMatch = message.match(merchantPattern);
    const merchant = merchantMatch
      ? this.cleanMerchantName(merchantMatch[1].trim())
      : 'Unknown Subscription';

    return {
      amount,
      nextDeductionDate: dueDate,
      merchant,
      umn: null,
      dateFormat: 'dd-MM-yyyy',
    };
  }

  isTransactionMessageForTesting(message: string): boolean {
    return this.isTransactionMessage(message);
  }
}

export default new FederalBankParser();
