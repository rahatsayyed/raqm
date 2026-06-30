import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for eMola (Mozambique) SMS messages (English).
 *
 * Amounts use US-style formatting (thousands separator ',', decimal '.'),
 * e.g. "3,123.45". Currency is written as "MT" which maps to MZN.
 * Dates are DD/MM/YYYY and times HH:MM:SS.
 *
 * Supported formats:
 * - Outgoing transfer (EXPENSE):
 *   "Transaction ID PP260530.0934.w91238. You transfered 100.00MT to 871234566, name: John Doe at 09:34:45 on 30/05/2026. Fee: 0.00MT. Your account balance is 3,123.45MT. ..."
 * - Incoming transfer (INCOME):
 *   "Transaction ID: PP260603.0854.K00983. You received 123.45MT from 871234567, name: JOHN DOE at 08:54:09 on 03/06/2026. Content: campo. Your account balance is 1,234.56MT. ..."
 * - Agent withdrawal (EXPENSE):
 *   "Transaction ID: CO260528.1806.W15992. You withdrew 50.00MT in the Agent with code ID 123456, Name JOHN DOE at 18:06:25 on 28/05/2026. Fee: 3.00 MT. Your account balance is 1,234.23MT. ..."
 *
 * Note: "transfered" is the spelling used in the app's SMS.
 */
export class EMolaParser extends BankParser {

  getBankName(): string {
    return 'eMola';
  }

  getCurrency(): string {
    return 'MZN';
  }

  canHandle(sender: string): boolean {
    return sender.toLowerCase() === 'emola';
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    return lower.includes('you transfered') ||
      lower.includes('you received') ||
      lower.includes('you withdrew');
  }

  protected extractAmount(message: string): number | null {
    // Amount follows the action verb, e.g. "transfered 100.00MT",
    // "received 123.45MT", "withdrew 50.00MT".
    const pattern = /(?:transfered|received|withdrew)\s+([0-9,]+\.[0-9]{2})\s*MT/i;
    const match = message.match(pattern);
    if (match) {
      return this.parseUsAmount(match[1]);
    }
    return null;
  }

  private parseUsAmount(raw: string): number | null {
    const normalized = raw.replace(/,/g, '');
    const parsed = parseFloat(normalized);
    return isNaN(parsed) ? null : parsed;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('you transfered')) return TransactionType.EXPENSE;
    if (lower.includes('you withdrew')) return TransactionType.EXPENSE;
    if (lower.includes('you received')) return TransactionType.INCOME;
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Counterparty name after "name:" for transfers/receipts.
    // e.g. "to 871234566, name: John Doe at 09:34:45"
    const namePattern = /name:\s*([^,]+?)\s+at\s+\d{2}:\d{2}:\d{2}/i;
    const nameMatch = message.match(namePattern);
    if (nameMatch) {
      const merchant = nameMatch[1].trim();
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    // Agent withdrawal: "Name JOHN DOE at 18:06:25"
    const agentPattern = /Name\s+([^,]+?)\s+at\s+\d{2}:\d{2}:\d{2}/i;
    const agentMatch = message.match(agentPattern);
    if (agentMatch) {
      const merchant = agentMatch[1].trim();
      if (this.isValidMerchantName(merchant)) {
        return merchant;
      }
    }

    return null;
  }

  protected extractBalance(message: string): number | null {
    // "Your account balance is 3,123.45MT."
    const pattern = /account\s+balance\s+is\s+([0-9,]+\.[0-9]{2})\s*MT/i;
    const match = message.match(pattern);
    if (match) {
      return this.parseUsAmount(match[1]);
    }
    return null;
  }

  protected extractReference(message: string): string | null {
    // "Transaction ID PP260530.0934.w91238." or "Transaction ID: PP260603.0854.K00983."
    const pattern = /Transaction\s+ID:?\s*([A-Za-z0-9.]+)/i;
    const match = message.match(pattern);
    if (match) {
      return match[1].trim().replace(/\.$/, '');
    }
    return null;
  }

  protected extractAccountLast4(_message: string): string | null {
    return null;
  }
}

export default new EMolaParser();
