import { BaseIndianBankParser } from '../core/BaseIndianBankParser';
import { ParsedTransaction, TransactionType } from '../core/types';

export class DOPBankParser extends BaseIndianBankParser {
    getBankName(): string {
        return 'Department of Post';
    }

    canHandle(sender: string): boolean {
        const upper = sender.toUpperCase();
        return (
            upper.includes('DOPBNK') ||
            upper.includes('DEPARTMENT OF POST') ||
            upper.includes('DOP-') ||
            upper.endsWith('-DOP') ||
            upper === 'DOP'
        );
    }

    parse(smsBody: string, sender: string, timestamp: number): ParsedTransaction | null {
        const normalizedBody = this.normalizeUnicodeText(smsBody);
        return super.parse(normalizedBody, sender, timestamp);
    }

    private normalizeUnicodeText(text: string): string {
        return text
            .normalize('NFKD')
            .replace(/[^\x00-\x7F]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    extractAmount(message: string): number | null {
        const amountPattern = /amount\s+(?:Rs\.?|INR)?\s*([\d,]+(?:\.\d{2})?)/i;
        const match = message.match(amountPattern);
        if (match) {
            const amount = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(amount)) {
                return amount;
            }
        }

        return super.extractAmount(message);
    }

    extractAccountLast4(message: string): string | null {
        const accountPattern = /Acc(?:ount)?\s*(?:No\.?)?\s+(?:[X*]+)?(\d{4})/i;
        const match = message.match(accountPattern);
        if (match) {
            return match[1];
        }

        return super.extractAccountLast4(message);
    }

    extractTransactionType(message: string): TransactionType | null {
        const lower = message.toLowerCase();
        if (lower.includes('credit')) {
            return TransactionType.INCOME;
        }
        if (lower.includes('debit')) {
            return TransactionType.EXPENSE;
        }
        return super.extractTransactionType(message);
    }

    extractBalance(message: string): number | null {
        const balancePattern = /Bal(?:ance)?\s*(?::)?\s*(?:Rs\.?|INR)?\s*([\d,]+(?:\.\d{2})?)/i;
        const match = message.match(balancePattern);
        if (match) {
            const balance = parseFloat(match[1].replace(/,/g, ''));
            if (!isNaN(balance)) {
                return balance;
            }
        }

        return super.extractBalance(message);
    }

    extractReference(message: string): string | null {
        const refPattern = /\[([A-Z0-9]+)\]/i;
        const match = message.match(refPattern);
        if (match) {
            return match[1];
        }

        return super.extractReference(message);
    }

    isTransactionMessage(message: string): boolean {
        const lower = message.toLowerCase();
        const hasKeyword =
            lower.includes('account') || lower.includes('a/c') || lower.includes('dop');
        const hasType = lower.includes('credit') || lower.includes('debit');
        return hasKeyword && hasType;
    }
}

export default new DOPBankParser();
