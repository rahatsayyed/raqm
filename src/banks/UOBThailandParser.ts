import { BaseThailandBankParser } from '../core/BaseThailandBankParser';
import { ParsedTransaction } from '../core/types';

/**
 * UOB Thailand parser for Thai banking SMS messages.
 */
export class UOBThailandParser extends BaseThailandBankParser {
  getBankName(): string {
    return 'UOB Thailand';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return (
      upperSender === 'UOB' ||
      upperSender.includes('UOB THAILAND') ||
      upperSender.includes('UOBTHAILAND')
    );
  }
}

export default new UOBThailandParser();
