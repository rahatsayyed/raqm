import { PermissionsAndroid } from 'react-native';
import { sendSms } from '../../modules/sms-reader/src/SmsReaderModule';
import { requestSendSmsPermission } from '../utils/permissions';
import {
  getSetting,
  getSplits,
  getSplitParticipants,
  setSplitParticipantLastReminded,
} from '../db/database';
import type { SplitParticipant } from '../db/database';
import { formatAmount } from '../utils/format';
import { buildUpiLink } from '../utils/upi';

const REMINDER_INTERVAL_MS = 24 * 60 * 60 * 1000; // once every 24h while still unpaid

function reminderMessage(input: {
  splitTitle: string;
  description: string | null;
  participantName: string;
  shareAmount: number;
  upiId: string | null;
}): string {
  const descLine = input.description ? ` (${input.description})` : '';
  const upiLine = input.upiId
    ? ` Pay here: ${buildUpiLink({ upiId: input.upiId, payeeName: input.splitTitle, amount: input.shareAmount, note: input.splitTitle })}`
    : '';
  return `Hi ${input.participantName}, for ${input.splitTitle}${descLine} you owe ${formatAmount(input.shareAmount)}.${upiLine}`;
}

/** Sends one participant a reminder now, requesting SEND_SMS if not yet granted.
 * Returns whether it actually sent (false on missing phone number, denied
 * permission, or a native send failure — all handled the same way: the caller
 * shows a toast, this never throws). */
export async function sendReminderNow(
  participant: SplitParticipant,
  split: { title: string; description: string | null },
): Promise<boolean> {
  if (!participant.phoneNumber) return false;
  try {
    const granted = await requestSendSmsPermission();
    if (!granted) return false;
    const upiId = await getSetting('upi_id');
    const message = reminderMessage({
      splitTitle: split.title,
      description: split.description,
      participantName: participant.name,
      shareAmount: participant.shareAmount,
      upiId: upiId ?? null,
    });
    await sendSms(participant.phoneNumber, message);
    await setSplitParticipantLastReminded(participant.id, Date.now());
    return true;
  } catch {
    return false;
  }
}

/**
 * Checked once per app open (see AppNavigator.tsx) — there is no proven
 * background-task mechanism in this app (see the spec's explicit decision), so
 * "opt-in auto reminders" means "checked whenever the app happens to be opened",
 * not a true background schedule. Never throws — a failure here must not block
 * app startup.
 */
export async function checkAndSendReminders(): Promise<void> {
  try {
    const enabled = await getSetting('auto_sms_reminders');
    if (enabled !== '1') return;

    // Only CHECK (never request) here — the user already granted SEND_SMS once via the
    // Settings toggle's own explicit request flow. An unattended app-open auto-check must
    // never pop a permission dialog on its own.
    const granted = await PermissionsAndroid.check('android.permission.SEND_SMS');
    if (!granted) return;

    const now = Date.now();
    const splits = await getSplits();
    for (const split of splits.filter((s) => s.status === 'open')) {
      const participants = await getSplitParticipants(split.id);
      for (const p of participants) {
        if (p.status !== 'unpaid' || !p.phoneNumber) continue;
        if (p.lastRemindedAt && now - p.lastRemindedAt < REMINDER_INTERVAL_MS) continue;
        await sendReminderNow(p, { title: split.title, description: split.description });
      }
    }
  } catch {
    // Silent — this runs on every app open and must never block startup.
  }
}
