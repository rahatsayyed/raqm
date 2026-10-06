// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BaseIndianBankParser } from '../core/BaseIndianBankParser';

/**
 * Parser for Pluxee (India), the prepaid meal-benefit card formerly Sodexo.
 * Format: "Rs. 40.00 spent from Pluxee  Meal wallet, card no.xx1234 on 17-08-2026 16:03:14 at NEW SHAKTHI  . Avl bal Rs.24342.81."
 */
export class PluxeeBankParser extends BaseIndianBankParser {
  getBankName(): string {
    return 'Pluxee';
  }

  canHandle(sender: string): boolean {
    return sender.toUpperCase().includes('PLUXEE');
  }

  extractMerchant(message: string, sender: string): string | null {
    const atBeforeBalance = message.match(/\bat\s+(.+?)\s*\.\s*Avl\s+bal/i);
    if (atBeforeBalance) {
      const merchant = this.cleanMerchantName(atBeforeBalance[1].trim());
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    return super.extractMerchant(message, sender);
  }

  extractAccountLast4(message: string): string | null {
    const cardMatch = message.match(/card\s+no\.?\s*(?:xx|XX|\*)*(\d{4})/i);
    if (cardMatch) {
      const last4 = this.extractLast4Digits(cardMatch[1]);
      if (last4) return last4;
    }

    return super.extractAccountLast4(message);
  }
}

export default new PluxeeBankParser();
