import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
  process.env.AUCTIONEER_PASSWORD = 'test-admin-pass';
  process.env.JWT_EXPIRY = '1h';
  process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
});

import express from 'express';
import auctionRoutes from '../routes/auction.routes.js';
import { stateMachine } from '../auction/stateMachine.js';

// Mock Prisma
const mockUpdateMany = vi.fn();
vi.mock('../lib/prisma.js', () => ({
  getPrisma: () => ({
    player: {
      updateMany: mockUpdateMany,
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    team: {
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
    },
    auctionState: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
  }),
}));

// Mock socket IO
vi.mock('../socket/index.js', () => ({
  getIo: () => ({
    emit: vi.fn(),
    to: () => ({ emit: vi.fn() }),
  }),
}));

// Mock auth middleware to allow AUCTIONEER through
vi.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (_req: any, _res: any, next: any) => {
    _req.user = { id: 'test-user', role: 'AUCTIONEER' };
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auction', auctionRoutes);
  return app;
}

describe('POST /api/auction/recall-unsold', () => {
  const app = createTestApp();

  async function post(path: string) {
    const { default: supertest } = await import('supertest');
    return (supertest as any)(app).post(path);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset state machine to idle
    stateMachine.phase = 'idle';
    stateMachine.currentPlayer = null;
    stateMachine.currentHighestBid = 0;
    stateMachine.currentHighestBidderTeamId = null;
  });

  it('recalls unsold players when auction is idle', async () => {
    mockUpdateMany.mockResolvedValue({ count: 3 });

    const res = await post('/api/auction/recall-unsold');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.recalledCount).toBe(3);

    expect(mockUpdateMany).toHaveBeenCalledWith({
      where: { status: 'UNSOLD' },
      data: { status: 'PENDING' },
    });
  });

  it('returns 404 when no unsold players exist', async () => {
    mockUpdateMany.mockResolvedValue({ count: 0 });

    const res = await post('/api/auction/recall-unsold');
    expect(res.status).toBe(404);
    expect(res.body.error.message).toContain('No unsold players');
  });

  it('rejects recall when auction is not idle (bidding_open)', async () => {
    stateMachine.phase = 'bidding_open';

    const res = await post('/api/auction/recall-unsold');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Cannot recall');
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects recall when auction is in player_presented phase', async () => {
    stateMachine.phase = 'player_presented';

    const res = await post('/api/auction/recall-unsold');
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('Cannot recall');
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('rejects recall when auction is in bidding_closed phase', async () => {
    stateMachine.phase = 'bidding_closed';

    const res = await post('/api/auction/recall-unsold');
    expect(res.status).toBe(400);
    expect(mockUpdateMany).not.toHaveBeenCalled();
  });

  it('only updates UNSOLD players, not SOLD', async () => {
    mockUpdateMany.mockResolvedValue({ count: 2 });

    await post('/api/auction/recall-unsold');

    // Verify the Prisma query strictly targets UNSOLD only
    expect(mockUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: 'UNSOLD' },
      })
    );
  });
});
