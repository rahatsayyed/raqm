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
 * Common case is a true single-line append via `File.write(line, { append: true })`
 * — no read of the existing file. Only when the file is already over the
 * MAX_BYTES cap do we pay for a full read + trim-oldest-half + overwrite, which
 * also resets the file below the cap so subsequent calls go back to the cheap
 * append path. `file.size` is real bytes (not JS string `.length`, which counts
 * UTF-16 code units), so the cap check is accurate for non-ASCII content too.
 */
export function logEvent(tag: string, message?: string): void {
  try {
    const file = logFile();
    const safeTag = tag.replace(/\t/g, ' ').replace(/\n/g, ' ');
    const safeMessage = (message ?? '').replace(/\t/g, ' ').replace(/\n/g, ' ');
    const line = `${isoNow()}\t${safeTag}\t${safeMessage}\n`;

    if (file.exists && file.size > MAX_BYTES) {
      const lines = file.textSync().split('\n');
      file.write(lines.slice(Math.floor(lines.length / 2)).join('\n'));
    }
    file.write(line, { append: true });
  } catch {
    // Swallow — logging must never crash the caller.
  }
}
