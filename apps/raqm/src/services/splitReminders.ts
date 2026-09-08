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
import { logEvent } from './logger';

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
  if (!participant.phoneNumber) {
    logEvent('splitReminders.noPhone', `participant ${participant.id}`);
    return false;
  }
  try {
    const granted = await requestSendSmsPermission();
    if (!granted) {
      logEvent('splitReminders.permissionDenied', `participant ${participant.id}`);
      return false;
    }
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
    logEvent('splitReminders.sms.sent', `participant ${participant.id}`);
    return true;
  } catch (e) {
    logEvent('splitReminders.sms.failed', e instanceof Error ? e.message : String(e));
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
    const now = Date.now();
    const splits = await getSplits();
    const openSplits = splits.filter((s) => s.status === 'open' && s.autoRemindEnabled);
    logEvent('splitReminders.check', `${openSplits.length} auto-remind splits open`);
    for (const split of openSplits) {
      const participants = await getSplitParticipants(split.id);
      for (const p of participants) {
        if (p.isSelf || p.status !== 'unpaid' || !p.phoneNumber) continue;
        // remindIntervalDays === null means "every app open" — no throttle.
        // Otherwise, only send once the configured number of days has passed
        // since this participant's last reminder (or if never reminded).
        if (split.remindIntervalDays != null && p.lastRemindedAt != null) {
          const elapsedMs = now - p.lastRemindedAt;
          const intervalMs = split.remindIntervalDays * 24 * 60 * 60 * 1000;
          if (elapsedMs < intervalMs) continue;
        }
        const sent = await sendReminderNow(p, { title: split.title, description: split.description });
        logEvent(
          sent ? 'splitReminders.sent' : 'splitReminders.failed',
          `split ${split.id} participant ${p.id}`,
        );
      }
    }
  } catch (e) {
    logEvent('splitReminders.checkFailed', e instanceof Error ? e.message : String(e));
    // Silent to the user — this runs on every app open and must never block startup.
  }
}
