import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SmsReader } from '../native/SmsReader';
import { JS_LOG_FILENAME } from './logger';

interface LogLine {
  ts: number;
  raw: string;
}

function parseLines(text: string): LogLine[] {
  return text
    .split('\n')
    .filter((line) => line.trim().length > 0)
    .map((line) => {
      const tabIndex = line.indexOf('\t');
      const tsStr = tabIndex === -1 ? line : line.slice(0, tabIndex);
      const ts = Date.parse(tsStr);
      return { ts: Number.isNaN(ts) ? 0 : ts, raw: line };
    });
}

/**
 * Reads a log file given a `File` instance already pointing at it. Missing/unreadable files are
 * treated as empty text, never thrown — a diagnostic export must never crash the caller over a
 * missing log (same invariant as logger.ts's own read-modify-write never throwing).
 */
async function readLogFile(file: File): Promise<string> {
  try {
    if (!file.exists) return '';
    return file.textSync();
  } catch {
    return ''; // missing/unreadable file = treated as empty, not an error
  }
}

/**
 * `expo-file-system` SDK 56's `File` constructor does NOT accept a raw absolute path string
 * (e.g. `/data/user/0/pkg/files/native.log`, as returned by `SmsReader.getNativeLogPath()`).
 * Per its source (`node_modules/expo-file-system/src/File.ts`), the constructor joins its
 * `(string | File | Directory)[]` args and expects any string segment to be a `file:///` URI —
 * a bare path with no scheme resolves (natively, on Android) to `File(URI.create(uri))`, and
 * `java.io.File`'s URI constructor throws `IllegalArgumentException` for a non-absolute
 * (schemeless) URI. Wrapping the raw path as a `file://` URI string fixes this.
 */
function fileFromAbsolutePath(absolutePath: string): File {
  return new File(`file://${absolutePath}`);
}

// Android's share sheet rejects a second shareAsync call while one is still open (rapid
// double-tap on the row) with "another share request is being processed now". Serialize
// through one in-flight promise, same pattern as rescan.ts, so a second call joins the first
// instead of firing a second native share intent.
let inFlight: Promise<void> | null = null;

/** E-diagnostic-1 — filters both logs to the last `rangeHours`, merges, shares as one file. */
export function shareDiagnosticLogs(rangeHours: number): Promise<void> {
  if (inFlight) return inFlight;
  inFlight = doShareDiagnosticLogs(rangeHours).finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function doShareDiagnosticLogs(rangeHours: number): Promise<void> {
  const nativeLogPath = await SmsReader.getNativeLogPath();
  const nativeLogFile = nativeLogPath ? fileFromAbsolutePath(nativeLogPath) : null;
  const jsLogFile = new File(Paths.document, JS_LOG_FILENAME);

  const [nativeText, jsText] = await Promise.all([
    nativeLogFile ? readLogFile(nativeLogFile) : Promise.resolve(''),
    readLogFile(jsLogFile),
  ]);

  const cutoff = Date.now() - rangeHours * 60 * 60 * 1000;
  const combined = [...parseLines(nativeText), ...parseLines(jsText)]
    .filter((l) => l.ts >= cutoff)
    .sort((a, b) => a.ts - b.ts)
    .map((l) => l.raw)
    .join('\n');

  const outFile = new File(Paths.cache, `raqm-diagnostics-${rangeHours}h-${Date.now()}.txt`);
  outFile.write(combined || 'No log entries in this time range.');

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(outFile.uri, { mimeType: 'text/plain', dialogTitle: 'Export diagnostic logs' });
  }
}
