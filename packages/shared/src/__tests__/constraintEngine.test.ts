import { describe, it, expect } from 'vitest';
import { calculateMaxBid, canTeamBid, validateBid } from '../constraintEngine.js';

describe('calculateMaxBid', () => {
  const MIN = 3000;
  const MAX_SQUAD = 7;

  it('100k purse, 0 players → 82,000', () => {
    expect(calculateMaxBid(100000, 0, MIN, MAX_SQUAD)).toBe(82000);
  });

  it('100k purse, 3 players → 91,000', () => {
    expect(calculateMaxBid(100000, 3, MIN, MAX_SQUAD)).toBe(91000);
  });

  it('100k purse, 6 players (last slot) → 100,000', () => {
    expect(calculateMaxBid(100000, 6, MIN, MAX_SQUAD)).toBe(100000);
  });

  it('full squad (7 players) → 0', () => {
    expect(calculateMaxBid(100000, 7, MIN, MAX_SQUAD)).toBe(0);
  });

  it('purse < minBasePrice → 0', () => {
    expect(calculateMaxBid(2000, 0, MIN, MAX_SQUAD)).toBe(0);
  });

  it('purse = 0 → 0', () => {
    expect(calculateMaxBid(0, 0, MIN, MAX_SQUAD)).toBe(0);
  });

  it('negative purse → 0', () => {
    expect(calculateMaxBid(-1000, 0, MIN, MAX_SQUAD)).toBe(0);
  });

  it('exactly enough for remaining slots → minBasePrice', () => {
    // 6 players, need 1 more. Purse = 3000. Max bid = 3000 - 0 = 3000
    expect(calculateMaxBid(3000, 6, MIN, MAX_SQUAD)).toBe(3000);
  });

  it('1 player, 20k purse → 5,000', () => {
    expect(calculateMaxBid(20000, 1, MIN, MAX_SQUAD)).toBe(5000);
  });

  // Config variations
  it('different minBasePrice (5000)', () => {
    expect(calculateMaxBid(100000, 0, 5000, 7)).toBe(70000);
  });

  it('different maxSquadSize (5)', () => {
    expect(calculateMaxBid(100000, 0, 3000, 5)).toBe(88000);
  });

  it('different startingPurse (50000)', () => {
    expect(calculateMaxBid(50000, 0, 3000, 7)).toBe(32000);
  });
});

describe('canTeamBid', () => {
  it('returns true when team has budget', () => {
    expect(canTeamBid(100000, 0, 3000, 7)).toBe(true);
  });

  it('returns false for full squad', () => {
    expect(canTeamBid(100000, 7, 3000, 7)).toBe(false);
  });

  it('returns false when purse too low', () => {
    expect(canTeamBid(0, 0, 3000, 7)).toBe(false);
  });
});

describe('validateBid', () => {
  const PURSE = 100000;
  const SQUAD = 0;
  const MIN = 3000;
  const MAX_SQUAD = 7;
  const CURRENT_BID = 5000;

  it('valid bid → { valid: true }', () => {
    expect(validateBid(10000, PURSE, SQUAD, MIN, MAX_SQUAD, CURRENT_BID)).toEqual({ valid: true });
  });

  it('bid exceeds max allowed', () => {
    const result = validateBid(90000, PURSE, SQUAD, MIN, MAX_SQUAD, CURRENT_BID);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('maximum allowed bid');
  });

  it('bid not higher than current', () => {
    const result = validateBid(4000, PURSE, SQUAD, MIN, MAX_SQUAD, CURRENT_BID);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('current highest bid');
  });

  it('squad full', () => {
    const result = validateBid(10000, PURSE, 7, MIN, MAX_SQUAD, CURRENT_BID);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('maximum players');
  });

  it('bid below min base price', () => {
    const result = validateBid(2000, PURSE, SQUAD, MIN, MAX_SQUAD, 0);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('at least');
  });

  it('bid exceeds purse', () => {
    const result = validateBid(200000, PURSE, SQUAD, MIN, MAX_SQUAD, CURRENT_BID);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('purse');
  });

  it('non-number bid', () => {
    const result = validateBid(NaN, PURSE, SQUAD, MIN, MAX_SQUAD, CURRENT_BID);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('positive integer');
  });

  it('zero bid', () => {
    const result = validateBid(0, PURSE, SQUAD, MIN, MAX_SQUAD, CURRENT_BID);
    expect(result.valid).toBe(false);
  });

  it('negative bid', () => {
    const result = validateBid(-100, PURSE, SQUAD, MIN, MAX_SQUAD, CURRENT_BID);
    expect(result.valid).toBe(false);
  });

  it('first bid (currentHighestBid = 0) only needs to meet minBasePrice', () => {
    expect(validateBid(3000, PURSE, SQUAD, MIN, MAX_SQUAD, 0)).toEqual({ valid: true });
  });
});
