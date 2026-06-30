import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

/**
 * Parser for IDFC First Bank SMS messages
 *
 * Common senders: XX-IDFCBK-S, XX-IDFCBK-T, XX-IDFCB-S, XX-IDFCB-T, IDFCBK
 * Examples: BM-IDFCBK-S, AX-IDFCBK-T, AD-IDFCB-S
 *
 * SMS Format:
 * Your A/C XXXXXXXXXXX is debited by INR 68.00 on 06/08/25 17:36. New Bal :INR XXXXX.00
 * Your A/C XXXXXXXXXXX is credited by INR 500.00 on 06/08/25 17:36. New Bal :INR XXXXX.00
 *
 * Credit Card Format (with multi-currency support):
 * Transaction Successful! EUR 500.00 spent on your IDFC FIRST Bank Credit Card ending XXXX at MERCHANT on DD-MMM-YYYY
 */
export class IDFCFirstBankParser extends BaseIndianBankParser {

    getBankName(): string {
        return 'IDFC First Bank';
    }

    canHandle(sender: string): boolean {
        const normalizedSender = sender.toUpperCase();
        return normalizedSender.includes('IDFCBK') ||
            normalizedSender.includes('IDFCFB') ||
            normalizedSender.includes('IDFC');
    }

    parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
        // Skip non-transaction messages
        if (!this.isTransactionMessage(smsBody)) {
            return null;
        }

        const amount = this.extractAmount(smsBody);
        if (amount === null) {
            return null;
        }

        const type = this.extractTransactionType(smsBody);
        if (type === null) {
            return null;
        }

        // Extract currency dynamically for multi-currency support (foreign transactions on credit cards)
        const currency = this.extractCurrencyFromMessage(smsBody) ?? 'INR';

        // Extract available limit for credit card transactions
        const availableLimit = type === TransactionType.CREDIT
            ? this.extractAvailableLimit(smsBody)
            : null;

