// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BaseElSalvadorBankParser } from '../core/BaseElSalvadorBankParser';

export class BancoCuscatlanParser extends BaseElSalvadorBankParser {
  getBankName(): string {
    return 'Banco Cuscatlan';
  }

  canHandle(sender: string): boolean {
    const s = sender.toUpperCase().replace(/\./g, '').replace(/ /g, '');
    return s === 'BCUSCATLAN' || s === 'CUSCATLAN' || s === 'BANCOCUSCATLAN';
  }

  protected accountPatterns: RegExp[] = [
    /CUSCATLAN\s+(\d{4})/i,
    /(?:CORRIENTE|AHORROS?)\s+X*(\d{4})/i,
  ];
}

export default new BancoCuscatlanParser();
