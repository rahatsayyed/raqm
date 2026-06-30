import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction } from '../core/types';

/**
 * Parser for Punjab & Sind Bank (PSB) SMS messages.
 *
 * Expected format:
 *   A/c No **<last4> Credited|Debited with Rs <amount>--<description> (CLR BAL <bal>CR|DR)(dd-MM-yyyy HH:mm:ss)-Punjab&Sind Bank
 *
 * <description> variants:
 *   - NEFT/<ref>/<sender name>
 *   - UPI/CR|DR/<utr>/<counterparty>/<bank>/<account>/<suffix>
 *   - Credit|Debit of <MICR> (cheque clearing)
 *   - Free text (e.g. generic vendor note)
 */
export class PunjabSindBankParser extends BaseIndianBankParser {

  getBankName(): string {
    return 'Punjab & Sind Bank';
  }

  canHandle(sender: string): boolean {
    const normalizedSender = sender.toUpperCase();
    return normalizedSender.includes('PSBANK') ||
      normalizedSender.includes('PUNJAB&SIND') ||
      normalizedSender.includes('PUNJAB & SIND');
  }

  extractAmount(message: string): number | null {
    const pattern = /(?:Credited|Debited)\s+with\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i;
    const match = message.match(pattern);
    if (match) {
      const amountStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(amountStr);
      if (!isNaN(parsed)) return parsed;
    }
    return super.extractAmount(message);
  }

  extractAccountLast4(message: string): string | null {
    const pattern = /A\/[Cc]\s+No\s+\*+(\d{2,})/i;
    const match = message.match(pattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }
    return super.extractAccountLast4(message);
  }

  extractBalance(message: string): number | null {
    const pattern = /CLR\s+BAL\s+([0-9,]+(?:\.\d{2})?)\s*(?:CR|DR)?/i;
    const match = message.match(pattern);
    if (match) {
      const balanceStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(balanceStr);
      if (!isNaN(parsed)) return parsed;
    }
    return super.extractBalance(message);
  }

  extractReference(message: string): string | null {
    const neftRef = /NEFT\/([A-Z0-9]+)\//i;
    const neftMatch = message.match(neftRef);
    if (neftMatch) return neftMatch[1];

    const upiRef = /UPI\/(?:CR|DR)\/(\d+)\//i;
    const upiMatch = message.match(upiRef);
    if (upiMatch) return upiMatch[1];

    const chequeRef = /(?:Credit|Debit)\s+of\s+(\d+)/i;
    const chequeMatch = message.match(chequeRef);
    if (chequeMatch) return chequeMatch[1];

    const psbRef = /\b(PSB\d{10,})\b/;
    const psbMatch = message.match(psbRef);
    if (psbMatch) return psbMatch[1];

    return super.extractReference(message);
  }

  extractMerchant(message: string, sender: string): string | null {
    const upiMerchant = /UPI\/(?:CR|DR)\/\d+\/([^/]+)\//i;
    const upiMatch = message.match(upiMerchant);
    if (upiMatch) {
      const merchant = this.cleanMerchantName(upiMatch[1].trim());
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    const neftMerchant = /NEFT\/[A-Z0-9]+\/([^(\r\n]+?)(?=\s*\(|\s*$)/i;
    const neftMatch = message.match(neftMerchant);
    if (neftMatch) {
      const merchant = this.cleanMerchantName(neftMatch[1].trim());
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    const chequePattern = /(Credit|Debit)\s+of\s+\d+/i;
    const chequeMatch = message.match(chequePattern);
    if (chequeMatch) {
      return chequeMatch[1].toLowerCase() === 'credit' ? 'Cheque Credit' : 'Cheque Debit';
    }

    const descPattern = /(?:Credited|Debited)\s+with\s+Rs\.?\s*[0-9,]+(?:\.\d{2})?\s*--\s*([^(\r\n]+?)\s*\(CLR\s+BAL/i;
    const descMatch = message.match(descPattern);
    if (descMatch) {
      const desc = descMatch[1].trim().replace(/-+$/, '').trim();
      const merchant = this.cleanMerchantName(desc);
      if (this.isValidMerchantName(merchant)) return merchant;
    }

    return super.extractMerchant(message, sender);
  }
}

export default new PunjabSindBankParser();
