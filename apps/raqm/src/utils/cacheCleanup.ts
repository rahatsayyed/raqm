import { Directory, Paths } from 'expo-file-system';

/**
 * Deletes files in Paths.cache whose name starts with `prefix` and are older than `maxAgeMs`.
 * Exported files (CSV/PDF/diagnostics) are written here and shared via the system share sheet;
 * deleting the just-written file right after shareAsync() resolves is unsafe on Android — the
 * receiving app may still be reading the content:// URI. Instead, each export call cleans up
 * its OWN previous exports on the way in, bounding cache growth without ever touching the file
 * currently being shared. Best-effort: a delete failure for one file must not block the rest.
 */
export function cleanupOldExports(prefix: string, maxAgeMs: number): void {
  try {
    const cutoff = Date.now() - maxAgeMs;
    for (const entry of new Directory(Paths.cache).list()) {
      if (!entry.name.startsWith(prefix)) continue;
      try {
        const modified = 'modificationTime' in entry ? entry.modificationTime : null;
        if (modified != null && modified < cutoff) entry.delete();
      } catch {
        // one stuck/locked file must not stop cleanup of the rest
      }
    }
  } catch {
    // Paths.cache itself unreadable — nothing to clean up, not worth surfacing
  }
}
