import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Navi Mutual Fund parser for SIP / unit-allotment SMS.
 *
 * Handles senders containing "NAVAMC" (Navi Asset Management Company),
 * e.g. "AD-NAVAMC-S", "VK-NAVAMC-T".
 *
 * Sample SMS:
 *   "Unit Allotment Update:
 *    Your SIP purchase of Rs.499.98 in Navi Nifty Next 50 Index Fund DG has been
 *    processed at applicable NAV. The units will be alloted in 1-2 working days.
 *    For further queries, please visit the Navi app.
 *    Team Navi Mutual Fund"
 *
 * Notes:
 * - Account number is not present in AMC unit-allotment SMS; left null.
 * - Underlying bank-side SIP debit (NACH/mandate) is parsed by the user's bank
 *   parser and will book a separate transaction. Manual dedupe is expected for v1.
 * - Mandate / autopay creation messages are NOT covered here; those originate
 *   from the user's bank, not the AMC.
 */
export class NaviMutualFundParser extends BankParser {

  getBankName(): string {
    return 'Navi Mutual Fund';
  }

  canHandle(sender: string): boolean {
    // Match DLT-style senders like "AD-NAVAMC-S", "VK-NAVAMC-T".
    // Keyed on "NAVAMC" specifically so we don't false-positive on
    // generic "NAVI" senders that may belong to Navi's banking arm.
    return sender.toUpperCase().includes('NAVAMC');
  }

  isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    // Gate strictly on unit-allotment + SIP purchase phrasing so we ignore
    // NAV updates, account statements, marketing, etc.
    return lower.includes('unit allotment') && lower.includes('sip purchase');
  }

  extractAmount(message: string): number | null {
    // "purchase of Rs.499.98 in ..." — also tolerate optional space after Rs
    // and Indian-style comma grouping (e.g. "Rs. 1,49,999.98").
    const pattern = /purchase\s+of\s+Rs\.?\s*([0-9,]+(?:\.\d+)?)/i;
    const match = message.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  extractMerchant(message: string, sender: string): string | null {
    // Capture the fund name between "in " and " has been processed".
    // Kept generic so Navi Largecap / Liquid / ELSS / etc. all flow through.
    const pattern = /\bin\s+(.+?)\s+has\s+been\s+processed/i;
    const match = message.match(pattern);
    if (match) {
      const fund = match[1].trim();
      if (fund.length > 0) return fund;
    }
    return null;
  }

  extractTransactionType(message: string): TransactionType | null {
    // Unit allotment from an AMC is always an investment outflow.
    return TransactionType.INVESTMENT;
  }

  // AMC SMS doesn't carry a bank account number.
  extractAccountLast4(message: string): string | null {
    return null;
  }

  // No running balance in AMC SMS.
  extractBalance(message: string): number | null {
    return null;
  }
}

export default new NaviMutualFundParser();
