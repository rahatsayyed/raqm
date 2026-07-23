import { SmsReader } from '../native/SmsReader';
import { BankParserFactory } from '@rahatsayyed/bank-sms-parser';

export interface InboxMessage {
  sender: string;
  body: string;
  timestamp: number;
  /** Whether Raqm's parser recognized this sender AND successfully parsed this specific message. */
  supported: boolean;
}

export interface SmsConversation {
  /** Resolved bank name for known senders, otherwise the raw sender/address string. */
  key: string;
  displayName: string;
  messages: InboxMessage[]; // ascending by timestamp
  lastTimestamp: number;
  lastBody: string;
  unsupportedCount: number;
}

const WINDOW_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Groups the last 90 days of the full SMS inbox (not just recognized bank senders) into
 * per-sender conversations, so a user can browse and "report" formats the parser doesn't
 * understand yet. Sender codes that resolve to the same known bank (e.g. different DLT
 * header variants of HDFC) are merged under one friendly name; unrecognized senders are
 * kept separate per raw sender string, matching how the underlying SMS app itself groups them.
 */
export async function loadSmsConversations(): Promise<SmsConversation[]> {
  const messages = await SmsReader.readInbox(Date.now() - WINDOW_MS, Date.now());

  // getParser() walks all registered bank parsers per call — cache per unique sender string
  // so a large inbox only pays that cost once per distinct sender, not once per message.
  const nameCache = new Map<string, string | null>();
  const groups = new Map<string, SmsConversation>();

  for (const msg of messages) {
    let bankName = nameCache.get(msg.sender);
    if (bankName === undefined) {
      bankName = BankParserFactory.getParser(msg.sender)?.getBankName() ?? null;
      nameCache.set(msg.sender, bankName);
    }
    const supported = bankName != null && BankParserFactory.parse(msg.body, msg.sender, msg.timestamp) != null;
    const key = bankName ?? msg.sender;

    let group = groups.get(key);
    if (!group) {
      group = { key, displayName: bankName ?? msg.sender, messages: [], lastTimestamp: 0, lastBody: '', unsupportedCount: 0 };
      groups.set(key, group);
    }
    group.messages.push({ sender: msg.sender, body: msg.body, timestamp: msg.timestamp, supported });
    if (!supported) group.unsupportedCount++;
  }

  const conversations = Array.from(groups.values());
  for (const group of conversations) {
    group.messages.sort((a, b) => a.timestamp - b.timestamp);
    const last = group.messages[group.messages.length - 1];
    group.lastTimestamp = last.timestamp;
    group.lastBody = last.body;
  }

  return conversations.sort((a, b) => b.lastTimestamp - a.lastTimestamp);
}