        return {
            amount,
            type,
            merchant: this.extractMerchant(smsBody, sender),
            reference: this.extractReference(smsBody),
            accountLast4: this.extractAccountLast4(smsBody),
            balance: this.extractBalance(smsBody),
            creditLimit: availableLimit,
            smsBody,
            sender,
            timestamp,
            bankName: this.getBankName(),
            isFromCard: this.detectIsCard(smsBody),
            currency,
        };
    }

    /**
     * Extract currency from IDFC First Bank transaction messages.
     * Handles formats like "EUR 500.00 spent" or "USD 100.00 spent" for credit card transactions.
     */
    private extractCurrencyFromMessage(message: string): string | null {
        // Pattern: "EUR 500.00 spent" or "USD 100.00 spent" (credit card foreign currency transactions)
        const currencySpentPattern = /([A-Z]{3})\s+[0-9,]+(?:\.\d{2})?\s+spent/i;
        const match = message.match(currencySpentPattern);
        if (match) {
            const currency = match[1].toUpperCase();
            // Validate: 3 letters, not month abbreviations
            if (!/^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)$/.test(currency)) {
                return currency;
            }
        }

        return null; // Falls back to INR
    }

    extractAmount(message: string): number | null {
        // List of amount patterns for IDFC First Bank
        const amountPatterns = [
            // Credit card foreign currency pattern: "EUR 500.00 spent" or "USD 100.00 spent"
            /[A-Z]{3}\s+([0-9,]+(?:\.\d{2})?)\s+spent/i,

            // Debit patterns
            /Debit\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
            /debited\s+by\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
            /debited\s+by\s+INR\s*([0-9,]+(?:\.\d{2})?)/i,

            // Credit patterns
            /credited\s+by\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
            /credited\s+with\s+INR\s*([0-9,]+(?:\.\d{2})?)/i,
            /credited\s+by\s+INR\s*([0-9,]+(?:\.\d{2})?)/i,

            // Interest pattern
            /interest\s+of\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
        ];

        for (const pattern of amountPatterns) {
            const match = message.match(pattern);
            if (match) {
                const amountStr = match[1].replace(/,/g, '');
                const amount = parseFloat(amountStr);
                if (!isNaN(amount)) {
                    return amount;
                }
                return null;
            }
        }

        return super.extractAmount(message);
    }

    isTransactionMessage(message: string): boolean {
        const lowerMessage = message.toLowerCase();

        // Skip OTP messages
        if (lowerMessage.includes('otp') ||
            lowerMessage.includes('one time password') ||
            lowerMessage.includes('verification code')
        ) {
            return false;
        }

        // Skip promotional messages
        if (lowerMessage.includes('offer') ||
            lowerMessage.includes('discount') ||
            lowerMessage.includes('cashback offer') ||
            lowerMessage.includes('win ')
        ) {
            return false;
        }

        // Skip bill reminders and due date notifications
        if (lowerMessage.includes('reminder') ||
            lowerMessage.includes('is due on') ||
            (lowerMessage.includes('bill of rs') && lowerMessage.includes('due'))
        ) {
            return false;
        }

        // Skip payment request messages (common across banks)
        if (lowerMessage.includes('has requested') ||
            lowerMessage.includes('payment request') ||
            lowerMessage.includes('collect request') ||
            lowerMessage.includes('requesting payment') ||
            lowerMessage.includes('requests rs') ||
            lowerMessage.includes('ignore if paid') ||
            lowerMessage.includes('ignore if already paid')
        ) {
            return false;
        }

        // Must contain transaction keywords - IDFC specific patterns
        const transactionKeywords = [
            'debit', 'debited', 'credited', 'withdrawn', 'deposited',
            'spent', 'received', 'transferred', 'paid', 'interest',
        ];

        return transactionKeywords.some(keyword => lowerMessage.includes(keyword));
    }

    extractTransactionType(message: string): TransactionType | null {
        const lowerMessage = message.toLowerCase();
        if (lowerMessage.includes('debit')) return TransactionType.EXPENSE;
        if (lowerMessage.includes('debited')) return TransactionType.EXPENSE;
        if (lowerMessage.includes('spent')) return TransactionType.EXPENSE; // Credit card transactions
        if (lowerMessage.includes('credited')) return TransactionType.INCOME;
        if (lowerMessage.includes('withdrawn') || lowerMessage.includes('withdrawal')) return TransactionType.EXPENSE;
        if (lowerMessage.includes('deposited') || lowerMessage.includes('deposit')) return TransactionType.INCOME;
        if (lowerMessage.includes('cash deposit')) return TransactionType.INCOME;
        if (lowerMessage.includes('interest') && lowerMessage.includes('earned')) return TransactionType.INCOME;
        if (lowerMessage.includes('monthly interest')) return TransactionType.INCOME;
        return super.extractTransactionType(message);
    }

    extractMerchant(message: string, sender: string): string | null {
        const lowerMessage = message.toLowerCase();

        // Interest credit
        if (lowerMessage.includes('monthly interest')) {
            return 'Interest Credit';
        }

        // Cash deposit
        if (lowerMessage.includes('cash deposit')) {
            // Try to extract ATM ID if present
            const atmPattern = /ATM\s+(?:ID\s+)?([A-Z0-9]+)/i;
            const atmMatch = message.match(atmPattern);
            if (atmMatch) {
                return `Cash Deposit - ATM ${atmMatch[1]}`;
            }
            return 'Cash Deposit';
        }

        // Pattern: "debited by Rs. X on DATE; MERCHANT credited" (e.g., REDBUS credited)
        const merchantCreditedPattern = /;\s*([A-Z][A-Z0-9\s]+?)\s+credited/i;
        const merchantCreditedMatch = message.match(merchantCreditedPattern);
        if (merchantCreditedMatch) {
            const merchant = this.cleanMerchantName(merchantCreditedMatch[1]);
            if (this.isValidMerchantName(merchant)) {
                return merchant;
            }
        }

        // UPI transaction pattern
        if (message.toUpperCase().includes('UPI')) {
            // Try to extract UPI ID
            const upiPattern = /(?:to|from|at)\s+([a-zA-Z0-9._-]+@[a-zA-Z0-9]+)/i;
            const upiMatch = message.match(upiPattern);
            if (upiMatch) {
                return `UPI - ${upiMatch[1]}`;
            }
            return 'UPI Transaction';
        }

        // IMPS with mobile number
        if (message.toUpperCase().includes('IMPS')) {
            // Try to extract mobile number
            const mobilePattern = /mobile\s+[X]*(\d{3,4})/i;
            const mobileMatch = message.match(mobilePattern);
            if (mobileMatch) {
                return `IMPS Transfer - Mobile XXX${mobileMatch[1]}`;
            }
            return 'IMPS Transfer';
        }

        // NEFT/RTGS patterns
        if (message.toUpperCase().includes('NEFT')) return 'NEFT Transfer';
        if (message.toUpperCase().includes('RTGS')) return 'RTGS Transfer';

        // ATM withdrawal/transaction
        if (message.toUpperCase().includes('ATM')) {
            // Try to extract ATM ID
            const atmIdPattern = /ATM\s+([A-Z]{2}\d+)/i;
            const atmIdMatch = message.match(atmIdPattern);
            if (atmIdMatch) {
                return `ATM - ${atmIdMatch[1]}`;
            }
            return 'ATM Transaction';
        }

        // For card transactions
        const toPattern = /(?:to|at|for)\s+([A-Z][A-Z0-9\s&.-]+?)(?:\s+on|\s+New|\.|\,|$)/i;
        const toMatch = message.match(toPattern);
        if (toMatch) {
            const merchant = this.cleanMerchantName(toMatch[1]);
            if (this.isValidMerchantName(merchant)) {
                return merchant;
            }
        }

        return super.extractMerchant(message, sender);
    }

    extractAccountLast4(message: string): string | null {
        const parentResult = super.extractAccountLast4(message);
        if (parentResult !== null && parentResult !== undefined) return parentResult;

        // Pattern 1: Credit Card ending XX1234
        const cardEndingPattern = /Credit\s+Card\s+ending\s+([X\d]+)/i;
        const cardEndingMatch = message.match(cardEndingPattern);
        if (cardEndingMatch) {
            return this.extractLast4Digits(cardEndingMatch[1]);
        }

        // Pattern 2: A/C XXXXXXXXXXX where last digits are visible
        const acPattern = /A\/C\s+([X\d]+)/i;
        const acMatch = message.match(acPattern);
        if (acMatch) {
            return this.extractLast4Digits(acMatch[1]);
        }

        return null;
    }

    extractBalance(message: string): number | null {
        // List of balance patterns for IDFC First Bank
        const balancePatterns = [
            // "New Bal :INR XXXXX.00" or "New bal: Rs.XXXXX.00"
            /New\s+Bal\s*:\s*(?:INR|Rs\.?)\s*([0-9,]+(?:\.\d{2})?)/i,
            // "New balance is INR XXXXX.00"
            /New\s+balance\s+is\s+INR\s*([0-9,]+(?:\.\d{2})?)/i,
            // "Updated balance is INR XXXXX.00"
            /Updated\s+balance\s+is\s+INR\s*([0-9,]+(?:\.\d{2})?)/i,
            // "Available balance Rs. X,XXX.XX"
            /Available\s+balance\s+Rs\.?\s*([0-9,]+(?:\.\d{2})?)/i,
        ];

        for (const pattern of balancePatterns) {
            const match = message.match(pattern);
            if (match) {
                const balanceStr = match[1].replace(/,/g, '');
                const balance = parseFloat(balanceStr);
                if (!isNaN(balance)) {
                    return balance;
                }
                return null;
            }
        }

        return super.extractBalance(message);
    }

    extractReference(message: string): string | null {
        // RRN (Retrieval Reference Number) pattern
        const rrnPattern = /RRN\s+(\d+)/i;
        const rrnMatch = message.match(rrnPattern);
        if (rrnMatch) {
            return rrnMatch[1];
        }

        // IMPS reference pattern in parentheses
        const impsRefPattern = /IMPS\s+Ref\s+no\s+(\d+)/i;
        const impsRefMatch = message.match(impsRefPattern);
        if (impsRefMatch) {
            return impsRefMatch[1];
        }

        // UPI reference pattern
        const upiRefPattern = /UPI[:/]\s*([0-9]+)/i;
        const upiRefMatch = message.match(upiRefPattern);
        if (upiRefMatch) {
            return upiRefMatch[1];
        }

        // Transaction ID pattern
        const txnIdPattern = /(?:txn|transaction)\s*(?:id|ref|no)[:\s]*([A-Z0-9]+)/i;
        const txnIdMatch = message.match(txnIdPattern);
        if (txnIdMatch) {
            return txnIdMatch[1];
        }

        return super.extractReference(message);
    }
}

export default new IDFCFirstBankParser();
