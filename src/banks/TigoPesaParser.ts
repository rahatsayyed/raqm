import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Tigo Pesa / Mixx by Yas (Tanzania) mobile money SMS messages
 *
 * Handles formats like:
 * - "Cash-In of TSh 100,000 from Agent - LUCY SUKUM is successful. New balance is TSh 100,000"
 * - "You have sent TSh 25,000 with CashOut fee TSh 2,156 to 255713XXXXXX - BENEDICTA MREMA"
 * - "You have paid TSh 131,000 to DIAPERS AND WIPES SUPPLIERS. Charges TSh 2,000"
 * - "Transfer Successful. New balance is TSh 97,000. You have received TSh 97,000 from TIPS.Selcom_MFB"
 *
 * Key patterns:
 * - Sender: TIGOPESA, TIGOPESA(smsfp), MIXX BY YAS
 * - Currency: TSh (Tanzanian Shilling, same as TZS)
 * - Transaction ID: TxnId, TxnID, or Trnx ID patterns
 * - Fee breakdown: "(Fees TSh X, Levy TSh Y), VAT TSh Z"
 *
 * Country: Tanzania
 */
export class TigoPesaParser extends BankParser {

  getBankName(): string {
    return 'Tigo Pesa';
  }

  getCurrency(): string {
    return 'TZS'; // TSh is same as TZS (Tanzanian Shilling)
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return (
      normalizedSender.includes('TIGOPESA') ||
      normalizedSender.includes('TIGO PESA') ||
      normalizedSender.includes('MIXX BY YAS') ||
      normalizedSender.includes('MIXXBYYAS') ||
      normalizedSender === 'TIGO' ||
      // Handle sender format like "TIGOPESA(smsfp)"
      normalizedSender.startsWith('TIGOPESA')
    );
  }

