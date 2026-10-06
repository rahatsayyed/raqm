// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from '../core/BankParser';
import { TransactionType } from '../core/types';

/** Parser for Awash Bank (Ethiopia) ETB transactions; amount is never the Charge or VAT value. */
export class AwashBankParser extends BankParser {

  getBankName(): string {
    return 'Awash Bank';
  }

  getCurrency(): string {
    return 'ETB';
  }

  canHandle(sender: string): boolean {
    const normalized = sender.toUpperCase().trim();
    return normalized === 'AWASH BANK' ||
      normalized === 'AWASHBANK' ||
      normalized === 'AWASH' ||
      /^[A-Z]{2}-AWASH-[A-Z]$/.test(normalized);
  }

  protected extractAmount(message: string): number | null {
    const patterns = [
      /ETB\s*([0-9,]+(?:\.[0-9]{1,2})?)\s+has\s+been\s+credited/i,
      /Transfer\s+of\s+([0-9,]+(?:\.[0-9]{1,2})?)\s*ETB/i,
      /sent\s+ETB\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) return this.toAmount(match[1]);
    }

    return super.extractAmount(message);
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('has been credited')) return TransactionType.INCOME;
    if (lower.includes('credited to your account')) return TransactionType.INCOME;

    if (lower.includes('telebirr transfer')) return TransactionType.EXPENSE;
    if (lower.includes('you have sent')) return TransactionType.EXPENSE;
    if (lower.includes('has been debited')) return TransactionType.EXPENSE;

    return super.extractTransactionType(message);
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const patterns = [
      /To\s*\([0-9]+\)\s*-\s*([A-Za-z][A-Za-z\s]+?)\s+by\s+Transaction/i,
      /to\s+([A-Za-z][A-Za-z\s]+?)\s*-\s*[0-9]+\s+from/i,
      /from\s+([A-Za-z][A-Za-z\s]+?)\s+on:?/i,
    ];

    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match) {
        const merchant = match[1].replace(/\s+/g, ' ').trim();
        if (merchant.length > 0) return merchant;
      }
    }

    return null;
  }

  protected extractReference(message: string): string | null {
    const txnId = message.match(/Txn\s+ID:\s*([A-Za-z0-9]+)/i);
    if (txnId) return txnId[1];

    const transactionId = message.match(/Transaction\s+ID:\s*([A-Za-z0-9]+)/i);
    if (transactionId) return transactionId[1];

    return null;
  }

  // Only the Telebirr format exposes the customer's own account; "To (<acct>)" is the recipient
  protected extractAccountLast4(message: string): string | null {
    const match = message.match(/from\s+(\d{5,})\/BANK/i);
    if (match) return this.extractLast4Digits(match[1]);
    return null;
  }

  protected extractBalance(message: string): number | null {
    const match = message.match(/Balance\s+is\s+(?:now\s+)?(?:ETB\s*)?([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (match) return this.toAmount(match[1]);
    return super.extractBalance(message);
  }

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    const keywords = [
      'has been credited',
      'has been debited',
      'telebirr transfer',
      'you have sent',
      'your balance is',
      'available balance',
    ];
    if (keywords.some((kw) => lower.includes(kw))) return true;
    return super.isTransactionMessage(message);
  }

  private toAmount(raw: string): number | null {
    const parsed = parseFloat(raw.replace(/,/g, ''));
    return isNaN(parsed) ? null : Math.round(parsed * 100) / 100;
  }
}

export default new AwashBankParser();
