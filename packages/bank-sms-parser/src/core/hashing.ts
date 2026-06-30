/**
 * Pure TypeScript MD5 implementation.
 * Produces the same hex digest as Java's MessageDigest("MD5").
 */

// MD5 constants (precomputed from sin): T[i] = floor(abs(sin(i+1)) * 2^32)
const T: number[] = (() => {
  const t: number[] = new Array(64);
  for (let i = 0; i < 64; i++) {
    t[i] = (Math.abs(Math.sin(i + 1)) * 0x100000000) >>> 0;
  }
  return t;
})();

function safeAdd(x: number, y: number): number {
  const lsw = (x & 0xffff) + (y & 0xffff);
  const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xffff);
}

function bitRotateLeft(num: number, cnt: number): number {
  return (num << cnt) | (num >>> (32 - cnt));
}

function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
  return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
}

function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5cmn((b & c) | (~b & d), a, b, x, s, t);
}

function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
}

function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5cmn(b ^ c ^ d, a, b, x, s, t);
}

function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number): number {
  return md5cmn(c ^ (b | ~d), a, b, x, s, t);
}

function md5blks(str: string): number[] {
  // Pad the string to a multiple of 64 bytes, append length in bits
  const nblk = ((str.length + 8) >> 6) + 1;
  const blks: number[] = new Array(nblk * 16).fill(0);
  for (let i = 0; i < str.length; i++) {
    blks[i >> 2] |= str.charCodeAt(i) << ((i % 4) * 8);
  }
  blks[str.length >> 2] |= 0x80 << ((str.length % 4) * 8);
  blks[nblk * 16 - 2] = str.length * 8;
  return blks;
}

