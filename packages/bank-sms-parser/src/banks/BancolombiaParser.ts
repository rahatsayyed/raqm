import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Bancolombia (Colombian bank) SMS messages
 *
 * Sender IDs: 87400, 85540
 * Language: Spanish
 * Currency: COP (Colombian Peso)
 *
 * Transaction types:
 * - Transferiste: Transfer (EXPENSE)
 * - Compraste: Purchase (EXPENSE)
 * - Pagaste: Payment (EXPENSE)
 * - Recibiste: Received (INCOME)
 */
export class BancolombiaParser extends BankParser {

  getBankName(): string {
    return 'Bancolombia';
  }

  canHandle(sender: string): boolean {
    return sender === '87400' || sender === '85540';
  }

  getCurrency(): string {
    return 'COP';
  }

  protected isTransactionMessage(message: string): boolean {
    // Override base class to handle Spanish transaction keywords
    const lowerMessage = message.toLowerCase();
    const spanishKeywords = [
      'transferiste', 'compraste', 'pagaste', 'recibiste',
    ];
    return spanishKeywords.some((kw) => lowerMessage.includes(kw));
  }

  protected extractAmount(message: string): number | null {
    // Colombian format: dots for thousands (1.000), commas for decimals (,50)
    // Example: $1.000.000,50 = 1 million pesos and 50 centavos
    const pattern = /(Transferiste|Compraste|Pagaste|Recibiste)\s+\$?([0-9.,]+)/i;
    const match = message.match(pattern);
    if (match) {
      // Convert Colombian format to standard format
      const amount = match[2]
        .replace(/\./g, '')   // Remove thousand separators (dots)
        .replace(/,/g, '.')   // Convert decimal separator (comma to dot)
        .replace(/\$/g, '')   // Remove currency symbol
        .trim();
      const parsed = parseFloat(amount);
      return isNaN(parsed) ? null : parsed;
    }
    return null;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('transferiste')) return TransactionType.EXPENSE;
    if (lower.includes('compraste')) return TransactionType.EXPENSE;
    if (lower.includes('pagaste')) return TransactionType.EXPENSE;
    if (lower.includes('recibiste')) return TransactionType.INCOME;
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    // Simple: just return the transaction type in Spanish for now
    const lower = message.toLowerCase();
    if (lower.includes('transferiste')) return 'Transferencia';
    if (lower.includes('compraste')) return 'Compra';
    if (lower.includes('pagaste')) return 'Pago';
    if (lower.includes('recibiste')) return 'Dinero recibido';
    return 'Bancolombia';
  }
}

export default new BancolombiaParser();
