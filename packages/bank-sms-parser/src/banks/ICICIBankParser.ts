import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for ICICI Bank SMS messages
 *
 * Supported formats:
 * - Debit: "Your account has been successfully debited with Rs xxx.00"
 * - Credit: "Acct XXxxx is credited with Rs xxx.00"
 * - UPI: "ICICI Bank Acct XXxxx debited for Rs xxx.00"
 * - Cash Deposit: "Cash deposit transaction of Rs xxx in ICICI Bank Account 1234XXXX1234 has been completed"
 * - AutoPay transactions
 * - Multi-currency: "USD 11.80 spent using ICICI Bank Card"
 *
 * Common senders: XX-ICICIB-S, ICICIB, ICICIBANK
 */
export class ICICIBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'ICICI Bank';
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    // Skip non-transaction messages
    if (!this.isTransactionMessage(smsBody)) {
      return null;
    }

    const amount = this.extractAmount(smsBody);
    if (amount === null) {
      return null;
    }

    // Detect ICICI's dual-account transfer pattern (e.g. IMPS where the SMS
    // mentions both `Acct XX debited` and `Acct YY credited` in the same body).
    // This routes such SMS to TRANSFER so a later pipeline pass can dedupe
    // against the credit-side SMS using the IMPS/NEFT reference.
    const transferAccounts = this.extractTransferAccounts(smsBody);

    const type = transferAccounts !== null
      ? TransactionType.TRANSFER
      : (this.extractTransactionType(smsBody) ?? null);

    if (type === null) {
      return null;
    }

    // Extract currency dynamically for multi-currency support
    const currency = this.extractCurrencyFromMessage(smsBody) ?? 'INR';

    // Extract available limit for credit card transactions
    const availableLimit = type === TransactionType.CREDIT
      ? this.extractAvailableLimit(smsBody)
      : null;

    const merchant = transferAccounts !== null
      ? this.labelTransferRail(smsBody)
      : this.extractMerchant(smsBody, sender);

    return {
      amount,
      type,
      merchant,
      reference: this.extractReference(smsBody),
      accountLast4: transferAccounts?.first ?? this.extractAccountLast4(smsBody),
      balance: this.extractBalance(smsBody),
      creditLimit: availableLimit,
      smsBody,
      sender,
      timestamp,
      bankName: this.getBankName(),
      isFromCard: this.detectIsCard(smsBody),
      currency,
      fromAccount: transferAccounts?.first ?? null,
      toAccount: transferAccounts?.second ?? null,
    };
  }

  private labelTransferRail(message: string): string {
    if (message.toLowerCase().includes('imps')) return 'IMPS Transfer';
    if (message.toLowerCase().includes('neft')) return 'NEFT Transfer';
    return 'Account Transfer';
  }

  /**
   * Detects ICICI's `Acct XX debited ... & Acct YY credited` IMPS/NEFT pattern
   * and returns { first, second } when both account references appear
   * in the same SMS and differ. Returns null otherwise so the regular type
   * extraction stays in charge.
   */
  private extractTransferAccounts(message: string): { first: string; second: string } | null {
    const debitedAcctPattern = /Acct\s+([X*\d]+)\s+(?:is\s+)?debited/i;
    const creditedAcctPattern = /Acct\s+([X*\d]+)\s+(?:is\s+)?credited/i;

    const debitedMatch = message.match(debitedAcctPattern);
    if (!debitedMatch) return null;

    const creditedMatch = message.match(creditedAcctPattern);
    if (!creditedMatch) return null;

    const fromAcct = this.extractLast4Digits(debitedMatch[1]);
    const toAcct = this.extractLast4Digits(creditedMatch[1]);

    if (!fromAcct || fromAcct.trim() === '' || !toAcct || toAcct.trim() === '' || fromAcct === toAcct) {
      return null;
    }
    return { first: fromAcct, second: toAcct };
  }

  /**
   * Extract currency from ICICI transaction messages
   * Handles formats like "USD 11.80 spent" or "EUR 50.00 spent"
   */
  private extractCurrencyFromMessage(message: string): string | null {
    // Pattern for "USD 11.80 spent" format
    const currencySpentPattern = /([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?\s+spent/i;
    const match = message.match(currencySpentPattern);
    if (match) {
      const currency = match[1].toUpperCase();
      // Validate it's a valid currency code (3 letters, not month abbreviations)
      if (currency.length === 3 &&
          !/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/.test(currency)) {
        return currency;
      }
    }

    return null;
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('ICICI') ||
      normalizedSender.includes('ICICIB') ||
      // DLT patterns for transactions (-S suffix)
      /^[A-Z]{2}-ICICIB-S$/.test(normalizedSender) ||
      /^[A-Z]{2}-ICICI-S$/.test(normalizedSender) ||
      // Other DLT patterns
      /^[A-Z]{2}-ICICIB-[TPG]$/.test(normalizedSender) ||
      // Legacy patterns
      /^[A-Z]{2}-ICICIB$/.test(normalizedSender) ||
      /^[A-Z]{2}-ICICI$/.test(normalizedSender) ||
      // Direct sender IDs
      normalizedSender === 'ICICIB' ||
      normalizedSender === 'ICICIBANK';
  }

  extractAmount(message: string): number | null {
    // Pattern 1: Multi-currency support - "USD 11.80 spent" or "EUR 50.00 spent"
    const multiCurrencySpentPattern = /[A-Z]{3}\s+([0-9,]+(?:\.\d{2})?)\s+spent/i;
    const multiCurrencyMatch = message.match(multiCurrencySpentPattern);
    if (multiCurrencyMatch) {
      const amount = parseFloat(multiCurrencyMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
      return null;
    }

    // Pattern 2: "Rs xxx.xx spent" or "INR xxx.xx spent" (for INR card transactions)
    const inrSpentPattern = /(?:Rs\.?|INR)\s+([0-9,]+(?:\.\d{2})?)\s+spent/i;
    const inrSpentMatch = message.match(inrSpentPattern);
    if (inrSpentMatch) {
      const amount = parseFloat(inrSpentMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
      return null;
    }

    // Pattern 2: "debited with Rs xxx.00"
    const debitWithPattern = /debited\s+with\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const debitWithMatch = message.match(debitWithPattern);
    if (debitWithMatch) {
      const amount = parseFloat(debitWithMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
      return null;
    }

    // Pattern 3: "debited for Rs xxx.00"
    const debitForPattern = /debited\s+for\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const debitForMatch = message.match(debitForPattern);
    if (debitForMatch) {
      const amount = parseFloat(debitForMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
      return null;
    }

    // Pattern 4: "credited with Rs xxx.00"
    const creditWithPattern = /credited\s+with\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const creditWithMatch = message.match(creditWithPattern);
    if (creditWithMatch) {
      const amount = parseFloat(creditWithMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
      return null;
    }

    // Pattern 5: "credited:Rs. xxx.xx" (colon format for cash deposits)
    const creditColonPattern = /credited:\s*Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const creditColonMatch = message.match(creditColonPattern);
    if (creditColonMatch) {
      const amount = parseFloat(creditColonMatch[1].replace(/,/g, ''));
      if (!isNaN(amount)) return amount;
      return null;
    }

    // Fall back to base class patterns
    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // Pattern 0: NEFT/RTGS transfer to beneficiary - use "NEFT Transfer" as merchant
    // These are outgoing transfers where we don't know the beneficiary name
    if (message.toLowerCase().includes('credited to the beneficiary') ||
        message.toLowerCase().includes('credited to beneficiary')) {
      return 'NEFT Transfer';
    }

    // Pattern 1: Salary transactions - "Info INF*...*...* SAL ..."
    // Example: "Info INF*000169831922*IQBO SAL FE"
    const salaryPattern = /Info\s+INF\*[^*]+\*[^*]*SAL[^.]*/i;
    if (salaryPattern.test(message)) {
      return 'Salary';
    }

    // Pattern 2: NFS Cash Withdrawal - various ATM withdrawal formats
    // Examples: "NFSCASH WDL", "NFS CASH WDL", "NFS*CASH WDL*", "CASH WDL"
    if (message.toLowerCase().includes('nfscash wdl') ||
        message.toLowerCase().includes('nfs cash wdl') ||
        message.toLowerCase().includes('nfs*cash wdl') ||
        message.toLowerCase().includes('cash wdl') ||
        message.toLowerCase().includes('nfscash')) {
      return 'Cash Withdrawal';
    }

    // Pattern 3: Card transactions - "on DD-Mon-YY at MERCHANT NAME. Avl" or "on DD-Mon-YY on MERCHANT NAME"
    const cardMerchantPattern = /on\s+\d{1,2}-\w{3}-\d{2}\s+(?:at|on)\s+([^.]+?)(?:\.|\s+Avl|$)/i;
    const cardMerchantMatch = message.match(cardMerchantPattern);
    if (cardMerchantMatch) {
      const merchant = this.cleanMerchantName(cardMerchantMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern: "for UPI-REFNO-MERCHANT" (credit card UPI transactions)
    const upiMerchantPattern = /for\s+UPI-\d+-([A-Za-z][\w\s]*?)(?:\.|$|\s+To\s)/i;
    const upiMerchantMatch = message.match(upiMerchantPattern);
    if (upiMerchantMatch) {
      const merchant = this.cleanMerchantName(upiMerchantMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 3: ACH/NACH dividend payments - "Info ACH*COMPANY NAME*XXX"
    const achNachPattern = /Info\s+(?:ACH|NACH)\*([^*]+)\*/i;
    const achNachMatch = message.match(achNachPattern);
    if (achNachMatch) {
      const companyName = this.cleanMerchantName(achNachMatch[1].trim());
      // Append "Dividend" to make categorization clear
      return `${companyName} Dividend`;
    }

    // Pattern 3: "towards <merchant> for"
    const towardsPattern = /towards\s+([^.\n]+?)\s+for/i;
    const towardsMatch = message.match(towardsPattern);
    if (towardsMatch) {
      const merchant = this.cleanMerchantName(towardsMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 4: "from <name>. UPI"
    const fromUpiPattern = /from\s+([^.\n]+?)\.\s*UPI/i;
    const fromUpiMatch = message.match(fromUpiPattern);
    if (fromUpiMatch) {
      const merchant = this.cleanMerchantName(fromUpiMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 5: "; <name> credited. UPI"
    const creditedPattern = /;\s*([^.\n]+?)\s+credited\.\s*UPI/i;
    const creditedMatch = message.match(creditedPattern);
    if (creditedMatch) {
      const merchant = this.cleanMerchantName(creditedMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 6: Cash deposit via "Info BY CASH" pattern
    if (message.toLowerCase().includes('info by cash')) {
      return 'Cash Deposit';
    }

    // Pattern 7: AutoPay specific - extract service name
    if (message.toLowerCase().includes('autopay')) {
      // Look for common AutoPay services
      const lowerMessage = message.toLowerCase();
      if (lowerMessage.includes('google play')) return 'Google Play Store';
      if (lowerMessage.includes('netflix')) return 'Netflix';
      if (lowerMessage.includes('spotify')) return 'Spotify';
      if (lowerMessage.includes('amazon prime')) return 'Amazon Prime';
      if (lowerMessage.includes('disney') || lowerMessage.includes('hotstar')) return 'Disney+ Hotstar';
      if (lowerMessage.includes('youtube')) return 'YouTube Premium';
      return 'AutoPay Subscription';
    }

    // Fall back to base class patterns
    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const baseResult = super.extractAccountLast4(message);
    if (baseResult !== null && baseResult !== undefined) return baseResult;

    // Pattern 1: "ICICI Bank Card XXNNNN"
    const cardPattern = /ICICI\s+Bank\s+Card\s+([X*\d]+)/i;
    const cardMatch = message.match(cardPattern);
    if (cardMatch) {
      return this.extractLast4Digits(cardMatch[1]);
    }

    // Pattern 2: "ICICI Bank Credit Card XX1234"
    const creditCardPattern = /ICICI\s+Bank\s+Credit\s+Card\s+([X*\d]+)/i;
    const creditCardMatch = message.match(creditCardPattern);
    if (creditCardMatch) {
      return this.extractLast4Digits(creditCardMatch[1]);
    }

    // Pattern 3: "ICICI Bank Account XXNNNN"
    const accountPattern = /ICICI\s+Bank\s+Account\s+([X*\d]+)/i;
    const accountMatch = message.match(accountPattern);
    if (accountMatch) {
      return this.extractLast4Digits(accountMatch[1]);
    }

    // Pattern 4: "ICICI Bank Acct XXNNNN"
    const bankAcctPattern = /ICICI\s+Bank\s+Acct\s+([X*\d]+)/i;
    const bankAcctMatch = message.match(bankAcctPattern);
    if (bankAcctMatch) {
      return this.extractLast4Digits(bankAcctMatch[1]);
    }

    // Pattern 5: "ICICI Bank Acc XX921"
    const bankAccPattern = /ICICI\s+Bank\s+Acc\s+([X*\d]+)/i;
    const bankAccMatch = message.match(bankAccPattern);
    if (bankAccMatch) {
      return this.extractLast4Digits(bankAccMatch[1]);
    }

    // Pattern 6: "Acct XX1234" or "Acct *1234"
    const acctPattern = /Acct\s+([X*\d]+)(?:\s|$|[,;.])/i;
    const acctMatch = message.match(acctPattern);
    if (acctMatch) {
      return this.extractLast4Digits(acctMatch[1]);
    }

    // Pattern 7: "Acc XX921"
    const accPattern = /Acc\s+([X*\d]+)(?:\s|$|[,;.])/i;
    const accMatch = message.match(accPattern);
    if (accMatch) {
      return this.extractLast4Digits(accMatch[1]);
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern 1: "Available Balance is Rs. 28,076.14" (ICICI-specific format with "is")
    const availBalIsPattern = /Available\s+Balance\s+is\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const availBalIsMatch = message.match(availBalIsPattern);
    if (availBalIsMatch) {
      const balanceStr = availBalIsMatch[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) return parsed;
      return null;
    }

    // Pattern 2: "Avl Bal Rs 10,000.00" or "Avb Bal Rs 10,000.00" (typo variant)
    const avlBalPattern = /Av[lb]\s+Bal\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const avlBalMatch = message.match(avlBalPattern);
    if (avlBalMatch) {
      const balanceStr = avlBalMatch[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) return parsed;
      return null;
    }

    // Pattern 3: "Updated Bal: Rs 5,000.00"
    const updatedBalPattern = /Updated\s+Bal[:\s]+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const updatedBalMatch = message.match(updatedBalPattern);
    if (updatedBalMatch) {
      const balanceStr = updatedBalMatch[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) return parsed;
      return null;
    }

    // Fall back to base class
    return super.extractBalance(message);
  }

  extractReference(message: string): string | null {
    // Pattern 0: "IMPS:xxxxx" — keep ahead of UPI so dual-rail SMS pick the IMPS ref
    const impsPattern = /IMPS:([A-Za-z0-9]+)/i;
    const impsMatch = message.match(impsPattern);
    if (impsMatch) {
      return impsMatch[1];
    }

    // Pattern 1: "RRN 1xxxxx3xxxxx"
    const rrnPattern = /RRN\s+([A-Za-z0-9]+)/i;
    const rrnMatch = message.match(rrnPattern);
    if (rrnMatch) {
      return rrnMatch[1];
    }

    // Pattern 2: "UPI:5xxxxx8xxxxx"
    const upiPattern = /UPI:([A-Za-z0-9]+)/i;
    const upiMatch = message.match(upiPattern);
    if (upiMatch) {
      return upiMatch[1];
    }

    // Pattern 3: "transaction reference no.MCDA001746000000"
    const txnRefPattern = /transaction\s+reference\s+no\.?([A-Z0-9]+)/i;
    const txnRefMatch = message.match(txnRefPattern);
    if (txnRefMatch) {
      return txnRefMatch[1];
    }

    // Fall back to base class
    return super.extractReference(message);
  }

  isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Skip cash deposit confirmation messages (these are duplicates)
    // We only want to process the actual credit notification
    if (lowerMessage.includes('cash deposit transaction') &&
        lowerMessage.includes('has been completed')) {
      return false; // Skip this confirmation message
    }

    // Skip payment due reminders
    if (lowerMessage.includes('is due by')) {
      return false; // Skip payment due reminders
    }

    // Skip future debit notifications - these are not actual transactions yet
    // Examples: "will be debited on", "will be debited with", "account will be debited"
    if (lowerMessage.includes('will be debited')) {
      return false; // This is a future debit notification, not an actual transaction
    }

    // Skip credit card bill payment confirmations - these are transfers between own accounts
    // Example: "Payment of Rs 26,266.00 has been received on your ICICI Bank Credit Card XX9006..."
    if (lowerMessage.includes('has been received on your icici bank credit card')) {
      return false; // This is a credit card bill payment, not a transaction
    }

    // Check for ICICI-specific transaction keywords
    const iciciKeywords = [
      'debited with',
      'debited for',
      'credited with',
      'credited:',  // For "credited:Rs." format
      'autopay',
      'your account has been',
      'inr', // For "INR xxx spent" pattern
      'spent using', // For card transactions
    ];

    // If any ICICI-specific pattern is found, it's likely a transaction
    // BUT make sure it's not a future transaction (already filtered above)
    if (iciciKeywords.some(kw => lowerMessage.includes(kw))) {
      return true;
    }

    // Fall back to base class for standard checks
    return super.isTransactionMessage(message);
  }

  extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    // NEFT/RTGS transfer confirmation to sender - "credited to the beneficiary account"
    // This means the sender's money was sent OUT to the beneficiary
    if (lowerMessage.includes('credited to the beneficiary') ||
        lowerMessage.includes('credited to beneficiary')) {
      return TransactionType.EXPENSE;
    }

    // Credit card transactions - both "ICICI Bank Credit Card" and "ICICI Bank Card" with spent
    if ((lowerMessage.includes('icici bank credit card') ||
         (lowerMessage.includes('icici bank card') && lowerMessage.includes('spent'))) &&
        (lowerMessage.includes('spent') || lowerMessage.includes('debited'))) {
      return TransactionType.CREDIT;
    }

    // Cash deposit via "Info BY CASH" is income
    if (lowerMessage.includes('info by cash')) {
      return TransactionType.INCOME;
    }

    // Fall back to base class for standard checks
    return super.extractTransactionType(message);
  }
}

export default new ICICIBankParser();