function md5core(x: number[]): number[] {
  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let i = 0; i < x.length; i += 16) {
    const olda = a;
    const oldb = b;
    const oldc = c;
    const oldd = d;

    // Round 1
    a = md5ff(a, b, c, d, x[i + 0], 7, T[0]);
    d = md5ff(d, a, b, c, x[i + 1], 12, T[1]);
    c = md5ff(c, d, a, b, x[i + 2], 17, T[2]);
    b = md5ff(b, c, d, a, x[i + 3], 22, T[3]);
    a = md5ff(a, b, c, d, x[i + 4], 7, T[4]);
    d = md5ff(d, a, b, c, x[i + 5], 12, T[5]);
    c = md5ff(c, d, a, b, x[i + 6], 17, T[6]);
    b = md5ff(b, c, d, a, x[i + 7], 22, T[7]);
    a = md5ff(a, b, c, d, x[i + 8], 7, T[8]);
    d = md5ff(d, a, b, c, x[i + 9], 12, T[9]);
    c = md5ff(c, d, a, b, x[i + 10], 17, T[10]);
    b = md5ff(b, c, d, a, x[i + 11], 22, T[11]);
    a = md5ff(a, b, c, d, x[i + 12], 7, T[12]);
    d = md5ff(d, a, b, c, x[i + 13], 12, T[13]);
    c = md5ff(c, d, a, b, x[i + 14], 17, T[14]);
    b = md5ff(b, c, d, a, x[i + 15], 22, T[15]);

    // Round 2
    a = md5gg(a, b, c, d, x[i + 1], 5, T[16]);
    d = md5gg(d, a, b, c, x[i + 6], 9, T[17]);
    c = md5gg(c, d, a, b, x[i + 11], 14, T[18]);
    b = md5gg(b, c, d, a, x[i + 0], 20, T[19]);
    a = md5gg(a, b, c, d, x[i + 5], 5, T[20]);
    d = md5gg(d, a, b, c, x[i + 10], 9, T[21]);
    c = md5gg(c, d, a, b, x[i + 15], 14, T[22]);
    b = md5gg(b, c, d, a, x[i + 4], 20, T[23]);
    a = md5gg(a, b, c, d, x[i + 9], 5, T[24]);
    d = md5gg(d, a, b, c, x[i + 14], 9, T[25]);
    c = md5gg(c, d, a, b, x[i + 3], 14, T[26]);
    b = md5gg(b, c, d, a, x[i + 8], 20, T[27]);
    a = md5gg(a, b, c, d, x[i + 13], 5, T[28]);
    d = md5gg(d, a, b, c, x[i + 2], 9, T[29]);
    c = md5gg(c, d, a, b, x[i + 7], 14, T[30]);
    b = md5gg(b, c, d, a, x[i + 12], 20, T[31]);

    // Round 3
    a = md5hh(a, b, c, d, x[i + 5], 4, T[32]);
    d = md5hh(d, a, b, c, x[i + 8], 11, T[33]);
    c = md5hh(c, d, a, b, x[i + 11], 16, T[34]);
    b = md5hh(b, c, d, a, x[i + 14], 23, T[35]);
    a = md5hh(a, b, c, d, x[i + 1], 4, T[36]);
    d = md5hh(d, a, b, c, x[i + 4], 11, T[37]);
    c = md5hh(c, d, a, b, x[i + 7], 16, T[38]);
    b = md5hh(b, c, d, a, x[i + 10], 23, T[39]);
    a = md5hh(a, b, c, d, x[i + 13], 4, T[40]);
    d = md5hh(d, a, b, c, x[i + 0], 11, T[41]);
    c = md5hh(c, d, a, b, x[i + 3], 16, T[42]);
    b = md5hh(b, c, d, a, x[i + 6], 23, T[43]);
    a = md5hh(a, b, c, d, x[i + 9], 4, T[44]);
    d = md5hh(d, a, b, c, x[i + 12], 11, T[45]);
    c = md5hh(c, d, a, b, x[i + 15], 16, T[46]);
    b = md5hh(b, c, d, a, x[i + 2], 23, T[47]);

    // Round 4
    a = md5ii(a, b, c, d, x[i + 0], 6, T[48]);
    d = md5ii(d, a, b, c, x[i + 7], 10, T[49]);
    c = md5ii(c, d, a, b, x[i + 14], 15, T[50]);
    b = md5ii(b, c, d, a, x[i + 5], 21, T[51]);
    a = md5ii(a, b, c, d, x[i + 12], 6, T[52]);
    d = md5ii(d, a, b, c, x[i + 3], 10, T[53]);
    c = md5ii(c, d, a, b, x[i + 10], 15, T[54]);
    b = md5ii(b, c, d, a, x[i + 1], 21, T[55]);
    a = md5ii(a, b, c, d, x[i + 8], 6, T[56]);
    d = md5ii(d, a, b, c, x[i + 15], 10, T[57]);
    c = md5ii(c, d, a, b, x[i + 6], 15, T[58]);
    b = md5ii(b, c, d, a, x[i + 13], 21, T[59]);
    a = md5ii(a, b, c, d, x[i + 4], 6, T[60]);
    d = md5ii(d, a, b, c, x[i + 11], 10, T[61]);
    c = md5ii(c, d, a, b, x[i + 2], 15, T[62]);
    b = md5ii(b, c, d, a, x[i + 9], 21, T[63]);

    a = safeAdd(a, olda);
    b = safeAdd(b, oldb);
    c = safeAdd(c, oldc);
    d = safeAdd(d, oldd);
  }
  return [a, b, c, d];
}

function rhex(n: number): string {
  let s = '';
  for (let j = 0; j < 4; j++) {
    s += ('0' + ((n >> (j * 8)) & 0xff).toString(16)).slice(-2);
  }
  return s;
}

/**
 * Computes the MD5 hex digest of a UTF-8 string.
 * Equivalent to Java's MessageDigest.getInstance("MD5") hex output.
 */
export function md5Hex(input: string): string {
  const state = md5core(md5blks(input));
  return state.map(rhex).join('');
}
