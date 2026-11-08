import { describe, expect, it } from 'vitest';
import { percentOf, splitBill, splitEven, splitProportional } from './splitBill';

describe('splitEven', () => {
  it('gives the extra paise to the first people and sums exactly', () => {
    expect(splitEven(1000, 3)).toEqual([334, 333, 333]);
    expect(splitEven(7, 7)).toEqual([1, 1, 1, 1, 1, 1, 1]);
  });
  it('handles zero people', () => {
    expect(splitEven(100, 0)).toEqual([]);
  });
});

describe('splitProportional', () => {
  it('sums exactly with largest remainders', () => {
    const parts = splitProportional(100, [1, 1, 1]);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(100);
    expect(parts).toEqual([34, 33, 33]);
  });
  it('falls back to even when all weights are zero', () => {
    expect(splitProportional(10, [0, 0])).toEqual([5, 5]);
  });
  it('is proportional', () => {
    expect(splitProportional(1000, [1, 3])).toEqual([250, 750]);
  });
});

describe('percentOf', () => {
  it('rounds half up in basis points', () => {
    expect(percentOf(10_000, 1000)).toBe(1000);
    expect(percentOf(1, 5000)).toBe(1);
    expect(percentOf(0, 1000)).toBe(0);
  });
});

describe('splitBill', () => {
  it('splits shared and solo items, tip follows items, extras are even', () => {
    const r = splitBill({
      items: [
        { price: 60_000, qty: 1, people: [0, 1, 2] },
        { price: 30_000, qty: 2, people: [0] },
      ],
      peopleCount: 3,
      tipBps: 1000,
      extras: 9_000,
    });
    expect(r.subtotal).toBe(120_000);
    expect(r.tip).toBe(12_000);
    expect(r.total).toBe(141_000);
    expect(r.shares.reduce((a, s) => a + s.total, 0)).toBe(r.total);
    expect(r.shares[0].items).toBe(80_000);
    expect(r.shares[1].items).toBe(20_000);
  });

  it('treats an item with nobody ticked as shared by everyone', () => {
    const r = splitBill({ items: [{ price: 300, qty: 1, people: [] }], peopleCount: 3, tipBps: 0, extras: 0 });
    expect(r.shares.map((s) => s.total)).toEqual([100, 100, 100]);
  });

  it('ignores out of range people', () => {
    const r = splitBill({ items: [{ price: 100, qty: 1, people: [0, 9] }], peopleCount: 2, tipBps: 0, extras: 0 });
    expect(r.shares.map((s) => s.total)).toEqual([100, 0]);
  });
});
