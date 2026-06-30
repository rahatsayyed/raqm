import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for IndusInd Bank SMS messages (India)
 *
 * Notes:
 * - Defaults to INR via base class
 * - Relies on base patterns for amount, balance, merchant, account, reference
 * - canHandle() includes common DLT sender variants seen in India
 */
export class IndusIndBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'IndusInd Bank';
  }

  canHandle(sender: string): boolean {
    const s = sender.toUpperCase();

    // Common short/long forms
    if (s === 'INDUSB' || s === 'INDUSIND' || s.includes('INDUSIND BANK')) return true;

    // DLT/route patterns frequently used in India
    // Allow -S, -T, or no suffix (e.g., VM-INDUSB, VM-INDUSB-S, VM-INDUSB-T)
    if (/^[A-Z]{2}-INDUSB(?:-[A-Z])?$/.test(s)) return true;
    if (/^[A-Z]{2}-INDUSIND(?:-[A-Z])?$/.test(s)) return true;

    // Some routes omit the trailing suffix or vary the middle part
    if (/^[A-Z]{2}-INDUS(?:[A-Z]{2,})?-[A-Z]$/.test(s)) return true;

    return false;
  }

  extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    // IndusInd typically uses standard verbs; fall back to base for most, but
    // explicitly treat "spent" and "purchase" as expenses to avoid ambiguity.
    if (lower.includes('card') && lower.includes('avl lmt')) return TransactionType.CREDIT;
    if (lower.includes('spent')) return TransactionType.EXPENSE;
    if (lower.includes('debited')) return TransactionType.EXPENSE;
    if (lower.includes('purchase')) return TransactionType.EXPENSE;
    if (lower.includes('deposit')) return TransactionType.INVESTMENT;
    if (lower.includes('fd')) return TransactionType.INVESTMENT;
    if (lower.includes('ach')) return TransactionType.INVESTMENT;
    return super.extractTransactionType(message);
  }

  /**
   * Force non-card detection for ACH/NACH messages since these are account debits/credits.
   */
  detectIsCard(message: string): boolean {
    const lower = message.toLowerCase();
    const isAchOrNach =
      lower.includes('ach db') || lower.includes('ach cr') || lower.includes('nach');
    if (isAchOrNach) return false;
    return super.detectIsCard(message);
  }

  /**
   * Detect balance-only notifications (not transactions).
   * Examples:
   *  - "Your A/C 2134***12345 has Avl BAL of INR 1,234.56 as on 05/10/25 04:10 AM ..."
   */
  isBalanceUpdateNotification(message: string): boolean {
    const lower = message.toLowerCase();
    const hasBalanceCue =
      lower.includes('avl bal') ||
      lower.includes('available bal') ||
      lower.includes('account balance') ||
      lower.includes('a/c balance');
    const hasTxnVerb = ['debited', 'credited', 'withdrawn', 'spent', 'transferred'].some(v =>
      lower.includes(v)
    );
    return hasBalanceCue && lower.includes('as on') && !hasTxnVerb;
  }

  /**
   * Parse balance-only notifications.
   */
  parseBalanceUpdate(message: string): any | null {
    if (!this.isBalanceUpdateNotification(message)) return null;

    // Extract account last4 using existing helper
    const accountLast4 = this.extractAccountLast4(message);
    if (accountLast4 === null || accountLast4 === undefined) return null;

    // Extract balance amount
    // Pattern 1: "Avl BAL of INR 1,234.56"
    const p1 = /Avl\s*BAL\s+of\s+INR\s*([0-9,]+(?:\.\d{2})?)/i;
    let balanceStr: string | null = null;
    const m1 = message.match(p1);
    if (m1) {
      balanceStr = m1[1].replace(/,/g, '');
    } else {
      // Pattern 2: "Avl BAL INR 1,234.56" | "Available Balance is INR ..." | "Bal INR ..."
      const p2 = /(?:Avl\s*BAL|Available\s+Balance(?:\s+is)?|Bal)[:\s]+INR\s*([0-9,]+(?:\.\d{2})?)/i;
      const m2 = message.match(p2);
      if (m2) {
        balanceStr = m2[1].replace(/,/g, '');
      }
    }
    if (balanceStr === null) return null;
    const balance = parseFloat(balanceStr);
    if (isNaN(balance)) return null;

    // Extract optional "as on" date. IndusInd often uses: dd/MM/yy hh:mm AM/PM
    const datePattern = /as\s+on\s+(\d{1,2}\/\d{1,2}\/\d{2})\s+(\d{1,2}:\d{2})\s*(AM|PM)/i;
    let asOfDate: Date | null = null;
    const dateMatch = message.match(datePattern);
    if (dateMatch) {
      try {
        const dateParts = dateMatch[1].split('/');
        const timeParts = dateMatch[2].split(':');
        const ampm = dateMatch[3].toUpperCase();
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10);
        const year = 2000 + parseInt(dateParts[2], 10);
        let hour = parseInt(timeParts[0], 10);
        const minute = parseInt(timeParts[1], 10);
        // Convert 12-hour to 24-hour format
        if (ampm === 'PM' && hour < 12) hour = hour + 12;
        else if (ampm === 'AM' && hour === 12) hour = 0;
        asOfDate = new Date(year, month - 1, day, hour, minute);
      } catch (_) {
        asOfDate = null;
      }
    }

    return {
      bankName: this.getBankName(),
      accountLast4,
      balance,
      asOfDate,
    };
  }

  isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    // Skip interest payout on deposits as per requirement
    if (lower.includes('net interest') && lower.includes('deposit no')) {
      return false;
    }
    return super.isTransactionMessage(message);
  }

  extractAmount(message: string): number | null {
    // Prefer transaction amount tied to action verbs to avoid picking Available Balance
    const verbAmountPattern =
      /(?:INR|Rs\.?|₹)\s*([0-9,]+(?:\.\d{2})?)\s+(?:debited|credited|spent|withdrawn|paid|purchase)/i;
    const match = message.match(verbAmountPattern);
    if (match) {
      const amt = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(amt)) return amt;
    }

    return super.extractAmount(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    // UPI-style: towards <vpa or merchant>
    // Capture the next token (can include dots) and strip trailing punctuation
    const towardsPattern = /towards\s+(\S+)/i;
    const towardsMatch = message.match(towardsPattern);
    if (towardsMatch) {
      let m = towardsMatch[1].trim().replace(/[.,;]+$/, '');
      if (m.includes('/')) m = m.substring(0, m.indexOf('/'));
      if (m.includes('@')) m = m.substring(0, m.indexOf('@')).trim();
      if (m.length > 0) return this.cleanMerchantName(m);
    }

    // Credit: from account XXXX/MERCHANT pattern
    // Example: "received from account XXXXXXX4321/MADMONEY"
    const fromAccountPattern = /from\s+account\s+[^\s/]+\/([^\s(]+)/i;
    const fromAccountMatch = message.match(fromAccountPattern);
    if (fromAccountMatch) {
      const merchant = fromAccountMatch[1].trim().replace(/[.,;)]+$/, '');
      if (merchant.length > 0) return this.cleanMerchantName(merchant);
    }

    // Credit: from <vpa or merchant>
    const fromPattern = /from\s+(\S+)/i;
    const fromMatch = message.match(fromPattern);
    if (fromMatch) {
      const token = fromMatch[1].trim().replace(/[.,;]+$/, '');
      let m = token;
      if (m.includes('/')) m = m.substring(0, m.indexOf('/'));
      if (m.includes('@')) {
        m = m.substring(0, m.indexOf('@')).trim();
        if (m.length > 0) return this.cleanMerchantName(m);
      }
    }

    // Card/POS: at <merchant>. Stop at " Ref", " on", a sentence-boundary period
    // (e.g. "at INSTAMART. Avl Lmt: ..." on credit-card spends), or end of line.
    const atPattern = /at\s+([^\n]+?)(?:\s+Ref|\s+on|\.\s|$)/i;
    const atMatch = message.match(atPattern);
    if (atMatch) {
      const merchant = atMatch[1].trim();
      if (merchant.length > 0) return this.cleanMerchantName(merchant);
    }

    // Pattern: Ref-.../REFID/<Merchant>.Bal ... -> capture merchant between last '/' and '.Bal'
    const merchantBeforeBal = /\/(?!\s)([^/.\s]+)\.\s*Bal/i;
    const balMatch = message.match(merchantBeforeBal);
    if (balMatch) {
      const m = balMatch[1].trim();
      if (m.length > 0) return this.cleanMerchantName(m);
    }

    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const baseResult = super.extractAccountLast4(message);
    if (baseResult !== null && baseResult !== undefined) return baseResult;

    // Pattern 1: "IndusInd Account 20XXXXX1234"
    const indusIndAccountPattern = /IndusInd\s+Account\s+([\dX]+)/i;
    const indusIndMatch = message.match(indusIndAccountPattern);
    if (indusIndMatch) {
      return this.extractLast4Digits(indusIndMatch[1]);
    }

    // Pattern 2: "account XXXXXXX1234"
    const accountXPattern = /account\s+([X\d]+)/i;
    const accountXMatch = message.match(accountXPattern);
    if (accountXMatch) {
      return this.extractLast4Digits(accountXMatch[1]);
    }

    // Pattern 3: "A/C 2134***12345" - masked accounts
    const maskedPattern = /A\/?C\s+([\d*xX#]+)/i;
    const maskedMatch = message.match(maskedPattern);
    if (maskedMatch) {
      return this.extractLast4Digits(maskedMatch[1]);
    }

    // Pattern 4: "A/c *XX1234"
    const starMaskPattern = /A\/?c\s+([*X\d]+)/i;
    const starMaskMatch = message.match(starMaskPattern);
    if (starMaskMatch) {
      return this.extractLast4Digits(starMaskMatch[1]);
    }

    return null;
  }

  extractBalance(message: string): number | null {
    // Pattern: "Avl BAL of INR 1,234.56"
    const pattern1 = /Avl\s*BAL\s+of\s+INR\s*([0-9,]+(?:\.\d{2})?)/i;
    const match1 = message.match(pattern1);
    if (match1) {
      const balanceStr = match1[1].replace(/,/g, '');
      const val = parseFloat(balanceStr);
      if (!isNaN(val)) return val;
    }

    // Variant: "Avl BAL INR 1,234.56", "Available Balance is INR ...", or "Bal INR ..."
    const pattern2 =
      /(?:Avl\s*BAL|Available\s+Balance(?:\s+is)?|Bal)[:\s]+INR\s*([0-9,]+(?:\.\d{2})?)/i;
    const match2 = message.match(pattern2);
    if (match2) {
      const balanceStr = match2[1].replace(/,/g, '');
      const val = parseFloat(balanceStr);
      if (!isNaN(val)) return val;
    }

    // Fallback to base patterns
    return super.extractBalance(message);
  }

  extractReference(message: string): string | null {
    // Capture RRN numbers
    const rrnPattern = /RRN[:\s]+([0-9]+)/i;
    const rrnMatch = message.match(rrnPattern);
    if (rrnMatch) return rrnMatch[1];

    // Capture IMPS/UPI Ref no. pattern
    // Example: "IMPS Ref no. 123456789" or "Ref no. 123456789"
    const refNoPattern = /(?:IMPS\s+)?Ref\s+no\.?\s*([0-9]+)/i;
    const refNoMatch = message.match(refNoPattern);
    if (refNoMatch) return refNoMatch[1];

    return super.extractReference(message);
  }
}

export default new IndusIndBankParser();
