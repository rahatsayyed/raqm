// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker
import { BankParser } from './BankParser';
import { FinancialMessageSafety } from './FinancialMessageSafety';
import { TransactionType } from './types';

const AMOUNT = /(?:USD|US\$|\$)\s*([\d,]+(?:\.\d{1,2})?)/i;
const DEBIT_MARKERS = ['debito', 'consumo', 'compra', 'retiro', 'aplicada', 'pago'];
const PURCHASE = /por\s+(?:USD|US\$|\$)\s*[\d,.]+\s+en\s+(.+?)(?:\s+el\s+\d|\.\s|\.?$)/i;
const FROM_PARTY = /\bdesde\s+(.+?)(?:\s+el\s+\d|\.\s|\.?$)/i;
const SPANISH_FAILURES = [
  'rechazada', 'rechazado', 'denegada', 'denegado', 'no aplicada', 'no aplicado',
  'fallida', 'fallido', 'no procesada', 'no procesado', 'sin exito', 'no exitosa',
  'solicitud de pago', 'solicita un pago', 'intento de',
];
const TO_PARTY = /.*\ba\s+(.+?)\s+por\s+(?:USD|US\$|\$)/i;
const CARD = /tarjeta|\bTTA\b/i;

const trimTrailingPunctuation = (s: string): string => s.trim().replace(/[.,]+$/, '');

// Shared skeleton for El Salvador banks: Spanish SMS in USD, subclasses add sender and account patterns.
export abstract class BaseElSalvadorBankParser extends BankParser {
  getCurrency(): string {
    return 'USD';
  }

  // Group 1 is the last 4; empty means the SMS carries no account number.
  protected accountPatterns: RegExp[] = [];

  protected isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();
    if (lower.includes('codigo') || lower.includes('clave') || lower.includes('otp')) return false;
    if (FinancialMessageSafety.isSecurityCode(message)) return false;
    if (FinancialMessageSafety.isOperationalOrPromotionalNotice(message)) return false;
    // A declined or merely requested payment moved no money.
    if (FinancialMessageSafety.hasExplicitFailure(message, SPANISH_FAILURES)) return false;
    if (SPANISH_FAILURES.some((f) => lower.includes(f))) return false;
    return this.extractTransactionType(message) !== null;
  }

  protected extractAmount(message: string): number | null {
    const match = message.match(AMOUNT);
    if (!match) return null;
    const parsed = parseFloat(match[1].replace(/,/g, ''));
    return isNaN(parsed) ? null : parsed;
  }

  protected extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    // "recibido" is checked first: income bodies may also say "Debito" or "Transferencia".
    if (lower.includes('recibido')) return TransactionType.INCOME;
    if (DEBIT_MARKERS.some((m) => lower.includes(m))) return TransactionType.EXPENSE;
    return null;
  }

  protected extractMerchant(message: string, _sender: string): string | null {
    const purchase = message.match(PURCHASE);
    if (purchase) return trimTrailingPunctuation(purchase[1]);

    if (this.extractTransactionType(message) === TransactionType.INCOME) {
      // The "de NAME" in "Abono a Cuenta de NAME" is the account holder, never the payer.
      const from = message.match(FROM_PARTY);
      return from ? trimTrailingPunctuation(from[1]) : null;
    }

    // Greedy prefix so the connector closest to the amount wins.
    const to = message.match(TO_PARTY);
    return to ? to[1].trim() : null;
  }

  protected extractAccountLast4(message: string): string | null {
    for (const pattern of this.accountPatterns) {
      const match = message.match(pattern);
      if (match) return match[1];
    }
    return null;
  }

  protected detectIsCard(message: string): boolean {
    return CARD.test(message);
  }
}
