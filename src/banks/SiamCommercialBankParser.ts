import { BaseThailandBankParser } from '../core/BaseThailandBankParser';

/**
 * Siam Commercial Bank (SCB) parser for Thai banking SMS messages.
 */
export class SiamCommercialBankParser extends BaseThailandBankParser {
  getBankName(): string {
    return 'Siam Commercial Bank';
  }

  canHandle(sender: string): boolean {
    const upperSender = sender.toUpperCase();
    return (
      upperSender === 'SCB' ||
      upperSender.includes('SIAM COMMERCIAL') ||
      upperSender.includes('SIAMCOMMERCIAL')
    );
  }
}

export default new SiamCommercialBankParser();
