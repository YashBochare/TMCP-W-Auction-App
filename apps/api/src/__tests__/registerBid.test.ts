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

const mockTeamFindUnique = vi.fn();
const mockGetTeamConstraints = vi.fn();

vi.mock('../lib/prisma.js', () => ({
  getPrisma: () => ({
    player: {
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue({}),
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
    },
    team: {
      findUnique: mockTeamFindUnique,
      update: vi.fn().mockResolvedValue({}),
    },
    auctionState: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  }),
}));

vi.mock('../socket/index.js', () => ({
  getIo: () => ({
    emit: vi.fn(),
    to: () => ({ emit: vi.fn() }),
  }),
}));

vi.mock('../middleware/auth.middleware.js', () => ({
  requireAuth: (_req: any, _res: any, next: any) => {
    _req.user = { id: 'test-user', role: 'AUCTIONEER' };
    next();
  },
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

vi.mock('../auction/constraintService.js', async (importOriginal) => {
  const actual = await importOriginal() as any;
  return {
    ...actual,
    getTeamConstraints: (...args: any[]) => mockGetTeamConstraints(...args),
    getAllTeamConstraints: vi.fn().mockResolvedValue([]),
  };
});

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auction', auctionRoutes);
  return app;
}

describe('POST /api/auction/register-bid', () => {
  const app = createTestApp();

  async function post(path: string, body?: object) {
    const { default: supertest } = await import('supertest');
    return (supertest as any)(app).post(path).send(body);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    stateMachine.phase = 'bidding_open';
    stateMachine.currentPlayer = { id: 'p1', name: 'Test Player', basePrice: 3000 } as any;
    stateMachine.currentHighestBid = 0;
    stateMachine.currentHighestBidderTeamId = null;
    stateMachine.isPaused = false;

    mockTeamFindUnique.mockResolvedValue({ name: 'Team A' });
    mockGetTeamConstraints.mockResolvedValue({
      teamId: 'team-1',
      teamName: 'Team A',
      currentPurse: 100000,
      currentSquadSize: 0,
      maxBid: 100000,
      canBid: true,
    });
  });

  it('registers first bid at base price', async () => {
    const res = await post('/api/auction/register-bid', { teamId: 'team-1' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.bidAmount).toBe(3000); // base price
    expect(res.body.data.teamName).toBe('Team A');
  });

  it('rejects when bidding is not open', async () => {
    stateMachine.phase = 'idle';
    const res = await post('/api/auction/register-bid', { teamId: 'team-1' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('not open');
  });

  it('rejects when auction is paused', async () => {
    stateMachine.isPaused = true;
    const res = await post('/api/auction/register-bid', { teamId: 'team-1' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('paused');
  });

  it('rejects self-bid (same team is already highest)', async () => {
    stateMachine.currentHighestBidderTeamId = 'team-1';
    const res = await post('/api/auction/register-bid', { teamId: 'team-1' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('already the highest');
  });

  it('rejects when team cannot afford', async () => {
    stateMachine.currentHighestBid = 90000;
    mockGetTeamConstraints.mockResolvedValue({
      teamId: 'team-1', teamName: 'Team A',
      currentPurse: 5000, currentSquadSize: 6,
      maxBid: 5000, canBid: true,
    });
    const res = await post('/api/auction/register-bid', { teamId: 'team-1' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('insufficient');
  });

  it('rejects when team canBid is false', async () => {
    mockGetTeamConstraints.mockResolvedValue({
      teamId: 'team-1', teamName: 'Team A',
      currentPurse: 100000, currentSquadSize: 7,
      maxBid: 0, canBid: false,
    });
    const res = await post('/api/auction/register-bid', { teamId: 'team-1' });
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('cannot bid');
  });

  it('rejects without teamId', async () => {
    const res = await post('/api/auction/register-bid', {});
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain('teamId');
  });
});
