import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Enpara (digital bank by QNB Finansbank / Enpara Bank, Turkey).
 *
 * Source: push notifications from the Enpara Android app (not SMS).
 * Sender alias supplied by BankNotificationConfig: "Enpara".
 * Currency: TRY (Turkish Lira; appears in notifications as "TL").
 *
 * Number formatting (Turkish locale):
 *  - `.` is the thousands separator, `,` is the decimal separator (e.g. "1.175,28 TL").
 *  - Strip `.` and replace `,` with `.` before parsing.
 *
 * Supported notification shapes:
 *
 *  1) Card spend (Encard) -> EXPENSE, isFromCard = true.
 *     "Vadesiz TL hesabınıza bağlı 2589 ile biten Encard'ınızla 10/05/2026 tarihinde
 *      105100000024364-OBILET ISTANBUL TR firmasında 520,00 TL tutarında harcama yapıldı."
 *     - accountLast4: 4 digits between "bağlı" and "ile biten Encard".
 *     - merchant: the segment after the leading numeric reference and before " firmasında",
 *       with the trailing " TR" stripped.
 *     - balanceAfter: not present in this notification shape.
 *
 *  2) Outgoing FAST transfer -> EXPENSE.
 *     "13/05/2026 tarihinde vadesiz TL hesabınızdan <RECIPIENT> adlı alıcıya 500,00 TL
 *      tutarında para transferi (FAST) yapıldı. İşlem sonrası hesap bakiyesi: 1.175,28 TL"
 *     - merchant: recipient name between "hesabınızdan" and "adlı alıcıya".
 *     - balance: number after "İşlem sonrası hesap bakiyesi:".
 *
 *  3) Incoming FAST transfer -> INCOME.
 *     "Vadesiz TL hesabınıza 11/05/2026 tarihinde <SENDER> tarafından yapılan para transferi
 *      (FAST) sonucunda 200,00 TL giriş oldu. İşlem sonrası hesap bakiyesi: 3.231,27 TL"
 *     - merchant: sender name between the date and "tarafından".
 *     - balance: number after "İşlem sonrası hesap bakiyesi:".
 */

// Card spend amount: "<number> TL tutarında harcama yapıldı"
const CARD_AMOUNT_REGEX = /([0-9.,]+)\s*TL\s+tutarında\s+harcama\s+yapıldı/i;

// Outgoing transfer amount: "<number> TL tutarında para transferi"
const OUTGOING_AMOUNT_REGEX = /([0-9.,]+)\s*TL\s+tutarında\s+para\s+transferi/i;

// Incoming transfer amount: "sonucunda <number> TL giriş oldu"
const INCOMING_AMOUNT_REGEX = /sonucunda\s+([0-9.,]+)\s*TL\s+giriş\s+oldu/i;

// Card spend merchant: after "tarihinde", optional leading numeric reference
// (e.g. "105100000024364-" or "2288088 -"), up to " firmasında".
const CARD_MERCHANT_REGEX = /tarihinde\s+\d+\s*-\s*(.+?)\s+firmasında/i;

// Outgoing recipient: between "hesabınızdan" and "adlı alıcıya".
const OUTGOING_RECIPIENT_REGEX = /hesabınızdan\s+(.+?)\s+adlı\s+alıcıya/i;

// Incoming sender: between "tarihinde" and "tarafından".
const INCOMING_SENDER_REGEX = /tarihinde\s+(.+?)\s+tarafından/i;

// Card last 4: digits between "bağlı" and "ile biten Encard".
const CARD_LAST4_REGEX = /bağlı\s+(\d{4})\s+ile\s+biten\s+Encard/i;

// Post-transaction balance: "İşlem sonrası hesap bakiyesi: <number> TL"
const BALANCE_REGEX = /İşlem\s+sonrası\s+hesap\s+bakiyesi:?\s*([0-9.,]+)\s*TL/i;

export class EnparaBankParser extends BankParser {
  getBankName(): string {
    return 'Enpara';
  }

  getCurrency(): string {
    return 'TRY';
  }

  canHandle(sender: string): boolean {
    return sender.toLowerCase() === 'enpara';
  }

