import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

beforeAll(() => {
  process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
});

import { AuctionStateMachine } from '../auction/stateMachine.js';
import { bidQueue } from '../auction/bidQueue.js';

// Mock syncToDb to avoid actual DB calls
vi.spyOn(AuctionStateMachine.prototype, 'syncToDb').mockResolvedValue();

describe('Force Accept Bid — state machine integration', () => {
  let sm: AuctionStateMachine;

  beforeEach(() => {
    sm = new AuctionStateMachine();
    sm.phase = 'bidding_open';
    sm.currentPlayer = { id: 'p1', name: 'Test Player' } as any;
    sm.currentHighestBid = 0;
    sm.currentHighestBidderTeamId = null;
    bidQueue.clearQueue();
  });

  it('forced bid uses acceptBid and updates state correctly', async () => {
    await sm.acceptBid('team-1', 15000);
    expect(sm.currentHighestBid).toBe(15000);
    expect(sm.currentHighestBidderTeamId).toBe('team-1');
    expect(sm.phase).toBe('bidding_open');
  });

  it('forced bid works during bidding_closed phase', async () => {
    sm.phase = 'bidding_closed';
    await sm.acceptBid('team-1', 15000);
    expect(sm.currentHighestBid).toBe(15000);
    expect(sm.currentHighestBidderTeamId).toBe('team-1');
  });

  it('forced bid clears lower proposals from queue', () => {
    bidQueue.addProposal('team-a', 'Team A', 5000);
    bidQueue.addProposal('team-b', 'Team B', 10000);
    bidQueue.addProposal('team-c', 'Team C', 20000);

    // Simulate forced bid at 15000 — should clear proposals <= 15000
    bidQueue.clearLowerProposals(15000);
    const remaining = bidQueue.getProposals();
    expect(remaining.length).toBe(1);
    expect(remaining[0].teamId).toBe('team-c');
    expect(remaining[0].bidAmount).toBe(20000);
  });

  it('forced bid replaces previous highest bidder', async () => {
    await sm.acceptBid('team-1', 10000);
    expect(sm.currentHighestBidderTeamId).toBe('team-1');

    await sm.acceptBid('team-2', 20000);
    expect(sm.currentHighestBidderTeamId).toBe('team-2');
    expect(sm.currentHighestBid).toBe(20000);
  });

  it('rejects forced bid during idle phase (via state machine)', async () => {
    sm.phase = 'idle';
    await expect(sm.acceptBid('team-1', 15000)).rejects.toThrow();
  });

  it('rejects forced bid during player_presented phase', async () => {
    sm.phase = 'player_presented';
    await expect(sm.acceptBid('team-1', 15000)).rejects.toThrow();
  });
});

describe('Force Accept Bid — constraint rejection', () => {
  let sm: AuctionStateMachine;

  beforeEach(() => {
    sm = new AuctionStateMachine();
    sm.phase = 'bidding_open';
    sm.currentPlayer = { id: 'p1', name: 'Test Player' } as any;
    sm.currentHighestBid = 0;
    sm.currentHighestBidderTeamId = null;
  });

  it('rejects forced bid that is not greater than current highest', async () => {
    sm.currentHighestBid = 20000;
    await expect(sm.acceptBid('team-1', 15000)).rejects.toThrow(/must exceed/);
  });
});
