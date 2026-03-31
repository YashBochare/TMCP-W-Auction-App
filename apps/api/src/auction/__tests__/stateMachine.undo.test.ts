import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

beforeAll(() => {
  process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
});

import { AuctionStateMachine } from '../stateMachine.js';

// Mock syncToDb and Prisma calls
vi.spyOn(AuctionStateMachine.prototype, 'syncToDb').mockResolvedValue();

const mockPrisma = {
  player: {
    update: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn().mockResolvedValue({ id: 'p1', name: 'Test Player', status: 'PENDING' }),
    findFirst: vi.fn().mockResolvedValue({ id: 'p1', name: 'Test Player', status: 'PENDING', basePrice: 5000 }),
  },
  team: {
    update: vi.fn().mockResolvedValue({}),
    findUnique: vi.fn().mockResolvedValue({ id: 't1', name: 'Team Alpha', purse: 100000 }),
  },
  auctionState: {
    findFirst: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
  },
  $transaction: vi.fn().mockImplementation(async (fn: any) => fn(mockPrisma)),
};

vi.mock('../../lib/prisma.js', () => ({
  getPrisma: () => mockPrisma,
}));

describe('AuctionStateMachine.undo', () => {
  let sm: AuctionStateMachine;

  beforeEach(() => {
    sm = new AuctionStateMachine();
    vi.clearAllMocks();
  });

  it('throws if no undo history', async () => {
    await expect(sm.undo()).rejects.toThrow('No recent action to undo');
  });

  it('hasUndoHistory is false initially', () => {
    expect(sm.getState().hasUndoHistory).toBe(false);
  });

  describe('undo SOLD', () => {
    beforeEach(async () => {
      // Setup: player presented, bidding open, bid accepted
      sm.phase = 'bidding_open';
      sm.currentPlayer = { id: 'p1', name: 'Test Player' } as any;
      sm.currentHighestBid = 10000;
      sm.currentHighestBidderTeamId = 't1';

      // sell() will snapshot and mutate
      await sm.sell('t1');
    });

    it('captures undo history after sell', () => {
      // After sell, state is idle but undo history exists
      expect(sm.phase).toBe('idle');
      expect(sm.currentPlayer).toBeNull();
      expect(sm.getState().hasUndoHistory).toBe(true);
    });

    it('undo restores player, phase, and bid state', async () => {
      await sm.undo();

      expect(sm.currentPlayer).toBeTruthy();
      expect(sm.currentPlayer?.id).toBe('p1');
      expect(sm.currentHighestBid).toBe(10000);
      expect(sm.currentHighestBidderTeamId).toBe('t1');
      // Phase restored to what it was before sell (bidding_open)
      expect(sm.phase).toBe('bidding_open');
    });

    it('undo calls Prisma $transaction to revert DB', async () => {
      await sm.undo();

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(2); // 1 for sell, 1 for undo
      expect(mockPrisma.player.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: 'PENDING', teamId: null, soldPrice: null },
      });
      expect(mockPrisma.team.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { purse: { increment: 10000 } },
      });
    });

    it('clears undo history after undo', async () => {
      await sm.undo();
      expect(sm.getState().hasUndoHistory).toBe(false);
      await expect(sm.undo()).rejects.toThrow('No recent action to undo');
    });
  });

  describe('undo UNSOLD', () => {
    beforeEach(async () => {
      sm.phase = 'bidding_closed';
      sm.currentPlayer = { id: 'p1', name: 'Test Player' } as any;
      sm.currentHighestBid = 5000;
      sm.currentHighestBidderTeamId = 't1';

      await sm.markUnsold();
    });

    it('captures undo history after markUnsold', () => {
      expect(sm.phase).toBe('idle');
      expect(sm.getState().hasUndoHistory).toBe(true);
    });

    it('undo restores player to PENDING and restores state', async () => {
      await sm.undo();

      expect(sm.currentPlayer).toBeTruthy();
      expect(sm.phase).toBe('bidding_closed');
      expect(sm.currentHighestBid).toBe(5000);
      expect(sm.currentHighestBidderTeamId).toBe('t1');
    });

    it('undo calls Prisma to set player PENDING', async () => {
      await sm.undo();

      // player.update called for markUnsold (UNSOLD) and undo (PENDING)
      const pendingCall = mockPrisma.player.update.mock.calls.find(
        (c: any) => c[0].data.status === 'PENDING'
      );
      expect(pendingCall).toBeTruthy();
    });
  });

  describe('undo BID_ACCEPTED', () => {
    beforeEach(async () => {
      sm.phase = 'bidding_open';
      sm.currentPlayer = { id: 'p1', name: 'Test Player' } as any;
      sm.currentHighestBid = 5000;
      sm.currentHighestBidderTeamId = 't1';

      await sm.acceptBid('t2', 8000);
    });

    it('captures undo history after acceptBid', () => {
      expect(sm.currentHighestBid).toBe(8000);
      expect(sm.currentHighestBidderTeamId).toBe('t2');
      expect(sm.getState().hasUndoHistory).toBe(true);
    });

    it('undo reverts to previous bid and team', async () => {
      await sm.undo();

      expect(sm.currentHighestBid).toBe(5000);
      expect(sm.currentHighestBidderTeamId).toBe('t1');
      expect(sm.phase).toBe('bidding_open'); // unchanged
    });

    it('clears undo history after undo', async () => {
      await sm.undo();
      expect(sm.getState().hasUndoHistory).toBe(false);
    });
  });

  describe('nextPlayer clears undo history', () => {
    it('clears lastAction when nextPlayer is called', async () => {
      sm.phase = 'bidding_open';
      sm.currentPlayer = { id: 'p1', name: 'Test Player' } as any;
      sm.currentHighestBid = 5000;
      sm.currentHighestBidderTeamId = 't1';

      await sm.acceptBid('t2', 8000);
      expect(sm.getState().hasUndoHistory).toBe(true);

      // Move to idle first so nextPlayer transition is valid
      sm.phase = 'idle';
      sm.currentPlayer = null;
      await sm.nextPlayer();

      expect(sm.getState().hasUndoHistory).toBe(false);
    });
  });
});
