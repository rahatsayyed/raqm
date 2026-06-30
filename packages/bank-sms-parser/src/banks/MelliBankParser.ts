import { BaseIranianBankParser } from '../core/BaseIranianBankParser';

/**
 * Bank Melli parser for Iranian banking SMS messages.
 * Handles Persian language transaction messages with amounts in Rials and Tomans.
 */
export class MelliBankParser extends BaseIranianBankParser {
  getBankName(): string {
    return 'Melli Bank';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();

    const melliSenders = new Set([
      '+98700717',
      'MELLI',
      'MELLIBANK',
      'MELLI BANK',
      'BANK MELLI',
      'BANKMELLI',
    ]);

    return melliSenders.has(upperSender);
  }
}

export default new MelliBankParser();
