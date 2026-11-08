const VERSION = 1;
const MAX_LEN = 4000;

function toB64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => {
    bin += String.fromCharCode(b);
  });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64Url(s: string): string {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Encode a calculator state as a URL hash fragment (never sent to a server). */
export function encodeShare(state: unknown): string {
  return `#s=${toB64Url(JSON.stringify({ v: VERSION, d: state }))}`;
}

/** Decode a hash fragment; null on any problem. Callers must still validate the shape. */
export function decodeShare(hash: string): unknown | null {
  const m = /^#s=([A-Za-z0-9_-]+)$/.exec(hash);
  if (!m || m[1].length > MAX_LEN) return null;
  try {
    const parsed = JSON.parse(fromB64Url(m[1])) as { v?: number; d?: unknown };
    return parsed.v === VERSION ? (parsed.d ?? null) : null;
  } catch {
    return null;
  }
}

/** Small validators used by each calculator's state check. */
export const isObj = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

export const str = (x: unknown, max = 24): string | null =>
  typeof x === 'string' && x.length <= max ? x.replace(/[\u0000-\u001f]/g, '') : null;

export const oneOf = <T extends string>(x: unknown, allowed: readonly T[]): T | null =>
  typeof x === 'string' && (allowed as readonly string[]).includes(x) ? (x as T) : null;
