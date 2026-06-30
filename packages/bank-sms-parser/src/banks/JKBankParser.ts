import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';
import { md5Hex } from '../core/hashing';

/**
 * Jammu & Kashmir Bank (JK Bank) specific parser.
 * Handles JK Bank's message formats including:
 * - Standard debit/credit messages
 * - UPI transactions
 * - Account number patterns
 * - Balance updates
 */
export class JKBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'JK Bank';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();

    // Common JK Bank sender IDs
    const jkBankSenders = new Set([
      'JKBANK',
      'JKB',
      'JKBANKL',
      'JKBNK',
    ]);

    // Direct match
    if (jkBankSenders.has(upperSender)) return true;

    // DLT patterns (AD-JKBANK-S, etc.)
    const dltPatterns = [
      /^[A-Z]{2}-JKBANK.*$/,
      /^[A-Z]{2}-JKB.*$/,
      /^[A-Z]{2}-JKBNK.*$/,
      /^JKBANK-[A-Z]+$/,
      /^JKB-[A-Z]+$/,
    ];

    return dltPatterns.some(pattern => pattern.test(upperSender));
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    const parsedTransaction = super.parse(smsBody, sender, timestamp);
    if (parsedTransaction === null) return null;

    // Generate JK Bank specific transaction hash
    const customHash = this.generateJKBankHash(parsedTransaction, smsBody, sender);

    // Return with custom hash
    return {
      ...parsedTransaction,
      transactionHash: customHash,
    };
  }

  private generateJKBankHash(
    transaction: ParsedTransaction,
    smsBody: string,
    sender: string
  ): string {
    const normalizedAmount = Math.round(transaction.amount * 100) / 100;

    // Use the already parsed reference to ensure consistency
    // This avoids issues where extractJKBankReference might have different patterns than extractReference
    const reference = transaction.reference;
    const transactionTime = this.extractTransactionTime(smsBody);

    let hashData: string;

    if (reference !== null && reference !== undefined && transactionTime !== null && transactionTime !== undefined) {
      // BEST CASE: Amount + UTR/Ref + Transaction Time
      // This uniquely identifies the transaction even if SMS is sent multiple times
      hashData = `JKBANK|${normalizedAmount}|REF:${reference}|TIME:${transactionTime}`;
    } else if (reference !== null && reference !== undefined) {
      // GOOD: Amount + UTR/Ref (unique per transaction)
      hashData = `JKBANK|${normalizedAmount}|REF:${reference}`;
    } else if (transactionTime !== null && transactionTime !== undefined && transaction.balance !== null && transaction.balance !== undefined) {
      // GOOD: Amount + Transaction Time + Balance
      // Transaction time helps identify the actual transaction, not SMS time
      const normalizedBalance = Math.round(transaction.balance * 100) / 100;
      hashData = `JKBANK|${normalizedAmount}|TIME:${transactionTime}|BAL:${normalizedBalance}`;
    } else if (transactionTime !== null && transactionTime !== undefined) {
      // FALLBACK: Amount + Transaction Time
      hashData = `JKBANK|${normalizedAmount}|TIME:${transactionTime}`;
    } else if (transaction.balance !== null && transaction.balance !== undefined) {
      // FALLBACK: Amount + Sender + Closing Balance
      // Balance helps differentiate multiple transactions of same amount
      const normalizedBalance = Math.round(transaction.balance * 100) / 100;
      hashData = `JKBANK|${normalizedAmount}|${sender}|BAL:${normalizedBalance}`;
    } else {
      // LAST RESORT: Original method (Amount + Sender + SMS Timestamp)
      // Only used if no transaction-specific data is available
      hashData = `${sender}|${normalizedAmount}|${transaction.timestamp}`;
    }

    return md5Hex(hashData);
  }

  private extractJKBankReference(message: string): string | null {
    const patterns = [
      // RTGS-JAKAH25085024027
      /RTGS-([A-Z0-9]+)/,
      // NEFT/IMPS references
      /NEFT-([A-Z0-9]+)/,
      /IMPS-([A-Z0-9]+)/,
      // UTR/TRN numbers
      /UTR\s+([A-Z0-9]+)/,
      /TRN\s+([A-Z0-9]+)/,
      // CHRGS/RTGS/BWY - unique charge reference
      /by\s+(CHRGS\/[^.]+)/,
      // eTFR/mTFR references
      /by\s+(eTFR\/[^.]+)/,
      /by\s+(mTFR\/\d+\/[^.]+)/,
      // UPI reference
      /UPI\s+Ref[:\s]+(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  }

  private extractTransactionTime(message: string): string | null {
    // Extract transaction time from JK Bank messages
    // Pattern: "at 10:43 by" or "on 17-Sep-24 at 10:43"
    const patterns: RegExp[] = [
      // Time only: "at 10:43"
      /at\s+(\d{1,2}:\d{2}(?::\d{2})?)/i,
      // Date and time: "on 17-Sep-24 at 10:43"
      /on\s+(\d{1,2}-\w{3}-\d{2,4})\s+at\s+(\d{1,2}:\d{2})/i,
      // Date only: "on 17-Sep-24"
      /on\s+(\d{1,2}-\w{3}-\d{2,4})/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        if (match.length === 2) {
          return match[1]; // Time only
        } else if (match.length === 3) {
          return `${match[1]} ${match[2]}`; // Date and time
        } else {
          return null;
        }
      }
    }

    return null;
  }

  extractMerchant(message: string, sender: string): string | null {
    // Check for IMPS Fund transfer pattern first
    // "Amt received from TRUEFILLINGS ADVISOR having A/C No."
    if (message.toLowerCase().includes('imps fund transfer')) {
      const impsPattern = /Amt\s+received\s+from\s+([^h]+?)(?:\s+having\s+A\/C|$)/i;
      const impsMatch = message.match(impsPattern);
      if (impsMatch) {
        const merchant = impsMatch[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }

      // Fallback pattern for "received from"
      const fromPattern = /received\s+from\s+([^.\n]+?)(?:\s+having|\s+with|$)/i;
      const fromMatch = message.match(fromPattern);
      if (fromMatch) {
        const merchant = fromMatch[1].trim();
        if (merchant.length > 0) {
          return this.cleanMerchantName(merchant);
        }
      }

      return 'IMPS Transfer';
    }

    // Check for TIN/Tax Information Network (handles both full and truncated versions)
    if (
      message.toLowerCase().includes('tin/tax information') ||
      message.toLowerCase().includes('tin/tax informat')
    ) {
      return 'Tax Information Network';
    }

    // Check for ATM Recovery and other charges
    if (message.toLowerCase().includes('atm recovery')) {
      return 'ATM Recovery Charge';
    }

    // Check for "towards" pattern - common for tax and other payments
    const towardsPattern = /towards\s+([^.\n]+?)(?:\.\s*Avl|\.\s*Available|\.\s*To\s+dispute|$)/i;
    const towardsMatch = message.match(towardsPattern);
    if (towardsMatch) {
      const merchant = towardsMatch[1].trim();

      // Special handling for TIN/Tax patterns
      if (
        merchant.toLowerCase().includes('tin/tax informat') ||
        merchant.toLowerCase().includes('tin/tax information')
      ) {
        return 'Tax Information Network';
      }

      // Return the merchant name, cleaning it up
      return this.cleanMerchantName(merchant);
    }

    // Check for transaction patterns "by XXX" but skip the amount part
    // Pattern: "Debited by INR 402393 at 10:43 by RTGS-..."
    const transactionByPattern =
      /(?:Debited|Credited)\s+by\s+INR\s+[\d,]+(?:\.\d{2})?\s+at\s+[\d:]+\s+by\s+([^.\n]+?)(?:\.|Available|$)/i;
    const transactionByMatch = message.match(transactionByPattern);
    if (transactionByMatch) {
      const merchant = transactionByMatch[1].trim();

      // Bank charges patterns - return null as these are internal bank charges
      if (
        merchant.toLowerCase().includes('chrgs') ||
        merchant.toLowerCase().includes('charges')
      ) {
        return null;
      } else if (merchant.toLowerCase().includes('indian clearing corpo')) {
        return 'Indian Clearing Corporation';
      } else if (merchant.toLowerCase().includes('clearing corpo')) {
        return 'Clearing Corporation';
      } else if (merchant.toLowerCase().includes('nse clearing')) {
        return 'NSE Clearing';
      } else if (merchant.toLowerCase().includes('bse clearing')) {
        return 'BSE Clearing';
      } else if (
        merchant.toLowerCase().includes('rtgs') &&
        !merchant.toLowerCase().includes('clearing')
      ) {
        return 'RTGS Transfer';
      } else if (merchant.toLowerCase().includes('neft')) {
        return 'NEFT Transfer';
      } else if (merchant.toLowerCase().includes('imps')) {
        return 'IMPS Transfer';
      } else if (merchant.toLowerCase().includes('etfr')) {
        return 'Transfer';
      } else if (merchant.toLowerCase().includes('mtfr')) {
        // Extract the actual recipient name from mTFR/phone/NAME pattern
        const mtfrMatch = merchant.match(/mTFR\/\d+\/(.+)/i);
        if (mtfrMatch) {
          return this.cleanMerchantName(mtfrMatch[1].trim());
        }
        return 'Mobile Transfer';
      } else if (merchant.toLowerCase().includes('tin')) {
        return 'Tax Information Network';
      } else {
        return this.cleanMerchantName(merchant.split('/')[0]);
      }
    }

    // Fallback pattern for simpler "by XXX" format
    const simpleByPattern = /by\s+([^.\n]+?)(?:\.|Available|$)/i;
    const simpleByMatch = message.match(simpleByPattern);
    if (simpleByMatch) {
      const merchant = simpleByMatch[1].trim();
      // Skip if it starts with INR (amount)
      if (!merchant.toLowerCase().startsWith('inr')) {
        return this.cleanMerchantName(merchant);
      }
    }

    // Pattern 1: "via UPI from SENDER NAME on" (for credits)
    if (message.toLowerCase().includes('via upi from')) {
      const fromPattern = /via\s+UPI\s+from\s+([^.\n]+?)\s+on/i;
      const fromMatch = message.match(fromPattern);
      if (fromMatch) {
        const merchant = fromMatch[1].trim();
        if (this.isValidMerchantName(merchant)) {
          return this.cleanMerchantName(merchant);
        }
      }
    }

    // Pattern 2: "by mTFR/962211111/SENDER NAME" (mPay transfer)
    // mTFR = mPay transfer, followed by mobile number, then sender name
    const mtfrPattern = /mTFR\/\d+\/([^.\n]+?)(?:\.|A\/C|$)/i;
    const mtfrMatch = message.match(mtfrPattern);
    if (mtfrMatch) {
      const merchant = mtfrMatch[1].trim();
      if (this.isValidMerchantName(merchant)) {
        return this.cleanMerchantName(merchant);
      }
    }

    // Pattern 3: UPI transactions to merchant
    if (message.toLowerCase().includes('via upi')) {
      // Look for UPI VPA pattern
      const vpaPattern = /to\s+([^@\s]+@[^\s]+)/i;
      const vpaMatch = message.match(vpaPattern);
      if (vpaMatch) {
        const vpa = vpaMatch[1].trim();
        // Extract the part before @ as merchant name
        const merchantName = vpa.split('@')[0];
        if (merchantName.length > 0 && merchantName !== 'upi') {
          return this.cleanMerchantName(merchantName);
        }
      }

      // Look for merchant after "to" but before "via UPI"
      const toMerchantPattern = /to\s+([^.\n]+?)\s+via\s+UPI/i;
      const toMerchantMatch = message.match(toMerchantPattern);
      if (toMerchantMatch) {
        const merchant = toMerchantMatch[1].trim();
        if (this.isValidMerchantName(merchant)) {
          return this.cleanMerchantName(merchant);
        }
      }

      // Default to "UPI" if no specific merchant found
      return 'UPI';
    }

    // Check for ATM withdrawals
    if (
      message.toLowerCase().includes('atm') ||
      message.toLowerCase().includes('withdrawn')
    ) {
      return 'ATM';
    }

    // Standard patterns for merchant extraction
    const merchantPatterns = [
      // Pattern for "to MERCHANT via"
      /to\s+([^.\n]+?)\s+via/i,
      // Pattern for "from MERCHANT"
      /from\s+([^.\n]+?)(?:\s+on|\s+Ref|$)/i,
      // Pattern for "at MERCHANT"
      /at\s+([^.\n]+?)(?:\s+on|\s+Ref|$)/i,
      // Pattern for "for MERCHANT"
      /for\s+([^.\n]+?)(?:\s+on|\s+Ref|$)/i,
    ];

    for (const pattern of merchantPatterns) {
      const match = message.match(pattern);
      if (match) {
        const merchant = this.cleanMerchantName(match[1].trim());
        if (this.isValidMerchantName(merchant)) {
          return merchant;
        }
      }
    }

    // Fall back to base extraction
    return super.extractMerchant(message, sender);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // Check for investment-related transactions first
    if (
      lowerMessage.includes('clearing corpo') ||
      lowerMessage.includes('indian clearing') ||
      lowerMessage.includes('nse clearing') ||
      lowerMessage.includes('bse clearing') ||
      lowerMessage.includes('iccl') ||
      lowerMessage.includes('nsccl')
    ) {
      // Clearing corporations handle investment transactions
      // Credits are redemptions/dividends, debits are investments
      if (lowerMessage.includes('credited')) return TransactionType.INVESTMENT;
      if (lowerMessage.includes('debited')) return TransactionType.INVESTMENT;
      return null;
    }

    // JK Bank specific patterns
    if (lowerMessage.includes('has been debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('has been credited')) return TransactionType.INCOME;

    // Standard expense keywords
    if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('withdrawn')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('spent')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('charged')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('paid')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('purchase')) return TransactionType.EXPENSE;
    if (lowerMessage.includes('transferred')) return TransactionType.EXPENSE;

    // Income keywords
    if (lowerMessage.includes('credited')) return TransactionType.INCOME;
    if (lowerMessage.includes('deposited')) return TransactionType.INCOME;
    if (lowerMessage.includes('received')) return TransactionType.INCOME;
    if (lowerMessage.includes('refund')) return TransactionType.INCOME;
    if (lowerMessage.includes('cashback') && !lowerMessage.includes('earn cashback')) return TransactionType.INCOME;

    return null;
  }

  extractReference(message: string): string | null {
    // JK Bank specific reference patterns
    const jkBankPatterns = [
      // RRN No.1234567890 for IMPS transfers
      /RRN\s+No\.?\s*(\d+)/i,
      // UPI Ref: 115458170728
      /UPI\s+Ref[:\s]+(\d+)/i,
      // txn Ref: XXXXX
      /txn\s+Ref[:\s]+([A-Z0-9]+)/i,
      // Reference: XXXXX
      /Reference[:\s]+([A-Z0-9]+)/i,
      // Ref No: XXXXX
      /Ref\s+No[:\s]+([A-Z0-9]+)/i,
    ];

    for (const pattern of jkBankPatterns) {
      const match = message.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }

    // Fall back to base extraction
    return super.extractReference(message);
  }

  extractAccountLast4(message: string): string | null {
    const baseResult = super.extractAccountLast4(message);
    if (baseResult !== null && baseResult !== undefined) return baseResult;

    // JK Bank specific account patterns
    const jkBankPatterns = [
      // Your A/c XXXXXXXX1111 or A/c XX1111
      /A\/c\s+([X\d]+)/i,
      // JK Bank A/c no. XXXXXXXX9651
      /JK\s+Bank\s+A\/c\s+no\.\s+([X\d]+)/i,
      // Account XXXXXXXX1111
      /Account\s+([X\d]+)/i,
      // from A/c ending 1111
      /A\/c\s+ending\s+(\d{4})/i,
    ];

    for (const pattern of jkBankPatterns) {
      const match = message.match(pattern);
      if (match) {
        return this.extractLast4Digits(match[1]);
      }
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // JK Bank specific balance patterns
    const balancePatterns = [
      // Available Bal is INR XXXX Cr/Dr
      /Available\s+Bal\s+is\s+INR\s*([0-9,]+(?:\.\d{2})?)\s*(?:Cr|Dr)?/i,
      // A/C Bal is INR XXXX Cr/Dr
      /A\/C\s+Bal\s+is\s+INR\s*([0-9,]+(?:\.\d{2})?)\s*(?:Cr|Dr)?/i,
      // Avl Bal: Rs.XXXX
      /Avl\s+Bal[:\s]+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
      // Balance: Rs.XXXX
      /Balance[:\s]+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
      // Bal Rs.XXXX
      /Bal\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
    ];

    for (const pattern of balancePatterns) {
      const match = message.match(pattern);
      if (match) {
        const balanceStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(balanceStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
        return null;
      }
    }

    // Fall back to base extraction
    return super.extractBalance(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip OTP and verification messages
    if (
      lowerMessage.includes('otp') ||
      lowerMessage.includes('one time password') ||
      lowerMessage.includes('verification code')
    ) {
      return false;
    }

    // Skip promotional messages
    if (
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
      lowerMessage.includes('requesting payment')
    ) {
      return false;
    }

    // Skip RTGS/NEFT/IMPS confirmation messages
    // These are confirmations of transactions that already happened
    // Example: "Your RTGS Txn with UTR ... has been credited on ..."
    if (lowerMessage.includes('your rtgs txn') && lowerMessage.includes('has been credited')) {
      return false;
    }
    if (lowerMessage.includes('your neft txn') && lowerMessage.includes('has been credited')) {
      return false;
    }
    if (lowerMessage.includes('your imps txn') && lowerMessage.includes('has been credited')) {
      return false;
    }

    // Skip messages asking to report fraud
    // But make sure the transaction keywords are present
    if (
      lowerMessage.includes('if not done by you') ||
      lowerMessage.includes('report immediately')
    ) {
      // These are usually part of transaction messages, so check for transaction keywords
      const transactionKeywords = [
        'debited', 'credited', 'withdrawn', 'deposited',
        'spent', 'received', 'transferred', 'paid',
      ];
      return transactionKeywords.some(kw => lowerMessage.includes(kw));
    }

    // JK Bank specific transaction keywords
    const jkBankTransactionKeywords = [
      'has been debited',
      'has been credited',
      'debited',
      'credited',
      'withdrawn',
      'deposited',
      'spent',
      'received',
      'transferred',
      'paid',
    ];

    return jkBankTransactionKeywords.some(kw => lowerMessage.includes(kw));
  }
}

export default new JKBankParser();
