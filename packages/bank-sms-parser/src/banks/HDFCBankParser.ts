import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType, MandateInfo } from '../core/types';
import { CompiledPatterns } from '../core/CompiledPatterns';

/**
 * HDFC Bank specific parser.
 * Handles HDFC's unique message formats including:
 * - Standard debit/credit messages
 * - UPI transactions with VPA details
 * - Salary credits with company names
 * - E-Mandate notifications
 * - Card transactions
 */
export class HDFCBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'HDFC Bank';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();

    const hdfcSenders = new Set([
      'HDFCBK',
      'HDFCBANK',
      'HDFC',
      'HDFCB',
    ]);

    if (hdfcSenders.has(upperSender)) return true;

    return CompiledPatterns.HDFC.DLT_PATTERNS.some((p: RegExp) => p.test(upperSender));
  }

  extractMerchant(message: string, sender: string): string | null {
    // Check for HDFC Bank Card debit transactions - "Spent Rs.xxx From HDFC Bank Card xxxx At [MERCHANT] On xxx"
    if (
      /From HDFC Bank Card/i.test(message) &&
      / At /i.test(message) &&
      / On /i.test(message)
    ) {
      const atIndex = message.search(/ At /i);
      const onIndex = message.search(/ On /i);
      if (atIndex !== -1 && onIndex !== -1 && onIndex > atIndex) {
        const merchant = message.substring(atIndex + 4, onIndex).trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    // Check for "Txn Rs.X On HDFC Bank Card At [MERCHANT] by UPI" format
    if (
      /Txn/i.test(message) &&
      /At /i.test(message) &&
      /Card/i.test(message)
    ) {
      const txnAtPattern = /At\s+(.+?)\s*(?:by\s+UPI|on\s+\d|$)/is;
      const txnAtMatch = message.match(txnAtPattern);
      if (txnAtMatch) {
        const merchant = txnAtMatch[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    // Check for ATM withdrawals - extract location
    if (/withdrawn/i.test(message)) {
      const atLocationPattern = /At\s+\+?([^O]+?)\s+On/i;
      const atLocationMatch = message.match(atLocationPattern);
      if (atLocationMatch) {
        const location = atLocationMatch[1].trim();
        return location.length > 0
          ? `ATM at ${this.cleanMerchantName(location)}`
          : 'ATM';
      }
      return 'ATM';
    }

    // Check for generic ATM mentions (without "withdrawn")
    if (/ATM/i.test(message)) {
      return 'ATM';
    }

    // For credit card transactions (with BLOCK CC/PCC instruction), extract merchant after "At"
    if (
      /card/i.test(message) &&
      / at /i.test(message) &&
      (/block cc/i.test(message) || /block pcc/i.test(message))
    ) {
      const atPattern = /at\s+([^@\s]+(?:@[^\s]+)?(?:\s+[^\s]+)?)(?:\s+by\s+|\s+on\s+|$)/i;
      const atMatch = message.match(atPattern);
      if (atMatch) {
        const merchant = atMatch[1].trim();
        const cleanedMerchant = merchant.includes('@')
          ? (() => {
              const vpaName = merchant.substring(0, merchant.indexOf('@')).trim();
              return /qr$/i.test(vpaName) ? vpaName.slice(0, -2) : vpaName;
            })()
          : merchant;
        if (cleanedMerchant.length > 0) {
          return this.cleanMerchantName(cleanedMerchant);
        }
      }
    }

    // Pattern 0: NEFT/RTGS credit - "for NEFT Cr-IFSCCODE-COMPANY NAME-BENEFICIARY-REF"
    if (/NEFT/i.test(message) || /RTGS/i.test(message)) {
      const neftPattern = /(?:NEFT|RTGS)\s+Cr-[A-Z]{4}0[A-Z0-9]{6}-([^-]+)/i;
      const neftMatch = message.match(neftPattern);
      if (neftMatch) {
        const merchant = neftMatch[1].trim();
        if (merchant.length > 0 && !/^\d+$/.test(merchant)) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    // Pattern 1: Salary credit - "for XXXXX-ABC-XYZ MONTH SALARY-COMPANY NAME"
    if (/SALARY/i.test(message) && /deposited/i.test(message)) {
      const salaryMatch = CompiledPatterns.HDFC.SALARY_PATTERN.exec(message);
      if (salaryMatch) {
        return this.cleanMerchantName(salaryMatch[1].trim());
      }

      const simpleSalaryMatch = CompiledPatterns.HDFC.SIMPLE_SALARY_PATTERN.exec(message);
      if (simpleSalaryMatch) {
        const merchant = simpleSalaryMatch[1].trim();
        if (merchant.length > 0 && !/^\d+$/.test(merchant)) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    // Pattern 2: "Info: UPI/merchant/category" format
    if (/Info:/i.test(message)) {
      const infoMatch = CompiledPatterns.HDFC.INFO_PATTERN.exec(message);
      if (infoMatch) {
        const merchant = infoMatch[1].trim();
        if (merchant.length > 0 && !/^UPI$/i.test(merchant)) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    // Pattern 3: "VPA merchant@bank (Merchant Name)" format
    if (/VPA/i.test(message)) {
      // Special case for UPI credit: "from VPA username@provider (UPI reference)"
      if (/from VPA/i.test(message) && /credited/i.test(message)) {
        const fromVpaPattern = /from\s+VPA\s*([^@\s]+)@[^\s]+\s*\(UPI\s+\d+\)/i;
        const fromVpaMatch = message.match(fromVpaPattern);
        if (fromVpaMatch) {
          const vpaUsername = fromVpaMatch[1].trim();
          if (vpaUsername.length > 0) {
            return this.cleanMerchantName(vpaUsername);
          }
        }
      }

      // First try to get name in parentheses
      const vpaWithNameMatch = CompiledPatterns.HDFC.VPA_WITH_NAME.exec(message);
      if (vpaWithNameMatch) {
        return this.cleanMerchantName(vpaWithNameMatch[1].trim());
      }

      // Then try just the VPA username part
      const vpaMatch = CompiledPatterns.HDFC.VPA_PATTERN.exec(message);
      if (vpaMatch) {
        const vpaName = vpaMatch[1].trim();
        if (vpaName.length > 3 && !/^\d+$/.test(vpaName)) {
          return this.cleanMerchantName(vpaName);
        }
      }
    }

    // Pattern 4: "spent on Card XX1234 at merchant on date"
    if (/spent on Card/i.test(message)) {
      const spentMatch = CompiledPatterns.HDFC.SPENT_PATTERN.exec(message);
      if (spentMatch) {
        return this.cleanMerchantName(spentMatch[1].trim());
      }
    }

    // Pattern 5: "debited for merchant on date"
    if (/debited for/i.test(message)) {
      const debitForMatch = CompiledPatterns.HDFC.DEBIT_FOR_PATTERN.exec(message);
      if (debitForMatch) {
        return this.cleanMerchantName(debitForMatch[1].trim());
      }
    }

    // Pattern 6: "To merchant name" (for UPI mandate)
    if (/UPI Mandate/i.test(message)) {
      const mandateMatch = CompiledPatterns.HDFC.MANDATE_PATTERN.exec(message);
      if (mandateMatch) {
        return this.cleanMerchantName(mandateMatch[1].trim());
      }
    }

    // Pattern 7: "towards [Merchant Name]" (for payment alerts)
    if (/towards/i.test(message)) {
      const towardsPattern = /towards\s+([^\n]+?)(?:\s+UMRN|\s+ID:|\s+Alert:|$)/i;
      const towardsMatch = message.match(towardsPattern);
      if (towardsMatch) {
        const merchant = towardsMatch[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    // Pattern 8: "For: [Description]" (for payment alerts)
    if (/For:/i.test(message)) {
      const forColonPattern = /For:\s+([^\n]+?)(?:\s+From|\s+Via|$)/i;
      const forColonMatch = message.match(forColonPattern);
      if (forColonMatch) {
        const merchant = forColonMatch[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    // Pattern 9: "for [Merchant Name]" (for future debit notifications)
    if (/for /i.test(message) && /will be debited/i.test(message)) {
      const forPattern = /for\s+([^\n]+?)(?:\s+mandate|\s+will\s+be|\s+ID:|\s+Act:|$)/i;
      const forMatch = message.match(forPattern);
      if (forMatch) {
        const merchant = forMatch[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    // Fall back to generic extraction
    return super.extractMerchant(message, sender);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (this.isInvestmentTransaction(lowerMessage)) {
      return TransactionType.INVESTMENT;
    }

    if (lowerMessage.includes('block cc') || lowerMessage.includes('block pcc')) {
      return TransactionType.CREDIT;
    }

    if (lowerMessage.includes('spent on card') && !lowerMessage.includes('block dc')) {
      return TransactionType.CREDIT;
    }

    if (lowerMessage.includes('payment') && lowerMessage.includes('credit card')) {
      return TransactionType.EXPENSE;
    }

    if (lowerMessage.includes('towards') && lowerMessage.includes('credit card')) {
      return TransactionType.EXPENSE;
    }

    if (lowerMessage.includes('sent') && lowerMessage.includes('from hdfc')) {
      return TransactionType.EXPENSE;
    }

    if (lowerMessage.includes('spent') && lowerMessage.includes('from hdfc bank card')) {
      return TransactionType.EXPENSE;
    }

    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn') && !lowerMessage.includes('block cc')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('spent') && !lowerMessage.includes('card')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('charged')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('paid')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('purchase')) return TransactionType.EXPENSE;

    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;
    if (lowerMessage.includes('received')) return TransactionType.INCOME;
    if (lowerMessage.includes('refund')) return TransactionType.INCOME;
    if (lowerMessage.includes('cashback') && !lowerMessage.includes('earn cashback')) return TransactionType.INCOME;

    return null;
  }

  extractReference(message: string): string | null {
    const hdfcPatterns = [
      CompiledPatterns.HDFC.REF_SIMPLE,
      CompiledPatterns.HDFC.UPI_REF_NO,
      CompiledPatterns.HDFC.REF_NO,
      CompiledPatterns.HDFC.REF_END,
    ];

    for (const pattern of hdfcPatterns) {
      const match = pattern.exec(message);
      if (match) {
        return match[1].trim();
      }
    }

    return super.extractReference(message);
  }

  extractAccountLast4(message: string): string | null {
    const base = super.extractAccountLast4(message);
    if (base !== null && base !== undefined) return base;

    // Pattern for "Card x####" format in withdrawals
    const cardPattern = /Card\s+x(\d{4})/i;
    const cardMatch = message.match(cardPattern);
    if (cardMatch) {
      return cardMatch[1];
    }

    // Pattern for "HDFC Bank Credit Card ####" / "HDFC Bank Debit Card ####"
    const plainCardPattern = /HDFC\s+Bank\s+(?:Credit|Debit)\s+Card\s+(\d{4})\b/i;
    const plainCardMatch = message.match(plainCardPattern);
    if (plainCardMatch) {
      return plainCardMatch[1];
    }

    // Pattern for "BLOCK DC ####" format
    const blockDCPattern = /BLOCK\s+DC\s+(\d{4})/i;
    const blockDCMatch = message.match(blockDCPattern);
    if (blockDCMatch) {
      return blockDCMatch[1];
    }

    // Pattern for "HDFC Bank XXNNNN" format
    const hdfcBankPattern = /HDFC\s+Bank\s+([X*]+\d{3,6})/i;
    const hdfcBankMatch = message.match(hdfcBankPattern);
    if (hdfcBankMatch) {
      return this.extractLast4Digits(hdfcBankMatch[1]);
    }

    const hdfcPatterns = [
      CompiledPatterns.HDFC.ACCOUNT_DEPOSITED,
      CompiledPatterns.HDFC.ACCOUNT_FROM,
      CompiledPatterns.HDFC.ACCOUNT_SIMPLE,
      CompiledPatterns.HDFC.ACCOUNT_GENERIC,
    ];

    for (const pattern of hdfcPatterns) {
      const match = pattern.exec(message);
      if (match) {
        return this.extractLast4Digits(match[1]);
      }
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // HDFC specific pattern for "Avl bal:INR NNNN.NN"
    const avlBalINRPattern = /Avl\s+bal:?\s*INR\s*([0-9,]+(?:\.\d{2})?)/i;
    const avlBalINRMatch = message.match(avlBalINRPattern);
    if (avlBalINRMatch) {
      const balanceStr = avlBalINRMatch[1].replace(/,/g, '');
      const value = parseFloat(balanceStr);
      return isNaN(value) ? null : value;
    }

    // Pattern for "Available Balance: INR NNNN.NN"
    const availableBalINRPattern = /Available\s+Balance:?\s*INR\s*([0-9,]+(?:\.\d{2})?)/i;
    const availableBalINRMatch = message.match(availableBalINRPattern);
    if (availableBalINRMatch) {
      const balanceStr = availableBalINRMatch[1].replace(/,/g, '');
      const value = parseFloat(balanceStr);
      return isNaN(value) ? null : value;
    }

    // Pattern for "Bal Rs.NNNN.NN" or "Bal Rs NNNN.NN"
    const balRsPattern = /Bal\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const balRsMatch = message.match(balRsPattern);
    if (balRsMatch) {
      const balanceStr = balRsMatch[1].replace(/,/g, '');
      const value = parseFloat(balanceStr);
      return isNaN(value) ? null : value;
    }

    return super.extractBalance(message);
  }

  cleanMerchantName(merchant: string): string {
    return super.cleanMerchantName(merchant);
  }

  isTransactionMessage(message: string): boolean {
    if (this.isEMandateNotification(message)) {
      return false;
    }

    if (this.isFutureDebitNotification(message)) {
      return false;
    }

    const lowerMessage = message.toLowerCase();

    if (
      lowerMessage.includes('nach mandate') &&
      lowerMessage.includes('received') &&
      lowerMessage.includes('for processing')
    ) {
      return false;
    }

    if (
      lowerMessage.includes('bill alert') ||
      (lowerMessage.includes('bill') && lowerMessage.includes('is due on'))
    ) {
      return false;
    }

    if (lowerMessage.includes('payment alert')) {
      if (!lowerMessage.includes('will be')) {
        return true;
      }
    }

    if (
      lowerMessage.includes('has requested') ||
      lowerMessage.includes('payment request') ||
      lowerMessage.includes('to pay, download') ||
      lowerMessage.includes('collect request') ||
      lowerMessage.includes('ignore if already paid')
    ) {
      return false;
    }

    if (lowerMessage.includes('received towards your credit card')) {
      return false;
    }

    if (
      lowerMessage.includes('payment') &&
      lowerMessage.includes('credited to your card')
    ) {
      return false;
    }

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

    const hdfcTransactionKeywords = [
      'debited', 'credited', 'withdrawn', 'deposited',
      'spent', 'received', 'transferred', 'paid',
      'sent',
      'deducted',
      'txn',
      'refund',
    ];

    return hdfcTransactionKeywords.some(kw => lowerMessage.includes(kw));
  }

  // ==========================================
  // E-Mandate / Subscription Logic
  // ==========================================

  /**
   * Parses E-Mandate subscription information from HDFC messages.
   */
  parseEMandateSubscription(message: string): EMandateInfo | null {
    if (!this.isEMandateNotification(message)) {
      return null;
    }

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
          break;
        }
      }
    }

    if (amount === null) return null;

    let merchant = 'Unknown Subscription';
    const merchantPatterns = [
      /towards\s+([^.\n]+?)(?:\s+from|\s+A\/c|\s+UMRN|\s+ID:|\s+Alert:|\s*\.|$)/i,
      /for\s+([^.\n]+?)(?:\s+mandate|\s+will\s+be|\s+ID:|\s+Act:|\s*\.|$)/i,
      /Info:\s*([^.\n]+?)(?:\s*$)/i,
      /To\s+([^.\n]+?)(?:\s+UPI|,|$)/i,
    ];

    for (const pattern of merchantPatterns) {
      const match = message.match(pattern);
      if (match) {
        const m = this.cleanMerchantName(match[1].trim());
        if (this.isValidMerchantName(m) && m.length > 2) {
          merchant = m;
          break;
        }
      }
    }

    const datePatterns = [
      /on\s+(\d{2}-\w{3}-\d{2,4})/i,
      /date[:\s]+(\d{2}\/\d{2}\/\d{2,4})/i,
      /(\d{2}-\d{2}-\d{4})/i,
      /(\d{2}\/\d{2}\/\d{2,4})/i,
    ];

    let nextDeductionDate: string | null = null;
    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        nextDeductionDate = match[1];
        break;
      }
    }

    const umnPatterns = [
      /UMN[:\s]+([^.\s]+)/i,
      /UMRN[:\s]+([^.\s]+)/i,
    ];

    let umn: string | null = null;
    for (const pattern of umnPatterns) {
      const match = message.match(pattern);
      if (match) {
        umn = match[1];
        break;
      }
    }

    return {
      amount,
      nextDeductionDate,
      merchant,
      umn,
      dateFormat: 'dd/MM/yy',
    };
  }

  /**
   * Parses future debit notification from HDFC messages.
   * These are alerts for upcoming subscription charges.
   */
  parseFutureDebit(message: string): EMandateInfo | null {
    if (!this.isFutureDebitNotification(message)) {
      return null;
    }

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
          break;
        }
      }
    }

    if (amount === null) return null;

    let merchant = 'Unknown Subscription';
    const merchantPatterns = [
      /for\s+([^.\n]+?)(?:\s+mandate|\s+will\s+be|\s+ID:|\s+Act:|\s*\.|$)/i,
      /towards\s+([^.\n]+?)(?:\s+from|\s+A\/c|\s+UMRN|\s+ID:|\s*\.|$)/i,
    ];

    for (const pattern of merchantPatterns) {
      const match = message.match(pattern);
      if (match) {
        const m = this.cleanMerchantName(match[1].trim());
        if (this.isValidMerchantName(m) && m.length > 2) {
          merchant = m;
          break;
        }
      }
    }

    const datePatterns = [
      /on\s+(\d{2}-\w{3}-\d{2,4})/i,
      /on\s+(\d{2}\/\d{2}\/\d{2,4})/i,
      /(\d{2}-\d{2}-\d{4})/i,
    ];

    let nextDeductionDate: string | null = null;
    for (const pattern of datePatterns) {
      const match = message.match(pattern);
      if (match) {
        nextDeductionDate = match[1];
        break;
      }
    }

    return {
      amount,
      nextDeductionDate,
      merchant,
      umn: null,
      dateFormat: 'dd/MM/yy',
    };
  }
}

/**
 * E-Mandate information for HDFC Bank
 */
export interface EMandateInfo extends MandateInfo {
  amount: number;
  nextDeductionDate: string | null;
  merchant: string;
  umn: string | null;
  dateFormat: string;
}

export default new HDFCBankParser();
