import { describe, it, expect } from 'vitest';
import { getNextBid, getBidIncrement } from '../bidIncrement.js';

describe('getBidIncrement', () => {
  it('returns 500 below 10k', () => {
    expect(getBidIncrement(0)).toBe(500);
    expect(getBidIncrement(5000)).toBe(500);
    expect(getBidIncrement(9500)).toBe(500);
    expect(getBidIncrement(9999)).toBe(500);
  });

  it('returns 1000 at 10k-20k', () => {
    expect(getBidIncrement(10000)).toBe(1000);
    expect(getBidIncrement(15000)).toBe(1000);
    expect(getBidIncrement(19000)).toBe(1000);
    expect(getBidIncrement(19999)).toBe(1000);
  });

  it('returns 2000 above 20k', () => {
    expect(getBidIncrement(20000)).toBe(2000);
    expect(getBidIncrement(50000)).toBe(2000);
    expect(getBidIncrement(100000)).toBe(2000);
  });
});

describe('getNextBid', () => {
  it('returns base price as first bid', () => {
    expect(getNextBid(0, 3000)).toBe(3000);
    expect(getNextBid(0, 5000)).toBe(5000);
    expect(getNextBid(0, 10000)).toBe(10000);
  });

  it('increments by 500 below 10k', () => {
    expect(getNextBid(3000, 3000)).toBe(3500);
    expect(getNextBid(9500, 3000)).toBe(10000);
  });

  it('increments by 1000 at 10k-20k', () => {
    expect(getNextBid(10000, 3000)).toBe(11000);
    expect(getNextBid(19000, 3000)).toBe(20000);
  });

  it('increments by 2000 above 20k', () => {
    expect(getNextBid(20000, 3000)).toBe(22000);
    expect(getNextBid(50000, 3000)).toBe(52000);
  });

  it('handles tier boundary transitions', () => {
    // 9500 + 500 = 10000 (crosses into 10k tier)
    expect(getNextBid(9500, 3000)).toBe(10000);
    // 10000 + 1000 = 11000
    expect(getNextBid(10000, 3000)).toBe(11000);
    // 19000 + 1000 = 20000 (crosses into 20k tier)
    expect(getNextBid(19000, 3000)).toBe(20000);
    // 20000 + 2000 = 22000
    expect(getNextBid(20000, 3000)).toBe(22000);
  });
});
