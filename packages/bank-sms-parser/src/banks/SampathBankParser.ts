import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Sampath Bank (Sri Lanka) SMS messages.
 *
 * Handles both account transactions and credit-card transactions.
 *
 * Account formats (sender: SAMPATHTXN):
 * - "LKR 5,000.00 credited to AC **8758 for PICKME - 37419306"
 * - "LKR 4,025.00 debited from AC **8758 for WPY_TAOA_041772_WLT@0347310"
 * - "GBP 1,000.00 credited to AC **5012 for Remittance ID : [IR26GBP36623] : REALIZE"
 *
 * Credit-card format (sender: SAMPCCTXN):
 * - "Cr Crd no..**0282 Auth Pmt LKR 2,100.00 at SPICE ASIA - DELIVERY Avl Bal LKR 250,000.00 ..."
 *
 * Currency is a leading 3-letter code (LKR/GBP/USD), captured dynamically per message.
 */
export class SampathBankParser extends BankParser {

  getBankName(): string {
    return 'Sampath Bank';
  }

  getCurrency(): string {
    return 'LKR'; // Sri Lankan Rupee (default; foreign-currency variants override per-message)
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase();
    // Containment covers bare senders and any operator/DLT prefix or suffix
    // (e.g. "AD-SAMPATHTXN", "SAMPATHTXN-S").
    return normalized.includes('SAMPATHTXN') || normalized.includes('SAMPCCTXN');
  }

  detectIsCard(message: string): boolean {
    // Sampath credit-card SMS use "Cr Crd no..**0282"; the base class only
    // recognises "card no."/"credit card", so detect the abbreviated form here.
    const lower = message.toLowerCase();
    if (lower.includes('crd no') || lower.includes('cr crd')) {
      return true;
    }
    return super.detectIsCard(message);
  }

  /**
   * Extracts the currency code that precedes the transaction amount.
   * Falls back to the bank default if no code is present.
   */
  private extractMessageCurrency(message: string): string {
    // Match the FIRST "<CODE> <amount>" occurrence to capture the transaction currency
    // (balance amounts share the same code, so first match is fine).
    const pattern = /\b([A-Z]{3})\s+[0-9,]+\.\d{2}/;
    const match = message.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
    return this.getCurrency();
  }

  parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
    // Delegate to base parsing, then override the currency with the per-message code
    // (base parse hard-codes getCurrency()).
    const base = super.parse(smsBody, sender, timestamp);
    if (base === null) return null;
    const currency = this.extractMessageCurrency(smsBody);
    if (currency === base.currency) return base;
    return { ...base, currency };
  }

  protected extractAmount(message: string): number | null {
    // Account: "LKR 5,000.00 credited", "GBP 1,000.00 credited"
    // Card: "Auth Pmt LKR 2,100.00 at ..."
    const patterns = [
      /Auth\s+Pmt\s+[A-Z]{3}\s+([0-9,]+\.\d{2})/i,
      /[A-Z]{3}\s+([0-9,]+\.\d{2})\s+(?:credited|debited)/i,
    ];
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const amountStr = match[1].replace(/,/g, '');
        const parsed = parseFloat(amountStr);
        if (!isNaN(parsed)) {
          return parsed;
        }
        return null;
      }
    }
    return super.extractAmount(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('credited to')) return TransactionType.INCOME;
    if (lower.includes('debited from')) return TransactionType.EXPENSE;
    if (lower.includes('auth pmt')) return TransactionType.EXPENSE;
    return super.extractTransactionType(message);
  }

  protected extractMerchant(message: string, sender: string): string | null {
    // Card: "at SPICE ASIA - DELIVERY Avl Bal LKR ..."
    const cardPattern = /\bat\s+(.+?)\s+Avl\s+Bal/i;
    const cardMatch = message.match(cardPattern);
    if (cardMatch) {
      const merchant = cardMatch[1].trim();
      if (merchant.length > 0) return merchant;
    }

    // International remittance: "for Remittance ID : [IR26GBP36623] : REALIZE"
    const remittancePattern = /for\s+Remittance\s+ID\s*:\s*\[[^\]]+\]\s*:\s*([^\n]+)/i;
    const remittanceMatch = message.match(remittancePattern);
    if (remittanceMatch) {
      const merchant = remittanceMatch[1].trim();
      if (merchant.length > 0) return merchant;
    }

    // Account: "for PICKME - 37419306" / "for WPY_TAOA_041772_WLT@0347310"
    // Capture everything after "for " up to newline, then strip a trailing " - <ref>".
    const forPattern = /\bfor\s+(.+?)(?:\n|$)/i;
    const forMatch = message.match(forPattern);
    if (forMatch) {
      let merchant = forMatch[1].trim();
      // Strip a trailing reference appended after " - "
      const dashRef = /\s+-\s+\S+$/;
      merchant = merchant.replace(dashRef, '').trim();
      if (merchant.length > 0) return merchant;
    }

    return super.extractMerchant(message, sender);
  }

  protected extractAccountLast4(message: string): string | null {
    // Account: "AC **8758"  Card: "Cr Crd no..**0282"
    const pattern = /(?:AC|Crd\s+no\.*)\s*\*+\s*(\d{3,})/i;
    const match = message.match(pattern);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }
    return super.extractAccountLast4(message);
  }

  protected extractReference(message: string): string | null {
    // International remittance: "Remittance ID : [IR26GBP36623]"
    const remittancePattern = /Remittance\s+ID\s*:\s*\[([^\]]+)\]/i;
    const remittanceMatch = message.match(remittancePattern);
    if (remittanceMatch) return remittanceMatch[1].trim();

    // Account: "for PICKME - 37419306" -> trailing numeric reference
    const dashRefPattern = /\bfor\s+.+?\s+-\s+(\d+)/i;
    const dashRefMatch = message.match(dashRefPattern);
    if (dashRefMatch) return dashRefMatch[1].trim();

    return super.extractReference(message);
  }

  protected extractBalance(message: string): number | null {
    // Card: "Avl Bal LKR 250,000.00"
    const pattern = /Avl\s+Bal\s+[A-Z]{3}\s+([0-9,]+\.\d{2})/i;
    const match = message.match(pattern);
    if (match) {
      const balStr = match[1].replace(/,/g, '');
      const parsed = parseFloat(balStr);
      if (!isNaN(parsed)) {
        return parsed;
      }
      return null;
    }
    return super.extractBalance(message);
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (
      lower.includes('credited to') ||
      lower.includes('debited from') ||
      lower.includes('auth pmt')
    ) {
      return true;
    }
    return super.isTransactionMessage(message);
  }
}

export default new SampathBankParser();