  isTransactionMessage(message: string): boolean {
    const lower = message.toLowerCase();

    // Skip OTP / verification codes if they ever appear in notifications.
    if (
      lower.includes('otp') ||
      lower.includes('doğrulama kodu') ||
      lower.includes('tek kullanımlık şifre') ||
      lower.includes('şifreniz')
    ) {
      return false;
    }

    // Must look like one of the three known transaction notification shapes.
    return (
      lower.includes('harcama yapıldı') ||
      lower.includes('para transferi') ||
      lower.includes('giriş oldu')
    );
  }

  extractAmount(message: string): number | null {
    // Card spend: "... 520,00 TL tutarında harcama yapıldı."
    const cardMatch = message.match(CARD_AMOUNT_REGEX);
    if (cardMatch) {
      return this.parseTurkishNumber(cardMatch[1]);
    }

    // Outgoing transfer: "... 500,00 TL tutarında para transferi (FAST) yapıldı."
    const outgoingMatch = message.match(OUTGOING_AMOUNT_REGEX);
    if (outgoingMatch) {
      return this.parseTurkishNumber(outgoingMatch[1]);
    }

    // Incoming transfer: "... sonucunda 200,00 TL giriş oldu."
    const incomingMatch = message.match(INCOMING_AMOUNT_REGEX);
    if (incomingMatch) {
      return this.parseTurkishNumber(incomingMatch[1]);
    }

    return null;
  }

  extractTransactionType(message: string): TransactionType | null {
    const lower = message.toLowerCase();
    if (lower.includes('giriş oldu')) {
      return TransactionType.INCOME;
    }
    if (lower.includes('harcama yapıldı')) {
      return TransactionType.EXPENSE;
    }
    if (lower.includes('para transferi') && lower.includes('yapıldı')) {
      return TransactionType.EXPENSE;
    }
    return null;
  }

  extractMerchant(message: string, sender: string): string | null {
    // Card spend: merchant lives between the leading numeric reference and " firmasında".
    const cardMatch = message.match(CARD_MERCHANT_REGEX);
    if (cardMatch) {
      const raw = cardMatch[1].trim();
      const stripped = this.stripTrailingCountryCode(raw);
      const cleaned = this.cleanMerchantName(stripped);
      if (this.isValidMerchantName(cleaned)) return cleaned;
    }

    // Outgoing transfer: recipient between "hesabınızdan" and "adlı alıcıya".
    const outgoingMatch = message.match(OUTGOING_RECIPIENT_REGEX);
    if (outgoingMatch) {
      const cleaned = this.cleanMerchantName(outgoingMatch[1].trim());
      if (this.isValidMerchantName(cleaned)) return cleaned;
    }

    // Incoming transfer: sender between "tarihinde" and "tarafından".
    const incomingMatch = message.match(INCOMING_SENDER_REGEX);
    if (incomingMatch) {
      const cleaned = this.cleanMerchantName(incomingMatch[1].trim());
      if (this.isValidMerchantName(cleaned)) return cleaned;
    }

    return null;
  }

  extractAccountLast4(message: string): string | null {
    // "bağlı 2589 ile biten Encard" — 4 digits between "bağlı" and "ile biten Encard".
    const match = message.match(CARD_LAST4_REGEX);
    if (match) {
      return this.extractLast4Digits(match[1]);
    }
    return null;
  }

  extractBalance(message: string): number | null {
    // "İşlem sonrası hesap bakiyesi: 1.175,28 TL"
    const match = message.match(BALANCE_REGEX);
    if (match) {
      return this.parseTurkishNumber(match[1]);
    }
    return null;
  }

  detectIsCard(message: string): boolean {
    // Card spend notifications mention "Encard".
    return /encard/i.test(message);
  }

  /**
   * Removes a trailing standalone " TR" (country code) from a card-spend merchant
   * candidate. We intentionally leave the city token (e.g. "ISTANBUL", "KIRIKKALE")
   * intact since the issue allows it.
   */
  private stripTrailingCountryCode(raw: string): string {
    return raw.trimEnd().replace(/ TR$/, '').trimEnd();
  }

  private parseTurkishNumber(raw: string): number | null {
    // Turkish format: "1.175,28" -> "1175.28"; "520,00" -> "520.00"
    const normalized = raw.replace(/\./g, '').replace(',', '.');
    const result = parseFloat(normalized);
    return isNaN(result) ? null : result;
  }
}

export default new EnparaBankParser();
