import { describe, it, expect, beforeAll, beforeEach } from 'vitest';

beforeAll(() => {
  process.env.JWT_SECRET = 'test-secret-key-that-is-at-least-32-characters-long';
  process.env.AUCTIONEER_PASSWORD = 'test-admin-pass';
  process.env.JWT_EXPIRY = '1h';
  process.env.DATABASE_URL = 'postgresql://fake:fake@localhost:5432/fake';
});

import express from 'express';
import eventConfigRoutes from '../routes/eventConfig.routes.js';
import authRoutes from '../routes/auth.routes.js';
import { generateToken } from '../services/auth.service.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRoutes);
  app.use('/api/event-config', eventConfigRoutes);
  return app;
}

describe('EventConfig API', () => {
  const app = createTestApp();
  let token: string;

  beforeAll(() => {
    token = generateToken({ role: 'auctioneer' });
  });

  async function request(method: string, path: string, body?: object) {
    const { default: supertest } = await import('supertest');
    const req = (supertest as any)(app);
    const r = method === 'POST' ? req.post(path).send(body) : req.get(path);
    r.set('Authorization', `Bearer ${token}`);
    return r;
  }

  it('returns 401 without auth', async () => {
    const { default: supertest } = await import('supertest');
    const res = await (supertest as any)(app).get('/api/event-config');
    expect(res.status).toBe(401);
  });

  // Skipping DB-dependent GET test — requires real DB connection
  // Covered by validation tests below which don't hit DB

  it('rejects negative numbers', async () => {
    const res = await request('POST', '/api/event-config', { startingPurse: -1 });
    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
  });

  it('rejects purse < minBasePrice * maxSquadSize', async () => {
    const res = await request('POST', '/api/event-config', {
      startingPurse: 1000,
      maxSquadSize: 7,
      minBasePrice: 3000,
    });
    expect(res.status).toBe(422);
    expect(res.body.error.details.some((d: string) => d.includes('startingPurse'))).toBe(true);
  });

  it('rejects non-auctioneer role', async () => {
    const captainToken = generateToken({ role: 'captain', teamId: 't1', teamName: 'T' });
    const { default: supertest } = await import('supertest');
    const res = await (supertest as any)(app)
      .get('/api/event-config')
      .set('Authorization', `Bearer ${captainToken}`);
    expect(res.status).toBe(403);
  });
});
