import { describe, expect, it } from 'vitest';
import { formatCompact, formatRupees, groupRupeeText, parseNumber, parseRupees } from './money';
import { decodeShare, encodeShare } from './share';

describe('parseRupees', () => {
  it('parses plain, grouped and decimal text to paise', () => {
    expect(parseRupees('1,50,000')).toBe(15_000_000);
    expect(parseRupees('₹ 12.5')).toBe(1250);
    expect(parseRupees('0.07')).toBe(7);
    expect(parseRupees('10.999')).toBe(1099);
  });
  it('rejects junk, negatives and overflow', () => {
    expect(parseRupees('')).toBeNull();
    expect(parseRupees('-5')).toBeNull();
    expect(parseRupees('abc')).toBeNull();
    expect(parseRupees('.')).toBeNull();
    expect(parseRupees('99999999999999')).toBeNull();
  });
});

describe('parseNumber', () => {
  it('parses decimals and rejects junk', () => {
    expect(parseNumber('8.5')).toBe(8.5);
    expect(parseNumber('0')).toBe(0);
    expect(parseNumber('x')).toBeNull();
    expect(parseNumber('')).toBeNull();
  });
});

describe('formatting', () => {
  it('uses Indian grouping', () => {
    expect(formatRupees(123_456_700)).toMatch(/12,34,567/);
    expect(formatRupees(867_823, 2)).toMatch(/8,678\.23/);
  });
  it('compacts to K, L and Cr', () => {
    expect(formatCompact(150_000_00)).toBe('₹1.5 L');
    expect(formatCompact(2_500_000_000)).toBe('₹2.5 Cr');
    expect(formatCompact(100_000_000_000)).toBe('₹100 Cr');
    expect(formatCompact(5_000_00)).toBe('₹5K');
  });
  it('groups typed text', () => {
    expect(groupRupeeText('1000000')).toBe('10,00,000');
    expect(groupRupeeText('1234.5')).toBe('1,234.5');
    expect(groupRupeeText('')).toBe('');
  });
});

describe('share hash', () => {
  it('round trips unicode state', () => {
    const state = { name: 'Aarav & Zoë', n: [1, 2] };
    expect(decodeShare(encodeShare(state))).toEqual(state);
  });
  it('rejects garbage and wrong versions', () => {
    expect(decodeShare('#s=!!!')).toBeNull();
    expect(decodeShare('#other')).toBeNull();
    const bad = '#s=' + btoa(JSON.stringify({ v: 9, d: {} }));
    expect(decodeShare(bad)).toBeNull();
  });
});
