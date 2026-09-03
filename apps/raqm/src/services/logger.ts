import { File, Paths } from 'expo-file-system';

export const JS_LOG_FILENAME = 'js.log';
const MAX_BYTES = 3 * 1024 * 1024; // 3 MB

function logFile(): File {
  return new File(Paths.document, JS_LOG_FILENAME);
}

function isoNow(): string {
  return new Date().toISOString();
}

/**
 * Appends one line to js.log. Fire-and-forget, never throws, never blocks the
 * caller — a logging failure must never break the feature it's observing (same
 * invariant as NotificationListenerService must never throw, see CLAUDE.md).
 * Read-modify-write, not true append: expo-file-system SDK 56's `File.write()`
 * does support an `{ append: true }` option, but we still need the full existing
 * text up front to enforce the MAX_BYTES cap (trim oldest half when exceeded),
 * so a plain read-modify-overwrite is used here (see Task 3 Step 1 research).
 */
export function logEvent(tag: string, message?: string): void {
  try {
    const file = logFile();
    const safeTag = tag.replace(/\t/g, ' ').replace(/\n/g, ' ');
    const safeMessage = (message ?? '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    const line = `${isoNow()}\t${safeTag}\t${safeMessage}\n`;

    let existing = '';
    if (file.exists) {
      existing = file.textSync();
      if (existing.length > MAX_BYTES) {
        const lines = existing.split('\n');
        existing = lines.slice(Math.floor(lines.length / 2)).join('\n');
      }
    }
    file.write(existing + line);
  } catch {
    // Swallow — logging must never crash the caller.
  }
}
