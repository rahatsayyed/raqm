import { BaseThailandBankParser } from '../core/BaseThailandBankParser';
import { ParsedTransaction } from '../core/types';

/**
 * Krungsri (Bank of Ayudhya - BAY) parser for Thai banking SMS messages.
 */
export class KrungsriBankParser extends BaseThailandBankParser {
  getBankName(): string {
    return 'Krungsri';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return upperSender === 'BAY' ||
      upperSender.includes('KRUNGSRI') ||
      upperSender.includes('AYUDHYA');
  }
}

export default new KrungsriBankParser();
