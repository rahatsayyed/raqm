import { BaseThailandBankParser } from '../core/BaseThailandBankParser';
import { ParsedTransaction } from '../core/types';

/**
 * TTB (TMBThanachart Bank) parser for Thai banking SMS messages.
 */
export class TTBBankParser extends BaseThailandBankParser {
  getBankName(): string {
    return 'TTB';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return (
      upperSender === 'TTB' ||
      upperSender.includes('TMBTHANACHART') ||
      upperSender.includes('TMB')
    );
  }
}

export default new TTBBankParser();
