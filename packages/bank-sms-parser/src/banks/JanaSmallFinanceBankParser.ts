// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BaseIndianBankParser } from '../core/BaseIndianBankParser';

/**
 * Parser for Jana Small Finance Bank SMS messages (senders like JM-JANABK-S).
 * Format: "Dear Customer, Your acct XX005 is credited with INR 8.00 on 13-Jun-26 from NPCI BHIM. UPI Ref no 103475395201 . JANA SFB"
 */
export class JanaSmallFinanceBankParser extends BaseIndianBankParser {
  getBankName(): string {
    return 'Jana Small Finance Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('JANABK') || normalizedSender.includes('JANASFB');
  }

  extractMerchant(message: string, sender: string): string | null {
    // A period separates the name from "UPI" here, so the base FROM/TO patterns drop it
    const keyword = /credited/i.test(message) ? 'from' : 'to';
    const pattern = new RegExp(`\\b${keyword}\\s+(.+?)(?:\\.\\s|\\s+UPI\\b|$)`, 'i');
    const match = message.match(pattern);
    if (match) {
      let name = match[1].trim();
      if (name.includes('@')) name = name.substring(0, name.indexOf('@'));
      name = name.replace(/[.,;]+$/, '');
      const merchant = this.cleanMerchantName(name);
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }
    return super.extractMerchant(message, sender);
  }
}

export default new JanaSmallFinanceBankParser();
