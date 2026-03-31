import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

beforeAll(() => {
  process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
});

import { AuctionStateMachine } from '../stateMachine.js';

// Mock syncToDb to avoid actual DB calls
vi.spyOn(AuctionStateMachine.prototype, 'syncToDb').mockResolvedValue();

describe('AuctionStateMachine.acceptBid', () => {
  let sm: AuctionStateMachine;

  beforeEach(() => {
    sm = new AuctionStateMachine();
    // Simulate player_presented -> bidding_open
    sm.phase = 'bidding_open';
    sm.currentPlayer = { id: 'p1', name: 'Test Player' } as any;
    sm.currentHighestBid = 0;
    sm.currentHighestBidderTeamId = null;
  });

  it('accepts bid during bidding_open — updates highest bid, keeps phase', async () => {
    await sm.acceptBid('t1', 10000);
    expect(sm.currentHighestBid).toBe(10000);
    expect(sm.currentHighestBidderTeamId).toBe('t1');
    expect(sm.phase).toBe('bidding_open');
  });

  it('accepts bid during bidding_closed', async () => {
    sm.phase = 'bidding_closed';
    await sm.acceptBid('t1', 10000);
    expect(sm.currentHighestBid).toBe(10000);
    expect(sm.phase).toBe('bidding_closed');
  });

  it('accepts higher bid after previous accept', async () => {
    await sm.acceptBid('t1', 10000);
    await sm.acceptBid('t2', 20000);
    expect(sm.currentHighestBid).toBe(20000);
    expect(sm.currentHighestBidderTeamId).toBe('t2');
  });

  it('stores lastAcceptedBid for undo', async () => {
    await sm.acceptBid('t1', 10000);
    await sm.acceptBid('t2', 20000);
    expect(sm.lastAcceptedBid).toEqual({
      teamId: 't2',
      bidAmount: 20000,
      previousHighestBid: 10000,
      previousHighestBidderTeamId: 't1',
    });
  });

  it('rejects bid during idle', async () => {
    sm.phase = 'idle';
    await expect(sm.acceptBid('t1', 10000)).rejects.toThrow(/idle phase/);
  });

  it('rejects bid during player_presented', async () => {
    sm.phase = 'player_presented';
    await expect(sm.acceptBid('t1', 10000)).rejects.toThrow(/player_presented phase/);
  });

  it('rejects bid <= current highest', async () => {
    sm.currentHighestBid = 15000;
    await expect(sm.acceptBid('t1', 10000)).rejects.toThrow(/must exceed/);
  });

  it('rejects bid with no current player', async () => {
    sm.currentPlayer = null;
    await expect(sm.acceptBid('t1', 10000)).rejects.toThrow(/no current player/);
  });

  it('getState() returns updated bid after accept', async () => {
    await sm.acceptBid('t1', 10000);
    const state = sm.getState();
    expect(state.currentHighestBid).toBe(10000);
    expect(state.currentHighestBidderTeamId).toBe('t1');
  });
});
