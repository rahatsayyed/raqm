import { BaseThailandBankParser } from '../core/BaseThailandBankParser';
import { ParsedTransaction } from '../core/types';

/**
 * Krungthai Bank (KTB) parser for Thai banking SMS messages.
 */
export class KrungThaiBankParser extends BaseThailandBankParser {

    getBankName(): string {
        return 'Krungthai Bank';
    }

    canHandle(sender: string): boolean {
        const upperSender = sender.toUpperCase();
        return upperSender === 'KTB' ||
            upperSender.includes('KRUNGTHAI') ||
            upperSender.includes('KRUNG THAI');
    }
}

export default new KrungThaiBankParser();
