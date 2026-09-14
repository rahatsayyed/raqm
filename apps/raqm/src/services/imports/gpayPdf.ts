import { TransactionType } from '@rahatsayyed/bank-sms-parser';
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

export interface GpayPdfRow {
  timestamp: number;
  merchant: string;
  amount: number;
  type: TransactionType.EXPENSE | TransactionType.INCOME;
  reference: string;
  bankName: string;
  accountLast4: string | null;
}

export interface GpayPdfParseResult {
  rows: GpayPdfRow[];
  /** Transaction-shaped blocks found but not fully parsed (unexpected line shape) — surfaced to the user like Axio's skippedRows. */
  skippedBlocks: number;
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

// One row per line, reconstructed from pdf.js's positioned text items — the statement is a
// 3-column table (date/time | details | amount) with no space between adjacent runs of a
// column's text, so items must be grouped by visual row (rounded y) and sorted by x, not
// concatenated in item order.
interface PositionedItem {
  x: number;
  y: number;
  str: string;
}

function linesFromItems(items: PositionedItem[]): string[] {
  const sorted = [...items].sort((a, b) => b.y - a.y || a.x - b.x);
  const Y_TOLERANCE = 2;
  const rows: PositionedItem[][] = [];
  for (const item of sorted) {
    const currentRow = rows[rows.length - 1];
    if (currentRow && Math.abs(currentRow[0].y - item.y) <= Y_TOLERANCE) {
      currentRow.push(item);
    } else {
      rows.push([item]);
    }
  }
  return rows
    .map((row) =>
      row
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);
}

async function extractLines(data: Uint8Array): Promise<string[]> {
  const doc = await pdfjsLib.getDocument({ data, isEvalSupported: false, useWorkerFetch: false }).promise;
  const lines: string[] = [];
  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items: PositionedItem[] = (content.items as Array<{ str?: string; transform: number[] }>)
      .filter((item): item is { str: string; transform: number[] } => typeof item.str === 'string')
      .map((item) => ({ x: item.transform[4], y: item.transform[5], str: item.str }));
    lines.push(...linesFromItems(items));
  }
  return lines;
}

/** "01 Aug, 2026" + "10:43 AM" -> epoch ms, using device-local wall-clock time (same
 * convention as bank-sms-parser's SMS-receipt timestamps — see database.ts's smsTimestamp). */
function parseDateTime(dateStr: string, timeStr: string): number | null {
  const dateMatch = dateStr.match(/^(\d{1,2})\s+([A-Za-z]{3}),?\s+(\d{4})$/);
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!dateMatch || !timeMatch) return null;

  const day = Number(dateMatch[1]);
  const month = MONTHS[dateMatch[2].toLowerCase()];
  const year = Number(dateMatch[3]);
  if (month === undefined) return null;

  let hour = Number(timeMatch[1]) % 12;
  if (timeMatch[3].toUpperCase() === 'PM') hour += 12;
  const minute = Number(timeMatch[2]);

  return new Date(year, month, day, hour, minute, 0, 0).getTime();
}

const TX_LINE = /^(\d{1,2}\s+[A-Za-z]{3},?\s+\d{4})\s+(Paid to|Self transfer to|Received from)\s+(.+?)\s+₹\s*([\d,]+(?:\.\d+)?)$/;
const TIME_REF_LINE = /^(\d{1,2}:\d{2}\s*(?:AM|PM))\s+UPI Transaction ID:\s*(\S+)$/i;
const BANK_LINE = /^Paid by\s+(.+?)(?:\s+(\d{3,6}))?$/;

/**
 * Parses a Google Pay "Transaction statement" PDF (already extracted to bytes) into rows
 * ready for `applyGpayPdfImport`. Only handles the "Paid to X" / "Self transfer to X" (debit)
 * and "Received from X" (credit) line shapes seen in the statement table — anything else
 * (page headers, the Sent/Received summary, the footer note) is skipped, not guessed at.
 *
 * ponytail: "Received from" is parsed defensively but untested against a real statement with
 * credit rows (this account's sample period had none) — verify against one before relying on it.
 */
export async function parseGpayPdf(bytes: Uint8Array): Promise<GpayPdfParseResult> {
  const lines = await extractLines(bytes);
  const rows: GpayPdfRow[] = [];
  let skippedBlocks = 0;

  for (let i = 0; i < lines.length; i++) {
    const txMatch = lines[i].match(TX_LINE);
    if (!txMatch) continue;

    const [, dateStr, kind, merchantRaw, amountStr] = txMatch;
    const timeRefMatch = lines[i + 1]?.match(TIME_REF_LINE);
    const bankMatch = lines[i + 2]?.match(BANK_LINE);

    if (!timeRefMatch || !bankMatch) {
      skippedBlocks++;
      continue;
    }

    const timestamp = parseDateTime(dateStr, timeRefMatch[1]);
    if (timestamp === null) {
      skippedBlocks++;
      continue;
    }

    const merchant = kind === 'Self transfer to' ? `Self transfer to ${merchantRaw.trim()}` : merchantRaw.trim();

    rows.push({
      timestamp,
      merchant,
      amount: Number(amountStr.replace(/,/g, '')),
      type: kind === 'Received from' ? TransactionType.INCOME : TransactionType.EXPENSE,
      reference: timeRefMatch[2].trim(),
      bankName: bankMatch[1].trim(),
      accountLast4: bankMatch[2]?.trim() ?? null,
    });

    i += 2; // consumed the time/ref and bank lines too
  }

  return { rows, skippedBlocks };
}
