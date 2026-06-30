import { BankParser } from '../core/BankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for Siddhartha Bank Limited (Nepal) SMS messages
 *
 * Handles formats like:
 * - "Dear [NAME], AC ###XXXX1234, NPR 97.00 withdrawn on 09/12/2025 12:31:20 for Fund Trf to A/C PAYABLE IBFT"
 * - "Dear [NAME], AC ###XXXX1234, NPR 810.00 withdrawn on 05/12/2025 18:06:50 for QR Payment to FALCHA KHAJA GHAR"
 * - "Dear [NAME], AC ###XXXX1234, NPR 120,000.00 deposited on 28/11/2025 20:13:59 for Fund Trf frm A/C PAYABLE IBF-FON"
 *
 * Common sender: SBL_Alert
 * Currency: NPR (Nepalese Rupee)
 */
export class SiddharthaBankParser extends BankParser {

    getBankName(): string {
        return 'Siddhartha Bank';
    }

    getCurrency(): string {
        return 'NPR';
    }

    canHandle(sender: string): boolean {
        const normalizedSender = sender.toUpperCase().replace(/-/g, '_');
        return normalizedSender.includes('SBL') ||
            normalizedSender === 'SBL_ALERT' ||
            normalizedSender.includes('SIDDHARTHA');
    }

    extractAmount(message: string): number | null {
        // Pattern: "NPR 97.00" or "NPR 120,000.00" (with commas)
        const nprPattern = /NPR\s+([0-9,]+(?:\.\d{2})?)/i;
        const match = message.match(nprPattern);
        if (match) {
            const amountStr = match[1].replace(/,/g, '');
            const amount = parseFloat(amountStr);
            if (!isNaN(amount)) {
                return amount;
            }
        }
        return null;
    }

    extractTransactionType(message: string): TransactionType | null {
        const lowerMessage = message.toLowerCase();

        // Withdrawn = expense (debit)
        if (lowerMessage.includes('withdrawn')) {
            return TransactionType.EXPENSE;
        }

        // Deposited = income (credit)
        if (lowerMessage.includes('deposited') || lowerMessage.includes('credited')) {
            return TransactionType.INCOME;
        }

        return null;
    }

    extractMerchant(message: string, sender: string): string | null {
        const lowerMessage = message.toLowerCase();

        // Pattern 1: "QR Payment to FALCHA KHAJA GHAR - falcha"
        const qrPattern = /qr payment to\s+([^-\n]+?)(?:\s+-|$)/i;
        const qrMatch = message.match(qrPattern);
        if (qrMatch) {
            const merchant = this.cleanMerchantName(qrMatch[1].trim());
            if (this.isValidMerchantName(merchant)) {
                return merchant;
            }
        }

        // Pattern 2: Utility bill - "Fund Trf to A/C PAYABLE IBFT (IN-670724040,NEA"
        if (lowerMessage.includes('nea')) {
            return 'Nepal Electricity Authority';
        }

        // Pattern 3: Fund transfer to account
        if (lowerMessage.includes('fund trf to') || lowerMessage.includes('fund transfer to')) {
            // Check for IBFT (Inter-Bank Fund Transfer)
            if (lowerMessage.includes('ibft')) {
                return 'Fund Transfer (IBFT)';
            }
            return 'Fund Transfer';
        }

        // Pattern 4: Fund transfer from account (deposits)
        if (lowerMessage.includes('fund trf frm') || lowerMessage.includes('fund transfer from')) {
            if (lowerMessage.includes('ibft')) {
                return 'Fund Transfer (IBFT)';
            }
            return 'Fund Transfer';
        }

        // Pattern 5: Generic deposit
        if (lowerMessage.includes('deposited')) {
            return 'Deposit';
        }

        return null;
    }

    extractAccountLast4(message: string): string | null {
        const superResult = super.extractAccountLast4(message);
        if (superResult !== null && superResult !== undefined) {
            return superResult;
        }
        // Pattern: "AC ###XXXX1234" or "AC XXXX1234" - capture masked string, extract last 4 digits
        const accountPattern = /AC\s+([X#\d]+)/i;
        const match = message.match(accountPattern);
        if (match) {
            return this.extractLast4Digits(match[1]);
        }
        return null;
    }

    extractReference(message: string): string | null {
        // Pattern 1: "(IN-670725619,222" - transaction reference with IN prefix
        const inPattern = /\(IN-(\d+)/;
        const inMatch = message.match(inPattern);
        if (inMatch) {
            return `IN-${inMatch[1]}`;
        }

        // Pattern 2: "FON:IBFT:1171853" - FON reference (check before IBFT pattern)
        const fonPattern = /FON:IBFT:(\d+)/;
        const fonMatch = message.match(fonPattern);
        if (fonMatch) {
            return fonMatch[1];
        }

        // Pattern 3: "IBFT:1171853" - IBFT reference
        const ibftPattern = /IBFT:(\d+)/;
        const ibftMatch = message.match(ibftPattern);
        if (ibftMatch) {
            return ibftMatch[1];
        }

        return null;
    }

    isTransactionMessage(message: string): boolean {
        const lowerMessage = message.toLowerCase();

        // Skip OTP and promotional messages
        if (lowerMessage.includes('otp') ||
            lowerMessage.includes('password') ||
            lowerMessage.includes('verification code')) {
            return false;
        }

        // Must contain transaction keywords and NPR amount
        const hasAmount = lowerMessage.includes('npr');
        const hasTransactionKeyword = lowerMessage.includes('withdrawn') ||
            lowerMessage.includes('deposited') ||
            lowerMessage.includes('fund trf') ||
            lowerMessage.includes('fund transfer') ||
            lowerMessage.includes('qr payment');

        return hasAmount && hasTransactionKeyword;
    }
}

export default new SiddharthaBankParser();
