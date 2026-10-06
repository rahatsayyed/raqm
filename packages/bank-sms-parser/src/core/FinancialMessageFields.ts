// Ported from PennyWise (AGPL-3.0): https://github.com/sarim2000/pennywiseai-tracker

export enum TransferDirection {
  INCOMING = 'INCOMING',
  OUTGOING = 'OUTGOING',
}

const SAR_FIRST = /^(?:SAR|SR)\s*([0-9][0-9,]*(?:\.\d{1,2})?)$/i;
const SAR_LAST = /^([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:SAR|SR)$/i;
const SETTLEMENT_SAR_FIRST = /\(\s*(?:SAR|SR)\s*([0-9][0-9,]*(?:\.\d{1,2})?)\s*\)/i;
const SETTLEMENT_SAR_LAST = /\(\s*([0-9][0-9,]*(?:\.\d{1,2})?)\s*(?:SAR|SR)\s*\)/i;

function parse(raw: string): number | null {
  const parsed = parseFloat(raw.replace(/,/g, ''));
  return isNaN(parsed) ? null : parsed;
}

function labelledValue(message: string, labels: readonly string[]): string | null {
  const alternatives = labels
    .map((l) => l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+'))
    .join('|');
  const pattern = new RegExp(`^(?:${alternatives})\\s*:?\\s*(.+?)\\s*$`, 'i');
  for (const rawLine of message.split(/\r\n|\r|\n/)) {
    const match = rawLine.trim().match(pattern);
    if (match) return match[1].trim();
  }
  return null;
}

function sarAmountFromValue(value: string): number | null {
  const first = value.match(SAR_FIRST);
  if (first) return parse(first[1]);
  const last = value.match(SAR_LAST);
  if (last) return parse(last[1]);
  return null;
}

/** Conservative extraction for explicitly labelled financial fields. */
export const FinancialMessageFields = {
  sarAmount(message: string, labels: readonly string[]): number | null {
    const value = labelledValue(message, labels);
    if (value === null) return null;
    return sarAmountFromValue(value);
  },

  sarSettlementOrAmount(message: string, labels: readonly string[]): number | null {
    const value = labelledValue(message, labels);
    if (value === null) return null;
    const first = value.match(SETTLEMENT_SAR_FIRST);
    if (first) return parse(first[1]);
    const last = value.match(SETTLEMENT_SAR_LAST);
    if (last) return parse(last[1]);
    return sarAmountFromValue(value);
  },

  transferDirection(message: string): TransferDirection | null {
    const from = labelledValue(message, ['From']) !== null;
    const to = labelledValue(message, ['To']) !== null;
    if (from && !to) return TransferDirection.INCOMING;
    if (to && !from) return TransferDirection.OUTGOING;
    return null;
  },
};