  protected extractAmount(message: string): number | null {
    // Pattern 1: "TSh 100,000" or "TSh100,000" (with or without space)
    const tshPattern = /TSh\s*([0-9,]+(?:\.[0-9]{2})?)/i;

    // Find the first occurrence that's part of the main transaction (not fees)
    // Look for patterns like "sent TSh", "received TSh", "paid TSh", "Cash-In of TSh"
    const transactionAmountPatterns: RegExp[] = [
      /Cash-In of TSh\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /sent TSh\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /received TSh\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /paid TSh\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /You have sent TSh\s*([0-9,]+(?:\.[0-9]{2})?)/i,
      /You have paid TSh\s*([0-9,]+(?:\.[0-9]{2})?)/i,
    ];

    for (const pattern of transactionAmountPatterns) {
      const match = message.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(amountStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
      }
    }

    // Fallback: first TSh amount in message
    const tshMatch = message.match(tshPattern);
    if (tshMatch) {
      const amountStr = tshMatch[1].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('cash-in')) {
      // Cash-In = income (money received from agent)
      return TransactionType.INCOME;
    }

    if (lowerMessage.includes('you have received')) {
      // Received from TIPS or other sources = income
      return TransactionType.INCOME;
    }

    if (lowerMessage.includes('received tsh')) {
      return TransactionType.INCOME;
    }

    if (
      lowerMessage.includes('transfer successful') &&
      lowerMessage.includes('received')
    ) {
      // Transfer successful with "received" = income
      return TransactionType.INCOME;
    }

    if (lowerMessage.includes('you have sent')) {
      // Sent/paid money = expense
      return TransactionType.EXPENSE;
    }

    if (lowerMessage.includes('you have paid')) {
      return TransactionType.EXPENSE;
    }

    return null;
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // Pattern 1: "from Agent - NAME is successful" (Cash-In)
    const agentPattern = /from Agent\s*-?\s*([A-Z][A-Za-z\s]+?)\s+is\s+successful/i;
    const agentMatch = message.match(agentPattern);
    if (agentMatch) {
      const merchant = this.cleanMerchantName(agentMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return `Agent - ${merchant}`;
      }
    }

    // Pattern 2: "to PHONE - NAME" (sent money)
    // e.g., "to 255713XXXXXX - BENEDICTA MREMA"
    // Phone numbers can be masked with X characters
    const toPhoneNamePattern = /to\s+[\dX]+\s*-\s*([A-Z][A-Za-z\s]+?)(?:\.|Total|$)/i;
    const toPhoneNameMatch = message.match(toPhoneNamePattern);
    if (toPhoneNameMatch) {
      const merchant = this.cleanMerchantName(toPhoneNameMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 3: "paid TSh X to MERCHANT_NAME" (merchant payment)
    // e.g., "paid TSh 131,000 to DIAPERS AND WIPES SUPPLIERS"
    const paidToPattern = /paid\s+TSh\s*[0-9,]+(?:\.[0-9]{2})?\s+to\s+([A-Za-z0-9\s&]+?)(?:\.|Charges|$)/i;
    const paidToMatch = message.match(paidToPattern);
    if (paidToMatch) {
      const merchant = this.cleanMerchantName(paidToMatch[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Pattern 4: "from TIPS.SERVICE_NAME" (inter-operator transfer)
    // e.g., "from TIPS.Selcom_MFB.2.Tigo"
    const tipsPattern = /from\s+(TIPS\.[A-Za-z0-9_.]+)/i;
    const tipsMatch = message.match(tipsPattern);
    if (tipsMatch) {
      const tipsSource = tipsMatch[1];
      // Clean up TIPS source name
      if (tipsSource.toLowerCase().includes('selcom')) {
        return 'Selcom (TIPS Transfer)';
      } else if (tipsSource.toLowerCase().includes('nmb')) {
        return 'NMB Bank (TIPS Transfer)';
      } else if (tipsSource.toLowerCase().includes('crdb')) {
        return 'CRDB Bank (TIPS Transfer)';
      } else {
        return 'TIPS Transfer';
      }
    }

    // Pattern 5: Simple "to NAME" at end
    const simpleToPattern = /to\s+([A-Z][A-Za-z\s]+?)(?:\.|,|Charges|Total|$)/i;
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
    // Pattern 1: "New balance is TSh 481,801"
    const newBalancePattern = /New balance is TSh\s*([0-9,]+(?:\.[0-9]{2})?)/i;
    const newBalanceMatch = message.match(newBalancePattern);
    if (newBalanceMatch) {
      const balanceStr = newBalanceMatch[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    // Pattern 2: "Your New balance is TSh 467,372"
    const yourNewBalancePattern = /Your New balance is TSh\s*([0-9,]+(?:\.[0-9]{2})?)/i;
    const yourNewBalanceMatch = message.match(yourNewBalancePattern);
    if (yourNewBalanceMatch) {
      const balanceStr = yourNewBalanceMatch[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
    }

    return null;
  }

  protected extractReference(message: string): string | null {
    // Pattern 1: "TxnId: 13411949026"
    const txnIdMatch = message.match(/TxnId:\s*(\d+)/i);
    if (txnIdMatch) {
      return txnIdMatch[1];
    }

    // Pattern 2: "TxnID: 27755640833"
    const txnIDMatch = message.match(/TxnID:\s*(\d+)/i);
    if (txnIDMatch) {
      return txnIDMatch[1];
    }

    // Pattern 3: "Trnx ID: 63425443091"
    const trnxIdMatch = message.match(/Trnx ID:\s*(\d+)/i);
    if (trnxIdMatch) {
      return trnxIdMatch[1];
    }

    // Pattern 4: TIPS reference pattern "with TxnId: 25693126312543. 035_12307E6LF"
    // The second part after period is the TIPS reference
    const tipsRefMatch = message.match(/with TxnId:\s*\d+\.\s*([A-Z0-9_]+)/i);
    if (tipsRefMatch) {
      return tipsRefMatch[1];
    }

    return null;
  }

  protected isTransactionMessage(message: string): boolean {
    const lowerMessage = message.toLowerCase();

    // Must contain TSh currency indicator (Tigo Pesa specific)
    if (!lowerMessage.includes('tsh')) {
      return false;
    }

    // Must contain transaction keywords or status indicators
    const transactionKeywords = [
      'cash-in',
      'you have sent',
      'you have paid',
      'you have received',
      'transfer successful',
      'is successful',
      'new balance',
    ];

    return transactionKeywords.some((kw) => lowerMessage.includes(kw));
  }

  protected cleanMerchantName(merchant: string): string {
    return merchant
      .replace(/\s*\(.*?\)\s*$/, '')   // Remove trailing parentheses
      .replace(/\s+on\s+\d{2}\/.*/, '') // Remove date suffix
      .replace(/\s*-\s*$/, '')          // Remove trailing dash
      .replace(/^\s*-\s*/, '')          // Remove leading dash
      .replace(/\s+$/, '')              // Remove trailing whitespace
      .trim();
  }
}

export default new TigoPesaParser();
